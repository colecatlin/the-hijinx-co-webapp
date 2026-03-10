import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { formatHomepageTickerItems, TICKER_FALLBACK } from '@/components/homepage/formatHomepageTickerItems';

/**
 * Destination page for ticker items that don't map to a specific entity.
 * Activity feed / story items link to OutletHome; generic items go to MotorsportsHome.
 */
function resolveTickerPage(label) {
  const l = label.toLowerCase();
  if (l.includes('story') || l.includes('stories')) return 'OutletHome';
  if (l.includes('apparel') || l.includes('shop'))   return 'ApparelHome';
  if (l.includes('race core'))                        return 'Registration';
  if (l.includes('media'))                            return 'MediaPortal';
  if (l.includes('driver'))                           return 'DriverDirectory';
  if (l.includes('track'))                            return 'TrackDirectory';
  if (l.includes('series'))                           return 'SeriesHome';
  if (l.includes('event') || l.includes('upcoming'))  return 'EventDirectory';
  return 'MotorsportsHome';
}

export default function HomepageTicker({ tickerItems = null, activityItems = [] }) {
  // Priority 1 — editorial / backend-built ticker_items
  // Priority 2 — activity feed titles formatted inline
  // Priority 3 — branded fallback
  let formattedLabels;

  if (tickerItems?.length) {
    formattedLabels = formatHomepageTickerItems(tickerItems);
  } else if (activityItems?.length) {
    const activityTitles = activityItems.map(i => i?.title).filter(Boolean);
    formattedLabels = formatHomepageTickerItems(activityTitles);
  }

  if (!formattedLabels?.length) {
    formattedLabels = TICKER_FALLBACK;
  }

  const items = formattedLabels.map(label => ({ label, page: resolveTickerPage(label) }));

  // Repeat 3× so the seamless loop looks full at any viewport width
  const repeated = [...items, ...items, ...items];

  return (
    <div className="relative bg-[#080C14] border-y border-[#00FFDA]/20 overflow-hidden py-3 select-none">
      {/* Edge fades */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#080C14] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#080C14] to-transparent z-10 pointer-events-none" />

      {/* Live indicator */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20 hidden sm:flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
        <span className="font-mono text-[9px] tracking-[0.3em] text-[#EF4444] uppercase font-bold">Live</span>
      </div>

      <div
        className="flex"
        style={{ animation: 'hijinx-ticker 28s linear infinite' }}
      >
        {repeated.map((item, i) => (
          <Link
            key={i}
            to={createPageUrl(item.page)}
            className="flex-shrink-0 flex items-center gap-4 px-7 group"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FFDA]/50 flex-shrink-0 group-hover:bg-[#00FFDA] transition-colors" />
            <span className="font-mono text-[10px] tracking-[0.3em] text-white/55 group-hover:text-[#00FFDA] transition-colors whitespace-nowrap uppercase font-bold">
              {item.label}
            </span>
          </Link>
        ))}
      </div>

      <style>{`
        @keyframes hijinx-ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  );
}