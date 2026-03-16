import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Clock, ExternalLink, ImageIcon, Shield, Eye, EyeOff,
  CheckCircle2, XCircle, AlertTriangle, Info, Upload
} from 'lucide-react';
import {
  ASSET_STATUS_COLORS, ASSET_STATUS_LABELS,
  RIGHTS_STATUS_COLORS, RIGHTS_STATUS_LABELS,
  logAssetRightsEvent,
} from '@/components/media/public/mediaPublicHelpers';
import AssetUploadForm from './AssetUploadForm';

const VISIBILITY_LABELS = {
  private: 'Private',
  contributor_only: 'Contributors',
  outlet_only: 'Outlet Only',
  public: 'Public',
};

function RightsRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-1.5">
      {value ? (
        <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
      ) : (
        <XCircle className="w-3 h-3 text-gray-600 shrink-0" />
      )}
      <span className={`text-xs ${value ? 'text-gray-300' : 'text-gray-600'}`}>{label}</span>
    </div>
  );
}

function AssetCard({ asset, review, currentUser, isAdmin, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  const updateAsset = useMutation({
    mutationFn: async (updates) => {
      await base44.entities.MediaAsset.update(asset.id, updates);
      await logAssetRightsEvent(base44, {
        operation_type: 'media_asset_rights_updated',
        assetId: asset.id,
        ownerUserId: asset.owner_user_id,
        ownerProfileId: asset.owner_profile_id,
        ownerOutletId: asset.owner_outlet_id,
        actedByUserId: currentUser?.id,
        previousStatus: asset.rights_status,
        newStatus: updates.rights_status || asset.rights_status,
        message: `Asset updated: ${Object.keys(updates).join(', ')}`,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myMediaAssets'] }),
  });

  const handleFeatureToggle = async (field, label) => {
    const next = !asset[field];
    await updateAsset.mutateAsync({ [field]: next });
    await logAssetRightsEvent(base44, {
      operation_type: `media_asset_${field}`,
      assetId: asset.id,
      ownerUserId: asset.owner_user_id,
      ownerProfileId: asset.owner_profile_id,
      ownerOutletId: asset.owner_outlet_id,
      actedByUserId: currentUser?.id,
      previousStatus: String(asset[field]),
      newStatus: String(next),
      message: `${label} set to ${next}`,
    });
  };

  const statusColor = ASSET_STATUS_COLORS[asset.status] || 'bg-gray-700 text-gray-300';
  const statusLabel = ASSET_STATUS_LABELS[asset.status] || asset.status;
  const rightsColor = RIGHTS_STATUS_COLORS[asset.rights_status] || 'bg-gray-700 text-gray-400';
  const rightsLabel = RIGHTS_STATUS_LABELS[asset.rights_status] || 'No rights data';

  return (
    <div className="bg-[#171717] border border-gray-800 rounded-lg overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Thumbnail */}
          <div className="w-14 h-14 rounded-lg bg-[#0f0f0f] border border-gray-800 overflow-hidden shrink-0 flex items-center justify-center">
            {asset.thumbnail_url || asset.file_url ? (
              <img src={asset.thumbnail_url || asset.file_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-5 h-5 text-gray-700" />
            )}
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{asset.title || asset.file_name || 'Untitled Asset'}</p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="text-gray-600 text-xs capitalize">{asset.asset_type}</span>
                  {asset.creator_owned !== false && (
                    <span className="text-[10px] text-emerald-600 font-medium">Creator Owned</span>
                  )}
                  {(asset.created_at || asset.created_date) && (
                    <span className="text-gray-700 text-xs">
                      <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                      {new Date(asset.created_at || asset.created_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge className={`text-xs ${statusColor}`}>{statusLabel}</Badge>
                <Badge className={`text-xs ${rightsColor}`}>{rightsLabel}</Badge>
              </div>
            </div>

            {/* Visibility */}
            <div className="flex items-center gap-2 mt-2">
              {asset.public_access ? (
                <Eye className="w-3 h-3 text-gray-500" />
              ) : (
                <EyeOff className="w-3 h-3 text-gray-700" />
              )}
              <span className="text-xs text-gray-600">
                {VISIBILITY_LABELS[asset.visibility_scope] || 'Private'}
                {asset.public_access ? ' · Public Access' : ''}
              </span>
              {asset.featured_on_media_home && (
                <Badge className="bg-indigo-900/50 text-indigo-300 text-[10px] py-0">MediaHome</Badge>
              )}
              {asset.featured_on_creator_profile && (
                <Badge className="bg-blue-900/50 text-blue-300 text-[10px] py-0">Portfolio</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-3 text-xs text-gray-600 hover:text-gray-400 flex items-center gap-1 transition-colors"
        >
          <Info className="w-3 h-3" />
          {expanded ? 'Hide' : 'Show'} rights details
        </button>
      </div>

      {/* Expanded rights panel */}
      {expanded && (
        <div className="border-t border-gray-800 p-4 bg-[#111] space-y-4">
          {/* Usage rights summary */}
          <div>
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-2">Usage Rights</p>
            <div className="grid grid-cols-2 gap-1.5">
              <RightsRow label="Editorial Usage" value={asset.editorial_usage_allowed} />
              <RightsRow label="Platform Promo" value={asset.platform_promotional_usage_allowed} />
              <RightsRow label="Merchandise" value={asset.merchandise_usage_allowed} />
              <RightsRow label="Revenue Eligible" value={asset.revenue_eligible} />
            </div>
          </div>

          {/* Featured placement */}
          <div>
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-2">Featured Placement</p>
            <div className="grid grid-cols-1 gap-1.5">
              <RightsRow label="Featured on MediaHome" value={asset.featured_on_media_home} />
              <RightsRow label="Featured on Creator Profile" value={asset.featured_on_creator_profile} />
              <RightsRow label="Featured on Outlet Profile" value={asset.featured_on_outlet_profile} />
            </div>
          </div>

          {/* Linked agreements */}
          {asset.linked_rights_agreement_ids?.length > 0 && (
            <div>
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Rights Agreements</p>
              <p className="text-gray-600 text-xs">{asset.linked_rights_agreement_ids.length} agreement(s) linked</p>
            </div>
          )}

          {/* Admin controls */}
          {isAdmin && (
            <div>
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-2">Admin Actions</p>
              <div className="flex flex-wrap gap-2">
                {/* Approval */}
                {asset.status !== 'approved' && (
                  <Button size="sm" variant="outline" className="text-xs h-7 border-green-800 text-green-400 hover:bg-green-900/20"
                    onClick={() => updateAsset.mutate({ status: 'approved', rights_status: 'cleared', public_access: true, visibility_scope: 'public' })}>
                    Approve & Clear Rights
                  </Button>
                )}
                {asset.status === 'approved' && (
                  <Button size="sm" variant="outline" className="text-xs h-7 border-red-800 text-red-400 hover:bg-red-900/20"
                    onClick={() => updateAsset.mutate({ status: 'rejected', rights_status: 'restricted', public_access: false })}>
                    Reject
                  </Button>
                )}
                {/* Feature toggles */}
                <Button size="sm" variant="outline" className="text-xs h-7 border-gray-700 text-gray-400 hover:bg-gray-800"
                  onClick={() => handleFeatureToggle('featured_on_media_home', 'featured_on_media_home')}>
                  {asset.featured_on_media_home ? '★ Unfeature from Home' : '☆ Feature on Home'}
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-7 border-gray-700 text-gray-400 hover:bg-gray-800"
                  onClick={() => handleFeatureToggle('featured_on_creator_profile', 'featured_on_creator_profile')}>
                  {asset.featured_on_creator_profile ? '★ Unfeature from Profile' : '☆ Feature on Profile'}
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-7 border-gray-700 text-gray-400 hover:bg-gray-800"
                  onClick={() => handleFeatureToggle('featured_on_outlet_profile', 'featured_on_outlet_profile')}>
                  {asset.featured_on_outlet_profile ? '★ Unfeature from Outlet' : '☆ Feature on Outlet'}
                </Button>
                {/* Rights controls */}
                {asset.rights_status !== 'cleared' && (
                  <Button size="sm" variant="outline" className="text-xs h-7 border-emerald-800 text-emerald-400 hover:bg-emerald-900/20"
                    onClick={() => updateAsset.mutate({ rights_status: 'cleared' })}>
                    Clear Rights
                  </Button>
                )}
                {asset.rights_status === 'cleared' && (
                  <Button size="sm" variant="outline" className="text-xs h-7 border-orange-800 text-orange-400 hover:bg-orange-900/20"
                    onClick={() => updateAsset.mutate({ rights_status: 'restricted' })}>
                    Restrict Rights
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Contributor: request visibility */}
          {!isAdmin && asset.status === 'approved' && asset.rights_status === 'cleared' && !asset.public_access && (
            <div className="bg-blue-900/10 border border-blue-900/30 rounded p-3">
              <p className="text-blue-300 text-xs">This asset is approved and rights are cleared. Contact an admin to enable public visibility.</p>
            </div>
          )}

          {/* Review notes */}
          {review && (review.status === 'rejected' || review.status === 'flagged') && review.notes && (
            <div className="bg-orange-900/10 border border-orange-900/40 rounded p-2">
              <p className="text-orange-300 text-xs flex items-start gap-1.5">
                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                <span><strong>Reviewer note:</strong> {review.notes}</span>
              </p>
            </div>
          )}

          {/* External link */}
          {(asset.drive_file_id || asset.file_url) && (
            <a
              href={asset.file_url || asset.drive_file_id}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-blue-500 hover:text-blue-400 text-xs transition-colors"
            >
              <ExternalLink className="w-3 h-3" /> View File
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function MyAssetsTab({ mediaUser, currentUser, isAdmin }) {
  const [showUpload, setShowUpload] = useState(false);
  const queryClient = useQueryClient();

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['myMediaAssets', mediaUser?.id, currentUser?.id],
    queryFn: async () => {
      let results = [];
      if (mediaUser?.id) {
        results = await base44.entities.MediaAsset.filter({ uploader_media_user_id: mediaUser.id });
      }
      // Also fetch by owner_user_id for creator-owned assets
      if (currentUser?.id) {
        const owned = await base44.entities.MediaAsset.filter({ owner_user_id: currentUser.id });
        // Merge without duplicates
        const existingIds = new Set(results.map(a => a.id));
        owned.forEach(a => { if (!existingIds.has(a.id)) results.push(a); });
      }
      return results.sort((a, b) => new Date(b.created_at || b.created_date || 0) - new Date(a.created_at || a.created_date || 0));
    },
    enabled: !!(mediaUser?.id || currentUser?.id),
  });

  const assetIds = assets.map(a => a.id);

  const { data: reviews = [] } = useQuery({
    queryKey: ['myAssetReviews', mediaUser?.id],
    queryFn: async () => {
      const all = await base44.entities.AssetReview.list();
      return all.filter(r => assetIds.includes(r.asset_id));
    },
    enabled: assetIds.length > 0,
  });

  const getReview = (assetId) => reviews.find(r => r.asset_id === assetId) || null;

  if (!mediaUser && !currentUser) return (
    <div className="text-center py-16 text-gray-600">
      <p className="text-sm">Complete your profile to view assets.</p>
    </div>
  );

  if (isLoading) return <p className="text-gray-500 text-sm p-4">Loading assets...</p>;

  const approvedCount = assets.filter(a => a.status === 'approved').length;
  const publicCount = assets.filter(a => a.public_access && a.rights_status === 'cleared').length;
  const featuredCount = assets.filter(a => a.featured_on_media_home || a.featured_on_creator_profile).length;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-white font-bold text-lg">My Assets</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {assets.length} total · {approvedCount} approved · {publicCount} public · {featuredCount} featured
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="border-gray-700 text-gray-400 hover:bg-gray-800 gap-1.5"
          onClick={() => setShowUpload(v => !v)}
        >
          <Upload className="w-3.5 h-3.5" />
          {showUpload ? 'Cancel' : 'Upload Asset'}
        </Button>
      </div>

      {/* Rights model notice */}
      <div className="bg-[#0f1a1f] border border-gray-800 rounded-lg p-3 flex items-start gap-2">
        <Shield className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
        <p className="text-gray-500 text-xs leading-relaxed">
          You retain ownership of your uploaded media by default. Editorial, promotional, and merchandise rights are managed separately and are never assumed without your consent.
        </p>
      </div>

      {/* Upload form */}
      {showUpload && (
        <AssetUploadForm
          currentUser={currentUser}
          mediaUser={mediaUser}
          onUploaded={() => {
            setShowUpload(false);
            queryClient.invalidateQueries({ queryKey: ['myMediaAssets'] });
          }}
        />
      )}

      {/* Asset list */}
      {assets.length === 0 ? (
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="py-12 text-center">
            <ImageIcon className="w-8 h-8 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No assets yet.</p>
            <p className="text-gray-600 text-xs mt-1">Upload your first asset to build your portfolio.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {assets.map(asset => (
            <AssetCard
              key={asset.id}
              asset={asset}
              review={getReview(asset.id)}
              currentUser={currentUser}
              isAdmin={isAdmin}
              onUpdate={() => queryClient.invalidateQueries({ queryKey: ['myMediaAssets'] })}
            />
          ))}
        </div>
      )}
    </div>
  );
}