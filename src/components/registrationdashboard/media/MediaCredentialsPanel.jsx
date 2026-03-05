import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const STATUS_COLORS = {
  active: 'bg-green-900/60 text-green-300',
  revoked: 'bg-red-900/60 text-red-300',
  expired: 'bg-gray-700 text-gray-400',
  pending: 'bg-yellow-900/60 text-yellow-300',
};

export default function MediaCredentialsPanel({ dashboardContext, selectedEvent, currentUser, isAdmin, invalidateAfterOperation }) {
  const [selected, setSelected] = useState(null);
  const [editRoles, setEditRoles] = useState('');
  const [editAccessLevel, setEditAccessLevel] = useState('');
  const [editExpiresAt, setEditExpiresAt] = useState('');
  const queryClient = useQueryClient();

  const entityId = dashboardContext?.orgId;
  const eventId = selectedEvent?.id;

  const { data: credentials = [] } = useQuery({
    queryKey: ['mediaCredentials', { entityId, eventId }],
    queryFn: async () => {
      const all = await base44.entities.MediaCredential.list();
      return all.filter(c =>
        c.issuer_entity_id === entityId ||
        (eventId && c.scope_entity_id === eventId)
      ).sort((a, b) => new Date(b.issued_at || b.created_date) - new Date(a.issued_at || a.created_date));
    },
    enabled: !!entityId,
  });

  const { data: mediaUsers = [] } = useQuery({
    queryKey: ['media_users'],
    queryFn: () => base44.entities.MediaUser.list(),
  });

  const getUserName = (id) => mediaUsers.find(u => u.id === id)?.full_name || id?.slice(0,8) || '—';

  const openEdit = (cred) => {
    setSelected(cred);
    setEditRoles(cred.roles?.join(', ') || '');
    setEditAccessLevel(cred.access_level || 'general');
    setEditExpiresAt(cred.expires_at ? cred.expires_at.slice(0, 10) : '');
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.MediaCredential.update(selected.id, {
        roles: editRoles.split(',').map(r => r.trim()).filter(Boolean),
        access_level: editAccessLevel,
        ...(editExpiresAt && { expires_at: new Date(editExpiresAt).toISOString() }),
        updated_at: new Date().toISOString(),
      });
      invalidateAfterOperation?.('media_credential_updated');
      queryClient.invalidateQueries({ queryKey: ['mediaCredentials'] });
      toast.success('Credential updated');
      setSelected(null);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (credId) => {
      await base44.entities.MediaCredential.update(credId, {
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revoked_by_user_id: currentUser?.id,
      });
      invalidateAfterOperation?.('media_credential_updated');
      queryClient.invalidateQueries({ queryKey: ['mediaCredentials'] });
      toast.success('Credential revoked');
      setSelected(null);
    },
  });

  return (
    <Card className="bg-[#1A1A1A] border-gray-800">
      <CardHeader>
        <CardTitle className="text-white text-sm">Issued Credentials</CardTitle>
      </CardHeader>
      <CardContent>
        {credentials.length === 0 ? (
          <p className="text-gray-500 text-sm">No credentials for this context.</p>
        ) : (
          <div className="space-y-2">
            {credentials.map(cred => (
              <div key={cred.id} className="bg-[#262626] border border-gray-700 rounded p-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-white text-xs font-medium">{getUserName(cred.holder_media_user_id)}</p>
                  <p className="text-gray-500 text-xs">{cred.access_level} • {cred.roles?.join(', ') || '—'}</p>
                  {cred.expires_at && <p className="text-gray-600 text-xs">Expires: {new Date(cred.expires_at).toLocaleDateString()}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_COLORS[cred.status] || 'bg-gray-700 text-gray-300'}>{cred.status}</Badge>
                  <Button size="sm" variant="outline" className="h-6 px-2 text-xs border-gray-700 text-gray-300" onClick={() => openEdit(cred)}>Edit</Button>
                  {cred.status === 'active' && (
                    <Button size="sm" className="h-6 px-2 text-xs bg-red-800 hover:bg-red-700" onClick={() => revokeMutation.mutate(cred.id)} disabled={revokeMutation.isPending}>Revoke</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="bg-[#262626] border-gray-700 max-w-md">
          <DialogHeader><DialogTitle className="text-white">Edit Credential</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Roles (comma separated)</label>
                <Input value={editRoles} onChange={e => setEditRoles(e.target.value)} className="bg-[#1A1A1A] border-gray-700 text-white" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Access Level</label>
                <Select value={editAccessLevel} onValueChange={setEditAccessLevel}>
                  <SelectTrigger className="bg-[#1A1A1A] border-gray-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-gray-700">
                    {['general','pit','hot_pit','restricted','drone','all_access'].map(l => (
                      <SelectItem key={l} value={l} className="text-white">{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Expires At (optional)</label>
                <Input type="date" value={editExpiresAt} onChange={e => setEditExpiresAt(e.target.value)} className="bg-[#1A1A1A] border-gray-700 text-white" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" className="border-gray-700 text-gray-300" onClick={() => setSelected(null)}>Cancel</Button>
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-blue-700 hover:bg-blue-600">Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}