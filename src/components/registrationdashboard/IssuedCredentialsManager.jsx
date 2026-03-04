import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle } from 'lucide-react';

export default function IssuedCredentialsManager({
  dashboardContext,
  selectedEvent,
  selectedTrack,
  selectedSeries,
  dashboardPermissions,
  invalidateAfterOperation,
}) {
  const [pending, setPending] = useState(false);
  const queryClient = useQueryClient();

  // Determine org context
  const orgEntityId = selectedTrack?.id || selectedSeries?.id;

  // Load issued credentials
  const { data: credentials = [] } = useQuery({
    queryKey: ['media_credentials', orgEntityId, selectedEvent?.id],
    queryFn: async () => {
      if (!orgEntityId) return [];
      const allCreds = await base44.entities.MediaCredential.filter({});
      return allCreds.filter(
        (c) =>
          c.issuer_entity_id === orgEntityId ||
          (selectedEvent && c.scope_entity_id === selectedEvent.id)
      );
    },
    enabled: !!orgEntityId,
  });

  // Load media users
  const { data: mediaUsers = [] } = useQuery({
    queryKey: ['media_users'],
    queryFn: () => base44.entities.MediaUser.list(),
  });

  const getUserName = (mediaUserId) => {
    const mu = mediaUsers.find((m) => m.id === mediaUserId);
    return mu?.full_name || '—';
  };

  // Revoke mutation
  const revokeMutation = useMutation({
    mutationFn: async (credentialId) => {
      const user = await base44.auth.me();
      return base44.functions.invoke('media_revokeCredential', {
        credential_id: credentialId,
        requester_user_id: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media_credentials'] });
      invalidateAfterOperation('media_credential_updated');
      setPending(false);
    },
    onError: (error) => {
      console.error('Revoke error:', error);
      setPending(false);
    },
  });

  const handleRevoke = (credentialId) => {
    setPending(true);
    revokeMutation.mutate(credentialId);
  };

  const statusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-900/40 text-green-300';
      case 'revoked':
        return 'bg-red-900/40 text-red-300';
      case 'expired':
        return 'bg-gray-900/40 text-gray-300';
      default:
        return 'bg-yellow-900/40 text-yellow-300';
    }
  };

  if (!orgEntityId) {
    return (
      <Card className="bg-[#1A1A1A] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Issued Credentials</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-gray-400">
            <AlertCircle className="w-4 h-4" />
            <p>Select a track or series to view credentials</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#1A1A1A] border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Issued Media Credentials</CardTitle>
      </CardHeader>
      <CardContent>
        {credentials.length === 0 ? (
          <p className="text-sm text-gray-500">No issued credentials</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700 hover:bg-transparent">
                  <TableHead className="text-gray-400">Holder</TableHead>
                  <TableHead className="text-gray-400">Roles</TableHead>
                  <TableHead className="text-gray-400">Access Level</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Issued</TableHead>
                  <TableHead className="text-gray-400">Expires</TableHead>
                  <TableHead className="text-gray-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credentials.map((cred) => (
                  <TableRow key={cred.id} className="border-gray-700 hover:bg-gray-900/30">
                    <TableCell className="text-xs text-gray-300">
                      {getUserName(cred.holder_media_user_id)}
                    </TableCell>
                    <TableCell className="text-xs text-gray-300">
                      {cred.roles?.join(', ') || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-gray-300">
                      {cred.access_level || 'general'}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColor(cred.status)}>
                        {cred.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-gray-300">
                      {cred.issued_at
                        ? new Date(cred.issued_at).toLocaleDateString()
                        : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-gray-300">
                      {cred.expires_at
                        ? new Date(cred.expires_at).toLocaleDateString()
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {cred.status === 'active' && (
                        <Button
                          size="sm"
                          disabled={pending}
                          onClick={() => handleRevoke(cred.id)}
                          className="h-6 px-2 text-xs bg-red-700 hover:bg-red-600"
                        >
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}