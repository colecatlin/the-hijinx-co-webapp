import React from 'react';
import { Package } from 'lucide-react';

export default function SponsorAssets({ assets = [] }) {
  if (assets.length === 0) {
    return (
      <div className="text-center py-12 rounded-xl" style={{ background: 'hsl(var(--surface) / 0.5)', border: '1px dashed hsl(var(--divider))' }}>
        <Package className="w-8 h-8 mx-auto mb-3" style={{ color: 'hsl(var(--foreground-quiet))' }} />
        <p className="text-sm" style={{ color: 'hsl(var(--foreground-quiet))' }}>No public assets yet.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-[10px] font-mono uppercase tracking-[0.3em] mb-3" style={{ color: 'hsl(var(--motion))' }}>
        Public Assets ({assets.length})
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {assets.map(a => (
          <div key={a.id} className="p-4 rounded-xl" style={{ background: 'hsl(var(--surface-elevated) / 0.8)', border: '1px solid hsl(var(--divider))' }}>
            {a.image_url && (
              <img src={a.image_url} alt={a.name} className="w-full h-24 rounded-lg object-cover mb-3" />
            )}
            <div className="text-sm font-bold truncate" style={{ color: 'hsl(var(--foreground))' }}>{a.name}</div>
            <div className="text-[10px] font-mono uppercase mt-1" style={{ color: 'hsl(var(--motion))' }}>{a.asset_type}</div>
            {a.description && (
              <p className="text-xs mt-2 line-clamp-2" style={{ color: 'hsl(var(--foreground-secondary))' }}>{a.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}