import React from 'react';
import { Clock } from 'lucide-react';

export default function MediaTimeline({ items = [] }) {
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-8 border border-dashed border-divider rounded-lg">
        <Clock className="w-6 h-6 mx-auto mb-2 text-foreground-quiet" />
        <p className="text-sm text-foreground-quiet">No media timeline yet.</p>
      </div>
    );
  }

  const sorted = [...items].sort((a, b) =>
    new Date(b.published_date || b.captured_date || 0).getTime() -
    new Date(a.published_date || a.captured_date || 0).getTime()
  );

  return (
    <div className="relative pl-6">
      <div className="absolute left-2 top-0 bottom-0 w-px" style={{ background: 'hsl(var(--divider))' }} />
      <div className="space-y-4">
        {sorted.slice(0, 20).map((item, idx) => (
          <div key={item.id || idx} className="relative">
            <div className="absolute -left-[18px] top-2 w-2.5 h-2.5 rounded-full" style={{ background: 'hsl(var(--motion))', border: '2px solid hsl(var(--canvas))' }} />
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-mono text-foreground-quiet">
                  {item.published_date ? new Date(item.published_date).toLocaleDateString() :
                   item.captured_date ? new Date(item.captured_date).toLocaleDateString() : ''}
                </p>
                <p className="text-sm font-semibold text-foreground truncate">{item.title || 'Untitled'}</p>
                <p className="text-[10px] uppercase tracking-widest text-motion mt-0.5">{item.media_type || item.asset_type}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}