import React from 'react';
import { motion } from 'framer-motion';
import { getBestImage } from '@/utils/imageResolver';

const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=80&q=60';

function Marquee({ items }) {
  const doubled = [...items, ...items];
  return (
    <div className="flex items-center overflow-hidden" style={{ maskImage: 'linear-gradient(to right, transparent, black 6%, black 94%, transparent)' }}>
      <motion.div
        className="flex items-center gap-0 shrink-0"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: items.length * 5, ease: 'linear', repeat: Infinity }}
      >
        {doubled.map((item, i) => {
          const img = getBestImage(item, 'feed', 'feed');
          return (
            <div key={i} className="flex items-center gap-3 shrink-0 px-4 py-1"
              style={{ borderRight: '1px solid rgba(255,248,245,0.07)' }}>
              {/* Visual thumbnail */}
              <div className="w-8 h-8 rounded-sm overflow-hidden shrink-0" style={{ border: '1px solid rgba(255,248,245,0.12)' }}>
                <img src={img} alt="" className="w-full h-full object-cover" style={{ filter: 'brightness(0.75) contrast(1.1)' }}
                  onError={e => { e.target.src = FALLBACK_AVATAR; }} />
              </div>
              <div>
                <div className="font-semibold text-xs leading-tight whitespace-nowrap" style={{ color: '#FFF8F5', maxWidth: 200 }}>
                  {item.label || item.title || 'Activity'}
                </div>
                {item.subtitle && (
                  <div className="text-[10px] mt-0.5 whitespace-nowrap" style={{ color: 'rgba(255,248,245,0.35)' }}>{item.subtitle}</div>
                )}
              </div>
              {item.time && <span className="font-mono text-[10px] shrink-0 ml-2" style={{ color: 'rgba(255,248,245,0.25)' }}>{item.time}</span>}
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

export default function LiveNowSection({ feedItems = [] }) {
  if (!feedItems.length) return null;
  return (
    <section style={{ background: '#111', borderBottom: '1px solid rgba(255,248,245,0.05)' }} className="py-2">
      <div className="flex items-center">
        <div className="flex items-center gap-2 shrink-0 px-6 py-1" style={{ borderRight: '1px solid rgba(255,248,245,0.1)', minWidth: 130 }}>
          <motion.span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#D33F49' }}
            animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
          <span className="font-mono text-[10px] tracking-[0.35em] uppercase font-bold shrink-0" style={{ color: '#D33F49' }}>Live Now</span>
        </div>
        <div className="flex-1 overflow-hidden py-1">
          <Marquee items={feedItems} />
        </div>
      </div>
    </section>
  );
}