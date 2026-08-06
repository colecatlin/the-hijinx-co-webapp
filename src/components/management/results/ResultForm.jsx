import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isResultOperational } from '@/components/registrationdashboard/sessionLifecycle';

const SESSION_TYPES = ['Practice', 'Qualifying', 'Heat', 'LCQ', 'Final'];
const STATUS_OPTIONS = ['Running', 'DNF', 'DNS', 'DSQ'];

export default function ResultForm({ initialData = {}, sessions = [], onSuccess, onCancel }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    driver_id: '',
    event_id: '',
    session_id: '',
    session_type: 'Heat',
    heat_number: '',
    position: '',
    status_text: 'Running',
    series_id: '',
    series_class_id: '',
    team_id: '',
    points: '',
    laps_completed: '',
    best_lap_time_ms: '',
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
    mutationFn: async (data) => {
      // Find a matching program_id if possible
      const program = programs.find(p => p.driver_id === data.driver_id);
      const payload = {
        ...data,
        program_id: data.program_id || program?.id || '',
        session_id: data.session_id || null,
        position: data.position ? Number(data.position) : null,
        points: data.points !== '' ? Number(data.points) : null,
        laps_completed: data.laps_completed !== '' ? Number(data.laps_completed) : null,
      };
      // Phase 5: Route through authoritative upsertOperationalResult orchestrator
      const res = await base44.functions.invoke('upsertOperationalResult', {
        payload,
        source_path: 'result_form',
      });
      if (!res?.data?.record) {
        throw new Error(res?.data?.errors?.[0]?.message || 'Failed to save result');
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['results'] });
      onSuccess?.();
    },
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setEventId = (val) => setForm(f => ({ ...f, event_id: val, session_id: '' }));

  const sessionsForEvent = sessions.filter(s => s.event_id === form.event_id);

  const isOperational = isResultOperational(initialData, sessions);

  return (
    <>
      {isOperational && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-800"><strong>Operational Result:</strong> Lifecycle fields are locked. Modify through RegistrationDashboard only.</p>
        </div>
      )}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Driver *</Label>
            <Select value={form.driver_id} onValueChange={v => set('driver_id', v)} disabled={isOperational}>
              <SelectTrigger disabled={isOperational}><SelectValue placeholder="Select driver" /></SelectTrigger>
              <SelectContent>
                {drivers.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Event *</Label>
            <Select value={form.event_id} onValueChange={setEventId} disabled={isOperational}>
              <SelectTrigger disabled={isOperational}><SelectValue placeholder="Select event" /></SelectTrigger>
              <SelectContent>
                {events.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name} ({e.event_date})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Linked Session {isOperational && '(Locked)'}</Label>
            <Select
              value={form.session_id}
              onValueChange={v => set('session_id', v)}
              disabled={isOperational || !form.event_id}
            >
              <SelectTrigger disabled={isOperational || !form.event_id}>
                <SelectValue placeholder={!form.event_id ? 'Select an event first' : sessionsForEvent.length === 0 ? 'No sessions found for this event' : 'Select session (optional)'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>— None —</SelectItem>
                {sessionsForEvent.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name || s.session_type || 'Unnamed Session'} ({s.session_type || 'Session'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">Optional. Linking a result to a session allows lifecycle and publishing rules to apply correctly.</p>
          </div>
        <div>
          <Label>Session Type {isOperational && '(Locked)'}</Label>
          <Select value={form.session_type} onValueChange={v => set('session_type', v)} disabled={isOperational}>
            <SelectTrigger disabled={isOperational}><SelectValue /></SelectTrigger>
            <SelectContent>
              {SESSION_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {form.session_type === 'Heat' && (
          <div>
            <Label>Heat Number</Label>
            <Input type="number" value={form.heat_number} onChange={e => set('heat_number', e.target.value)} placeholder="e.g. 1" disabled={isOperational} />
          </div>
        )}
        <div>
          <Label>Finishing Position {isOperational && '(Locked)'}</Label>
          <Input type="number" value={form.position} onChange={e => set('position', e.target.value)} placeholder="e.g. 1" disabled={isOperational} />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={form.status_text} onValueChange={v => set('status_text', v)} disabled={isOperational}>
            <SelectTrigger disabled={isOperational}><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Points</Label>
          <Input type="number" value={form.points} onChange={e => set('points', e.target.value)} placeholder="e.g. 40" disabled={isOperational} />
        </div>
        <div>
          <Label>Laps Completed {isOperational && '(Locked)'}</Label>
          <Input type="number" value={form.laps_completed} onChange={e => set('laps_completed', e.target.value)} placeholder="e.g. 15" disabled={isOperational} />
        </div>
        <div>
          <Label>Best Lap Time (ms) {isOperational && '(Locked)'}</Label>
          <Input type="number" value={form.best_lap_time_ms} onChange={e => set('best_lap_time_ms', e.target.value)} placeholder="e.g. 92456" disabled={isOperational} />
        </div>
      </div>
        <div className="flex gap-2 justify-end pt-2">
          {onCancel && <Button variant="outline" onClick={onCancel}>Cancel</Button>}
          <Button
            className="bg-gray-900 text-white"
            onClick={() => saveMutation.mutate(form)}
            disabled={!form.driver_id || !form.event_id || saveMutation.isPending || isOperational}
          >
            {saveMutation.isPending ? 'Saving...' : initialData.id ? 'Update Result' : 'Add Result'}
          </Button>
        </div>
      </div>
    </>
  );
}