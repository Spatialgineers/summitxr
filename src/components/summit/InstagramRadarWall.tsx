import React, { useEffect, useRef, useState } from 'react';
import { Instagram, Play } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

/* Approved Instagram posts found by the server's radar (GET /api/social/instagram/approved).
   Nothing is requested, and no Instagram image loads, until the block is on screen.
   Renders nothing when the feature is off or there is nothing approved. */

interface ApprovedIg {
  id: string;
  permalink: string;
  mediaType: string;
  imageUrl: string | null;
  caption: string;
  timestamp: string;
  username: string | null;
}

export const InstagramRadarWall: React.FC = () => {
  const { language } = useLanguage();
  const es = language === 'es';
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [posts, setPosts] = useState<ApprovedIg[]>([]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setVisible(true); io.disconnect(); }
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    const load = () => fetch('/api/social/instagram/approved')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (alive && j && Array.isArray(j.posts)) setPosts(j.posts); })
      .catch(() => { /* offline: keep what we have */ });
    load();
    const t = window.setInterval(load, 5 * 60_000);
    return () => { alive = false; window.clearInterval(t); };
  }, [visible]);

  return (
    <div ref={ref} className="sgx-igradar" data-count={posts.length}>
      {posts.length > 0 && (
        <section aria-label={es ? 'Publicaciones de Instagram de la comunidad' : 'Community Instagram posts'} className="space-y-3">
          <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-300 flex items-center gap-2">
            <Instagram className="w-4 h-4 text-[var(--sgx-primary)]" aria-hidden="true" />
            {es ? 'Visto en Instagram' : 'Seen on Instagram'}
          </h3>
          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 list-none p-0 m-0">
            {posts.map((p) => {
              const date = p.timestamp ? new Date(p.timestamp).toLocaleDateString(es ? 'es-PR' : 'en-US', { day: 'numeric', month: 'short' }) : '';
              return (
                <li key={p.id} className="sgx-igradar__card bg-[var(--sgx-card-bg)] border border-[var(--sgx-border)] overflow-hidden">
                  <a href={p.permalink} target="_blank" rel="noopener noreferrer" className="block group focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sgx-primary)]"
                    aria-label={`${es ? 'Ver en Instagram' : 'View on Instagram'}${p.username ? `: @${p.username}` : ''}`}>
                    <div className="relative aspect-square bg-black">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.caption ? p.caption.slice(0, 120) : (es ? 'Publicación de Instagram' : 'Instagram post')}
                          loading="lazy" decoding="async" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Instagram className="w-10 h-10 text-slate-600" aria-hidden="true" /></div>
                      )}
                      <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-black/80 text-white flex items-center gap-1">
                        <Instagram className="w-3 h-3" aria-hidden="true" /> Instagram
                      </span>
                      {p.mediaType === 'VIDEO' && <Play className="absolute bottom-2 right-2 w-5 h-5 text-white" aria-hidden="true" />}
                    </div>
                    <div className="p-2.5 space-y-1">
                      <p className="text-[11px] font-mono text-slate-400">{p.username ? `@${p.username} · ` : ''}{date}</p>
                      {p.caption && <p className="text-xs text-slate-200 line-clamp-3">{p.caption}</p>}
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
};
