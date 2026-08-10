import React from 'react';
import { Link } from 'react-router-dom';
import { Star, ArrowRight } from 'lucide-react';

export default function FeaturedMedia({ items = [], title = 'Featured Media' }) {
  if (!items || items.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Star className="w-3.5 h-3.5 text-motion" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-foreground-secondary">{title}</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.slice(0, 4).map((item) => {
          const thumb = item.cover_image || item.thumbnail_url || item.file_url;
          const url = item.profile_url || (item.slug ? `/story/${item.slug}` : `/media/${item.id}`);
          return (
            <Link key={item.id} to={url} className="group flex gap-3 p-3 rounded-lg border border-divider hover:border-motion transition-colors">
              <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'hsl(var(--surface-interactive))' }}>
                {thumb ? (
                  <img src={thumb} alt={item.title || ''} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Star className="w-6 h-6 text-foreground-quiet" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground group-hover:text-motion transition-colors line-clamp-2">{item.title || 'Untitled'}</p>
                {item.subtitle && <p className="text-xs text-foreground-quiet mt-0.5 line-clamp-1">{item.subtitle}</p>}
                <div className="flex items-center gap-1 mt-1 text-[10px] text-foreground-quiet">
                  <span className="uppercase tracking-widest">{item.media_type || item.asset_type || 'article'}</span>
                  <ArrowRight className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}