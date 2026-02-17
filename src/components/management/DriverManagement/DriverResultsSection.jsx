import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Trophy } from 'lucide-react';

const EMPTY_FORM = {
  program_id: '',
  event_id: '',
  session_id: '',
  position: '',
  status_text: 'Running',
  team_name: '',
  series: '',
  class: '',
  laps_completed: '',
  best_lap_time: '',
  points: '',
};

export default function DriverResultsSection({ driverId }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingResult, setEditingResult] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['driverResults', driverId],
    queryFn: () => base44.entities.Results.filter({ driver_id: driverId }),
  });

  const { data: programs = [] } = useQuery({
    queryKey: ['driverPrograms', driverId],
    queryFn: () => base44.entities.DriverProgram.filter({ driver_id: driverId }),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list(),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => base44.entities.Session.list(),
  });

  // Derive selected program's details for auto-filling series/class
  const selectedProgram = programs.find(p => p.id === form.program_id);

  // Sessions filtered by selected event
  const filteredSessions = sessions.filter(s => s.event_id === form.event_id);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Results.create({ ...data, driver_id: driverId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverResults', driverId] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Results.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverResults', driverId] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Results.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['driverResults', driverId] }),
  });

  const openAdd = () => {
    setEditingResult(null);
    setForm(EMPTY_FORM);
    setShowDialog(true);
  };

  const openEdit = (result) => {
    setEditingResult(result);
    // Find the event_id from the session if available
    const session = sessions.find(s => s.id === result.session_id);
    setForm({
      program_id: result.program_id || '',
      event_id: session?.event_id || result.event_id || '',
      session_id: result.session_id || '',
      position: result.position ?? '',
      status_text: result.status_text || 'Running',
      team_name: result.team_name || '',
      series: result.series || '',
      class: result.class || '',
      laps_completed: result.laps_completed ?? '',
      best_lap_time: result.best_lap_time || '',
      points: result.points ?? '',
    });
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingResult(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = () => {
    const payload = {
      ...form,
      position: form.position !== '' ? Number(form.position) : null,
      laps_completed: form.laps_completed !== '' ? Number(form.laps_completed) : null,
      points: form.points !== '' ? Number(form.points) : null,
    };
    if (editingResult) {
      updateMutation.mutate({ id: editingResult.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const getResultLabel = (result) => {
    if (result.session_id) {
      const session = sessions.find(s => s.id === result.session_id);
      if (session) {
        const event = events.find(e => e.id === session.event_id);
        return `${event?.name || 'Unknown Event'} — ${session.name}`;
      }
    }
    if (result.event_id) {
      const event = events.find(e => e.id === result.event_id);
      return event?.name || 'Unknown Event';
    }
    return '—';
  };

  const getResultDate = (result) => {
    if (result.session_id) {
      const session = sessions.find(s => s.id === result.session_id);
      if (session) {
        const event = events.find(e => e.id === session.event_id);
        return event?.event_date || '';
      }
    }
    if (result.event_id) {
      const event = events.find(e => e.id === result.event_id);
      return event?.event_date || '';
    }
    return '';
  };

  // Sort results by event date desc
  const sortedResults = [...results].sort((a, b) => {
    const dateA = getResultDate(a);
    const dateB = getResultDate(b);
    return (dateB || '').localeCompare(dateA || '');
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Race Results</h3>
          <p className="text-sm text-gray-500">{results.length} result{results.length !== 1 ? 's' : ''} recorded</p>
        </div>
        <Button onClick={openAdd} className="bg-gray-900">
          <Plus className="w-4 h-4 mr-2" />
          Add Result
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading results...</div>
      ) : sortedResults.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg text-gray-500">
          <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>No results yet. Add the first race result.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Event / Session</th>
                <th className="text-center px-4 py-3 font-semibold">Pos</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Series</th>
                <th className="text-left px-4 py-3 font-semibold">Class</th>
                <th className="text-center px-4 py-3 font-semibold">Laps</th>
                <th className="text-center px-4 py-3 font-semibold">Best Lap</th>
                <th className="text-center px-4 py-3 font-semibold">Pts</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedResults.map(result => (
                <tr key={result.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                   <div className="font-medium">{getResultLabel(result)}</div>
                   {getResultDate(result) && (
                     <div className="text-xs text-gray-500">{getResultDate(result)}</div>
                   )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {result.position ? (
                      <span className={`font-bold text-base ${result.position === 1 ? 'text-yellow-500' : result.position <= 3 ? 'text-gray-500' : ''}`}>
                        {result.position}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      result.status_text === 'Running' ? 'bg-green-100 text-green-800' :
                      result.status_text === 'DNF' ? 'bg-red-100 text-red-800' :
                      result.status_text === 'DNS' ? 'bg-yellow-100 text-yellow-800' :
                      result.status_text === 'DSQ' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {result.status_text || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{result.series || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{result.class || '—'}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{result.laps_completed ?? '—'}</td>
                  <td className="px-4 py-3 text-center text-gray-600 font-mono text-xs">{result.best_lap_time || '—'}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{result.points ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(result)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { if (confirm('Delete this result?')) deleteMutation.mutate(result.id); }}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={closeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingResult ? 'Edit Result' : 'Add Race Result'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">

            {/* Step 1: Program */}
            <div className="space-y-1">
              <Label>Program <span className="text-red-500">*</span></Label>
              <Select
                value={form.program_id}
                onValueChange={v => {
                  const prog = programs.find(p => p.id === v);
                  setForm(f => ({
                    ...f,
                    program_id: v,
                    event_id: '',
                    session_id: '',
                    series: prog?.series_name || f.series,
                    class: prog?.class_name || f.class,
                    team_name: prog?.team_name || f.team_name,
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select program..." />
                </SelectTrigger>
                <SelectContent>
                  {programs.map(prog => (
                    <SelectItem key={prog.id} value={prog.id}>
                      {prog.series_name} — {prog.class_name || 'No Class'} ({prog.season})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProgram && (
                <p className="text-xs text-gray-500">
                  Series: {selectedProgram.series_name} · Class: {selectedProgram.class_name || '—'} · Car #{selectedProgram.car_number || '—'}
                </p>
              )}
            </div>

            {/* Step 2: Event */}
            <div className="space-y-1">
              <Label>Event <span className="text-red-500">*</span></Label>
              <Select
                value={form.event_id}
                onValueChange={v => setForm(f => ({ ...f, event_id: v, session_id: '' }))}
                disabled={!form.program_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder={form.program_id ? "Select event..." : "Select a program first"} />
                </SelectTrigger>
                <SelectContent>
                  {events.sort((a, b) => (b.event_date || '').localeCompare(a.event_date || '')).map(event => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}{event.event_date ? ` — ${event.event_date}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 3: Session (optional) */}
            <div className="space-y-1">
              <Label>Session <span className="text-gray-400 text-xs font-normal">(optional — for future T&S integration)</span></Label>
              <Select
                value={form.session_id}
                onValueChange={v => setForm(f => ({ ...f, session_id: v }))}
                disabled={!form.event_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder={form.event_id ? (filteredSessions.length ? "Select session..." : "No sessions for this event") : "Select an event first"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredSessions.map(session => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.name} ({session.session_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Finishing Position</Label>
                <Input type="number" min="1" placeholder="e.g. 1" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status_text} onValueChange={v => setForm(f => ({ ...f, status_text: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Running">Running (Finished)</SelectItem>
                    <SelectItem value="DNF">DNF</SelectItem>
                    <SelectItem value="DNS">DNS</SelectItem>
                    <SelectItem value="DSQ">DSQ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Series</Label>
                <Input placeholder="e.g. SCORE" value={form.series} onChange={e => setForm(f => ({ ...f, series: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Class</Label>
                <Input placeholder="e.g. Pro 4" value={form.class} onChange={e => setForm(f => ({ ...f, class: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Team Name</Label>
              <Input placeholder="Team name at time of race" value={form.team_name} onChange={e => setForm(f => ({ ...f, team_name: e.target.value }))} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Laps</Label>
                <Input type="number" min="0" placeholder="0" value={form.laps_completed} onChange={e => setForm(f => ({ ...f, laps_completed: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Best Lap</Label>
                <Input placeholder="1:23.456" value={form.best_lap_time} onChange={e => setForm(f => ({ ...f, best_lap_time: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Points</Label>
                <Input type="number" min="0" placeholder="0" value={form.points} onChange={e => setForm(f => ({ ...f, points: e.target.value }))} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={isPending || !form.program_id || !form.event_id}>
                {isPending ? 'Saving...' : editingResult ? 'Save Changes' : 'Add Result'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}