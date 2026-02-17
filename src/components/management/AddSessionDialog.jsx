import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const EMPTY = { name: '', session_type: 'Race', laps: '', status: 'scheduled' };

// Predefined session name options with their auto-detected types
const SESSION_NAME_OPTIONS = [
  { name: 'Heat 1', type: 'Heat' },
  { name: 'Heat 2', type: 'Heat' },
  { name: 'Heat 3', type: 'Heat' },
  { name: 'Heat 4', type: 'Heat' },
  { name: 'LCQ', type: 'LCQ' },
  { name: 'Final', type: 'Feature' },
  { name: 'Practice', type: 'Practice' },
  { name: 'Qualifying', type: 'Qualifying' },
  { name: 'Race', type: 'Race' },
  { name: 'Main', type: 'Main' },
];

export default function AddSessionDialog({ open, onClose, onSessionCreated, eventId }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [duplicateError, setDuplicateError] = useState('');

  // Fetch existing sessions for this event to check duplicates
  const { data: allSessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => base44.entities.Session.list(),
  });
  const existingSessionNames = allSessions
    .filter(s => s.event_id === eventId)
    .map(s => s.name.toLowerCase());

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Session.create(data),
    onSuccess: (newSession) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      onSessionCreated(newSession.id);
      setForm(EMPTY);
      setDuplicateError('');
    },
  });

  const handleNameChange = (name) => {
    const option = SESSION_NAME_OPTIONS.find(o => o.name === name);
    setForm(f => ({ ...f, name, session_type: option ? option.type : f.session_type }));
    setDuplicateError('');
  };

  const handleSubmit = () => {
    if (existingSessionNames.includes(form.name.toLowerCase())) {
      setDuplicateError(`A session named "${form.name}" already exists for this event.`);
      return;
    }
    const payload = {
      ...form,
      event_id: eventId,
      laps: form.laps !== '' ? Number(form.laps) : undefined,
    };
    createMutation.mutate(payload);
  };

  const handleClose = () => { setForm(EMPTY); setDuplicateError(''); onClose(); };

  const availableOptions = SESSION_NAME_OPTIONS.filter(
    o => !existingSessionNames.includes(o.name.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add New Session</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="space-y-1">
            <Label>Session Name <span className="text-red-500">*</span></Label>
            <Select value={form.name} onValueChange={handleNameChange}>
              <SelectTrigger><SelectValue placeholder="Select session..." /></SelectTrigger>
              <SelectContent>
                {availableOptions.map(o => (
                  <SelectItem key={o.name} value={o.name}>{o.name}</SelectItem>
                ))}
                {availableOptions.length === 0 && (
                  <SelectItem value={null} disabled>All sessions already added</SelectItem>
                )}
              </SelectContent>
            </Select>
            {duplicateError && <p className="text-xs text-red-500">{duplicateError}</p>}
          </div>
          <div className="space-y-1">
            <Label>Session Type <span className="text-red-500">*</span></Label>
            <Select value={form.session_type} onValueChange={v => setForm({ ...form, session_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Practice">Practice</SelectItem>
                <SelectItem value="Qualifying">Qualifying</SelectItem>
                <SelectItem value="Heat">Heat</SelectItem>
                <SelectItem value="LCQ">LCQ (Last Chance Qualifier)</SelectItem>
                <SelectItem value="Main">Main</SelectItem>
                <SelectItem value="Race">Race</SelectItem>
                <SelectItem value="Feature">Feature</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Laps</Label>
            <Input type="number" min="0" value={form.laps} onChange={e => setForm({ ...form, laps: e.target.value })} placeholder="e.g. 10" />
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending || !form.name || !eventId || availableOptions.length === 0}>
            {createMutation.isPending ? 'Adding...' : 'Add Session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}