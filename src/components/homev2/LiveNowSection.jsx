import React from 'react';

export default function LiveNowSection({ feedItems = [] }) {
  if (!feedItems.length) return null;

  return (
    <section style={{ background: '#1A3249', borderBottom: '1px solid rgba(0,255,218,0.15)' }} className="py-4">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-0 overflow-x-auto scrollbar-hide">

          {/* Label */}
          <div className="flex items-center gap-2 shrink-0 pr-5 mr-5" style={{ borderRight: '1px solid rgba(255,248,245,0.15)' }}>
            <span className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ background: '#D33F49' }} />
            <span className="font-mono text-[10px] tracking-[0.35em] uppercase font-bold shrink-0" style={{ color: '#D33F49' }}>
              Live Now
            </span>
          </div>

          {/* Feed items */}
          <div className="flex items-center gap-0 overflow-x-auto scrollbar-hide">
            {feedItems.map((item, i) => (
              <div
                key={item.id || i}
                className="flex items-center gap-4 shrink-0 pr-5 mr-5"
                style={{ borderRight: i < feedItems.length - 1 ? '1px solid rgba(255,248,245,0.08)' : 'none' }}
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
                  <span className="font-mono text-[10px] shrink-0" style={{ color: 'rgba(255,248,245,0.3)' }}>
                    {item.time}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}