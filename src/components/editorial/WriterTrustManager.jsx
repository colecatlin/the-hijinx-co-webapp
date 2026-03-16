// WriterTrustManager — lets admins/editors manage writer trust levels on MediaProfiles.
// Can be embedded in ManageMediaApplications or any editorial management page.

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Shield, Zap, X } from 'lucide-react';
import { toast } from 'sonner';
import { WRITER_TRUST_LEVELS, logSubmissionEvent } from '@/components/editorial/editorialBridge';

export default function WriterTrustManager({ currentUser }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [editTrust, setEditTrust] = useState('');
  const [editCanPublish, setEditCanPublish] = useState(false);
  const [editNotes, setEditNotes] = useState('');

  const queryClient = useQueryClient();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['allMediaProfiles'],
    queryFn: () => base44.entities.MediaProfile.list('-created_date', 200),
  });

  const filtered = profiles.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.display_name?.toLowerCase().includes(q) || p.user_id?.includes(q);
  });

  const openEdit = (profile) => {
    setSelected(profile);
    setEditTrust(profile.writer_trust_level || 'none');
    setEditCanPublish(profile.can_publish_without_review || false);
    setEditNotes(profile.trust_notes || '');
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const prev = selected.writer_trust_level || 'none';
      const isGrant = editTrust !== 'none' && prev === 'none';
      const isRevoke = editTrust === 'none' && prev !== 'none';
      const isPromotion = editTrust !== prev && editTrust !== 'none';

      const update = {
        writer_trust_level: editTrust,
        can_publish_without_review: editCanPublish,
        trust_notes: editNotes,
      };

      if (isGrant || isPromotion) {
        update.verified_writer_since = selected.verified_writer_since || new Date().toISOString();
      }
      if (isRevoke) {
        update.can_publish_without_review = false;
      }

      await base44.entities.MediaProfile.update(selected.id, update);

      const op = isRevoke
        ? 'verified_writer_status_revoked'
        : isGrant
        ? 'verified_writer_status_granted'
        : 'writer_trust_level_changed';

      await logSubmissionEvent(op, {
        mediaProfileId: selected.id,
        actedByUserId: currentUser?.id,
        previousTrustLevel: prev,
        newTrustLevel: editTrust,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allMediaProfiles'] });
      setSelected(null);
      toast.success('Writer trust level updated');
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-bold">Writer Trust Management</h3>
          <p className="text-sm text-gray-500">Control editorial publish permissions for contributors</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search contributors…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 text-sm"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Contributor</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Trust Level</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell">Direct Publish</th>
                <th className="w-16 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(profile => {
                const trustInfo = WRITER_TRUST_LEVELS[profile.writer_trust_level || 'none'];
                return (
                  <tr key={profile.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{profile.display_name || 'Unnamed'}</p>
                      {profile.primary_outlet_name && (
                        <p className="text-xs text-gray-400">{profile.primary_outlet_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={trustInfo.color + ' text-xs'}>{trustInfo.label}</Badge>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {profile.can_publish_without_review ? (
                        <span className="flex items-center gap-1 text-teal-600 text-xs font-medium">
                          <Zap className="w-3 h-3" /> Enabled
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Review required</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" onClick={() => openEdit(profile)}>
                        <Shield className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Dialog */}
      {selected && (
        <Dialog open onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Writer Trust — {selected.display_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Trust Level</label>
                <Select value={editTrust} onValueChange={setEditTrust}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(WRITER_TRUST_LEVELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Verified Writer and above are eligible for direct publish (if also enabled below).
                </p>
              </div>

              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium">Can Publish Without Review</p>
                  <p className="text-xs text-gray-500">Only applies to verified writers and above</p>
                </div>
                <Switch
                  checked={editCanPublish}
                  onCheckedChange={setEditCanPublish}
                  disabled={!['verified_writer', 'senior_writer', 'editor'].includes(editTrust)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Trust Notes</label>
                <Textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Internal editorial notes on this trust decision…"
                  rows={3}
                  className="text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="bg-[#232323] hover:bg-[#1A3249]"
                >
                  Save Trust Level
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}