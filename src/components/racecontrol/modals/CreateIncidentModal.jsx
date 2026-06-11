/**
 * R9BQ Sprint 2 — CreateIncidentModal
 * Simple incident creation form. Backend is source of truth for permissions.
 */
import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import IncidentParticipantPicker from './IncidentParticipantPicker';

const INCIDENT_TYPES = [
  'On-Track Contact', 'Mechanical Failure', 'Safety Violation', 'Conduct Violation',
  'Technical Infraction', 'Medical', 'Property Damage', 'Environmental', 'Other',
];
const SEVERITIES = ['Informational', 'Minor', 'Significant', 'Major', 'Serious'];

export default function CreateIncidentModal({ open, onClose, eventId, sessions = [], entries = [], drivers = [] }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [involvedDriverIds, setInvolvedDriverIds] = useState([]);
  const [form, setForm] = useState({
    incident_type: '',
    severity: 'Minor',
    session_id: '',
    lap_number: '',
    location_description: '',
    description: '',
    is_medical: false,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await base44.functions.invoke('createIncident', {
      event_id: eventId,
      incident_type: form.incident_type,
      severity: form.severity,
      session_id: form.session_id || null,
      lap_number: form.lap_number ? parseInt(form.lap_number) : null,
      location_description: form.location_description || null,
      description: form.description,
      is_medical: form.is_medical,
      involved_driver_ids: involvedDriverIds.length > 0 ? involvedDriverIds : [],
    });
    await queryClient.invalidateQueries({ queryKey: ['incidents', eventId] });
    setSaving(false);
    setInvolvedDriverIds([]);
    setForm({ incident_type: '', severity: 'Minor', session_id: '', lap_number: '', location_description: '', description: '', is_medical: false });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-950 border-gray-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Create Incident Report</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Incident Type *</Label>
            <Select value={form.incident_type} onValueChange={v => set('incident_type', v)} required>
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                <SelectValue placeholder="Select type…" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                {INCIDENT_TYPES.map(t => <SelectItem key={t} value={t} className="text-gray-200">{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Severity *</Label>
            <Select value={form.severity} onValueChange={v => set('severity', v)}>
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                {SEVERITIES.map(s => <SelectItem key={s} value={s} className="text-gray-200">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {sessions.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs">Session (optional)</Label>
              <Select value={form.session_id} onValueChange={v => set('session_id', v)}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue placeholder="No session selected" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {sessions.map(s => <SelectItem key={s.id} value={s.id} className="text-gray-200">{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs">Lap # (optional)</Label>
              <Input type="number" value={form.lap_number} onChange={e => set('lap_number', e.target.value)}
                className="bg-gray-900 border-gray-700 text-white" placeholder="e.g. 4" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs">Location (optional)</Label>
              <Input value={form.location_description} onChange={e => set('location_description', e.target.value)}
                className="bg-gray-900 border-gray-700 text-white" placeholder="e.g. Turn 3" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Description *</Label>
            <Textarea required value={form.description} onChange={e => set('description', e.target.value)}
              className="bg-gray-900 border-gray-700 text-white h-20" placeholder="Describe the incident…" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Involved Drivers</Label>
            <IncidentParticipantPicker
              entries={entries}
              drivers={drivers}
              selectedDriverIds={involvedDriverIds}
              onChange={setInvolvedDriverIds}
            />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_medical" checked={form.is_medical} onChange={e => set('is_medical', e.target.checked)}
              className="rounded border-gray-700" />
            <Label htmlFor="is_medical" className="text-gray-400 text-xs cursor-pointer">Medical incident</Label>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} className="text-gray-400">Cancel</Button>
            <Button type="submit" disabled={saving || !form.incident_type || !form.description}
              className="bg-orange-700 hover:bg-orange-600 text-white">
              {saving ? 'Creating…' : 'Create Incident'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}