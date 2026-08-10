import React from 'react';
import { Calendar, User, Eye, Clock } from 'lucide-react';

export default function MediaHero({ media, publisher }) {
  if (!media) return null;

  const heroImage = media.hero_image || media.cover_image || media.thumbnail_url;
  const isVideo = media.media_type === 'video' || media.asset_type === 'video';
  const isArticle = media.media_type === 'article' || media.media_type === 'story';

  return (
    <div className="relative overflow-hidden rounded-xl border border-divider" style={{ background: 'hsl(var(--surface))' }}>
      {heroImage ? (
        <div className="relative h-[280px] sm:h-[380px]">
          {isVideo ? (
            <video src={media.file_url} poster={heroImage} controls className="w-full h-full object-cover" />
          ) : (
            <img src={heroImage} alt={media.title} className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, hsl(var(--canvas) / 0.95) 0%, transparent 60%)' }} />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded" style={{ background: 'hsl(var(--motion) / 0.2)', color: 'hsl(var(--motion))' }}>
                {media.media_type}
              </span>
              {media.featured && (
                <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded" style={{ background: 'hsl(var(--warning) / 0.2)', color: 'hsl(var(--warning))' }}>
                  Featured
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground leading-tight">{media.title}</h1>
            {media.subtitle && <p className="text-sm text-foreground-secondary mt-1 line-clamp-2">{media.subtitle}</p>}
            <div className="flex items-center gap-4 mt-3 text-xs text-foreground-quiet">
              {media.published_date && (
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(media.published_date).toLocaleDateString()}</span>
              )}
              {media.author?.name && (
                <span className="flex items-center gap-1"><User className="w-3 h-3" /> {media.author.name}</span>
              )}
              {publisher?.name && (
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {publisher.name}</span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded" style={{ background: 'hsl(var(--motion) / 0.2)', color: 'hsl(var(--motion))' }}>
              {media.media_type}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground leading-tight">{media.title}</h1>
          {media.subtitle && <p className="text-sm text-foreground-secondary mt-1">{media.subtitle}</p>}
        </div>
      )}
    </div>
  );
}