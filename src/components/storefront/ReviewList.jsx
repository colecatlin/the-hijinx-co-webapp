import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { format } from 'date-fns';

function StarRating({ rating, size = 3.5 }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className={`w-${Math.round(size)} h-${Math.round(size)} ${n <= rating ? 'text-[#00FFDA] fill-[#00FFDA]' : 'text-[#2a2a2a] fill-[#2a2a2a]'}`}
          style={{ width: `${size * 4}px`, height: `${size * 4}px` }}
        />
      ))}
    </div>
  );
}

export default function ReviewList({ reviews = [], avgRating, totalCount }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? reviews : reviews.slice(0, 4);

  if (reviews.length === 0) {
    return (
      <div className="py-16" style={{ borderTop: '1px solid #111' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-5 h-px bg-[#00FFDA]" />
          <span className="font-mono text-[10px] tracking-[0.45em] text-[#00FFDA] uppercase">Reviews</span>
        </div>
        <p className="text-sm text-[#444]">No reviews yet. Be the first.</p>
      </div>
    );
  }

  return (
    <div className="py-16" style={{ borderTop: '1px solid #111' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-12">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-5 h-px bg-[#00FFDA]" />
            <span className="font-mono text-[10px] tracking-[0.45em] text-[#00FFDA] uppercase">Reviews</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-4xl font-black text-[#F5F5F5]">{(avgRating || 0).toFixed(1)}</span>
            <div>
              <StarRating rating={Math.round(avgRating || 0)} size={4} />
              <span className="text-xs text-[#555] mt-1 block">{totalCount} review{totalCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {visible.map((r) => (
          <div
            key={r.id}
            className="p-6 transition-all duration-300"
            style={{
              background: '#0D0D0D',
              border: '1px solid #1a1a1a',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#262626'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#1a1a1a'}
          >
            <div className="flex items-start justify-between mb-4">
              <StarRating rating={r.rating} size={3.5} />
              <div className="text-right">
                <p className="text-xs font-semibold text-[#A1A1A1]">{r.customer_name || 'Anonymous'}</p>
                {r.created_date && (
                  <p className="text-[10px] text-[#333] mt-0.5 font-mono">{format(new Date(r.created_date), 'MMM d, yyyy')}</p>
                )}
              </div>
            </div>
            {r.title && (
              <p className="text-sm font-bold text-[#F5F5F5] mb-2 leading-snug">{r.title}</p>
            )}
            {r.body && (
              <p className="text-sm text-[#6a6a6a] leading-relaxed">{r.body}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-5 pt-4" style={{ borderTop: '1px solid #1a1a1a' }}>
              {r.size_purchased && (
                <span className="text-[9px] font-mono text-[#444] tracking-[0.2em] uppercase">Size: {r.size_purchased}</span>
              )}
              {r.fit_rating && (
                <span className="text-[9px] font-mono text-[#444] tracking-[0.2em] uppercase">
                  Fit: {r.fit_rating.replace(/_/g, ' ')}
                </span>
              )}
              {r.verified_purchase && (
                <span className="text-[9px] font-mono text-[#00FFDA] tracking-[0.2em] uppercase">✓ Verified Purchase</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {reviews.length > 4 && (
        <div className="mt-8">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-[10px] font-mono tracking-[0.25em] uppercase px-8 py-3.5 transition-all duration-200"
            style={{ border: '1px solid #262626', color: '#A1A1A1' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#00FFDA'; e.currentTarget.style.color = '#00FFDA'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#262626'; e.currentTarget.style.color = '#A1A1A1'; }}
          >
            {showAll ? 'Show Less' : `View All ${reviews.length} Reviews`}
          </button>
        </div>
      )}
    </div>
  );
}