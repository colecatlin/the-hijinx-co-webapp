import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Tag, User, Eye, Clock, FileText, Image as ImageIcon, Video, Music } from 'lucide-react';

export default function MediaSidebar({ media, publisher, author, relatedEntities = [] }) {
  if (!media) return null;

  return (
    <div className="space-y-4">
      {/* Publisher badge */}
      {publisher && (
        <div className="p-4 rounded-lg border border-divider" style={{ background: 'hsl(var(--surface-interactive) / 0.3)' }}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-foreground-quiet mb-2">Publisher</p>
          {publisher.profile_url ? (
            <Link to={publisher.profile_url} className="flex items-center gap-2 group">
              {publisher.logo_url && <img src={publisher.logo_url} alt={publisher.name} className="w-8 h-8 rounded-full object-cover" />}
              <div>
                <p className="text-sm font-semibold text-foreground group-hover:text-motion transition-colors">{publisher.name}</p>
                <p className="text-[10px] uppercase tracking-widest text-foreground-quiet">{publisher.type}</p>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              {publisher.logo_url && <img src={publisher.logo_url} alt={publisher.name} className="w-8 h-8 rounded-full object-cover" />}
              <div>
                <p className="text-sm font-semibold text-foreground">{publisher.name}</p>
                <p className="text-[10px] uppercase tracking-widest text-foreground-quiet">{publisher.type}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Metadata */}
      <div className="p-4 rounded-lg border border-divider space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-foreground-quiet mb-2">Details</p>
        {media.published_date && (
          <div className="flex items-center gap-2 text-xs text-foreground-secondary">
            <Calendar className="w-3.5 h-3.5 text-foreground-quiet" />
            {new Date(media.published_date).toLocaleDateString()}
          </div>
        )}
        {media.captured_date && media.captured_date !== media.published_date && (
          <div className="flex items-center gap-2 text-xs text-foreground-secondary">
            <Clock className="w-3.5 h-3.5 text-foreground-quiet" />
            Captured {new Date(media.captured_date).toLocaleDateString()}
          </div>
        )}
        {author?.name && (
          <div className="flex items-center gap-2 text-xs text-foreground-secondary">
            <User className="w-3.5 h-3.5 text-foreground-quiet" />
            {author.profile_url ? (
              <Link to={author.profile_url} className="hover:text-motion transition-colors">{author.name}</Link>
            ) : author.name}
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-foreground-secondary">
          <Eye className="w-3.5 h-3.5 text-foreground-quiet" />
          {media.media_type || media.asset_type}
        </div>
      </div>

      {/* Tags */}
      {media.tags?.length > 0 && (
        <div className="p-4 rounded-lg border border-divider">
          <p className="text-[10px] font-bold uppercase tracking-widest text-foreground-quiet mb-2">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {media.tags.slice(0, 12).map((tag, idx) => (
              <span key={idx} className="text-xs px-2 py-1 rounded border border-divider text-foreground-secondary" style={{ background: 'hsl(var(--surface-interactive) / 0.3)' }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Related entities */}
      {relatedEntities.length > 0 && (
        <div className="p-4 rounded-lg border border-divider">
          <p className="text-[10px] font-bold uppercase tracking-widest text-foreground-quiet mb-2">Related</p>
          <div className="space-y-1.5">
            {relatedEntities.map((ent, idx) => (
              <div key={idx}>
                {ent.profile_url ? (
                  <Link to={ent.profile_url} className="flex items-center gap-2 text-xs text-foreground-secondary hover:text-motion transition-colors group">
                    <span className="text-[9px] uppercase tracking-widest text-foreground-quiet w-12 flex-shrink-0">{ent.entity_type}</span>
                    <span className="group-hover:underline">{ent.entity_name}</span>
                  </Link>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                    <span className="text-[9px] uppercase tracking-widest text-foreground-quiet w-12 flex-shrink-0">{ent.entity_type}</span>
                    <span>{ent.entity_name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}