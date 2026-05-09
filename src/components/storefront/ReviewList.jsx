import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { format } from 'date-fns';

function StarRating({ rating, size = 4 }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className={`w-${size} h-${size} ${n <= rating ? 'text-[#00FFDA] fill-[#00FFDA]' : 'text-[#333]'}`}
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
      <div className="py-12 border-t border-[#1a1a1a]">
        <span className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase block mb-6">Reviews</span>
        <p className="text-sm text-[#555]">No reviews yet. Be the first.</p>
      </div>
    );
  }

  return (
    <div className="py-12 border-t border-[#1a1a1a]">
      <div className="flex items-center justify-between mb-10">
        <div>
          <span className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase block mb-2">Reviews</span>
          <div className="flex items-center gap-3">
            <StarRating rating={Math.round(avgRating || 0)} size={5} />
            <span className="text-2xl font-black text-[#F5F5F5]">{(avgRating || 0).toFixed(1)}</span>
            <span className="text-sm text-[#555]">({totalCount} reviews)</span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {visible.map((r) => (
          <div key={r.id} className="border border-[#1a1a1a] bg-[#0D0D0D] p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <StarRating rating={r.rating} />
                {r.title && <p className="text-sm font-bold text-[#F5F5F5] mt-2">{r.title}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs text-[#555]">{r.customer_name || 'Anonymous'}</p>
                {r.created_date && (
                  <p className="text-xs text-[#333] mt-0.5">{format(new Date(r.created_date), 'MMM d, yyyy')}</p>
                )}
              </div>
            </div>
            {r.body && <p className="text-sm text-[#A1A1A1] leading-relaxed">{r.body}</p>}
            <div className="flex gap-4 mt-4">
              {r.size_purchased && (
                <span className="text-[10px] font-mono text-[#555] tracking-wider uppercase">Size: {r.size_purchased}</span>
              )}
              {r.fit_rating && (
                <span className="text-[10px] font-mono text-[#555] tracking-wider uppercase">
                  Fit: {r.fit_rating.replace('_', ' ')}
                </span>
              )}
              {r.verified_purchase && (
                <span className="text-[10px] font-mono text-[#00FFDA] tracking-wider uppercase">✓ Verified</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {reviews.length > 4 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-8 text-xs font-mono tracking-[0.2em] text-[#A1A1A1] uppercase border border-[#262626] px-6 py-3 hover:border-[#00FFDA] hover:text-[#00FFDA] transition-all"
        >
          {showAll ? 'Show Less' : `View All ${reviews.length} Reviews`}
        </button>
      )}
    </div>
  );
}