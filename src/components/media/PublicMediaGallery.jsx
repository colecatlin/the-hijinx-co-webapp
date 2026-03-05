import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Video } from 'lucide-react';
import { format } from 'date-fns';

/**
 * PublicMediaGallery
 * Shows published MediaAssets for a given target entity/type.
 * Read-only, public-facing.
 */
export default function PublicMediaGallery({
  targetType,
  targetEntityId,
  title = 'Media',
}) {
  const [selected, setSelected] = useState(null);

  const targetTypes = Array.isArray(targetType) ? targetType : [targetType];

  // Step 1: Load PublishTargets for this entity, published only
  const { data: publishTargets = [] } = useQuery({
    queryKey: ['publicPublishTargets', targetEntityId, targetTypes],
    queryFn: async () => {
      if (!targetEntityId) return [];
      const all = await base44.entities.PublishTarget.filter({
        target_entity_id: targetEntityId,
        status: 'published',
      });
      return all
        .filter((pt) => targetTypes.includes(pt.target_type))
        .sort((a, b) => new Date(b.published_at || b.created_at) - new Date(a.published_at || a.created_at))
        .slice(0, 24);
    },
    enabled: !!targetEntityId,
  });

  // Step 2: Fetch the unique asset ids
  const assetIds = useMemo(() => {
    return [...new Set(publishTargets.map((pt) => pt.asset_id).filter(Boolean))];
  }, [publishTargets]);

  // Step 3: Load MediaAssets for those ids
  const { data: assets = [] } = useQuery({
    queryKey: ['publicMediaAssets', assetIds],
    queryFn: async () => {
      if (assetIds.length === 0) return [];
      const all = await base44.entities.MediaAsset.list();
      return all.filter((a) => assetIds.includes(a.id));
    },
    enabled: assetIds.length > 0,
  });

  // Merge publish targets with their asset data, preserving sort order
  const items = useMemo(() => {
    return publishTargets
      .map((pt) => {
        const asset = assets.find((a) => a.id === pt.asset_id);
        if (!asset) return null;
        return { publishTarget: pt, asset };
      })
      .filter(Boolean);
  }, [publishTargets, assets]);

  // Don't render if nothing to show
  if (!targetEntityId || items.length === 0) return null;

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#232323] mb-6">{title}</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {items.map(({ asset, publishTarget }) => (
          <button
            key={publishTarget.id}
            onClick={() => setSelected({ asset, publishTarget })}
            className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100 border border-gray-200 hover:border-gray-400 transition-colors focus:outline-none"
          >
            {asset.asset_type === 'video' ? (
              <>
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                  <Video className="w-8 h-8 text-white/60" />
                </div>
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
              </>
            ) : (
              <img
                src={asset.drive_file_id || asset.file_name}
                alt={asset.title || asset.file_name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentNode.classList.add('flex', 'items-center', 'justify-center');
                }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Preview Dialog */}
      {selected && (
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-[#232323]">
                {selected.asset.title || selected.asset.file_name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selected.asset.asset_type === 'video' ? (
                <video
                  src={selected.asset.drive_file_id || selected.asset.file_name}
                  controls
                  className="w-full rounded-lg bg-black max-h-[60vh]"
                />
              ) : (
                <img
                  src={selected.asset.drive_file_id || selected.asset.file_name}
                  alt={selected.asset.title || selected.asset.file_name}
                  className="w-full rounded-lg object-contain max-h-[60vh]"
                />
              )}
              <div className="space-y-1 text-sm text-gray-600">
                {selected.asset.description && (
                  <p>{selected.asset.description}</p>
                )}
                {selected.asset.captured_date && (
                  <p className="text-xs text-gray-400">
                    Captured: {format(new Date(selected.asset.captured_date), 'MMM d, yyyy')}
                  </p>
                )}
                {selected.asset.file_name && (
                  <p className="text-xs text-gray-400 truncate">{selected.asset.file_name}</p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}