import React from 'react';
import { Link } from 'react-router-dom';
import { Image } from 'lucide-react';

export default function SeriesMedia({ media }) {
  if (!media || (!media.outlet_stories || media.outlet_stories.length === 0)) {
    return (
      <div className="bg-surface-elevated border border-divider rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Image className="w-4 h-4 text-motion" />
          <h2 className="text-xl font-bold text-foreground">Media</h2>
        </div>
        <p className="text-foreground-quiet text-sm">No media coverage available yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-elevated border border-divider rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Image className="w-4 h-4 text-motion" />
        <h2 className="text-xl font-bold text-foreground">Media</h2>
        <span className="text-sm text-foreground-quiet">({media.story_count})</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {media.outlet_stories.map(story => (
          <Link key={story.id} to={story.slug ? `/story/${story.slug}` : `/OutletStoryPage?id=${story.id}`} className="border border-divider rounded-lg overflow-hidden hover:border-motion/40 transition-colors group">
            {story.cover_image_url && (
              <div className="aspect-video bg-surface-interactive overflow-hidden">
                <img src={story.cover_image_url} alt={story.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              </div>
            )}
            <div className="p-3">
              <div className="font-semibold text-foreground text-sm line-clamp-2">{story.title}</div>
              {story.subtitle && <div className="text-xs text-foreground-quiet mt-1 line-clamp-2">{story.subtitle}</div>}
              <div className="flex items-center gap-2 mt-2 text-xs text-foreground-quiet">
                {story.primary_category && <span>{story.primary_category}</span>}
                {story.published_date && <span>{story.published_date.split('T')[0]}</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}