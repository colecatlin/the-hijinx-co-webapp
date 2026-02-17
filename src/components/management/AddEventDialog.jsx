import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const EMPTY = { name: '', track_id: '', series: '', season: '', event_date: '', end_date: '', status: 'upcoming', round_number: '' };

export default function AddEventDialog({ open, onClose, onEventCreated, series, season }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (open) setForm(f => ({ ...f, series: series || '', season: season || '' }));
  }, [open, series, season]);

  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Event.create(data),
    onSuccess: (newEvent) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      onEventCreated(newEvent.id);
      setForm(EMPTY);
    },
  });

  const handleSubmit = () => {
    const payload = {
      ...form,
      round_number: form.round_number !== '' ? Number(form.round_number) : undefined,
    };
    if (!payload.track_id) delete payload.track_id;
    if (!payload.end_date) delete payload.end_date;
    createMutation.mutate(payload);
  };

  const handleClose = () => { setForm(EMPTY); onClose(); };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Event</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="space-y-1">
            <Label>Event Name <span className="text-red-500">*</span></Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Baja 1000 2026" />
          </div>
          <div className="space-y-1">
            <Label>Track</Label>
            <Select value={form.track_id} onValueChange={v => setForm({ ...form, track_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select track..." /></SelectTrigger>
              <SelectContent>
                {tracks.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}{t.location_city ? ` — ${t.location_city}` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Series</Label>
              <Input value={form.series} onChange={e => setForm({ ...form, series: e.target.value })} placeholder="e.g. SCORE" />
            </div>
            <div className="space-y-1">
              <Label>Season</Label>
              <Input value={form.season} onChange={e => setForm({ ...form, season: e.target.value })} placeholder="e.g. 2026" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Event Date <span className="text-red-500">*</span></Label>
              <Input type="date" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>End Date</Label>
              <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Round #</Label>
              <Input type="number" min="1" value={form.round_number} onChange={e => setForm({ ...form, round_number: e.target.value })} placeholder="e.g. 1" />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending || !form.name || !form.event_date}>
            {createMutation.isPending ? 'Adding...' : 'Add Event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}