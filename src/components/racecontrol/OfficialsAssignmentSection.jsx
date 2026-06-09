/**
 * R9BQ Sprint 2 — OfficialsAssignmentSection
 * Officials management surface for Event Settings panel.
 * Shown only to admin or users with canManageOfficials.
 */
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { UserPlus, UserCheck } from 'lucide-react';

const ROLES = [
  'Race Director', 'Competition Director', 'Chief Steward', 'Steward',
  'Technical Director', 'Technical Inspector', 'Registration Manager',
  'Timing and Scoring', 'Announcer', 'Media Director', 'Safety Director', 'Gate Staff',
];

const STATUSES = ['Invited', 'Confirmed', 'Active', 'Withdrawn'];

const STATUS_COLOR = {
  Invited: 'text-yellow-400',
  Confirmed: 'text-blue-400',
  Active: 'text-green-400',
  Withdrawn: 'text-gray-500',
};

export default function OfficialsAssignmentSection({ eventId }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [form, setForm] = useState({ user_id: '', role: '', notes: '' });

  const { data: officials = [], isLoading } = useQuery({
    queryKey: ['eventOfficials', eventId],
    queryFn: () => base44.entities.EventOfficial.filter({ event_id: eventId }, 'role', 50),
    enabled: !!eventId,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    await base44.functions.invoke('assignEventOfficial', {
      event_id: eventId,
      user_id: form.user_id,
      role: form.role,
      notes: form.notes || '',
    });
    await queryClient.invalidateQueries({ queryKey: ['eventOfficials', eventId] });
    setSaving(false);
    setForm({ user_id: '', role: '', notes: '' });
    setShowForm(false);
  };

  const handleStatusChange = async (officialId, newStatus) => {
    setUpdatingId(officialId);
    await base44.functions.invoke('updateOfficialStatus', {
      official_id: officialId,
      status: newStatus,
    });
    await queryClient.invalidateQueries({ queryKey: ['eventOfficials', eventId] });
    setUpdatingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-teal-400" />
          Event Officials
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowForm(s => !s)}
          className="border-gray-700 text-gray-300 hover:text-white text-xs gap-1.5">
          <UserPlus className="w-3.5 h-3.5" />
          Add Official
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="rounded-lg border border-gray-800 bg-gray-900/40 p-4 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">User ID *</Label>
            <Input required value={form.user_id} onChange={e => set('user_id', e.target.value)}
              className="bg-gray-900 border-gray-700 text-white text-sm" placeholder="User ID…" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Role *</Label>
            <Select value={form.role} onValueChange={v => set('role', v)} required>
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                <SelectValue placeholder="Select role…" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                {ROLES.map(r => <SelectItem key={r} value={r} className="text-gray-200">{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Notes (optional)</Label>
            <Input value={form.notes} onChange={e => set('notes', e.target.value)}
              className="bg-gray-900 border-gray-700 text-white text-sm" placeholder="Notes…" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)} className="text-gray-400">Cancel</Button>
            <Button type="submit" size="sm" disabled={saving || !form.user_id || !form.role}
              className="bg-teal-700 hover:bg-teal-600 text-white">
              {saving ? 'Assigning…' : 'Assign'}
            </Button>
          </div>
        </form>
      )}

      {isLoading && <p className="text-xs text-gray-500">Loading officials…</p>}

      {!isLoading && officials.length === 0 && (
        <p className="text-xs text-gray-600">No officials assigned yet.</p>
      )}

      {officials.map(off => (
        <div key={off.id} className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/30 px-3 py-2.5">
          <div>
            <p className="text-xs font-semibold text-gray-200">{off.role}</p>
            <p className="text-[10px] text-gray-500 font-mono">{off.user_id}</p>
            {off.notes && <p className="text-[10px] text-gray-600 mt-0.5">{off.notes}</p>}
          </div>
          <Select
            value={off.status}
            onValueChange={v => handleStatusChange(off.id, v)}
            disabled={updatingId === off.id}
          >
            <SelectTrigger className={`w-32 bg-transparent border-gray-700 text-xs ${STATUS_COLOR[off.status] || 'text-gray-400'}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              {STATUSES.map(s => <SelectItem key={s} value={s} className="text-gray-200 text-xs">{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}