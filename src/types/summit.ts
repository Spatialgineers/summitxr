export type SummitPillarId = 
  | 'SGX.STORY' 
  | 'SGX.SHOWCASE' 
  | 'SGX.SPARK' 
  | 'SGX.STAGE' 
  | 'SGX.SYSTEM' 
  | 'SGX.SYNTHESIZE';

export type LanguageCode = 'en' | 'es' | 'ja';

export interface SummitPillar {
  id: SummitPillarId;
  name: string;
  tagline: string;
  description: string;
  color: string;
  iconName: string;
  iconUrl?: string;
  leadSpeaker: string;
  caseStudies: string[];
  features: string[];
  dayFeatured: number;
}

export interface SummitSession {
  id: string;
  day: 1 | 2 | 3;
  dateStr: string; // e.g. "Dec 12, 2026"
  startTime: string; // e.g. "10:00 AM"
  endTime: string; // e.g. "10:30 AM"
  startMinutes: number; // for chronological sorting
  title: string;
  titleEn?: string;
  subtitle?: string;
  subtitleEn?: string;
  description: string;
  descriptionEn?: string;
  pillarId?: SummitPillarId;
  speakerIds: string[];
  format: 'DIGITAL' | 'HYBRID' | 'PHYSICAL' | 'ROBLOX_STREAM';
  venueLocation: string; // e.g. "YouTube Live", "Chroma Space Studios, San Juan", "Roblox Universe"
  venueLocationEn?: string;
  streamUrl?: string;
  mapNodeId?: string;
  tags: string[];
  tagsEn?: string[];
  isBookmarked?: boolean;
  pushNotifyEnabled?: boolean;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED';
}

export interface SummitSpeaker {
  id: string;
  name: string;
  handle?: string;
  role: string;
  roleEn?: string;
  organization: string;
  avatarUrl: string;
  bio: string;
  bioEn?: string;
  pillarId?: SummitPillarId;
  day: number;
  isKeynote?: boolean;
  isAwakenInitiate?: boolean;
  awakenRank?: 'INITIATE' | 'AWAKEN_STATUS' | 'HONORARY_MENTION';
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    github?: string;
    portfolio?: string;
    roblox?: string;
  };
}

export interface Map360Hotspot {
  id: string;
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  yaw: number; // -180 to 180 degrees
  pitch: number; // -90 to 90 degrees
  targetNodeId?: string;
  actionType: 'NAVIGATE' | 'VIEW_SESSION' | 'PLAY_AUDIO' | 'OPEN_URL';
  actionUrl?: string;
}

export interface Map360Node {
  id: string;
  title: string;
  titleEn?: string;
  areaName: string;
  areaNameEn?: string;
  locationLabel: string;
  locationLabelEn?: string;
  category: 'PHYSICAL_STUDIO' | 'METAVERSE' | 'VIRTUAL_GALLERY' | 'ARENA' | 'LOUNGE';
  mapCoords: { x: number; y: number }; // percentage on 2D map 0-100
  panorama360Url: string;
  thumbnailUrl: string;
  description: string;
  descriptionEn?: string;
  liveStatus: 'ONLINE_ACTIVE' | 'HYBRID_LIVE' | 'VIRTUAL_READY';
  capacityInfo?: string;
  capacityInfoEn?: string;
  connectedNodeIds: string[];
  hotspots: Map360Hotspot[];
  embedUrl?: string;
}

export interface ChatMessage {
  id: string;
  channelId: string; // e.g. '#general', '#stage-live', '#initiates', '#networking', 'dm_user123'
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderRole?: 'ATTENDEE' | 'SPEAKER' | 'ORGANIZER' | 'INITIATE' | 'VIP';
  senderPillar?: SummitPillarId;
  text: string;
  textEn?: string;
  timestamp: number;
  reactions?: Record<string, number>; // emoji -> count
  isPinned?: boolean;
  isSystem?: boolean;
}

export interface AttendeeProfile {
  id: string;
  name: string;
  title: string;
  company: string;
  avatar: string;
  bio: string;
  pillars: SummitPillarId[];
  isOnline: boolean;
  ticketType: 'DIGITAL_ACCESS' | 'HYBRID_SAN_JUAN' | 'VIP_PASS' | 'INITIATE';
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    portfolio?: string;
  };
}

export type EmbedCategory = 'MINI_GAME' | 'METAVERSE_ROBLOX' | 'WEBGL_XR' | 'WEBAPP' | 'STREAM_VIDEO' | 'CUSTOM_CODE';

export interface EmbedWidget {
  id: string;
  title: string;
  titleEn?: string;
  category: EmbedCategory;
  description: string;
  descriptionEn?: string;
  thumbnailUrl: string;
  embedType?: 'URL' | 'CODE';
  embedUrl?: string;
  externalUrl?: string;
  customCode?: string; // HTML / JS code or iframe tag
  aspectRatio?: string; // '16:9', '4:3', '1:1', 'fullscreen'
  author: string;
  tags: string[];
  tagsEn?: string[];
  rating?: number;
  featured?: boolean;
  isCustomUserApp?: boolean;
}

export interface SummitNotification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  type: 'SESSION_START' | 'VOTE_ALERT' | 'SYSTEM_ANNOUNCEMENT' | 'AWAKEN_REVEAL' | 'SPONSOR_DROP';
  priority: 'URGENT' | 'HIGH' | 'NORMAL';
  actionUrl?: string;
  actionLabel?: string;
  isRead?: boolean;
}

export interface SponsorshipTier {
  id: string;
  tierNumber: 1 | 2 | 3 | 4 | 5;
  name: string;
  nameEn?: string;
  priceRange: string;
  priceRangeEn?: string;
  keyBenefit: string;
  keyBenefitEn?: string;
  yearLongLicense: boolean;
  features: string[];
  featuresEn?: string[];
  sponsors: Array<{
    name: string;
    logoUrl: string;
    websiteUrl: string;
    description: string;
    descriptionEn?: string;
  }>;
}

export interface SponsorInquiry {
  id: string;
  companyName: string;
  contactName: string;
  roleTitle?: string;
  email: string;
  phone: string;
  websiteUrl?: string;
  selectedTierId: string;
  selectedTierName: string;
  estimatedBudget?: string;
  goals: string[];
  customMessage?: string;
  submittedAt: number;
  status: 'PENDING_REVIEW' | 'CONTACTED' | 'APPROVED' | 'DECLINED';
  referenceCode: string;
  /** uid of the visitor who sent it (their sponsor Holo Card). */
  submittedBy?: string;
}

export interface ApprovedSponsor {
  id: string;
  inquiryId?: string;
  companyName: string;
  companyNameEn?: string;
  brandSlug: string; // e.g. "nextgen-sound"
  tierId: string; // 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4'
  tierName: string;
  tierNameEn?: string;
  tagline: string;
  taglineEn?: string;
  logoUrl: string;
  bannerUrl?: string;
  websiteUrl: string;
  contactName?: string;
  contactEmail?: string;
  phone?: string;
  description: string;
  descriptionEn?: string;
  highlights: string[];
  highlightsEn?: string[];
  specialOfferText?: string;
  specialOfferTextEn?: string;
  specialOfferCode?: string;
  ctaButtonText: string;
  ctaButtonTextEn?: string;
  activeInVisualizer: boolean; // Stage 3D LED Wall & HUD lower-third
  activeInMiniGame: boolean; // Drone mini-game drop crate with sponsor logo/points
  activeInAppTicker: boolean; // Ticker bar in Summit & Stage
  boothLocation?: string; // e.g. "Chroma Space Studios - Partner Pavilion Stage"
  boothLocationEn?: string;
  publishedAt: number;
  updatedAt: number;
}

export interface SummitAnalyticsMetrics {
  totalRegistered: number;
  digitalAttendees: number;
  physicalAttendees: number;
  liveStreamPeakViewers: number;
  totalVotesCast: number;
  chatMessagesSent: number;
  xr360NodeViews: number;
  droneGamesPlayed: number;
  prizesClaimed: number;
  pillarEngagement: Record<SummitPillarId, number>;
  countryDistribution: Array<{ country: string; count: number; flag: string }>;
  hourlyEngagement: Array<{ hour: string; viewers: number; votes: number }>;
}

