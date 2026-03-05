import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, ExternalLink, ImageIcon } from 'lucide-react';

const REVIEW_STATUS_COLORS = {
  uploaded: 'bg-gray-700 text-gray-300',
  in_review: 'bg-yellow-900/60 text-yellow-300',
  approved: 'bg-green-900/60 text-green-300',
  rejected: 'bg-red-900/60 text-red-300',
  flagged: 'bg-orange-900/60 text-orange-300',
};

const REVIEW_STATUS_LABELS = {
  uploaded: 'Uploaded — pending review',
  in_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  flagged: 'Flagged',
};

export default function MyAssetsTab({ mediaUser }) {
  const { data: assets = [], isLoading: loadingAssets } = useQuery({
    queryKey: ['myMediaAssets', mediaUser?.id],
    queryFn: () => base44.entities.MediaAsset.filter({ uploader_media_user_id: mediaUser.id }),
    enabled: !!mediaUser?.id,
    select: data => [...data].sort((a, b) => new Date(b.created_at || b.created_date) - new Date(a.created_at || a.created_date)),
  });

  const assetIds = assets.map(a => a.id);

  const { data: reviews = [] } = useQuery({
    queryKey: ['myAssetReviews', mediaUser?.id],
    queryFn: async () => {
      if (!assetIds.length) return [];
      const all = await base44.entities.AssetReview.list();
      return all.filter(r => assetIds.includes(r.asset_id));
    },
    enabled: assetIds.length > 0,
  });

  const getReview = (assetId) => reviews.find(r => r.asset_id === assetId) || null;

  if (!mediaUser) return (
    <div className="text-center py-16 text-gray-600">
      <p className="text-sm">Complete your profile to view assets.</p>
    </div>
  );

  if (loadingAssets) return <p className="text-gray-500 text-sm">Loading assets...</p>;

  if (assets.length === 0) return (
    <Card className="bg-[#171717] border-gray-800">
      <CardContent className="py-12 text-center">
        <ImageIcon className="w-8 h-8 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">No assets logged yet.</p>
        <p className="text-gray-600 text-xs mt-1">Assets logged by the event team will appear here with their review status.</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-white font-bold text-lg">My Assets</h2>
        <p className="text-gray-500 text-sm">{assets.length} asset(s)</p>
      </div>

      <div className="space-y-2">
        {assets.map(asset => {
          const review = getReview(asset.id);

          return (
            <div key={asset.id} className="bg-[#171717] border border-gray-800 rounded p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white text-sm font-medium truncate">{asset.title || asset.file_name}</p>
                    {asset.asset_type && <span className="text-gray-600 text-xs">{asset.asset_type}</span>}
                  </div>
                  {asset.description && (
                    <p className="text-gray-500 text-xs mt-1 truncate">{asset.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                    {(asset.created_at || asset.created_date) && (
                      <span><Clock className="w-2.5 h-2.5 inline mr-0.5" />{new Date(asset.created_at || asset.created_date).toLocaleDateString()}</span>
                    )}
                    {asset.drive_file_id && (
                      <a href={asset.drive_file_id} target="_blank" rel="noopener noreferrer"
                        className="text-blue-500 hover:underline flex items-center gap-0.5">
                        <ExternalLink className="w-2.5 h-2.5" /> View
                      </a>
                    )}
                  </div>
                </div>

                {/* Review status */}
                {review ? (
                  <div className="shrink-0 text-right">
                    <Badge className={REVIEW_STATUS_COLORS[review.status] || 'bg-gray-700 text-gray-300'}>
                      {REVIEW_STATUS_LABELS[review.status] || review.status}
                    </Badge>
                    {(review.status === 'rejected' || review.status === 'flagged') && review.notes && (
                      <p className="text-orange-400 text-xs mt-1 max-w-xs text-left">{review.notes}</p>
                    )}
                  </div>
                ) : (
                  <Badge className="bg-gray-800 text-gray-500 shrink-0">no review</Badge>
                )}
              </div>

              {/* Rejected/flagged inline warning */}
              {(review?.status === 'rejected' || review?.status === 'flagged') && review?.notes && (
                <div className="mt-2 bg-orange-900/10 border border-orange-900/40 rounded p-2">
                  <p className="text-orange-300 text-xs"><strong>Reviewer note:</strong> {review.notes}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}