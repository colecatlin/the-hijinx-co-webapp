import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Trophy } from 'lucide-react';
import AddEventDialog from '../AddEventDialog';
import AddSessionDialog from '../AddSessionDialog';

const EMPTY_FORM = {
  program_id: '',
  event_id: '',
  session_id: '',
  position: '',
  status_text: 'Running',
  laps_completed: '',
  best_lap_time: '',
  points: '',
};

export default function DriverResultsSection({ driverId }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingResult, setEditingResult] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showAddEventDialog, setShowAddEventDialog] = useState(false);
  const [showAddSessionDialog, setShowAddSessionDialog] = useState(false);

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

  const selectedProgram = programs.find(p => p.id === form.program_id);
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
    const session = sessions.find(s => s.id === result.session_id);
    setForm({
      program_id: result.program_id || '',
      event_id: session?.event_id || result.event_id || '',
      session_id: result.session_id || '',
      position: result.position ?? '',
      status_text: result.status_text || 'Running',
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
      session_id: form.session_id || null,
      position: form.position !== '' ? Number(form.position) : null,
      laps_completed: form.laps_completed !== '' ? Number(form.laps_completed) : null,
      points: form.points !== '' ? Number(form.points) : null,
      // Auto-populate from selected program
      series: selectedProgram?.series_name || '',
      class: selectedProgram?.class_name || '',
      team_name: selectedProgram?.team_name || '',
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
                      {result.status_text === 'Running' ? 'Finished' : result.status_text || '—'}
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

            {/* Program */}
            <div className="space-y-1">
              <Label>Program <span className="text-red-500">*</span></Label>
              <Select
                value={form.program_id}
                onValueChange={v => {
                  setForm(f => ({ ...f, program_id: v, event_id: '', session_id: '' }));
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
                  Team: {selectedProgram.team_name || '—'} · Series: {selectedProgram.series_name} · Class: {selectedProgram.class_name || '—'} · Car #{selectedProgram.car_number || '—'}
                </p>
              )}
            </div>

            {/* Event */}
            <div className="space-y-1">
              <Label>Event <span className="text-red-500">*</span></Label>
              <Select
                value={form.event_id}
                onValueChange={v => {
                  if (v === '__add_event__') {
                    setShowAddEventDialog(true);
                  } else {
                    setForm(f => ({ ...f, event_id: v, session_id: '' }));
                  }
                }}
                disabled={!form.program_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder={form.program_id ? "Select event..." : "Select a program first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__add_event__" className="text-blue-600 font-medium">+ Create New Event</SelectItem>
                  {events.sort((a, b) => (b.event_date || '').localeCompare(a.event_date || '')).map(event => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}{event.event_date ? ` — ${event.event_date}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Session (optional) */}
            <div className="space-y-1">
              <Label>Session <span className="text-gray-400 text-xs font-normal">(optional)</span></Label>
              <Select
                value={form.session_id}
                onValueChange={v => {
                  if (v === '__add_session__') {
                    setShowAddSessionDialog(true);
                  } else {
                    setForm(f => ({ ...f, session_id: v }));
                  }
                }}
                disabled={!form.event_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder={form.event_id ? (filteredSessions.length ? "Select session..." : "No sessions — create one") : "Select an event first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__add_session__" className="text-blue-600 font-medium">+ Create New Session</SelectItem>
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
                    <SelectItem value="Running">Finished</SelectItem>
                    <SelectItem value="DNF">DNF</SelectItem>
                    <SelectItem value="DNS">DNS</SelectItem>
                    <SelectItem value="DSQ">DSQ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Laps Completed</Label>
                <Input type="number" min="0" placeholder="0" value={form.laps_completed} onChange={e => setForm(f => ({ ...f, laps_completed: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Best Lap Time</Label>
                <Input placeholder="1:23.456" value={form.best_lap_time} onChange={e => setForm(f => ({ ...f, best_lap_time: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-gray-400">Points <span className="text-xs font-normal">(auto-calculated in future)</span></Label>
              <Input type="number" min="0" placeholder="—" value={form.points} disabled className="bg-gray-50 text-gray-400" />
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

      <AddEventDialog
        open={showAddEventDialog}
        onClose={() => setShowAddEventDialog(false)}
        onEventCreated={(newEventId) => {
          setForm(f => ({ ...f, event_id: newEventId, session_id: '' }));
          setShowAddEventDialog(false);
        }}
        series={selectedProgram?.series_name}
        season={selectedProgram?.season}
      />

      <AddSessionDialog
        open={showAddSessionDialog}
        onClose={() => setShowAddSessionDialog(false)}
        onSessionCreated={(newSessionId) => {
          setForm(f => ({ ...f, session_id: newSessionId }));
          setShowAddSessionDialog(false);
        }}
        eventId={form.event_id}
      />
    </div>
  );
}