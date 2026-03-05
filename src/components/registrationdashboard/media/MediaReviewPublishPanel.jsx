import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function MediaReviewPublishPanel({ dashboardContext, selectedEvent, currentUser, invalidateAfterOperation }) {
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState('');
  const [publishTargetType, setPublishTargetType] = useState('event_recap');
  const queryClient = useQueryClient();

  const entityId = dashboardContext?.orgId;
  const entityType = dashboardContext?.orgType;
  const eventId = selectedEvent?.id;

  const { data: reviews = [] } = useQuery({
    queryKey: ['assetReviews', { entityId }],
    queryFn: () => base44.entities.AssetReview.filter({ entity_id: entityId, status: 'in_review' }),
    enabled: !!entityId,
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['mediaAssetsByIds', reviews.map(r => r.asset_id)],
    queryFn: async () => {
      if (reviews.length === 0) return [];
      const ids = [...new Set(reviews.map(r => r.asset_id))];
      const all = await base44.entities.MediaAsset.list();
      return all.filter(a => ids.includes(a.id));
    },
    enabled: reviews.length > 0,
  });

  const getAsset = (assetId) => assets.find(a => a.id === assetId);

  const approveMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      // Update review status
      await base44.entities.AssetReview.update(selected.id, {
        status: 'approved',
        notes,
        reviewer_user_id: currentUser?.id,
        updated_at: now,
      });

      // Create PublishTarget
      await base44.entities.PublishTarget.create({
        asset_id: selected.asset_id,
        target_type: publishTargetType,
        target_entity_id: eventId || entityId,
        status: 'published',
        published_at: now,
        created_at: now,
        updated_at: now,
      });

      queryClient.invalidateQueries({ queryKey: ['assetReviews'] });
      queryClient.invalidateQueries({ queryKey: ['publishTargets'] });
      invalidateAfterOperation?.('media_review_updated');
      invalidateAfterOperation?.('publish_target_updated', { assetId: selected.asset_id });
      toast.success('Asset approved and published');
      setSelected(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.AssetReview.update(selected.id, {
        status: 'rejected',
        notes,
        reviewer_user_id: currentUser?.id,
        updated_at: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ['assetReviews'] });
      invalidateAfterOperation?.('media_review_updated');
      toast.success('Asset rejected');
      setSelected(null);
    },
  });

  const targetTypeOptions = eventId
    ? ['event_recap','driver_gallery','team_gallery','track_gallery','series_feed','homepage_feature']
    : ['driver_gallery','team_gallery','track_gallery','series_feed','homepage_feature'];

  return (
    <Card className="bg-[#1A1A1A] border-gray-800">
      <CardHeader>
        <CardTitle className="text-white text-sm">Review & Publish</CardTitle>
      </CardHeader>
      <CardContent>
        {reviews.length === 0 ? (
          <p className="text-gray-500 text-sm">No assets awaiting review.</p>
        ) : (
          <div className="space-y-2">
            {reviews.map(review => {
              const asset = getAsset(review.asset_id);
              return (
                <button
                  key={review.id}
                  onClick={() => { setSelected(review); setNotes(''); setPublishTargetType(eventId ? 'event_recap' : 'track_gallery'); }}
                  className="w-full text-left bg-[#262626] border border-gray-700 rounded p-3 hover:bg-[#2a2a2a] transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-white text-xs font-medium">{asset?.title || asset?.file_name || review.asset_id?.slice(0,8)}</p>
                      <p className="text-gray-500 text-xs">{asset?.asset_type || '—'}</p>
                    </div>
                    <Badge className="bg-yellow-900/60 text-yellow-300">in_review</Badge>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="bg-[#262626] border-gray-700 max-w-md">
          <DialogHeader><DialogTitle className="text-white">Review Asset</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              {(() => {
                const asset = getAsset(selected.asset_id);
                return asset ? (
                  <div className="bg-[#1A1A1A] border border-gray-700 rounded p-3">
                    <p className="text-white text-xs font-medium">{asset.title || asset.file_name}</p>
                    <p className="text-gray-500 text-xs">{asset.asset_type} • {asset.description}</p>
                    {asset.drive_file_id && (
                      <a href={asset.drive_file_id} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline mt-1 block">View file</a>
                    )}
                  </div>
                ) : null;
              })()}

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Publish Target Type</label>
                <Select value={publishTargetType} onValueChange={setPublishTargetType}>
                  <SelectTrigger className="bg-[#1A1A1A] border-gray-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-gray-700">
                    {targetTypeOptions.map(t => <SelectItem key={t} value={t} className="text-white">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Notes (optional)</label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="bg-[#1A1A1A] border-gray-700 text-white resize-none" />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => rejectMutation.mutate()}
                  disabled={rejectMutation.isPending}
                  variant="outline"
                  className="flex-1 border-red-900 text-red-400 hover:bg-red-900/20"
                >
                  <XCircle className="w-3 h-3 mr-1" />Reject
                </Button>
                <Button
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                  className="flex-1 bg-green-700 hover:bg-green-600"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />Approve & Publish
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}