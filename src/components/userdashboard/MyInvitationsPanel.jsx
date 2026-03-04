import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Mail, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format, isPast } from 'date-fns';

function entityTypeBadgeColor(type) {
  switch (type) {
    case 'Driver': return 'bg-blue-500/20 text-blue-400';
    case 'Team': return 'bg-purple-500/20 text-purple-400';
    case 'Track': return 'bg-teal-500/20 text-teal-400';
    case 'Series': return 'bg-yellow-500/20 text-yellow-400';
    case 'Event': return 'bg-orange-500/20 text-orange-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
}

export default function MyInvitationsPanel({ user, invitations }) {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState(null);

  const handleAccept = async (invitation) => {
    setProcessingId(invitation.id);
    try {
      // Create EntityCollaborator record
      await base44.entities.EntityCollaborator.create({
        user_id: user.id,
        user_email: user.email,
        entity_type: invitation.entity_type,
        entity_id: invitation.entity_id,
        entity_name: invitation.entity_name || '',
        access_code: invitation.code || '',
        role: 'editor',
      });
      // Mark invitation accepted
      await base44.entities.Invitation.update(invitation.id, {
        status: 'accepted',
        accepted_date: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ['pendingInvitations', user.email] });
      queryClient.invalidateQueries({ queryKey: ['entityCollaborators', user.id] });
      toast.success(`Accepted invitation for ${invitation.entity_name || invitation.entity_type}`);
    } catch (e) {
      toast.error('Failed to accept invitation');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invitation) => {
    setProcessingId(invitation.id);
    try {
      await base44.entities.Invitation.update(invitation.id, { status: 'expired' });
      queryClient.invalidateQueries({ queryKey: ['pendingInvitations', user.email] });
      toast.success('Invitation declined');
    } catch (e) {
      toast.error('Failed to decline invitation');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="bg-[#171717] border border-yellow-800/50 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-yellow-800/30 flex items-center gap-2">
        <Mail className="w-4 h-4 text-yellow-400" />
        <h2 className="text-sm font-semibold text-white">Pending Invitations</h2>
        <span className="ml-auto text-xs text-yellow-500 font-semibold">{invitations.length}</span>
      </div>

      <div className="divide-y divide-gray-800/50">
        {invitations.map(inv => {
          const expired = inv.expiration_date && isPast(new Date(inv.expiration_date));
          const isProcessing = processingId === inv.id;
          return (
            <div key={inv.id} className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`text-xs ${entityTypeBadgeColor(inv.entity_type)}`}>{inv.entity_type}</Badge>
                  <span className="text-white text-sm font-medium">{inv.entity_name || inv.entity_id}</span>
                </div>
                <p className="text-xs text-gray-400">
                  Invited by {inv.invited_by || 'admin'}
                  {inv.expiration_date && (
                    <span className={`ml-2 ${expired ? 'text-red-400' : 'text-gray-500'}`}>
                      · {expired ? 'Expired' : `Expires ${format(new Date(inv.expiration_date), 'MMM d, yyyy')}`}
                    </span>
                  )}
                </p>
              </div>
              {!expired && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isProcessing}
                    onClick={() => handleDecline(inv)}
                    className="h-7 px-3 text-xs border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
                  >
                    <X className="w-3 h-3 mr-1" /> Decline
                  </Button>
                  <Button
                    size="sm"
                    disabled={isProcessing}
                    onClick={() => handleAccept(inv)}
                    className="h-7 px-3 text-xs bg-green-700 hover:bg-green-600 text-white border-0"
                  >
                    <Check className="w-3 h-3 mr-1" /> Accept
                  </Button>
                </div>
              )}
              {expired && (
                <Badge className="text-xs bg-red-500/20 text-red-400">Expired</Badge>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}