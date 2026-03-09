import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Radio } from 'lucide-react';
import { motion } from 'framer-motion';

const BADGE_COLORS = {
  Registration: 'bg-blue-50   text-blue-700   border-blue-200',
  Story:        'bg-purple-50 text-purple-700 border-purple-200',
  Media:        'bg-pink-50   text-pink-700   border-pink-200',
  Results:      'bg-amber-50  text-amber-700  border-amber-200',
  Event:        'bg-green-50  text-green-700  border-green-200',
  Track:        'bg-teal-50   text-teal-700   border-teal-200',
  Series:       'bg-indigo-50 text-indigo-700 border-indigo-200',
  Update:       'bg-gray-50   text-gray-600   border-gray-200',
};

function RailItem({ item }) {
  const badge = BADGE_COLORS[item.badge_label] || BADGE_COLORS.Update;
  const inner = (
    <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 hover:border-[#1DA1A1] hover:shadow-sm hover:-translate-y-px transition-all duration-200 cursor-pointer min-w-[220px] max-w-[280px]">
      <span className={`inline-block text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border flex-shrink-0 ${badge}`}>
        {item.badge_label}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-gray-800 leading-snug line-clamp-1">{item.title}</p>
        {item.timestamp && (
          <p className="text-[10px] text-gray-400 mt-0.5">{item.timestamp}</p>
        )}
      </div>
    </div>
  );

  return item.href ? (
    <Link to={item.href}>{inner}</Link>
  ) : (
    <div>{inner}</div>
  );
}

export default function HomepageLiveFeedRail({ items = [] }) {
  const scrollRef = useRef(null);

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir * 300, behavior: 'smooth' });
  };

  return (
    <div className="bg-white border-b border-gray-100">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
      <div className="flex items-center gap-3 sm:gap-4">
          {/* Label */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Radio className="w-3.5 h-3.5 text-red-500" />
            <span className="font-mono text-[9px] tracking-[0.3em] text-gray-500 uppercase font-bold whitespace-nowrap">Live Feed</span>
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-gray-200 flex-shrink-0" />

          {/* Scrollable rail */}
          {items.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Live updates will appear here as the platform comes alive.</p>
          ) : (
            <div className="flex-1 min-w-0 relative">
              <div
                ref={scrollRef}
                className="flex items-center gap-2 overflow-x-auto scrollbar-hide"
              >
                {items.map((item, i) => (
                  <motion.div
                    key={item.id || i}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <RailItem item={item} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Nav arrows */}
          {items.length > 3 && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => scroll(-1)} className="p-1 hover:bg-gray-100 rounded transition-colors">
                <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
              </button>
              <button onClick={() => scroll(1)} className="p-1 hover:bg-gray-100 rounded transition-colors">
                <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}