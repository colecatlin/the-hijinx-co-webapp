import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Image as ImageIcon, Video, Music, ArrowRight } from 'lucide-react';

export default function RelatedMediaGrid({ items = [], title = 'Related Media' }) {
  if (!items || items.length === 0) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'video': return Video;
      case 'audio': return Music;
      case 'article': case 'story': return FileText;
      default: return ImageIcon;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-foreground-secondary">{title}</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {items.slice(0, 8).map((item) => {
          const Icon = getIcon(item.media_type || item.asset_type);
          const thumb = item.thumbnail_url || item.cover_image || item.file_url;
          const url = item.profile_url || `/media/${item.id}`;
          return (
            <Link key={item.id} to={url} className="group">
              <div className="aspect-video rounded-lg overflow-hidden border border-divider group-hover:border-motion transition-colors relative" style={{ background: 'hsl(var(--surface-interactive))' }}>
                {thumb ? (
                  <img src={thumb} alt={item.title || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Icon className="w-6 h-6 text-foreground-quiet" />
                  </div>
                )}
              </div>
              <p className="text-xs font-semibold text-foreground mt-1.5 line-clamp-2 group-hover:text-motion transition-colors">{item.title || 'Untitled'}</p>
              {item.published_date && (
                <p className="text-[10px] text-foreground-quiet mt-0.5">{new Date(item.published_date).toLocaleDateString()}</p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}