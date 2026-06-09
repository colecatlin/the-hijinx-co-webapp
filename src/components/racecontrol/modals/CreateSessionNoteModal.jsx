/**
 * R9BQ Sprint 2 — CreateSessionNoteModal
 * Simple session note creation form. Backend is source of truth for permissions.
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

const NOTE_TYPES = [
  'Caution', 'Red Flag', 'Restart', 'Debris', 'Medical',
  'Weather', 'Penalty Notification', 'Protest Filed', 'General',
];

export default function CreateSessionNoteModal({ open, onClose, eventId, sessions = [] }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    note_type: 'General',
    session_id: '',
    lap_number: '',
    body: '',
    is_public: false,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await base44.functions.invoke('createSessionNote', {
      event_id: eventId,
      note_type: form.note_type,
      session_id: form.session_id || null,
      lap_number: form.lap_number ? parseInt(form.lap_number) : null,
      body: form.body,
      is_public: form.is_public,
    });
    await queryClient.invalidateQueries({ queryKey: ['sessionNotes', eventId] });
    setSaving(false);
    setForm({ note_type: 'General', session_id: '', lap_number: '', body: '', is_public: false });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-950 border-gray-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Add Session Note</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Note Type *</Label>
            <Select value={form.note_type} onValueChange={v => set('note_type', v)}>
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                {NOTE_TYPES.map(t => <SelectItem key={t} value={t} className="text-gray-200">{t}</SelectItem>)}
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

          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Lap # (optional)</Label>
            <Input type="number" value={form.lap_number} onChange={e => set('lap_number', e.target.value)}
              className="bg-gray-900 border-gray-700 text-white" placeholder="e.g. 6" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Note *</Label>
            <Textarea required value={form.body} onChange={e => set('body', e.target.value)}
              className="bg-gray-900 border-gray-700 text-white h-20" placeholder="Note content…" />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_public_note" checked={form.is_public} onChange={e => set('is_public', e.target.checked)}
              className="rounded border-gray-700" />
            <Label htmlFor="is_public_note" className="text-gray-400 text-xs cursor-pointer">Public note</Label>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} className="text-gray-400">Cancel</Button>
            <Button type="submit" disabled={saving || !form.body}
              className="bg-teal-700 hover:bg-teal-600 text-white">
              {saving ? 'Saving…' : 'Add Note'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}