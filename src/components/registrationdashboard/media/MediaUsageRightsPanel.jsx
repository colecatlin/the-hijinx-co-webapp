import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLORS = {
  draft: 'bg-gray-700 text-gray-300',
  proposed: 'bg-blue-900/60 text-blue-300',
  accepted_by_media: 'bg-teal-900/60 text-teal-300',
  accepted_by_entity: 'bg-purple-900/60 text-purple-300',
  fully_executed: 'bg-green-900/60 text-green-300',
  expired: 'bg-red-900/60 text-red-300',
};

export default function MediaUsageRightsPanel({ request, currentUser, dashboardContext }) {
  const queryClient = useQueryClient();
  const [proposeDialog, setProposeDialog] = useState(false);
  const [rightsText, setRightsText] = useState('');
  const [entityDeadline, setEntityDeadline] = useState('');
  const [mediaDeadline, setMediaDeadline] = useState('');

  const entityId = dashboardContext?.orgId;

  const { data: agreements = [], isLoading } = useQuery({
    queryKey: ['usageRightsAgreementsAdmin', request?.id, request?.holder_media_user_id, entityId],
    queryFn: async () => {
      const filter = { holder_media_user_id: request.holder_media_user_id };
      if (entityId) filter.entity_id = entityId;
      return base44.entities.UsageRightsAgreement.filter(filter);
    },
    enabled: !!request?.holder_media_user_id && !!entityId,
  });

  const proposeMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('proposeUsageRightsAgreement', {
        entity_id: entityId,
        holder_media_user_id: request.holder_media_user_id,
        event_id: request.target_entity_type === 'event' ? request.target_entity_id : undefined,
        request_id: request.id,
        rights_text: rightsText,
        entity_deadline: entityDeadline || undefined,
        media_deadline: mediaDeadline || undefined,
      });
      if (res?.data?.error) throw new Error(res.data.error);
      return res?.data?.agreement;
    },
    onSuccess: () => {
      toast.success('Usage rights agreement proposed');
      queryClient.invalidateQueries({ queryKey: ['usageRightsAgreementsAdmin'] });
      setProposeDialog(false);
      setRightsText('');
      setEntityDeadline('');
      setMediaDeadline('');
    },
    onError: (err) => toast.error(err.message),
  });

  const signAsEntityMutation = useMutation({
    mutationFn: async (agreement_id) => {
      const res = await base44.functions.invoke('signUsageRightsAgreementAsEntity', {
        agreement_id,
        signing_user_id: currentUser?.id,
      });
      if (res?.data?.error) throw new Error(res.data.error);
      return res?.data?.agreement;
    },
    onSuccess: () => {
      toast.success('Signed as entity');
      queryClient.invalidateQueries({ queryKey: ['usageRightsAgreementsAdmin'] });
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <>
      <div className="bg-[#262626] border border-gray-700 rounded p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-gray-400" />
            <p className="text-xs text-gray-400 uppercase tracking-wide">Usage Rights</p>
          </div>
          <Button size="sm" variant="ghost" className="text-xs text-blue-400 hover:text-blue-300 h-6 px-2"
            onClick={() => setProposeDialog(true)}>
            <Plus className="w-3 h-3 mr-1" /> Propose
          </Button>
        </div>

        {isLoading && <p className="text-gray-600 text-xs">Loading...</p>}

        {!isLoading && agreements.length === 0 && (
          <p className="text-gray-600 text-xs italic">No usage rights agreement yet.</p>
        )}

        {agreements.map(agreement => {
          const canSignAsEntity = !agreement.entity_signed_at && agreement.status !== 'expired' && agreement.status !== 'draft';

          return (
            <div key={agreement.id} className="border border-gray-700 rounded p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Badge className={STATUS_COLORS[agreement.status] || 'bg-gray-700 text-gray-300'} style={{ fontSize: '10px' }}>
                  {agreement.status.replace(/_/g, ' ')}
                </Badge>
                {agreement.status === 'fully_executed' && <CheckCircle className="w-3.5 h-3.5 text-green-400" />}
              </div>

              <div className="bg-[#1A1A1A] border border-gray-800 rounded p-2 max-h-24 overflow-y-auto">
                <p className="text-gray-400 text-xs leading-relaxed">{agreement.rights_text}</p>
              </div>

              {/* Sig status */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className={`rounded p-1.5 text-center ${agreement.entity_signed_at ? 'bg-green-900/20 text-green-400' : 'bg-[#0A0A0A] text-gray-600'}`}>
                  Entity: {agreement.entity_signed_at ? `✓ ${new Date(agreement.entity_signed_at).toLocaleDateString()}` : 'unsigned'}
                </div>
                <div className={`rounded p-1.5 text-center ${agreement.media_signed_at ? 'bg-green-900/20 text-green-400' : 'bg-[#0A0A0A] text-gray-600'}`}>
                  Media: {agreement.media_signed_at ? `✓ ${new Date(agreement.media_signed_at).toLocaleDateString()}` : 'unsigned'}
                </div>
              </div>

              {canSignAsEntity && (
                <Button size="sm" className="w-full bg-purple-900 hover:bg-purple-800 text-white text-xs"
                  disabled={signAsEntityMutation.isPending}
                  onClick={() => signAsEntityMutation.mutate(agreement.id)}>
                  Sign as Entity
                </Button>
              )}

              {agreement.status === 'expired' && (
                <div className="flex items-center gap-1 text-xs text-red-400">
                  <AlertCircle className="w-3 h-3" /> Expired
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Propose Dialog */}
      <Dialog open={proposeDialog} onOpenChange={o => !o && setProposeDialog(false)}>
        <DialogContent className="bg-[#262626] border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-sm">Propose Usage Rights Agreement</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Rights Text *</label>
              <Textarea
                value={rightsText}
                onChange={e => setRightsText(e.target.value)}
                rows={5}
                placeholder="Describe the usage rights, licensing terms, and any restrictions..."
                className="bg-[#1A1A1A] border-gray-700 text-white resize-none text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Entity Deadline</label>
                <Input type="datetime-local" value={entityDeadline} onChange={e => setEntityDeadline(e.target.value)}
                  className="bg-[#1A1A1A] border-gray-700 text-white text-xs" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Media Deadline</label>
                <Input type="datetime-local" value={mediaDeadline} onChange={e => setMediaDeadline(e.target.value)}
                  className="bg-[#1A1A1A] border-gray-700 text-white text-xs" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 border-gray-700 text-gray-400" onClick={() => setProposeDialog(false)}>Cancel</Button>
              <Button className="flex-1 bg-blue-800 hover:bg-blue-700 text-white"
                disabled={!rightsText.trim() || proposeMutation.isPending}
                onClick={() => proposeMutation.mutate()}>
                Send Proposal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}