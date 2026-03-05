import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Eye, Flag, Clock, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLORS = {
  uploaded: 'bg-gray-700 text-gray-300',
  in_review: 'bg-yellow-900/60 text-yellow-300',
  approved: 'bg-green-900/60 text-green-300',
  rejected: 'bg-red-900/60 text-red-300',
  flagged: 'bg-orange-900/60 text-orange-300',
};

const ALL_STATUSES = ['uploaded', 'in_review', 'approved', 'rejected', 'flagged'];

export default function MediaReviewQueuePanel({ dashboardContext, currentUser }) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState(['uploaded', 'in_review', 'flagged']);
  const [expandedId, setExpandedId] = useState(null);
  const [notes, setNotes] = useState({});

  const entityId = dashboardContext?.orgId;

  const { data: reviews = [], isLoading, refetch } = useQuery({
    queryKey: ['reviewQueue', entityId, statusFilter.join(',')],
    queryFn: async () => {
      const res = await base44.functions.invoke('getReviewQueue', { entity_id: entityId, status: statusFilter });
      return res?.data?.reviews || [];
    },
    enabled: !!entityId,
  });

  const setStatusMutation = useMutation({
    mutationFn: async ({ review_id, status, note }) => {
      const res = await base44.functions.invoke('setAssetReviewStatus', {
        review_id,
        entity_id: entityId,
        status,
        notes: note || undefined,
        reviewer_user_id: currentUser?.id,
      });
      if (res?.data?.error) throw new Error(res.data.error);
      return res?.data?.review;
    },
    onSuccess: (_, vars) => {
      toast.success(`Asset marked ${vars.status}`);
      queryClient.invalidateQueries({ queryKey: ['reviewQueue', entityId] });
      setExpandedId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleFilter = (s) => {
    setStatusFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  if (!entityId) return <p className="text-gray-600 text-xs">No entity context.</p>;

  return (
    <div className="space-y-4">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {ALL_STATUSES.map(s => (
          <button key={s} onClick={() => toggleFilter(s)}
            className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${statusFilter.includes(s) ? 'bg-blue-900/40 border-blue-700 text-blue-300' : 'bg-[#262626] border-gray-700 text-gray-500 hover:border-gray-500'}`}>
            {s}
          </button>
        ))}
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-gray-500" onClick={() => refetch()}>Refresh</Button>
      </div>

      {isLoading && <p className="text-gray-600 text-xs">Loading...</p>}
      {!isLoading && reviews.length === 0 && (
        <p className="text-gray-600 text-xs italic">No assets in queue for selected filters.</p>
      )}

      <div className="space-y-2">
        {reviews.map(review => {
          const asset = review.asset;
          const isExpanded = expandedId === review.id;
          const linkSummary = review.links?.map(l => `${l.subject_type}:${l.subject_id?.slice(0, 6)}`).join(', ');

          return (
            <div key={review.id} className="border border-gray-700 rounded bg-[#1A1A1A]">
              {/* Row */}
              <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[#222] transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : review.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-white text-xs font-medium truncate">{asset?.title || asset?.file_name || review.asset_id?.slice(0, 12)}</p>
                    {asset?.asset_type && <span className="text-gray-600 text-xs">{asset.asset_type}</span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    {asset?.created_at && <span><Clock className="w-2.5 h-2.5 inline mr-0.5" />{new Date(asset.created_at).toLocaleDateString()}</span>}
                    {asset?.uploader_media_user_id && <span>by {asset.uploader_media_user_id.slice(0, 8)}</span>}
                    {linkSummary && <span className="text-gray-700">{linkSummary}</span>}
                  </div>
                </div>
                <Badge className={`${STATUS_COLORS[review.status]} shrink-0`}>{review.status}</Badge>
              </div>

              {/* Expanded actions */}
              {isExpanded && (
                <div className="border-t border-gray-700 p-3 space-y-3">
                  {asset?.drive_file_id && (
                    <a href={asset.drive_file_id} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline">
                      <ExternalLink className="w-3 h-3" /> View File
                    </a>
                  )}
                  {asset?.description && (
                    <p className="text-gray-500 text-xs bg-[#0A0A0A] rounded p-2 border border-gray-800">{asset.description}</p>
                  )}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Review Notes (optional)</label>
                    <Textarea
                      value={notes[review.id] || review.notes || ''}
                      onChange={e => setNotes(n => ({ ...n, [review.id]: e.target.value }))}
                      rows={2}
                      placeholder="Add notes for this asset..."
                      className="bg-[#0A0A0A] border-gray-700 text-white resize-none text-xs"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {review.status !== 'in_review' && (
                      <Button size="sm" className="bg-yellow-800 hover:bg-yellow-700 text-white text-xs h-7"
                        disabled={setStatusMutation.isPending}
                        onClick={() => setStatusMutation.mutate({ review_id: review.id, status: 'in_review', note: notes[review.id] })}>
                        <Eye className="w-3 h-3 mr-1" /> Mark In Review
                      </Button>
                    )}
                    {review.status !== 'approved' && (
                      <Button size="sm" className="bg-green-800 hover:bg-green-700 text-white text-xs h-7"
                        disabled={setStatusMutation.isPending}
                        onClick={() => setStatusMutation.mutate({ review_id: review.id, status: 'approved', note: notes[review.id] })}>
                        <CheckCircle className="w-3 h-3 mr-1" /> Approve
                      </Button>
                    )}
                    {review.status !== 'rejected' && (
                      <Button size="sm" className="bg-red-900 hover:bg-red-800 text-white text-xs h-7"
                        disabled={setStatusMutation.isPending}
                        onClick={() => setStatusMutation.mutate({ review_id: review.id, status: 'rejected', note: notes[review.id] })}>
                        <XCircle className="w-3 h-3 mr-1" /> Reject
                      </Button>
                    )}
                    {review.status !== 'flagged' && (
                      <Button size="sm" variant="outline" className="border-orange-800 text-orange-400 hover:bg-orange-900/20 text-xs h-7"
                        disabled={setStatusMutation.isPending}
                        onClick={() => setStatusMutation.mutate({ review_id: review.id, status: 'flagged', note: notes[review.id] })}>
                        <Flag className="w-3 h-3 mr-1" /> Flag
                      </Button>
                    )}
                  </div>
                  {review.notes && !notes[review.id] && (
                    <p className="text-gray-500 text-xs italic">Previous notes: {review.notes}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}