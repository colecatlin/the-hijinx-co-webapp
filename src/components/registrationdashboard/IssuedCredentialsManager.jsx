import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle } from 'lucide-react';
import { revokeCredential } from './mediaApi';

export default function IssuedCredentialsManager({
  dashboardContext,
  selectedEvent,
  selectedTrack,
  selectedSeries,
  dashboardPermissions,
  invalidateAfterOperation,
}) {
  const [pending, setPending] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedCredentialId, setSelectedCredentialId] = useState(null);
  const [revokeNotes, setRevokeNotes] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  // Determine org context
  const orgEntityId = selectedTrack?.id || selectedSeries?.id;

  // Load issued credentials with proper scoping
  const { data: credentials = [] } = useQuery({
    queryKey: ['media_credentials', orgEntityId, selectedEvent?.id],
    queryFn: async () => {
      if (!orgEntityId) return [];
      const allCreds = await base44.entities.MediaCredential.filter({});
      return allCreds.filter(
        (c) =>
          (selectedEvent && c.scope_entity_id === selectedEvent.id) ||
          (selectedSeries && c.scope_entity_id === selectedSeries.id) ||
          (selectedTrack && c.scope_entity_id === selectedTrack.id) ||
          c.issuer_entity_id === orgEntityId
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
    mutationFn: async ({ credentialId, userId, notes }) => {
      const result = await revokeCredential({
        credential_id: credentialId,
        requester_user_id: userId,
        revoke_notes: notes,
      });
      if (!result.ok) throw new Error(result.errorMessage);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media_credentials'] });
      invalidateAfterOperation('media_credential_revoked');
      setPending(false);
      setRevokeDialogOpen(false);
      setRevokeNotes('');
      setError('');
    },
    onError: (err) => {
      setError(err.message);
      setPending(false);
    },
  });

  const handleRevokeClick = (credentialId) => {
    setSelectedCredentialId(credentialId);
    setRevokeNotes('');
    setError('');
    setRevokeDialogOpen(true);
  };

  const handleConfirmRevoke = async () => {
    if (!selectedCredentialId) return;
    setPending(true);
    setError('');
    const user = await base44.auth.me();
    revokeMutation.mutate({ credentialId: selectedCredentialId, userId: user.id, notes: revokeNotes });
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
                          onClick={() => handleRevokeClick(cred.id)}
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

      {/* Revoke Dialog */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent className="bg-[#262626] border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Revoke Credential</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded p-3 text-red-300 text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Revoke Notes (optional)</label>
              <Textarea
                placeholder="Reason for revocation..."
                value={revokeNotes}
                onChange={(e) => setRevokeNotes(e.target.value)}
                rows={3}
                className="bg-[#1A1A1A] border-gray-700 text-white"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setRevokeDialogOpen(false)}
                className="border-gray-700 text-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmRevoke}
                disabled={pending}
                className="bg-red-700 hover:bg-red-600"
              >
                {pending ? 'Revoking...' : 'Revoke'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}