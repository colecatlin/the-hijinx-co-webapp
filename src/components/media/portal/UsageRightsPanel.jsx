import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Clock, FileText } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLORS = {
  draft: 'bg-gray-700 text-gray-300',
  proposed: 'bg-blue-900/60 text-blue-300',
  accepted_by_media: 'bg-teal-900/60 text-teal-300',
  accepted_by_entity: 'bg-purple-900/60 text-purple-300',
  fully_executed: 'bg-green-900/60 text-green-300',
  expired: 'bg-red-900/60 text-red-300',
};

const STATUS_LABELS = {
  draft: 'Draft',
  proposed: 'Proposed — awaiting your signature',
  accepted_by_media: 'Signed by you — awaiting entity',
  accepted_by_entity: 'Signed by entity — awaiting your signature',
  fully_executed: 'Fully Executed',
  expired: 'Expired',
};

export default function UsageRightsPanel({ request, mediaUser }) {
  const queryClient = useQueryClient();
  const [signing, setSigning] = useState(false);

  const { data: agreements = [], isLoading } = useQuery({
    queryKey: ['usageRightsAgreements', request?.id, mediaUser?.id],
    queryFn: async () => {
      const filter = { holder_media_user_id: mediaUser.id };
      if (request?.target_entity_id) filter.entity_id = request.target_entity_id;
      if (request?.id) filter.request_id = request.id;
      return base44.entities.UsageRightsAgreement.filter(filter);
    },
    enabled: !!mediaUser?.id,
  });

  const signMutation = useMutation({
    mutationFn: async (agreement_id) => {
      const res = await base44.functions.invoke('signUsageRightsAgreementAsMedia', {
        agreement_id,
        holder_media_user_id: mediaUser.id,
      });
      if (res?.data?.error) throw new Error(res.data.error);
      return res?.data?.agreement;
    },
    onSuccess: () => {
      toast.success('Usage rights accepted');
      queryClient.invalidateQueries({ queryKey: ['usageRightsAgreements'] });
      setSigning(false);
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return null;
  if (agreements.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <FileText className="w-4 h-4 text-gray-400" />
        <p className="text-white font-semibold text-sm">Usage Rights Agreement</p>
      </div>

      {agreements.map(agreement => {
        const needsMediaSig = !agreement.media_signed_at && agreement.status !== 'expired' && agreement.status !== 'draft';
        const isExpired = agreement.status === 'expired';

        return (
          <div key={agreement.id} className="bg-[#171717] border border-gray-800 rounded p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Badge className={STATUS_COLORS[agreement.status] || 'bg-gray-700 text-gray-300'}>
                {STATUS_LABELS[agreement.status] || agreement.status}
              </Badge>
              {agreement.status === 'fully_executed' && (
                <CheckCircle className="w-4 h-4 text-green-400" />
              )}
            </div>

            {/* Rights text */}
            <div className="bg-[#0A0A0A] border border-gray-800 rounded p-3 max-h-40 overflow-y-auto">
              <p className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap">{agreement.rights_text}</p>
            </div>

            {/* Deadlines */}
            {(agreement.media_deadline || agreement.entity_deadline) && (
              <div className="flex gap-4 text-xs text-gray-500">
                {agreement.media_deadline && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Your deadline: {new Date(agreement.media_deadline).toLocaleDateString()}
                  </div>
                )}
                {agreement.entity_deadline && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Entity deadline: {new Date(agreement.entity_deadline).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}

            {/* Signature status */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className={`rounded p-2 text-center ${agreement.media_signed_at ? 'bg-green-900/20 border border-green-900/40 text-green-400' : 'bg-[#0A0A0A] border border-gray-800 text-gray-500'}`}>
                {agreement.media_signed_at ? `✓ You signed ${new Date(agreement.media_signed_at).toLocaleDateString()}` : 'Awaiting your signature'}
              </div>
              <div className={`rounded p-2 text-center ${agreement.entity_signed_at ? 'bg-green-900/20 border border-green-900/40 text-green-400' : 'bg-[#0A0A0A] border border-gray-800 text-gray-500'}`}>
                {agreement.entity_signed_at ? `✓ Entity signed ${new Date(agreement.entity_signed_at).toLocaleDateString()}` : 'Awaiting entity signature'}
              </div>
            </div>

            {/* Action */}
            {needsMediaSig && (
              <Button
                className="w-full bg-blue-800 hover:bg-blue-700 text-white text-sm"
                disabled={signMutation.isPending}
                onClick={() => signMutation.mutate(agreement.id)}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Accept Usage Rights
              </Button>
            )}

            {isExpired && (
              <div className="flex items-start gap-2 bg-red-900/20 border border-red-800 rounded p-2">
                <AlertCircle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
                <p className="text-red-300 text-xs">This agreement has expired. Please contact the entity to issue a new agreement.</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}