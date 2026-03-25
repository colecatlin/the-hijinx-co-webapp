import React, { useRef } from 'react';
import { motion } from 'framer-motion';

// Seamless marquee — duplicated items for infinite loop
function Marquee({ items }) {
  const doubled = [...items, ...items];
  return (
    <div className="flex items-center overflow-hidden" style={{ maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)' }}>
      <motion.div
        className="flex items-center gap-0 shrink-0"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: items.length * 4, ease: 'linear', repeat: Infinity }}
      >
        {doubled.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-4 shrink-0 px-5"
            style={{ borderRight: '1px solid rgba(255,248,245,0.08)' }}
          >
            <div>
              <div className="font-semibold text-xs leading-tight whitespace-nowrap" style={{ color: '#FFF8F5' }}>
                {item.label || item.title || 'Activity'}
              </div>
              {item.subtitle && (
                <div className="text-[10px] mt-0.5 whitespace-nowrap" style={{ color: 'rgba(255,248,245,0.4)' }}>
                  {item.subtitle}
                </div>
              )}
            </div>
            {item.time && (
              <span className="font-mono text-[10px] shrink-0" style={{ color: 'rgba(255,248,245,0.3)' }}>{item.time}</span>
            )}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export default function LiveNowSection({ feedItems = [] }) {
  if (!feedItems.length) return null;

  return (
    <section style={{ background: '#1A3249', borderBottom: '1px solid rgba(0,255,218,0.15)' }} className="py-4">
      <div className="max-w-full">
        <div className="flex items-center gap-0">
          {/* Fixed label */}
          <div
            className="flex items-center gap-2 shrink-0 px-6"
            style={{ borderRight: '1px solid rgba(255,248,245,0.15)', minWidth: 120 }}
          >
            <motion.span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: '#D33F49' }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <span className="font-mono text-[10px] tracking-[0.35em] uppercase font-bold shrink-0" style={{ color: '#D33F49' }}>
              Live Now
            </span>
          </div>
          {/* Scrolling strip */}
          <div className="flex-1 overflow-hidden py-2">
            <Marquee items={feedItems} />
          </div>
        </div>
      </div>
    </section>
  );
}