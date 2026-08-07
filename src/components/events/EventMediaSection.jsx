import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Image, Video, Award, History } from 'lucide-react';

export default function EventMediaSection({ media, sponsors, history }) {
  return (
    <div className="space-y-6">
      {/* Media Gallery */}
      {media && (media.gallery_urls?.length > 0 || media.promo_video_url) && (
        <section className="bg-surface border border-divider rounded-lg p-6">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><Image className="w-4 h-4 text-motion" />Gallery</h2>
          {media.promo_video_url && (
            <div className="mb-4">
              <video src={media.promo_video_url} controls className="w-full rounded-lg max-h-64 object-cover" />
            </div>
          )}
          {media.gallery_urls?.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {media.gallery_urls.slice(0, 8).map((url, i) => (
                <img key={i} src={url} alt={`Gallery ${i + 1}`} className="w-full h-32 object-cover rounded-lg" />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Outlet Stories */}
      {media?.outlet_stories && media.outlet_stories.length > 0 && (
        <section className="bg-surface border border-divider rounded-lg p-6">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-motion" />Stories & Coverage</h2>
          <div className="space-y-3">
            {media.outlet_stories.map(story => (
              <Link key={story.id} to={story.slug ? `/story/${story.slug}` : '#'} className="flex items-start gap-3 p-3 border border-divider rounded-lg hover:border-motion/30 transition-colors group">
                {story.cover_image_url && <img src={story.cover_image_url} alt={story.title} className="w-16 h-12 object-cover rounded flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground group-hover:text-motion transition-colors line-clamp-2">{story.title}</p>
                  {story.subtitle && <p className="text-xs text-foreground-quiet mt-1 line-clamp-1">{story.subtitle}</p>}
                  {story.published_date && <p className="text-[10px] text-foreground-quiet mt-1 font-mono">{new Date(story.published_date).toLocaleDateString()}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Sponsors */}
      {sponsors && sponsors.current_sponsors && sponsors.current_sponsors.length > 0 && (
        <section className="bg-surface border border-divider rounded-lg p-6">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><Award className="w-4 h-4 text-motion" />Sponsors</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {sponsors.current_sponsors.map(s => (
              <div key={s.sponsor_id} className="flex flex-col items-center text-center p-3 border border-divider rounded-lg">
                {s.logo_url ? (
                  <img src={s.logo_url} alt={s.sponsor_name} className="h-12 object-contain mb-2" />
                ) : (
                  <div className="h-12 flex items-center justify-center text-xs font-bold text-foreground-quiet mb-2">{s.sponsor_name}</div>
                )}
                <div className="text-xs font-medium text-foreground truncate">{s.sponsor_name}</div>
                {s.tier && <div className="text-[10px] text-foreground-quiet uppercase mt-0.5">{s.tier}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* History */}
      {history && history.available && history.past_editions && history.past_editions.length > 0 && (
        <section className="bg-surface border border-divider rounded-lg p-6">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><History className="w-4 h-4 text-motion" />Past Editions</h2>
          <div className="space-y-2">
            {history.past_editions.map(pe => (
              <Link key={pe.event_id} to={pe.profile_url || '#'} className="flex items-center justify-between p-3 border border-divider rounded-lg hover:border-motion/30 transition-colors group">
                <div>
                  <div className="text-sm font-medium text-foreground group-hover:text-motion transition-colors">{pe.name}</div>
                  <div className="text-xs text-foreground-quiet">{[pe.season, pe.track_name, pe.series_name].filter(Boolean).join(' · ')}</div>
                </div>
                <div className="text-xs font-mono text-foreground-quiet">{pe.event_date}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}