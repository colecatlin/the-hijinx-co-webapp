import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Trophy, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

const BLANK = {
  year: '', team_id: '', series_id: '', class_id: '', vehicle: '',
  manufacturer: '', number: '', starts: '', wins: '', podiums: '',
  top_fives: '', top_tens: '', championship_position: '', notes: '',
};

function EntryForm({ initial, driverId, onClose, onSaved }) {
  const [form, setForm] = useState({ ...BLANK, ...initial });
  const qc = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        driver_id: driverId,
        year: data.year ? Number(data.year) : null,
        team_id: data.team_id || null,
        series_id: data.series_id || null,
        class_id: data.class_id || null,
        vehicle: data.vehicle || null,
        manufacturer: data.manufacturer || null,
        number: data.number || null,
        starts: data.starts !== '' ? Number(data.starts) : null,
        wins: data.wins !== '' ? Number(data.wins) : null,
        podiums: data.podiums !== '' ? Number(data.podiums) : null,
        top_fives: data.top_fives !== '' ? Number(data.top_fives) : null,
        top_tens: data.top_tens !== '' ? Number(data.top_tens) : null,
        championship_position: data.championship_position !== '' ? Number(data.championship_position) : null,
        notes: data.notes || null,
      };
      if (initial?.id) return base44.entities.DriverCareerEntry.update(initial.id, payload);
      return base44.entities.DriverCareerEntry.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driverCareerEntries', driverId] });
      toast.success(initial?.id ? 'Career entry updated' : 'Career entry added');
      onSaved?.();
      onClose();
    },
  });

  const f = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Year *</Label>
          <Input className="mt-1" type="number" value={form.year} onChange={e => f('year', e.target.value)} placeholder="2024" min="1950" max="2100" required />
        </div>
        <div>
          <Label>Car / Bib #</Label>
          <Input className="mt-1" value={form.number} onChange={e => f('number', e.target.value)} placeholder="e.g. 24" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Vehicle Type</Label>
          <Input className="mt-1" value={form.vehicle} onChange={e => f('vehicle', e.target.value)} placeholder="Truck, Car, Sled…" />
        </div>
        <div>
          <Label>Manufacturer</Label>
          <Input className="mt-1" value={form.manufacturer} onChange={e => f('manufacturer', e.target.value)} placeholder="Chevrolet, Ford…" />
        </div>
      </div>

      <div className="border-t pt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Season Stats</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            ['starts', 'Starts'], ['wins', 'Wins'], ['podiums', 'Podiums'],
            ['top_fives', 'Top 5s'], ['top_tens', 'Top 10s'], ['championship_position', 'Champ Pos.'],
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
        <Textarea className="mt-1" rows={3} value={form.notes} onChange={e => f('notes', e.target.value)} placeholder="Injuries, milestones, career highlights…" />
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
          <CardDescription>Season-by-season career timeline</CardDescription>
        </div>
        {driverId !== 'new' && (
          <Button size="sm" onClick={openAdd} className="bg-gray-900 ml-4 flex-shrink-0">
            <Plus className="w-3.5 h-3.5 mr-1.5" />Add Season
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {driverId === 'new' ? (
          <p className="text-sm text-gray-400">Save the driver record first, then add career history.</p>
        ) : isLoading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : entries.length === 0 ? (
          <div className="py-10 text-center border-2 border-dashed border-gray-200 rounded-lg">
            <BookOpen className="w-7 h-7 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-500">No career history yet.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={openAdd}>Add First Season</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map(entry => (
              <div key={entry.id} className="flex items-start justify-between gap-4 border border-gray-200 rounded-lg p-4 hover:border-gray-400 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl font-black text-[#232323]">{entry.year}</span>
                    {entry.number && <span className="text-sm font-bold text-gray-500">#{entry.number}</span>}
                    {entry.championship_position && (
                      <Badge className="bg-yellow-50 text-yellow-700 border border-yellow-200 text-xs">
                        <Trophy className="w-2.5 h-2.5 mr-1" />P{entry.championship_position}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                    {entry.vehicle && <span>{entry.vehicle}</span>}
                    {entry.manufacturer && <span>· {entry.manufacturer}</span>}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-600">
                    {entry.starts != null && <span><strong>{entry.starts}</strong> starts</span>}
                    {entry.wins != null && <span><strong>{entry.wins}</strong> wins</span>}
                    {entry.podiums != null && <span><strong>{entry.podiums}</strong> podiums</span>}
                    {entry.top_fives != null && <span><strong>{entry.top_fives}</strong> top 5s</span>}
                  </div>
                  {entry.notes && <p className="text-xs text-gray-500 mt-1.5 italic line-clamp-2">{entry.notes}</p>}
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
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Career Entry' : 'Add Career Entry'}</DialogTitle>
          </DialogHeader>
          <EntryForm
            initial={editing}
            driverId={driverId}
            onClose={() => setDialogOpen(false)}
            onSaved={() => {}}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}