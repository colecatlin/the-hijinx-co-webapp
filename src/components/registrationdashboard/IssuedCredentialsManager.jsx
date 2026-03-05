import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { revokeCredential } from './mediaApi';
import { getEventCredentialExpiry, normalizeCredentialStatus } from './media/credentialRules';
import { getCredentialBadgeState } from './media/credentialGuards';

const STATUS_FILTERS = ['all', 'active', 'pending', 'expired', 'revoked'];

const BADGE_CLASSES = {
  active:  'bg-green-900/40 text-green-300',
  pending: 'bg-yellow-900/40 text-yellow-300',
  expired: 'bg-gray-900/40 text-gray-300',
  revoked: 'bg-red-900/40 text-red-300',
};

export default function IssuedCredentialsManager({
  dashboardContext,
  selectedEvent,
  selectedTrack,
  selectedSeries,
  dashboardPermissions,
  invalidateAfterOperation,
}) {
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedCredentialId, setSelectedCredentialId] = useState(null);
  const [revokeNotes, setRevokeNotes] = useState('');
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const queryClient = useQueryClient();

  const now = useMemo(() => new Date(), []);

  if (!dashboardContext?.orgId || !dashboardContext?.orgType) return null;

  const orgEntityId = selectedTrack?.id || selectedSeries?.id;

  // Load credentials
  const { data: credentials = [] } = useQuery({
    queryKey: ['mediaCredentials', orgEntityId, selectedEvent?.id],
    queryFn: async () => {
      if (!orgEntityId) return [];
      const all = await base44.entities.MediaCredential.filter({});
      return all.filter(
        (c) =>
          (selectedEvent && c.scope_entity_id === selectedEvent.id) ||
          (selectedSeries && c.scope_entity_id === selectedSeries.id) ||
          (selectedTrack && c.scope_entity_id === selectedTrack.id) ||
          c.issuer_entity_id === orgEntityId
      );
    },
    enabled: !!orgEntityId,
  });

  // Load events for expiry computation (unique event scope_entity_ids)
  const eventScopedCredIds = useMemo(
    () => credentials.filter((c) => c.scope_entity_type === 'event').map((c) => c.scope_entity_id),
    [credentials]
  );

  const { data: scopedEvents = [] } = useQuery({
    queryKey: ['eventsByIds', eventScopedCredIds],
    queryFn: async () => {
      if (eventScopedCredIds.length === 0) return [];
      const all = await base44.entities.Event.list();
      return all.filter((e) => eventScopedCredIds.includes(e.id));
    },
    enabled: eventScopedCredIds.length > 0,
  });

  const eventById = useMemo(() => {
    const map = {};
    scopedEvents.forEach((e) => { map[e.id] = e; });
    return map;
  }, [scopedEvents]);

  // Compute effective status for each credential
  const enrichedCredentials = useMemo(() =>
    credentials.map((cred) => {
      const event = cred.scope_entity_type === 'event' ? eventById[cred.scope_entity_id] : null;
      const expiryDate = event ? getEventCredentialExpiry({ event }) : null;
      const effectiveStatus = normalizeCredentialStatus({ credential: cred, now, expiryDate });
      return { ...cred, _effectiveStatus: effectiveStatus, _expiryDate: expiryDate };
    }),
    [credentials, eventById, now]
  );

  // Filter
  const filtered = useMemo(() =>
    statusFilter === 'all'
      ? enrichedCredentials
      : enrichedCredentials.filter((c) => c._effectiveStatus === statusFilter),
    [enrichedCredentials, statusFilter]
  );

  // Media users lookup
  const { data: mediaUsers = [] } = useQuery({
    queryKey: ['media_users'],
    queryFn: () => base44.entities.MediaUser.list(),
  });
  const getUserName = (id) => mediaUsers.find((m) => m.id === id)?.full_name || '—';

  // Revoke mutation
  const revokeMutation = useMutation({
    mutationFn: async ({ credentialId, userId, notes }) => {
      const result = await revokeCredential({ credential_id: credentialId, requester_user_id: userId, revoke_notes: notes });
      if (!result.ok) throw new Error(result.errorMessage);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaCredentials'] });
      invalidateAfterOperation?.('media_credential_updated');
      setRevokeDialogOpen(false);
      setRevokeNotes('');
      setError('');
    },
    onError: (err) => setError(err.message),
  });

  // Bulk mark expired mutation
  const bulkExpireMutation = useMutation({
    mutationFn: async () => {
      const toExpire = enrichedCredentials.filter(
        (c) => c._effectiveStatus === 'expired' && c.status === 'active'
      );
      if (toExpire.length === 0) {
        toast.info('No credentials need expiring.');
        return;
      }
      const now = new Date().toISOString();
      await Promise.all(
        toExpire.map((c) =>
          base44.entities.MediaCredential.update(c.id, {
            status: 'expired',
            expires_at: c._expiryDate ? c._expiryDate.toISOString() : now,
            updated_at: now,
          })
        )
      );
      queryClient.invalidateQueries({ queryKey: ['mediaCredentials'] });
      invalidateAfterOperation?.('media_credential_expired');
      toast.success(`${toExpire.length} credential(s) marked expired`);
    },
  });

  const handleRevokeClick = (credentialId) => {
    setSelectedCredentialId(credentialId);
    setRevokeNotes('');
    setError('');
    setRevokeDialogOpen(true);
  };

  const handleConfirmRevoke = async () => {
    const user = await base44.auth.me();
    revokeMutation.mutate({ credentialId: selectedCredentialId, userId: user.id, notes: revokeNotes });
  };

  const computedExpiredCount = enrichedCredentials.filter(
    (c) => c._effectiveStatus === 'expired' && c.status === 'active'
  ).length;

  if (!orgEntityId) {
    return (
      <Card className="bg-[#1A1A1A] border-gray-800">
        <CardHeader><CardTitle className="text-white">Issued Credentials</CardTitle></CardHeader>
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
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-white">Issued Media Credentials</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status filter pills */}
            <div className="flex gap-1 flex-wrap">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-2 py-1 text-xs rounded border transition-colors capitalize ${
                    statusFilter === f
                      ? 'bg-white text-black border-white'
                      : 'bg-transparent text-gray-400 border-gray-700 hover:border-gray-500'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            {computedExpiredCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                disabled={bulkExpireMutation.isPending}
                onClick={() => bulkExpireMutation.mutate()}
                className="border-gray-600 text-gray-300 hover:bg-gray-800 text-xs h-7"
              >
                <Clock className="w-3 h-3 mr-1" />
                Mark Expired ({computedExpiredCount})
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500">No credentials match this filter.</p>
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
                {filtered.map((cred) => {
                  const badge = getCredentialBadgeState({ credential: cred, now, expiryDate: cred._expiryDate });
                  const expiryDisplay = cred._expiryDate
                    ? cred._expiryDate.toLocaleDateString()
                    : cred.expires_at
                    ? new Date(cred.expires_at).toLocaleDateString()
                    : '—';
                  return (
                    <TableRow key={cred.id} className="border-gray-700 hover:bg-gray-900/30">
                      <TableCell className="text-xs text-gray-300">{getUserName(cred.holder_media_user_id)}</TableCell>
                      <TableCell className="text-xs text-gray-300">{cred.roles?.join(', ') || '—'}</TableCell>
                      <TableCell className="text-xs text-gray-300">{cred.access_level || 'general'}</TableCell>
                      <TableCell>
                        <Badge className={BADGE_CLASSES[badge.variant] || BADGE_CLASSES.pending}>
                          {badge.label}
                        </Badge>
                        {cred._effectiveStatus === 'expired' && cred.status === 'active' && (
                          <span className="ml-1 text-xs text-orange-400">(computed)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-gray-300">
                        {cred.issued_at ? new Date(cred.issued_at).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-gray-300">{expiryDisplay}</TableCell>
                      <TableCell>
                        {cred._effectiveStatus === 'active' && (
                          <Button
                            size="sm"
                            onClick={() => handleRevokeClick(cred.id)}
                            className="h-6 px-2 text-xs bg-red-700 hover:bg-red-600"
                          >
                            Revoke
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
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
              <div className="bg-red-900/30 border border-red-700 rounded p-3 text-red-300 text-sm">{error}</div>
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
              <Button variant="outline" onClick={() => setRevokeDialogOpen(false)} className="border-gray-700 text-gray-300">
                Cancel
              </Button>
              <Button onClick={handleConfirmRevoke} disabled={revokeMutation.isPending} className="bg-red-700 hover:bg-red-600">
                {revokeMutation.isPending ? 'Revoking...' : 'Revoke'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}