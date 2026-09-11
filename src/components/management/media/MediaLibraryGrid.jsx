import React from 'react';
import { FileText, Video, File as FileIcon, Loader2 } from 'lucide-react';
import { formatFileSize } from '@/lib/mediaLibraryUtils';

/**
 * MediaLibraryGrid — responsive grid of media asset cards.
 * Each card shows thumbnail/preview, title, type badge, dimensions.
 * Clicking a card opens the detail drawer (onSelect).
 */
export default function MediaLibraryGrid({ assets = [], loading, onSelect, emptyState }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-lg border border-divider bg-surface animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (assets.length === 0) {
    return emptyState || null;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {assets.map((asset) => (
        <button
          key={asset.id}
          onClick={() => onSelect?.(asset)}
          className="group text-left rounded-lg border border-divider bg-surface overflow-hidden hover:border-motion transition-colors"
        >
          {/* Preview */}
          <div className="aspect-square bg-surface-interactive relative overflow-hidden">
            {asset.asset_type === 'image' && asset.url ? (
              <img
                src={asset.url}
                alt={asset.alt_text || asset.title || ''}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-foreground-quiet">
                {asset.asset_type === 'video' ? (
                  <Video className="w-8 h-8" />
                ) : asset.asset_type === 'document' ? (
                  <FileText className="w-8 h-8" />
                ) : (
                  <FileIcon className="w-8 h-8" />
                )}
              </div>
            )}
            {/* Type badge */}
            <span
              className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded"
              style={{
                background: 'hsl(var(--surface-elevated) / 0.85)',
                color: 'hsl(var(--foreground-secondary))',
                backdropFilter: 'blur(4px)',
              }}
            >
              {asset.asset_type}
            </span>
          </div>

          {/* Metadata */}
          <div className="p-2 space-y-0.5">
            <p className="text-xs font-semibold truncate" style={{ color: 'hsl(var(--foreground))' }}>
              {asset.title || asset.filename || 'Untitled'}
            </p>
            <p className="text-[10px]" style={{ color: 'hsl(var(--foreground-quiet))' }}>
              {asset.width && asset.height
                ? `${asset.width}×${asset.height}`
                : formatFileSize(asset.file_size)}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}