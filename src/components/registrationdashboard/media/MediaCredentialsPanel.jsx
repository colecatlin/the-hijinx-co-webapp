import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CRED_STATUS_COLORS } from './mediaAccess';

export default function MediaCredentialsPanel({ dashboardContext, selectedEvent, currentUser, hasAuthority, invalidateAfterOperation }) {
  const queryClient = useQueryClient();
  const eventId = selectedEvent?.id;

  const { data: credentials = [] } = useQuery({
    queryKey: ['mediaCredentials', { eventId }],
    queryFn: async () => {
      const all = await base44.entities.MediaCredential.list();
      return all.filter(c => c.scope_entity_id === eventId)
        .sort((a, b) => new Date(b.issued_at || b.created_date) - new Date(a.issued_at || a.created_date));
    },
    enabled: !!eventId,
  });

  const { data: mediaUsers = [] } = useQuery({
    queryKey: ['media_users'],
    queryFn: () => base44.entities.MediaUser.list(),
  });

  const getUserName = (id) => {
    const mu = mediaUsers.find(u => u.id === id);
    return mu?.full_name || mu?.legal_name || id?.slice(0,8) || '—';
  };

  const now = new Date();
  const getDisplayStatus = (cred) => {
    if (cred.status === 'active' && cred.expires_at && new Date(cred.expires_at) < now) return 'expired';
    return cred.status;
  };

  const revokeMutation = useMutation({
    mutationFn: async (credId) => {
      const n = new Date().toISOString();
      await base44.entities.MediaCredential.update(credId, {
        status: 'revoked',
        revoked_at: n,
        revoked_by_user_id: currentUser?.id,
        updated_at: n,
      });
      await base44.entities.OperationLog.create({
        operation_type: 'media_credential_revoked',
        source_type: 'media',
        entity_name: 'MediaCredential',
        status: 'success',
        metadata: { credential_id: credId, event_id: eventId },
      }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['mediaCredentials'] });
      invalidateAfterOperation?.('media_credential_revoked');
      toast.success('Credential revoked');
    },
  });

  return (
    <Card className="bg-[#1A1A1A] border-gray-800">
      <CardHeader>
        <CardTitle className="text-white text-sm">Issued Credentials ({credentials.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {credentials.length === 0 ? (
          <p className="text-gray-500 text-sm">No credentials issued for this event yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-gray-500 pb-2 pr-4 font-medium">Applicant</th>
                  <th className="text-left text-gray-500 pb-2 pr-4 font-medium">Roles</th>
                  <th className="text-left text-gray-500 pb-2 pr-4 font-medium">Access</th>
                  <th className="text-left text-gray-500 pb-2 pr-4 font-medium">Status</th>
                  <th className="text-left text-gray-500 pb-2 pr-4 font-medium">Issued</th>
                  <th className="text-left text-gray-500 pb-2 font-medium">Expires</th>
                  {hasAuthority && <th className="pb-2"></th>}
                </tr>
              </thead>
              <tbody>
                {credentials.map(cred => {
                  const displayStatus = getDisplayStatus(cred);
                  return (
                    <tr key={cred.id} className="border-b border-gray-800/50">
                      <td className="py-2 pr-4 text-white font-medium">{getUserName(cred.holder_media_user_id)}</td>
                      <td className="py-2 pr-4 text-gray-400">{cred.roles?.join(', ') || '—'}</td>
                      <td className="py-2 pr-4 text-gray-400">{cred.access_level}</td>
                      <td className="py-2 pr-4">
                        <Badge className={CRED_STATUS_COLORS[displayStatus] || 'bg-gray-700 text-gray-300'}>{displayStatus}</Badge>
                      </td>
                      <td className="py-2 pr-4 text-gray-500">{cred.issued_at ? new Date(cred.issued_at).toLocaleDateString() : '—'}</td>
                      <td className="py-2 text-gray-500">{cred.expires_at ? new Date(cred.expires_at).toLocaleDateString() : '—'}</td>
                      {hasAuthority && (
                        <td className="py-2 pl-2">
                          {cred.status === 'active' && displayStatus !== 'expired' && (
                            <Button size="sm" className="h-6 px-2 text-xs bg-red-900 hover:bg-red-800"
                              onClick={() => revokeMutation.mutate(cred.id)}
                              disabled={revokeMutation.isPending}>
                              Revoke
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}