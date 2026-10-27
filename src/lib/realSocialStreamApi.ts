import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  arrayUnion, 
  increment,
  where
} from 'firebase/firestore';
import { auth, db } from './firebase';

/** In-house avatar for posts and comments without a photo (no stock faces). */
const SGX_DEFAULT_AVATAR = '/brand/sgx-bolt.svg';

export type SocialPlatform = 'instagram' | 'x' | 'threads' | 'tiktok';

export interface SocialAuthor {
  name: string;
  handle: string;
  avatar: string;
  badge?: string;
  verified: boolean;
}

export interface SocialComment {
  id: string;
  author: string;
  handle: string;
  avatar: string;
  text: string;
  timestamp: string;
}

export interface SocialPost {
  id: string;
  platform: SocialPlatform;
  instagramPostUrl?: string;
  author: SocialAuthor;
  content: string;
  hashtags: string[];
  mediaUrl?: string;
  mediaType: 'image' | 'video' | 'text';
  aspectRatio?: 'square' | 'portrait' | 'landscape';
  location: string;
  timestamp: string;
  createdAt: number;
  likes: number;
  commentsCount: number;
  sharesCount: number;
  isFeaturedOnStage?: boolean;
  featuredQuote?: string;
  comments?: SocialComment[];
  userLiked?: boolean;
  userSaved?: boolean;
}

export interface SocialFilterOptions {
  hashtag?: string;
  platform?: SocialPlatform | 'all';
  searchQuery?: string;
  sortBy?: 'recent' | 'trending' | 'stage_featured';
}

export const OFFICIAL_SUMMIT_HASHTAGS = [
  '#SpatialgineersSummit',
  '#SGX2026',
  '#SpatialComputing',
  '#ChromaStudios',
  '#RobloxLive',
  '#WebXR',
  '#UnrealEngine5',
  '#SanJuanTech',
  '#AudioEspacial'
];

// Helper: map Firestore doc to SocialPost
function mapDocToPost(id: string, data: any): SocialPost {
  return {
    id,
    platform: data.platform || 'instagram',
    instagramPostUrl: data.instagramPostUrl,
    author: data.author || {
      name: data.authorName || 'Asistente Spatialgineer',
      handle: data.authorHandle || '@asistente',
      avatar: data.authorAvatar || SGX_DEFAULT_AVATAR,
      badge: data.authorBadge,
      verified: !!data.authorVerified,
    },
    content: data.content || '',
    hashtags: Array.isArray(data.hashtags) ? data.hashtags : ['#SpatialgineersSummit'],
    mediaUrl: data.mediaUrl,
    mediaType: data.mediaType || (data.mediaUrl ? 'image' : 'text'),
    aspectRatio: data.aspectRatio || 'landscape',
    location: data.location || 'Spatialgineers Summit 2026',
    timestamp: data.timestamp || (data.createdAt ? new Date(data.createdAt).toLocaleDateString('es-PR') : 'Reciente'),
    createdAt: data.createdAt || Date.now(),
    likes: typeof data.likes === 'number' ? data.likes : 0,
    commentsCount: typeof data.commentsCount === 'number' ? data.commentsCount : (data.comments?.length || 0),
    sharesCount: typeof data.sharesCount === 'number' ? data.sharesCount : 0,
    isFeaturedOnStage: !!data.isFeaturedOnStage,
    featuredQuote: data.featuredQuote,
    comments: Array.isArray(data.comments) ? data.comments : [],
    userLiked: false,
  };
}

/**
 * Fetch real social posts from Firestore
 */
export async function fetchSocialPosts(options: SocialFilterOptions = {}): Promise<SocialPost[]> {
  const postsMap = new Map<string, SocialPost>();

  // Fetch real posts from Firestore collection 'social_posts'
  try {
    const colRef = collection(db, 'social_posts');
    const q = query(colRef, orderBy('createdAt', 'desc'), limit(50));
    const snap = await getDocs(q);

    snap.forEach((docSnap) => {
      postsMap.set(docSnap.id, mapDocToPost(docSnap.id, docSnap.data()));
    });
  } catch (err) {
    console.warn('[Real Social Stream] Firestore read fallback:', err);
  }

  let results = Array.from(postsMap.values());

  // Filter by Hashtag
  if (options.hashtag && options.hashtag !== 'all') {
    const targetTag = options.hashtag.toLowerCase();
    results = results.filter((p) =>
      p.hashtags.some((tag) => tag.toLowerCase() === targetTag) ||
      p.content.toLowerCase().includes(targetTag)
    );
  }

  // Filter by Platform
  if (options.platform && options.platform !== 'all') {
    results = results.filter((p) => p.platform === options.platform);
  }

  // Search query
  if (options.searchQuery && options.searchQuery.trim()) {
    const q = options.searchQuery.toLowerCase().trim();
    results = results.filter(
      (p) =>
        p.content.toLowerCase().includes(q) ||
        p.author.name.toLowerCase().includes(q) ||
        p.author.handle.toLowerCase().includes(q) ||
        p.hashtags.some((t) => t.toLowerCase().includes(q))
    );
  }

  // Sort
  if (options.sortBy === 'trending') {
    results.sort((a, b) => (b.likes + b.sharesCount * 2) - (a.likes + a.sharesCount * 2));
  } else if (options.sortBy === 'stage_featured') {
    results.sort((a, b) => (b.isFeaturedOnStage ? 1 : 0) - (a.isFeaturedOnStage ? 1 : 0));
  } else {
    // Default: recent
    results.sort((a, b) => b.createdAt - a.createdAt);
  }

  return results;
}

/**
 * Real-time subscription to Firestore 'social_posts' collection
 */
export function subscribeToSocialPosts(
  onUpdate: (posts: SocialPost[]) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    const colRef = collection(db, 'social_posts');
    const q = query(colRef, orderBy('createdAt', 'desc'), limit(50));

    return onSnapshot(
      q,
      (snapshot) => {
        const posts = snapshot.docs.map((docSnap) => mapDocToPost(docSnap.id, docSnap.data()));
        onUpdate(posts);
      },
      (err) => {
        console.error('[Real Social Stream] Subscription error:', err);
        if (onError) onError(err);
      }
    );
  } catch (err: any) {
    console.warn('[Real Social Stream] Unable to subscribe to Firestore:', err);
    return () => {};
  }
}

/**
 * Publish a real attendee or speaker post into Firestore
 */
export async function publishAttendeePost(post: {
  content: string;
  hashtags: string[];
  platform?: SocialPlatform;
  mediaUrl?: string;
  authorName?: string;
  authorHandle?: string;
  authorAvatar?: string;
  location?: string;
  instagramPostUrl?: string;
}): Promise<SocialPost> {
  const postId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();

  const author: SocialAuthor = {
    name: post.authorName || 'Asistente Spatialgineers',
    handle: post.authorHandle || '@asistente_sgx',
    avatar: post.authorAvatar && /^https:\/\//.test(post.authorAvatar) && post.authorAvatar.length <= 1000 ? post.authorAvatar : SGX_DEFAULT_AVATAR,
    badge: 'Asistente',
    verified: false,
  };

  const newPostData = {
    platform: post.platform || (post.instagramPostUrl ? 'instagram' : 'instagram'),
    instagramPostUrl: post.instagramPostUrl || null,
    author,
    content: post.content,
    hashtags: post.hashtags.length ? post.hashtags : ['#SpatialgineersSummit', '#SGX2026'],
    mediaUrl: post.mediaUrl || null,
    mediaType: post.mediaUrl ? 'image' : 'text',
    aspectRatio: 'landscape',
    location: post.location || 'Spatialgineers Summit 2026',
    timestamp: 'Justo ahora',
    createdAt: now,
    likes: 0,
    commentsCount: 0,
    sharesCount: 0,
    isFeaturedOnStage: false,
    comments: [],
    authorUid: auth.currentUser?.uid || null,
  };

  // Save to Firestore
  try {
    await setDoc(doc(db, 'social_posts', postId), newPostData);
  } catch (err) {
    console.error('[Real Social Stream] Error writing post to Firestore:', err);
  }

  return mapDocToPost(postId, newPostData);
}

/**
 * Import an Instagram post by its public URL
 */
export async function importInstagramPost(
  url: string,
  extra?: { caption?: string; authorHandle?: string }
): Promise<SocialPost> {
  const trimmedUrl = url.trim();
  const match = trimmedUrl.match(/instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/i);
  
  if (!match) {
    throw new Error('No es una URL válida de publicación o reel de Instagram. Debe tener el formato https://www.instagram.com/p/... o https://www.instagram.com/reel/...');
  }

  const shortcode = match[1];
  const canonicalUrl = `https://www.instagram.com/p/${shortcode}/`;
  const isReel = trimmedUrl.toLowerCase().includes('/reel/');
  const postId = `ig_imported_${shortcode}`;

  const postData = {
    platform: 'instagram' as SocialPlatform,
    instagramPostUrl: canonicalUrl,
    author: {
      name: extra?.authorHandle || 'Instagram Oficial',
      handle: extra?.authorHandle ? (extra.authorHandle.startsWith('@') ? extra.authorHandle : `@${extra.authorHandle}`) : '@spatialgineers',
      avatar: '/brand/sgx-bolt.svg',
      badge: 'Instagram',
      verified: true,
    },
    content: extra?.caption || 'Publicación verificada en Instagram oficial.',
    hashtags: ['#SpatialgineersSummit', '#SGX2026', '#InstagramLive'],
    mediaType: isReel ? 'video' : 'image',
    location: 'Instagram • Publicación Oficial',
    timestamp: 'Publicado en Instagram',
    createdAt: Date.now(),
    likes: 0,
    commentsCount: 0,
    sharesCount: 0,
    isFeaturedOnStage: true,
    comments: [],
    authorUid: auth.currentUser?.uid || null,
  };

  await setDoc(doc(db, 'social_posts', postId), postData);
  return mapDocToPost(postId, postData);
}

export interface BulkInstagramItem {
  url: string;
  caption?: string;
  authorHandle?: string;
  authorName?: string;
  hashtags?: string[];
  isFeaturedOnStage?: boolean;
}

export interface BulkImportResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  importedPosts: SocialPost[];
  errors: { url: string; reason: string }[];
}

/**
 * Bulk import multiple Instagram posts into Firestore simultaneously
 */
export async function bulkImportInstagramPosts(
  items: BulkInstagramItem[]
): Promise<BulkImportResult> {
  const result: BulkImportResult = {
    totalProcessed: items.length,
    successful: 0,
    failed: 0,
    importedPosts: [],
    errors: [],
  };

  const timestampNow = Date.now();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rawUrl = (item.url || '').trim();
    if (!rawUrl) continue;

    const match = rawUrl.match(/instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/i);
    if (!match) {
      result.failed++;
      result.errors.push({
        url: rawUrl,
        reason: 'Formato de URL no válido (debe contener instagram.com/p/... o instagram.com/reel/...)',
      });
      continue;
    }

    const shortcode = match[1];
    const canonicalUrl = `https://www.instagram.com/p/${shortcode}/`;
    const isReel = rawUrl.toLowerCase().includes('/reel/');
    const postId = `ig_imported_${shortcode}`;

    const authorHandle = item.authorHandle 
      ? (item.authorHandle.startsWith('@') ? item.authorHandle : `@${item.authorHandle}`)
      : '@spatialgineers';
      
    const authorName = item.authorName || (item.authorHandle ? item.authorHandle.replace('@', '') : 'Instagram Oficial');

    const postData = {
      platform: 'instagram' as SocialPlatform,
      instagramPostUrl: canonicalUrl,
      author: {
        name: authorName,
        handle: authorHandle,
        avatar: SGX_DEFAULT_AVATAR,
        badge: 'Meta Verificado',
        verified: true,
      },
      content: item.caption || 'Publicación oficial destacada de Instagram.',
      hashtags: item.hashtags && item.hashtags.length > 0 
        ? item.hashtags 
        : ['#SpatialgineersSummit', '#SGX2026', '#InstagramLive'],
      mediaType: isReel ? 'video' : 'image',
      location: 'Instagram • Publicación Oficial',
      timestamp: 'Publicado en Instagram',
      createdAt: timestampNow - (i * 1000), // Slight offset for order stability
      likes: 0,
      commentsCount: 0,
      sharesCount: 0,
      isFeaturedOnStage: item.isFeaturedOnStage !== undefined ? item.isFeaturedOnStage : true,
      comments: [],
    };

    try {
      await setDoc(doc(db, 'social_posts', postId), postData);
      const post = mapDocToPost(postId, postData);
      result.importedPosts.push(post);
      result.successful++;
    } catch (err: any) {
      console.warn(`[Bulk Import] Error importing ${canonicalUrl}:`, err);
      result.failed++;
      result.errors.push({
        url: rawUrl,
        reason: err?.message || 'Error al escribir en Firestore',
      });
    }
  }

  return result;
}

/**
 * Real like interaction saved to Firestore
 */
export async function likeSocialPost(postId: string): Promise<{ likes: number; userLiked: boolean; xpAwarded: number }> {
  const postRef = doc(db, 'social_posts', postId);
  try {
    await updateDoc(postRef, {
      likes: increment(1),
    });
  } catch (err) {
    console.warn('[Real Social Stream] Firestore update like fallback:', err);
  }

  return {
    likes: 1,
    userLiked: true,
    xpAwarded: 10,
  };
}

/**
 * Real comment interaction saved to Firestore
 */
export async function addCommentToPost(
  postId: string,
  text: string,
  authorName = 'Asistente Summit',
  handle = '@asistente'
): Promise<SocialComment> {
  const newComment: SocialComment = {
    id: `c_${Date.now()}`,
    author: authorName,
    handle,
    avatar: SGX_DEFAULT_AVATAR,
    text,
    timestamp: 'Justo ahora',
  };

  const postRef = doc(db, 'social_posts', postId);
  try {
    await updateDoc(postRef, {
      comments: arrayUnion(newComment),
      commentsCount: increment(1),
    });
  } catch (err) {
    console.warn('[Real Social Stream] Firestore comment fallback:', err);
  }

  return newComment;
}

