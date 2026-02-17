import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Trophy, ChevronDown, ChevronUp, X } from 'lucide-react';
import AddEventDialog from '../AddEventDialog';
import AddSessionDialog from '../AddSessionDialog';

const EMPTY_SESSION_ENTRY = {
  session_type: '',
  position: '',
  status_text: 'Running',
  laps_completed: '',
  best_lap_time: '',
  points: '',
  _expanded: true,
  _key: Date.now(),
};

const SESSION_TYPES = ['Practice', 'Qualifying', 'Heat 1', 'Heat 2', 'Heat 3', 'Heat 4', 'LCQ', 'Final'];

const EMPTY_FORM = {
  program_id: '',
  event_id: '',
};

export default function DriverResultsSection({ driverId }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null); // event_id being edited
  const [form, setForm] = useState(EMPTY_FORM);
  const [sessionEntries, setSessionEntries] = useState([{ ...EMPTY_SESSION_ENTRY, _key: Date.now() }]);
  const [showAddEventDialog, setShowAddEventDialog] = useState(false);
  const [showAddSessionDialog, setShowAddSessionDialog] = useState(false);
  const [addingSessionForIndex, setAddingSessionForIndex] = useState(null);

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['driverResults', driverId] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Results.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['driverResults', driverId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Results.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['driverResults', driverId] }),
  });

  const openAdd = () => {
    setEditingEventId(null);
    setForm(EMPTY_FORM);
    setSessionEntries([{ ...EMPTY_SESSION_ENTRY, _key: Date.now() }]);
    setShowDialog(true);
  };

  // Group results by event for the "edit" flow
  const openEdit = (eventId) => {
    const eventResults = results.filter(r => {
      const session = sessions.find(s => s.id === r.session_id);
      return session?.event_id === eventId || r.event_id === eventId;
    });
    if (!eventResults.length) return;

    const firstResult = eventResults[0];
    setEditingEventId(eventId);
    setForm({
      program_id: firstResult.program_id || '',
      event_id: eventId,
    });
    setSessionEntries(
      eventResults.map(r => {
        const s = sessions.find(sess => sess.id === r.session_id);
        return {
          _resultId: r.id,
          session_id: r.session_id || '',
          session_type: r.session_type || s?.session_type || '',
          position: r.position ?? '',
          status_text: r.status_text || 'Running',
          laps_completed: r.laps_completed ?? '',
          best_lap_time: r.best_lap_time || '',
          points: r.points ?? '',
          _expanded: true,
          _key: r.id,
        };
      })
    );
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingEventId(null);
    setForm(EMPTY_FORM);
    setSessionEntries([{ ...EMPTY_SESSION_ENTRY, _key: Date.now() }]);
  };

  const handleSubmit = async () => {
    const base = {
      program_id: form.program_id,
      event_id: form.event_id,
      series: selectedProgram?.series_name || '',
      class: selectedProgram?.class_name || '',
      team_name: selectedProgram?.team_name || '',
      driver_id: driverId,
    };

    for (const entry of sessionEntries) {
      // Find the matching session by type within the selected event
      const matchedSession = filteredSessions.find(s => s.session_type === entry.session_type);
      const payload = {
        ...base,
        session_id: matchedSession?.id || entry.session_id || null,
        session_type: entry.session_type || null,
        position: entry.position !== '' ? Number(entry.position) : null,
        status_text: entry.status_text,
        laps_completed: entry.laps_completed !== '' ? Number(entry.laps_completed) : null,
        best_lap_time: entry.best_lap_time || '',
        points: entry.points !== '' ? Number(entry.points) : null,
      };

      if (entry._resultId) {
        await updateMutation.mutateAsync({ id: entry._resultId, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
    }
    closeDialog();
  };

  const addSessionEntry = () => {
    setSessionEntries(prev => [...prev, { ...EMPTY_SESSION_ENTRY, _key: Date.now() + Math.random() }]);
  };

  const removeSessionEntry = (key) => {
    setSessionEntries(prev => prev.filter(e => e._key !== key));
  };

  const updateEntry = (key, field, value) => {
    setSessionEntries(prev => prev.map(e => e._key === key ? { ...e, [field]: value } : e));
  };

  const toggleExpand = (key) => {
    setSessionEntries(prev => prev.map(e => e._key === key ? { ...e, _expanded: !e._expanded } : e));
  };

  const getEntryLabel = (entry) => {
    return entry.session_type || 'No session type selected';
  };

  // For the results table: group by event
  const getEventLabel = (result) => {
    if (result.session_id) {
      const session = sessions.find(s => s.id === result.session_id);
      if (session) {
        const event = events.find(e => e.id === session.event_id);
        return { eventName: event?.name || 'Unknown Event', eventDate: event?.event_date || '', eventId: session.event_id };
      }
    }
    if (result.event_id) {
      const event = events.find(e => e.id === result.event_id);
      return { eventName: event?.name || 'Unknown Event', eventDate: event?.event_date || '', eventId: result.event_id };
    }
    return { eventName: '—', eventDate: '', eventId: null };
  };

  // Group results by eventId for table display
  const groupedResults = results.reduce((acc, result) => {
    const { eventId, eventName, eventDate } = getEventLabel(result);
    const key = eventId || result.id;
    if (!acc[key]) acc[key] = { eventId, eventName, eventDate, results: [] };
    acc[key].results.push(result);
    return acc;
  }, {});

  const sortedGroups = Object.values(groupedResults).sort((a, b) =>
    (b.eventDate || '').localeCompare(a.eventDate || '')
  );

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
      ) : sortedGroups.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg text-gray-500">
          <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>No results yet. Add the first race result.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedGroups.map(group => (
            <div key={group.eventId || group.eventName} className="border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                <div>
                  <div className="font-semibold text-sm">{group.eventName}</div>
                  {group.eventDate && <div className="text-xs text-gray-500">{group.eventDate}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{group.results.length} session{group.results.length !== 1 ? 's' : ''}</span>
                  {group.eventId && (
                    <Button variant="ghost" size="sm" onClick={() => openEdit(group.eventId)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-white border-b">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-500">Session</th>
                    <th className="text-center px-4 py-2 font-medium text-gray-500">Pos</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500">Status</th>
                    <th className="text-center px-4 py-2 font-medium text-gray-500">Laps</th>
                    <th className="text-center px-4 py-2 font-medium text-gray-500">Best Lap</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {group.results.map(result => {
                    const session = sessions.find(s => s.id === result.session_id);
                    return (
                      <tr key={result.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          {result.session_type || (session ? `${session.name} (${session.session_type})` : '—')}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {result.position ? (
                            <span className={`font-bold ${result.position === 1 ? 'text-yellow-500' : result.position <= 3 ? 'text-gray-500' : ''}`}>
                              {result.position}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-2">
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
                        <td className="px-4 py-2 text-center text-gray-600">{result.laps_completed ?? '—'}</td>
                        <td className="px-4 py-2 text-center text-gray-600 font-mono text-xs">{result.best_lap_time || '—'}</td>
                        <td className="px-4 py-2 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { if (confirm('Delete this result?')) deleteMutation.mutate(result.id); }}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={closeDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEventId ? 'Edit Race Results' : 'Add Race Results'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">

            {/* Program */}
            <div className="space-y-1">
              <Label>Program <span className="text-red-500">*</span></Label>
              <Select
                value={form.program_id}
                onValueChange={v => setForm(f => ({ ...f, program_id: v, event_id: '' }))}
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
                  Team: {selectedProgram.team_name || '—'} · Series: {selectedProgram.series_name} · Class: {selectedProgram.class_name || '—'}
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
                    setForm(f => ({ ...f, event_id: v }));
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

            {/* Session Entries */}
            {form.event_id && (
              <div className="space-y-2">
                <Label>Sessions</Label>
                {sessionEntries.map((entry, idx) => (
                  <div key={entry._key} className="border rounded-lg overflow-hidden">
                    {/* Header */}
                    <div
                      className="flex items-center justify-between px-3 py-2 bg-gray-50 cursor-pointer"
                      onClick={() => toggleExpand(entry._key)}
                    >
                      <span className="text-sm font-medium text-gray-700">
                        {getEntryLabel(entry)}
                      </span>
                      <div className="flex items-center gap-1">
                        {sessionEntries.length > 1 && (
                          <button
                            type="button"
                            className="p-1 hover:bg-gray-200 rounded"
                            onClick={e => { e.stopPropagation(); removeSessionEntry(entry._key); }}
                          >
                            <X className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        )}
                        {entry._expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </div>

                    {/* Body */}
                    {entry._expanded && (
                      <div className="px-3 py-3 space-y-3">
                        {/* Session type selector */}
                        <div className="space-y-1">
                          <Label className="text-xs">Session Type</Label>
                          <Select
                            value={entry.session_type}
                            onValueChange={v => updateEntry(entry._key, 'session_type', v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select session type..." />
                            </SelectTrigger>
                            <SelectContent>
                              {SESSION_TYPES.map(t => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Finishing Position</Label>
                            <Input
                              type="number" min="1" placeholder="e.g. 1"
                              value={entry.position}
                              onChange={e => updateEntry(entry._key, 'position', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Status</Label>
                            <Select value={entry.status_text} onValueChange={v => updateEntry(entry._key, 'status_text', v)}>
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
                            <Label className="text-xs">Laps Completed</Label>
                            <Input
                              type="number" min="0" placeholder="0"
                              value={entry.laps_completed}
                              onChange={e => updateEntry(entry._key, 'laps_completed', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Best Lap Time</Label>
                            <Input
                              placeholder="1:23.456"
                              value={entry.best_lap_time}
                              onChange={e => updateEntry(entry._key, 'best_lap_time', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed text-gray-500"
                  onClick={addSessionEntry}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Session
                </Button>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={isPending || !form.program_id || !form.event_id}>
                {isPending ? 'Saving...' : editingEventId ? 'Save Changes' : 'Add Results'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddEventDialog
        open={showAddEventDialog}
        onClose={() => setShowAddEventDialog(false)}
        onEventCreated={(newEventId) => {
          setForm(f => ({ ...f, event_id: newEventId }));
          setShowAddEventDialog(false);
        }}
        series={selectedProgram?.series_name}
        season={selectedProgram?.season}
      />

      <AddSessionDialog
        open={showAddSessionDialog}
        onClose={() => { setShowAddSessionDialog(false); setAddingSessionForIndex(null); }}
        onSessionCreated={(sessionId) => {
          if (addingSessionForIndex !== null) {
            updateEntry(addingSessionForIndex, 'session_id', sessionId);
          }
          setShowAddSessionDialog(false);
          setAddingSessionForIndex(null);
          queryClient.invalidateQueries({ queryKey: ['sessions'] });
        }}
        eventId={form.event_id}
      />
    </div>
  );
}