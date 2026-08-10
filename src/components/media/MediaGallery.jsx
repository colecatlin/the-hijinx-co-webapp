import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Video, Image as ImageIcon, FileText, Music, X } from 'lucide-react';

export default function MediaGallery({ items = [], title = 'Gallery' }) {
  const [selected, setSelected] = useState(null);

  if (!items || items.length === 0) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'video': return Video;
      case 'audio': return Music;
      case 'document': return FileText;
      default: return ImageIcon;
    }
  };

  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-widest text-foreground-secondary mb-3">{title}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {items.map((item) => {
          const Icon = getIcon(item.asset_type || item.media_type);
          const thumb = item.thumbnail_url || item.cover_image || item.file_url;
          return (
            <button
              key={item.id}
              onClick={() => setSelected(item)}
              className="group relative aspect-square overflow-hidden rounded-lg border border-divider hover:border-motion transition-colors"
              style={{ background: 'hsl(var(--surface-interactive))' }}
            >
              {thumb ? (
                <img src={thumb} alt={item.title || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Icon className="w-8 h-8 text-foreground-quiet" />
                </div>
              )}
              {(item.asset_type === 'video' || item.media_type === 'video') && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'hsl(var(--canvas) / 0.7)' }}>
                    <Video className="w-5 h-5 text-foreground" />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selected && (
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-4xl">
            <div className="relative">
              <button onClick={() => setSelected(null)} className="absolute top-2 right-2 z-10 p-2 rounded-full" style={{ background: 'hsl(var(--canvas) / 0.8)' }}>
                <X className="w-4 h-4 text-foreground" />
              </button>
              {selected.asset_type === 'video' || selected.media_type === 'video' ? (
                <video src={selected.file_url} controls className="w-full rounded-lg max-h-[70vh]" />
              ) : selected.file_url ? (
                <img src={selected.file_url} alt={selected.title || ''} className="w-full rounded-lg max-h-[70vh] object-contain" />
              ) : (
                <div className="p-12 text-center text-foreground-quiet">No preview available</div>
              )}
              {selected.title && <p className="text-sm font-semibold text-foreground mt-3">{selected.title}</p>}
              {selected.description && <p className="text-xs text-foreground-quiet mt-1">{selected.description}</p>}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}