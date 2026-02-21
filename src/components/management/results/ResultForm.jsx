import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SESSION_TYPES = ['Practice', 'Qualifying', 'Heat 1', 'Heat 2', 'Heat 3', 'Heat 4', 'LCQ', 'Final'];
const STATUS_OPTIONS = ['Running', 'DNF', 'DNS', 'DSQ'];

export default function ResultForm({ initialData = {}, onSuccess, onCancel }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    driver_id: '',
    event_id: '',
    session_type: 'Final',
    position: '',
    status_text: 'Running',
    series: '',
    class: '',
    team_name: '',
    points: '',
    laps_completed: '',
    best_lap_time: '',
    ...initialData,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-event_date', 200),
  });

  const { data: programs = [] } = useQuery({
    queryKey: ['driver-programs'],
    queryFn: () => base44.entities.DriverProgram.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      // Find a matching program_id if possible
      const program = programs.find(p => p.driver_id === data.driver_id);
      const payload = {
        ...data,
        program_id: data.program_id || program?.id || '',
        position: data.position ? Number(data.position) : null,
        points: data.points !== '' ? Number(data.points) : null,
        laps_completed: data.laps_completed !== '' ? Number(data.laps_completed) : null,
      };
      if (initialData.id) return base44.entities.Results.update(initialData.id, payload);
      return base44.entities.Results.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['results'] });
      onSuccess?.();
    },
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Driver *</Label>
          <Select value={form.driver_id} onValueChange={v => set('driver_id', v)}>
            <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
            <SelectContent>
              {drivers.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Event *</Label>
          <Select value={form.event_id} onValueChange={v => set('event_id', v)}>
            <SelectTrigger><SelectValue placeholder="Select event" /></SelectTrigger>
            <SelectContent>
              {events.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.name} ({e.event_date})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Session Type</Label>
          <Select value={form.session_type} onValueChange={v => set('session_type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SESSION_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Finishing Position</Label>
          <Input type="number" value={form.position} onChange={e => set('position', e.target.value)} placeholder="e.g. 1" />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={form.status_text} onValueChange={v => set('status_text', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Points</Label>
          <Input type="number" value={form.points} onChange={e => set('points', e.target.value)} placeholder="e.g. 40" />
        </div>
        <div>
          <Label>Series</Label>
          <Input value={form.series} onChange={e => set('series', e.target.value)} placeholder="e.g. Lucas Oil Off Road" />
        </div>
        <div>
          <Label>Class</Label>
          <Input value={form.class} onChange={e => set('class', e.target.value)} placeholder="e.g. Pro 4" />
        </div>
        <div>
          <Label>Team Name</Label>
          <Input value={form.team_name} onChange={e => set('team_name', e.target.value)} placeholder="e.g. Chaney Off Road" />
        </div>
        <div>
          <Label>Laps Completed</Label>
          <Input type="number" value={form.laps_completed} onChange={e => set('laps_completed', e.target.value)} placeholder="e.g. 15" />
        </div>
        <div>
          <Label>Best Lap Time</Label>
          <Input value={form.best_lap_time} onChange={e => set('best_lap_time', e.target.value)} placeholder="e.g. 1:32.456" />
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        {onCancel && <Button variant="outline" onClick={onCancel}>Cancel</Button>}
        <Button
          className="bg-gray-900 text-white"
          onClick={() => saveMutation.mutate(form)}
          disabled={!form.driver_id || !form.event_id || saveMutation.isPending}
        >
          {saveMutation.isPending ? 'Saving...' : initialData.id ? 'Update Result' : 'Add Result'}
        </Button>
      </div>
    </div>
  );
}