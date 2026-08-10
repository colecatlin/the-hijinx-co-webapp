import React from 'react';
import { Link } from 'react-router-dom';
import { Image, FileText, Megaphone } from 'lucide-react';

export default function SponsorMediaSummary({ mediaSummary }) {
  if (!mediaSummary) return null;
  const { outlet_stories = [], advertisements = [], media_assignments = [] } = mediaSummary;

  if (outlet_stories.length === 0 && advertisements.length === 0 && media_assignments.length === 0) {
    return (
      <div className="text-center py-12 rounded-xl" style={{ background: 'hsl(var(--surface) / 0.5)', border: '1px dashed hsl(var(--divider))' }}>
        <Image className="w-8 h-8 mx-auto mb-3" style={{ color: 'hsl(var(--foreground-quiet))' }} />
        <p className="text-sm" style={{ color: 'hsl(var(--foreground-quiet))' }}>No media coverage yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {outlet_stories.length > 0 && (
        <div>
          <h3 className="text-[10px] font-mono uppercase tracking-[0.3em] mb-3" style={{ color: 'hsl(var(--motion))' }}>
            Published Stories ({outlet_stories.length})
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {outlet_stories.map(s => (
              <Link key={s.id} to={s.slug ? `/story/${s.slug}` : `/OutletStoryPage?id=${s.id}`}
                className="block p-4 rounded-xl transition-all hover:opacity-80"
                style={{ background: 'hsl(var(--surface-elevated) / 0.8)', border: '1px solid hsl(var(--divider))' }}>
              {s.cover_image_url && (
                <img src={s.cover_image_url} alt={s.title} className="w-full h-24 rounded-lg object-cover mb-3" />
              )}
              <div className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>{s.title}</div>
              {s.subtitle && <div className="text-xs mt-1" style={{ color: 'hsl(var(--foreground-secondary))' }}>{s.subtitle}</div>}
              <div className="text-[10px] font-mono mt-2" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                {s.published_date?.split('T')[0]} {s.author ? `· ${s.author}` : ''}
              </div>
            </Link>
            ))}
          </div>
        </div>
      )}

      {advertisements.length > 0 && (
        <div>
          <h3 className="text-[10px] font-mono uppercase tracking-[0.3em] mb-3" style={{ color: 'hsl(var(--motion))' }}>
            Advertisements ({advertisements.length})
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {advertisements.map(ad => (
              <div key={ad.id} className="p-4 rounded-xl" style={{ background: 'hsl(var(--surface-elevated) / 0.8)', border: '1px solid hsl(var(--divider))' }}>
                <div className="flex items-start gap-3">
                  {ad.cover_image_url && (
                    <img src={ad.cover_image_url} alt={ad.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>{ad.title}</div>
                    {ad.tagline && <div className="text-xs mt-0.5" style={{ color: 'hsl(var(--foreground-secondary))' }}>{ad.tagline}</div>}
                    {ad.call_to_action_url && (
                      <a href={ad.call_to_action_url} target="_blank" rel="noreferrer" className="text-[10px] mt-2 inline-block" style={{ color: 'hsl(var(--motion))' }}>
                        {ad.call_to_action_text || 'Learn More'} →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {media_assignments.length > 0 && (
        <div>
          <h3 className="text-[10px] font-mono uppercase tracking-[0.3em] mb-3" style={{ color: 'hsl(var(--foreground-quiet))' }}>
            Editorial Assignments ({media_assignments.length})
          </h3>
          <div className="space-y-2">
            {media_assignments.map(a => (
              <div key={a.id} className="p-3 rounded-xl flex items-center gap-3" style={{ background: 'hsl(var(--surface-elevated) / 0.6)', border: '1px solid hsl(var(--divider))' }}>
                <FileText className="w-4 h-4 flex-shrink-0" style={{ color: 'hsl(var(--foreground-quiet))' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate" style={{ color: 'hsl(var(--foreground))' }}>{a.assignment_title}</div>
                  <div className="text-[10px]" style={{ color: 'hsl(var(--foreground-quiet))' }}>{a.assignment_type} · {a.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}