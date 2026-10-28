import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { ParticleForm, canRunParticles, paintLines } from '../../immersion/ParticleForm';

/* DAY 3 ARRIVAL: passes stream in from both sides and become the venue's
   name, the way pilots will arrive at Chroma on December 13. Plays once,
   when the band scrolls into view; the real text is underneath. */

export const SgxChromaArrival: React.FC = () => {
  const { language } = useLanguage();
  const es = language === 'es';
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number; fonts: string[] } | null>(null);
  const [formed, setFormed] = useState(() => !canRunParticles());

  useEffect(() => {
    if (formed) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      (document.fonts?.ready || Promise.resolve()).then(() => {
        const title = el.querySelector('.sgx-chroma__name') as HTMLElement | null;
        const sub = el.querySelector('.sgx-chroma__when') as HTMLElement | null;
        const f = (n: HTMLElement | null) => (n ? `${getComputedStyle(n).fontWeight} ${getComputedStyle(n).fontSize} ${getComputedStyle(n).fontFamily}` : '700 40px Orbitron');
        const r = el.getBoundingClientRect();
        setBox({ w: r.width, h: r.height, fonts: [f(title), f(sub)] });
      });
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [formed]);

  const half = (side: 'left' | 'right') => box && (
    <ParticleForm
      width={box.w}
      height={box.h}
      origin={side === 'left' ? 'left' : { x: box.w + 60, y: box.h / 2 }}
      density={0.55}
      colors={['#00DDFF', '#FDCC0D', '#FFFFFF']}
      duration={1600}
      hold={300}
      paint={(g, w, h) => {
        paintLines([{ text: 'CHROMA SPACE STUDIOS', font: box.fonts[0] }, { text: es ? 'DÍA 3 · 13 DIC · SAN JUAN, PR' : 'DAY 3 · DEC 13 · SAN JUAN, PR', font: box.fonts[1] }], 'center', 1.25)(g, w, h);
        // each swarm builds its own half of the words
        g.globalCompositeOperation = 'destination-out';
        g.fillRect(side === 'left' ? w / 2 : 0, 0, w / 2, h);
      }}
      onSettled={() => setFormed(true)}
      onDone={() => setBox(null)}
    />
  );

  return (
    <div ref={ref} className={`sgx-chroma ${formed ? 'is-formed' : ''}`} aria-label={es ? 'Día 3 en Chroma Space Studios' : 'Day 3 at Chroma Space Studios'}>
      {half('left')}
      {half('right')}
      <p className="sgx-chroma__name">CHROMA SPACE STUDIOS</p>
      <p className="sgx-chroma__when">{es ? 'DÍA 3 · 13 DIC · SAN JUAN, PR' : 'DAY 3 · DEC 13 · SAN JUAN, PR'}</p>
    </div>
  );
};

export default SgxChromaArrival;
