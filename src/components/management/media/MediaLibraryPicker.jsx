import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, Check } from 'lucide-react';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import { formatFileSize } from '@/lib/mediaLibraryUtils';

/**
 * MediaLibraryPicker — shared media picker dialog for MediaSelector.
 *
 * Compact selection version of the Media Library: search, filter, grid,
 * select. Does NOT duplicate the full management page (no upload, no
 * metadata editing, no archive).
 *
 * On select, calls onSelect(asset) with the full LibraryAsset record.
 * The caller (MediaSelector) extracts url + alt_text from it.
 */
export default function MediaLibraryPicker({ open, onOpenChange, onSelect }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);

  const { data: assets, isLoading } = useMediaLibrary({
    search,
    asset_type: filter,
    sort: 'newest',
    is_archived: false,
    limit: 60,
  });

  const handleSelect = () => {
    const selected = (assets || []).find((a) => a.id === selectedId);
    if (selected) {
      onSelect?.(selected);
      onOpenChange?.(false);
      setSelectedId(null);
      setSearch('');
    }
  };

  const handleClose = (open) => {
    onOpenChange?.(open);
    if (!open) {
      setSelectedId(null);
      setSearch('');
    }
  };

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'image', label: 'Images' },
    { key: 'video', label: 'Video' },
    { key: 'document', label: 'Documents' },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-3xl max-h-[80vh] flex flex-col"
        style={{ background: 'hsl(var(--surface))', border: '1px solid hsl(var(--divider))' }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: 'hsl(var(--foreground))' }}>Browse Media Library</DialogTitle>
        </DialogHeader>

        {/* Search + Filters */}
        <div className="space-y-2">
          <div className="relative">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
              style={{ color: 'hsl(var(--foreground-quiet))' }}
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, filename, alt text, tags..."
              className="h-8 pl-8 text-xs"
            />
          </div>
          <div className="flex gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-colors"
                style={{
                  background: filter === f.key ? 'hsl(var(--motion) / 0.15)' : 'transparent',
                  color: filter === f.key ? 'hsl(var(--motion))' : 'hsl(var(--foreground-quiet))',
                  border: `1px solid ${filter === f.key ? 'hsl(var(--motion) / 0.3)' : 'hsl(var(--divider))'}`,
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'hsl(var(--motion))' }} />
            </div>
          ) : (assets || []).length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-xs" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                {search ? `No results for "${search}"` : 'No media assets yet'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {(assets || []).map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => setSelectedId(asset.id)}
                  className="group relative rounded-lg border overflow-hidden transition-colors"
                  style={{
                    borderColor: selectedId === asset.id ? 'hsl(var(--motion))' : 'hsl(var(--divider))',
                    background: 'hsl(var(--surface-interactive))',
                  }}
                >
                  <div className="aspect-square">
                    {asset.asset_type === 'image' && asset.url ? (
                      <img
                        src={asset.url}
                        alt={asset.alt_text || ''}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-[10px] font-bold uppercase"
                        style={{ color: 'hsl(var(--foreground-quiet))' }}
                      >
                        {asset.asset_type}
                      </div>
                    )}
                  </div>
                  {selectedId === asset.id && (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ background: 'hsl(var(--motion) / 0.2)' }}
                    >
                      <Check className="w-6 h-6" style={{ color: 'hsl(var(--motion))' }} />
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 px-1.5 py-1 truncate">
                    <p className="text-[10px] font-semibold truncate" style={{ color: 'hsl(var(--foreground))' }}>
                      {asset.title || asset.filename || 'Untitled'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'hsl(var(--divider))' }}>
          <Button variant="ghost" size="sm" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSelect} disabled={!selectedId}>
            Select
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}