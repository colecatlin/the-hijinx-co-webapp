import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const EMPTY = { name: '', session_type: 'Race', laps: '', status: 'scheduled' };

export default function AddSessionDialog({ open, onClose, onSessionCreated, eventId }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Session.create(data),
    onSuccess: (newSession) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      onSessionCreated(newSession.id);
      setForm(EMPTY);
    },
  });

  const handleSubmit = () => {
    const payload = {
      ...form,
      event_id: eventId,
      laps: form.laps !== '' ? Number(form.laps) : undefined,
    };
    createMutation.mutate(payload);
  };

  const handleClose = () => { setForm(EMPTY); onClose(); };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add New Session</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="space-y-1">
            <Label>Session Name <span className="text-red-500">*</span></Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Heat 1" />
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
          <Button onClick={handleSubmit} disabled={createMutation.isPending || !form.name || !eventId}>
            {createMutation.isPending ? 'Adding...' : 'Add Session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}