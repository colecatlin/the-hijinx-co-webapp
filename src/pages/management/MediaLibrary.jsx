import React, { useState } from 'react';
import ManagementLayout from '@/components/management/ManagementLayout';
import AdminGuard from '@/components/management/AdminGuard';
import ManagementShell from '@/components/management/ManagementShell';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useMediaLibrary, useInvalidateMediaLibrary } from '@/hooks/useMediaLibrary';
import MediaLibraryGrid from '@/components/management/media/MediaLibraryGrid';
import MediaLibraryUploader from '@/components/management/media/MediaLibraryUploader';
import MediaLibraryDetail from '@/components/management/media/MediaLibraryDetail';

const PAGE_SIZE = 48;

export default function MediaLibrary() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [showArchived, setShowArchived] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: assets, isLoading, error, refetch } = useMediaLibrary({
    search,
    asset_type: filter,
    sort,
    is_archived: showArchived,
    limit: 200,
  });
  const invalidate = useInvalidateMediaLibrary();

  const allAssets = assets || [];
  const visibleAssets = allAssets.slice(0, visibleCount);
  const hasMore = allAssets.length > visibleCount;

  const handleSelect = (asset) => {
    setSelectedAsset(asset);
    setDetailOpen(true);
  };

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'image', label: 'Images' },
    { key: 'video', label: 'Video' },
    { key: 'document', label: 'Documents' },
  ];

  const SORTS = [
    { key: 'newest', label: 'Newest' },
    { key: 'oldest', label: 'Oldest' },
    { key: 'name', label: 'Name A–Z' },
  ];

  return (
    <ManagementLayout currentPage="management/media/library">
      <AdminGuard>
        <ManagementShell
          title="Media Library"
          subtitle="Searchable reusable media for content editors"
          actions={<MediaLibraryUploader />}
        >
          {/* Search + Controls */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                  style={{ color: 'hsl(var(--foreground-quiet))' }}
                />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  placeholder="Search title, filename, alt text, tags..."
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowArchived(!showArchived);
                  setVisibleCount(PAGE_SIZE);
                }}
                className="h-8 text-xs"
              >
                {showArchived ? 'Showing Archived' : 'Active Only'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-8 w-8 p-0">
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Filter + Sort */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => {
                      setFilter(f.key);
                      setVisibleCount(PAGE_SIZE);
                    }}
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
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="h-7 text-xs rounded border px-2"
                style={{
                  background: 'hsl(var(--surface-elevated))',
                  borderColor: 'hsl(var(--divider))',
                  color: 'hsl(var(--foreground-secondary))',
                }}
              >
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Content */}
          <div className="mt-4">
            {error ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <AlertCircle className="w-8 h-8" style={{ color: 'hsl(var(--danger))' }} />
                <p className="text-xs" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                  Failed to load media library
                </p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Retry
                </Button>
              </div>
            ) : (
              <MediaLibraryGrid
                assets={visibleAssets}
                loading={isLoading}
                onSelect={handleSelect}
                emptyState={
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <p
                      className="text-xs font-bold uppercase tracking-widest"
                      style={{ color: 'hsl(var(--foreground-quiet))' }}
                    >
                      {showArchived ? 'No archived assets' : 'No media yet'}
                    </p>
                    <p className="text-xs text-center max-w-xs" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                      {showArchived
                        ? 'Archived assets will appear here.'
                        : 'Upload reusable images and files here to use across HIJINX content.'}
                    </p>
                  </div>
                }
              />
            )}

            {/* Load More */}
            {hasMore && !isLoading && (
              <div className="flex justify-center mt-4">
                <Button variant="outline" size="sm" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                  Load More ({allAssets.length - visibleCount} more)
                </Button>
              </div>
            )}

            {/* Count */}
            {!isLoading && !error && allAssets.length > 0 && (
              <p className="text-[10px] mt-3 text-center" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                Showing {visibleAssets.length} of {allAssets.length} assets
              </p>
            )}
          </div>
        </ManagementShell>

        <MediaLibraryDetail asset={selectedAsset} open={detailOpen} onOpenChange={setDetailOpen} />
      </AdminGuard>
    </ManagementLayout>
  );
}