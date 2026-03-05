import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ShieldOff, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { canPublishAsset } from './publishGuards';

/**
 * Renders publish controls for a single asset, enforcing usage rights gating.
 * Props:
 *   asset          - MediaAsset record
 *   publishTarget  - existing PublishTarget (optional, for override detection)
 *   targetEntityId - entity this is being published to
 *   targetType     - e.g. 'track_gallery', 'event_recap'
 *   isAdmin        - boolean
 *   isEntityManager - boolean
 *   currentUserId  - string
 *   invalidateAfterOperation - fn
 *   onPublished    - optional callback
 */
export default function AssetPublishControl({
  asset,
  publishTarget: existingPublishTarget,
  targetEntityId,
  targetType,
  isAdmin,
  isEntityManager,
  currentUserId,
  invalidateAfterOperation,
  onPublished,
}) {
  const [showOverride, setShowOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const queryClient = useQueryClient();

  const holderId = asset?.uploader_media_user_id;

  // Load asset links
  const { data: assetLinks = [] } = useQuery({
    queryKey: ['assetLinks', asset?.id],
    queryFn: () => base44.entities.AssetLink.filter({ asset_id: asset.id }),
    enabled: !!asset?.id,
  });

  const eventLink = assetLinks.find((l) => l.subject_type === 'event');
  const eventId = eventLink?.subject_id || null;

  // Load usage rights agreements
  const { data: usageAgreements = [] } = useQuery({
    queryKey: ['usageRights', holderId, targetEntityId, eventId],
    queryFn: async () => {
      if (!holderId) return [];
      const all = await base44.entities.UsageRightsAgreement.filter({
        holder_media_user_id: holderId,
      });
      return all.filter(
        (a) =>
          a.entity_id === targetEntityId ||
          (eventId && a.event_id === eventId)
      );
    },
    enabled: !!holderId,
  });

  // Load current publish target if not passed in
  const { data: publishTargetFromQuery } = useQuery({
    queryKey: ['publishTargets', asset?.id],
    queryFn: () => base44.entities.PublishTarget.filter({ asset_id: asset.id }).then((r) => r[0] || null),
    enabled: !!asset?.id && !existingPublishTarget,
  });

  const publishTarget = existingPublishTarget || publishTargetFromQuery;

  const guardResult = canPublishAsset({
    asset,
    assetLinks,
    usageAgreements,
    publishTarget: publishTarget || { target_entity_id: targetEntityId },
    isAdmin,
    isEntityManager,
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      if (publishTarget?.id) {
        await base44.entities.PublishTarget.update(publishTarget.id, {
          status: 'scheduled',
          updated_at: now,
        });
        invalidateAfterOperation?.('publish_target_updated', { assetId: asset.id });
      } else {
        await base44.entities.PublishTarget.create({
          asset_id: asset.id,
          target_type: targetType,
          target_entity_id: targetEntityId,
          status: 'scheduled',
          scheduled_at: now,
          created_at: now,
          updated_at: now,
        });
        invalidateAfterOperation?.('publish_target_updated', { assetId: asset.id });
      }
      queryClient.invalidateQueries({ queryKey: ['publishTargets', asset.id] });
      toast.success('Asset scheduled for publishing');
      onPublished?.();
    },
  });

  const overrideMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      if (publishTarget?.id) {
        await base44.entities.PublishTarget.update(publishTarget.id, {
          override_allowed: true,
          override_by_user_id: currentUserId,
          override_reason: overrideReason,
          updated_at: now,
        });
      } else {
        await base44.entities.PublishTarget.create({
          asset_id: asset.id,
          target_type: targetType,
          target_entity_id: targetEntityId,
          status: 'scheduled',
          scheduled_at: now,
          override_allowed: true,
          override_by_user_id: currentUserId,
          override_reason: overrideReason,
          created_at: now,
          updated_at: now,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['publishTargets', asset.id] });
      invalidateAfterOperation?.('publish_target_updated', { assetId: asset.id });
      toast.success('Override applied — asset can now be published');
      setShowOverride(false);
    },
  });

  // Already published/scheduled
  if (publishTarget?.status === 'published' || publishTarget?.status === 'scheduled') {
    return (
      <div className="flex items-center gap-2">
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          {publishTarget.status === 'published' ? 'Published' : 'Scheduled'}
        </Badge>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!guardResult.allowed ? (
        <>
          {/* Blocked state */}
          <div className="bg-red-950/30 border border-red-800 rounded p-3">
            <p className="font-semibold text-red-300 flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4" />
              Publishing blocked
            </p>
            <p className="text-sm text-red-200">
              Usage rights must be fully executed before this asset can be published.
              You can still upload and submit for review.
            </p>
            <p className="text-xs text-red-400 mt-1">{guardResult.reason}</p>
          </div>

          {/* Override controls (admin or entity manager only) */}
          {(isAdmin || isEntityManager) && !showOverride && (
            <Button
              size="sm"
              variant="outline"
              className="border-orange-900 text-orange-400 hover:bg-orange-900/20"
              onClick={() => setShowOverride(true)}
            >
              <ShieldOff className="w-3 h-3 mr-1" />
              Override Usage Rights
            </Button>
          )}

          {showOverride && (
            <div className="bg-[#1A1A1A] border border-orange-800 rounded p-3 space-y-3">
              <p className="text-xs text-orange-300 font-medium">Override Usage Rights</p>
              <Textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Reason for override (required)"
                rows={2}
                className="bg-[#262626] border-gray-700 text-white text-sm resize-none"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-700"
                  onClick={() => { setShowOverride(false); setOverrideReason(''); }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!overrideReason.trim() || overrideMutation.isPending}
                  className="bg-orange-800 hover:bg-orange-700 text-white"
                  onClick={() => overrideMutation.mutate()}
                >
                  Confirm Override
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <Button
          size="sm"
          disabled={publishMutation.isPending}
          onClick={() => publishMutation.mutate()}
          className="bg-[#1A3249] hover:bg-[#234469] text-white"
        >
          Publish to Site
        </Button>
      )}
    </div>
  );
}