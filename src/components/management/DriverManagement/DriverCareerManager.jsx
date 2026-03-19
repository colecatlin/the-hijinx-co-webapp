import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Trash2, Trophy, BookOpen, Star } from 'lucide-react';
import { toast } from 'sonner';

const PROGRAM_STATUSES = ['Planned', 'Active', 'Completed', 'Partial', 'Cancelled'];

const BLANK = {
  year: '', season_label: '', is_primary_program: false, program_status: '',
  team_name_override: '', series_name_override: '', class_name_override: '',
  vehicle: '', manufacturer: '', number: '', rounds_contested: '',
  starts: '', wins: '', podiums: '', top_fives: '', top_tens: '',
  championship_position: '', sort_order: '', notes: '',
};

function EntryForm({ initial, driverId, allEntries, onClose }) {
  const [form, setForm] = useState({ ...BLANK, ...initial });
  const qc = useQueryClient();

  const f = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const year = data.year ? Number(data.year) : null;

      // If marking as primary, auto-unset any existing primary for same year
      if (data.is_primary_program && year) {
        const existingPrimary = allEntries.find(
          e => e.year === year && e.is_primary_program && e.id !== initial?.id
        );
        if (existingPrimary) {
          await base44.entities.DriverCareerEntry.update(existingPrimary.id, { is_primary_program: false });
        }
      }

      const payload = {
        driver_id: driverId,
        year,
        season_label: data.season_label || null,
        is_primary_program: !!data.is_primary_program,
        program_status: data.program_status || null,
        team_name_override: data.team_name_override || null,
        series_name_override: data.series_name_override || null,
        class_name_override: data.class_name_override || null,
        vehicle: data.vehicle || null,
        manufacturer: data.manufacturer || null,
        number: data.number || null,
        rounds_contested: data.rounds_contested !== '' ? Number(data.rounds_contested) : null,
        starts: data.starts !== '' ? Number(data.starts) : null,
        wins: data.wins !== '' ? Number(data.wins) : null,
        podiums: data.podiums !== '' ? Number(data.podiums) : null,
        top_fives: data.top_fives !== '' ? Number(data.top_fives) : null,
        top_tens: data.top_tens !== '' ? Number(data.top_tens) : null,
        championship_position: data.championship_position !== '' ? Number(data.championship_position) : null,
        sort_order: data.sort_order !== '' ? Number(data.sort_order) : null,
        notes: data.notes || null,
      };

      if (initial?.id) return base44.entities.DriverCareerEntry.update(initial.id, payload);
      return base44.entities.DriverCareerEntry.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driverCareerEntries', driverId] });
      toast.success(initial?.id ? 'Career entry updated' : 'Career entry added');
      onClose();
    },
  });

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      {/* Year + Label + Primary */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Year *</Label>
          <Input className="mt-1" type="number" value={form.year} onChange={e => f('year', e.target.value)} placeholder="2024" min="1950" max="2100" required />
        </div>
        <div>
          <Label>Program Status</Label>
          <Select value={form.program_status || ''} onValueChange={v => f('program_status', v)}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {PROGRAM_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Season Label</Label>
        <Input className="mt-1" value={form.season_label} onChange={e => f('season_label', e.target.value)} placeholder="e.g. Pro 4 Full Season, Select Rounds, Mid-season substitute…" />
      </div>

      <div className="flex items-center gap-3 p-3 rounded-lg border border-[#00FFDA]/30 bg-[#00FFDA]/5">
        <Checkbox
          id="is_primary"
          checked={!!form.is_primary_program}
          onCheckedChange={v => f('is_primary_program', v)}
        />
        <label htmlFor="is_primary" className="cursor-pointer">
          <span className="font-semibold text-sm text-[#232323]">Primary Program</span>
          <p className="text-xs text-gray-500">Mark as the main ride for this year. Any existing primary will be automatically unset.</p>
        </label>
      </div>

      {/* Program identity */}
      <div className="border-t pt-4 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Program Identity</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Series Name</Label>
            <Input className="mt-1 text-sm" value={form.series_name_override} onChange={e => f('series_name_override', e.target.value)} placeholder="e.g. ULTRA4" />
          </div>
          <div>
            <Label className="text-xs">Class Name</Label>
            <Input className="mt-1 text-sm" value={form.class_name_override} onChange={e => f('class_name_override', e.target.value)} placeholder="e.g. Pro 4" />
          </div>
          <div>
            <Label className="text-xs">Team Name</Label>
            <Input className="mt-1 text-sm" value={form.team_name_override} onChange={e => f('team_name_override', e.target.value)} placeholder="e.g. Factory Team" />
          </div>
        </div>
      </div>

      {/* Vehicle */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Car / Bib #</Label>
          <Input className="mt-1 text-sm" value={form.number} onChange={e => f('number', e.target.value)} placeholder="e.g. 24" />
        </div>
        <div>
          <Label className="text-xs">Vehicle Type</Label>
          <Input className="mt-1 text-sm" value={form.vehicle} onChange={e => f('vehicle', e.target.value)} placeholder="Truck, Car…" />
        </div>
        <div>
          <Label className="text-xs">Manufacturer</Label>
          <Input className="mt-1 text-sm" value={form.manufacturer} onChange={e => f('manufacturer', e.target.value)} placeholder="Ford, Chevy…" />
        </div>
      </div>

      {/* Stats */}
      <div className="border-t pt-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Season Stats</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            ['rounds_contested', 'Rounds'], ['starts', 'Starts'], ['wins', 'Wins'],
            ['podiums', 'Podiums'], ['top_fives', 'Top 5s'], ['top_tens', 'Top 10s'],
            ['championship_position', 'Champ Pos.'],
          ].map(([key, label]) => (
            <div key={key}>
              <Label className="text-xs">{label}</Label>
              <Input className="mt-1 text-sm" type="number" min="0" value={form[key]} onChange={e => f(key, e.target.value)} placeholder="0" />
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label>Notes / Highlights</Label>
        <Textarea className="mt-1" rows={2} value={form.notes} onChange={e => f('notes', e.target.value)} placeholder="Injuries, milestones, one-off appearances…" />
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.year} className="bg-gray-900">
          {saveMutation.isPending ? 'Saving…' : initial?.id ? 'Update Entry' : 'Add Entry'}
        </Button>
      </div>
    </div>
  );
}

const STATUS_COLORS = {
  Active: 'bg-green-50 text-green-700 border-green-200',
  Completed: 'bg-blue-50 text-blue-700 border-blue-200',
  Partial: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Planned: 'bg-purple-50 text-purple-700 border-purple-200',
  Cancelled: 'bg-red-50 text-red-600 border-red-200',
};

export default function DriverCareerManager({ driverId }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['driverCareerEntries', driverId],
    queryFn: () => base44.entities.DriverCareerEntry.filter({ driver_id: driverId }, '-year'),
    enabled: !!driverId && driverId !== 'new',
    staleTime: 60 * 1000,
  });

  // Group entries by year, sorted desc; within year: primary first, then by sort_order
  const grouped = useMemo(() => {
    const years = [...new Set(entries.map(e => e.year))].filter(Boolean).sort((a, b) => b - a);
    return years.map(year => {
      const yearEntries = entries
        .filter(e => e.year === year)
        .sort((a, b) => {
          if (a.is_primary_program && !b.is_primary_program) return -1;
          if (!a.is_primary_program && b.is_primary_program) return 1;
          return (a.sort_order ?? 99) - (b.sort_order ?? 99);
        });
      return { year, entries: yearEntries };
    });
  }, [entries]);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DriverCareerEntry.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driverCareerEntries', driverId] });
      toast.success('Entry removed');
    },
  });

  const openAdd = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (entry) => { setEditing(entry); setDialogOpen(true); };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Career History</CardTitle>
          <CardDescription>Season-by-season career timeline · multiple programs per year supported</CardDescription>
        </div>
        {driverId !== 'new' && (
          <Button size="sm" onClick={openAdd} className="bg-gray-900 ml-4 flex-shrink-0">
            <Plus className="w-3.5 h-3.5 mr-1.5" />Add Program
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {driverId === 'new' ? (
          <p className="text-sm text-gray-400">Save the driver record first, then add career history.</p>
        ) : isLoading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : grouped.length === 0 ? (
          <div className="py-10 text-center border-2 border-dashed border-gray-200 rounded-lg">
            <BookOpen className="w-7 h-7 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-500">No career history yet.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={openAdd}>Add First Program</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(({ year, entries: yearEntries }) => (
              <div key={year}>
                {/* Year header */}
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl font-black text-[#232323]">{year}</span>
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">{yearEntries.length} program{yearEntries.length > 1 ? 's' : ''}</span>
                </div>

                <div className="space-y-2 pl-2 border-l-2 border-gray-100">
                  {yearEntries.map(entry => (
                    <div
                      key={entry.id}
                      className={`flex items-start gap-3 rounded-lg p-3 border transition-colors ${
                        entry.is_primary_program
                          ? 'border-[#232323] bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {/* Primary indicator */}
                      <div className="flex-shrink-0 mt-0.5">
                        {entry.is_primary_program
                          ? <Star className="w-4 h-4 text-[#232323] fill-[#232323]" />
                          : <Star className="w-4 h-4 text-gray-300" />
                        }
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {entry.is_primary_program && (
                            <Badge className="bg-[#232323] text-white text-[10px] px-1.5 py-0 h-auto">Primary</Badge>
                          )}
                          {entry.season_label && (
                            <span className="font-semibold text-sm text-[#232323]">{entry.season_label}</span>
                          )}
                          {entry.series_name_override && (
                            <span className="text-sm text-gray-600">{entry.series_name_override}</span>
                          )}
                          {entry.class_name_override && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-auto">{entry.class_name_override}</Badge>
                          )}
                          {entry.program_status && (
                            <Badge className={`text-[10px] px-1.5 py-0 h-auto border ${STATUS_COLORS[entry.program_status] || 'bg-gray-100 text-gray-600'}`}>
                              {entry.program_status}
                            </Badge>
                          )}
                          {entry.championship_position && (
                            <Badge className="bg-yellow-50 text-yellow-700 border border-yellow-200 text-[10px] px-1.5 py-0 h-auto">
                              <Trophy className="w-2.5 h-2.5 mr-0.5" />P{entry.championship_position}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-x-3 text-xs text-gray-500 mt-1">
                          {entry.team_name_override && <span>{entry.team_name_override}</span>}
                          {entry.number && <span>#{entry.number}</span>}
                          {entry.vehicle && <span>{entry.vehicle}</span>}
                          {entry.manufacturer && <span>{entry.manufacturer}</span>}
                        </div>

                        <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-600">
                          {entry.rounds_contested != null && <span><strong>{entry.rounds_contested}</strong> rounds</span>}
                          {entry.starts != null && <span><strong>{entry.starts}</strong> starts</span>}
                          {entry.wins != null && <span><strong>{entry.wins}</strong> wins</span>}
                          {entry.podiums != null && <span><strong>{entry.podiums}</strong> podiums</span>}
                        </div>

                        {entry.notes && <p className="text-xs text-gray-400 mt-1 italic line-clamp-1">{entry.notes}</p>}
                      </div>

                      <div className="flex gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(entry)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => deleteMutation.mutate(entry.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Career Program' : 'Add Career Program'}</DialogTitle>
          </DialogHeader>
          <EntryForm
            initial={editing}
            driverId={driverId}
            allEntries={entries}
            onClose={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}