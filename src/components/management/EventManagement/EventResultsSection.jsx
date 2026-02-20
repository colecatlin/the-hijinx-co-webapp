import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Save } from 'lucide-react';

export default function EventResultsSection({ event }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    driver_id: '',
    session_type: 'Final',
    position: '',
    status_text: 'Running',
    team_name: '',
    class: '',
    laps_completed: '',
    best_lap_time: '',
    points: '',
  });

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['eventResults', event.id],
    queryFn: () => base44.entities.Results.filter({ event_id: event.id }),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  const { data: programs = [] } = useQuery({
    queryKey: ['driverPrograms'],
    queryFn: () => base44.entities.DriverProgram.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Results.create({ ...data, event_id: event.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventResults', event.id] });
      setShowForm(false);
      setForm({ driver_id: '', session_type: 'Final', position: '', status_text: 'Running', team_name: '', class: '', laps_completed: '', best_lap_time: '', points: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Results.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['eventResults', event.id] }),
  });

  const getDriverName = (id) => {
    const d = drivers.find(d => d.id === id);
    return d ? `${d.first_name} ${d.last_name}` : id;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const program = programs.find(p => p.driver_id === form.driver_id);
    createMutation.mutate({
      ...form,
      program_id: program?.id || '',
      position: form.position ? Number(form.position) : undefined,
      laps_completed: form.laps_completed ? Number(form.laps_completed) : undefined,
      points: form.points ? Number(form.points) : undefined,
    });
  };

  const sessionTypes = ['Practice', 'Qualifying', 'Heat 1', 'Heat 2', 'Heat 3', 'Heat 4', 'LCQ', 'Final'];
  const statusOptions = ['Running', 'DNF', 'DNS', 'DSQ'];

  const groupedResults = sessionTypes.reduce((acc, type) => {
    const r = results.filter(r => r.session_type === type);
    if (r.length) acc[type] = r.sort((a, b) => (a.position || 99) - (b.position || 99));
    return acc;
  }, {});

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold">Results</h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="bg-gray-900">
          <Plus className="w-4 h-4 mr-1" /> Add Result
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="border border-gray-200 rounded-lg p-4 mb-6 space-y-3 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Driver *</label>
              <Select value={form.driver_id} onValueChange={v => setForm({ ...form, driver_id: v })}>
                <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Select driver" /></SelectTrigger>
                <SelectContent>
                  {drivers.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Session Type</label>
              <Select value={form.session_type} onValueChange={v => setForm({ ...form, session_type: v })}>
                <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sessionTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Position</label>
              <Input type="number" className="h-8 text-xs" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} placeholder="1" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Status</label>
              <Select value={form.status_text} onValueChange={v => setForm({ ...form, status_text: v })}>
                <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Team</label>
              <Input className="h-8 text-xs" value={form.team_name} onChange={e => setForm({ ...form, team_name: e.target.value })} placeholder="Team name" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Class</label>
              <Input className="h-8 text-xs" value={form.class} onChange={e => setForm({ ...form, class: e.target.value })} placeholder="e.g. Pro 4" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Laps</label>
              <Input type="number" className="h-8 text-xs" value={form.laps_completed} onChange={e => setForm({ ...form, laps_completed: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Best Lap</label>
              <Input className="h-8 text-xs" value={form.best_lap_time} onChange={e => setForm({ ...form, best_lap_time: e.target.value })} placeholder="1:23.456" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Points</label>
              <Input type="number" className="h-8 text-xs" value={form.points} onChange={e => setForm({ ...form, points: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={createMutation.isPending || !form.driver_id} className="bg-gray-900">
              <Save className="w-3.5 h-3.5 mr-1" /> Save
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : results.length === 0 ? (
        <p className="text-gray-500 text-sm">No results yet.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedResults).map(([type, typeResults]) => (
            <div key={type}>
              <h3 className="text-xs font-mono uppercase tracking-wider text-gray-400 mb-2">{type}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100">
                    <tr className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                      <th className="text-left py-1 px-2">Pos</th>
                      <th className="text-left py-1 px-2">Driver</th>
                      <th className="text-left py-1 px-2">Team</th>
                      <th className="text-left py-1 px-2">Class</th>
                      <th className="text-left py-1 px-2">Status</th>
                      <th className="text-left py-1 px-2">Laps</th>
                      <th className="text-left py-1 px-2">Best Lap</th>
                      <th className="text-left py-1 px-2">Pts</th>
                      <th className="py-1 px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {typeResults.map(r => (
                      <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 px-2 font-bold">{r.position || '—'}</td>
                        <td className="py-2 px-2">{getDriverName(r.driver_id)}</td>
                        <td className="py-2 px-2 text-gray-500">{r.team_name || '—'}</td>
                        <td className="py-2 px-2 text-gray-500">{r.class || '—'}</td>
                        <td className="py-2 px-2">
                          <span className={`text-[10px] px-1.5 py-0.5 font-mono ${r.status_text === 'DNF' ? 'bg-red-100 text-red-700' : r.status_text === 'Running' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {r.status_text}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-gray-500">{r.laps_completed ?? '—'}</td>
                        <td className="py-2 px-2 text-gray-500 font-mono text-xs">{r.best_lap_time || '—'}</td>
                        <td className="py-2 px-2 font-bold">{r.points ?? '—'}</td>
                        <td className="py-2 px-2">
                          <Button variant="ghost" size="sm" onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(r.id); }}>
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}