import React from 'react';
import { Calendar, Tag, FileText, Image as ImageIcon, Video, Music, File, Palette } from 'lucide-react';

export default function MediaMetadata({ media }) {
  if (!media) return null;

  const typeIcon = {
    article: FileText, story: FileText,
    photo: ImageIcon, video: Video, audio: Music,
    document: File, graphic: Palette,
  };
  const Icon = typeIcon[media.media_type || media.asset_type] || FileText;

  return (
    <div className="p-4 rounded-lg border border-divider" style={{ background: 'hsl(var(--surface-interactive) / 0.3)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-motion" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-foreground-secondary">Media Metadata</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        {media.mime_type && (
          <div>
            <p className="text-[9px] uppercase tracking-widest text-foreground-quiet">MIME Type</p>
            <p className="text-foreground-secondary font-mono">{media.mime_type}</p>
          </div>
        )}
        {media.file_size && (
          <div>
            <p className="text-[9px] uppercase tracking-widest text-foreground-quiet">File Size</p>
            <p className="text-foreground-secondary">{(media.file_size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        )}
        {media.asset_type && (
          <div>
            <p className="text-[9px] uppercase tracking-widest text-foreground-quiet">Asset Type</p>
            <p className="text-foreground-secondary capitalize">{media.asset_type}</p>
          </div>
        )}
        {media.status && (
          <div>
            <p className="text-[9px] uppercase tracking-widest text-foreground-quiet">Status</p>
            <p className="text-foreground-secondary capitalize">{media.status}</p>
          </div>
        )}
        {media.published_date && (
          <div>
            <p className="text-[9px] uppercase tracking-widest text-foreground-quiet">Published</p>
            <p className="text-foreground-secondary">{new Date(media.published_date).toLocaleDateString()}</p>
          </div>
        )}
        {media.captured_date && (
          <div>
            <p className="text-[9px] uppercase tracking-widest text-foreground-quiet">Captured</p>
            <p className="text-foreground-secondary">{new Date(media.captured_date).toLocaleDateString()}</p>
          </div>
        )}
      </div>
      {media.categories?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-divider">
          <p className="text-[9px] uppercase tracking-widest text-foreground-quiet mb-1">Categories</p>
          <div className="flex flex-wrap gap-1.5">
            {media.categories.map((cat, idx) => (
              <span key={idx} className="text-xs px-2 py-0.5 rounded" style={{ background: 'hsl(var(--motion) / 0.1)', color: 'hsl(var(--motion))' }}>
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}