import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Edit2, Trash2, Archive, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ManagePointsConfig() {
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState({ series_id: '', season: '' });
  const [deleteWarning, setDeleteWarning] = useState(null);

  // Load current user
  useEffect(() => {
    (async () => {
      const user = await base44.auth.me();
      setIsAdmin(user?.role === 'admin');
    })();
  }, []);

  const { data: configs = [] } = useQuery({
    queryKey: ['pointsConfigs'],
    queryFn: () => base44.entities.PointsConfig.list()
  });

  const { data: series = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list()
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses'],
    queryFn: () => base44.entities.SeriesClass.list()
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list().catch(() => [])
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PointsConfig.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pointsConfigs'] });
      setOpenDialog(false);
      setEditingId(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PointsConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pointsConfigs'] });
      setOpenDialog(false);
      setEditingId(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PointsConfig.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pointsConfigs'] });
      setDeleteWarning(null);
    }
  });

  const filteredConfigs = useMemo(() => {
    return configs.filter(c => {
      if (filters.series_id && c.series_id !== filters.series_id) return false;
      if (filters.season && c.season !== filters.season) return false;
      return true;
    });
  }, [configs, filters]);

  const uniqueSeasons = useMemo(() => {
    return [...new Set(configs.map(c => c.season))].sort().reverse();
  }, [configs]);

  if (!isAdmin) {
    return <div className="p-6 text-center text-gray-400">Admin access required.</div>;
  }

  return (
    <div className="space-y-6 p-6 bg-gray-950 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Points Configuration</h1>
        <Button onClick={() => { setEditingId(null); setOpenDialog(true); }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> New Ruleset
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-2">Series</label>
              <Select value={filters.series_id} onValueChange={(v) => setFilters({ ...filters, series_id: v })}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="All Series" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value={null}>All Series</SelectItem>
                  {series.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-2">Season</label>
              <Select value={filters.season} onValueChange={(v) => setFilters({ ...filters, season: v })}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="All Seasons" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value={null}>All Seasons</SelectItem>
                  {uniqueSeasons.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-400">Name</TableHead>
                  <TableHead className="text-gray-400">Series</TableHead>
                  <TableHead className="text-gray-400">Class</TableHead>
                  <TableHead className="text-gray-400">Season</TableHead>
                  <TableHead className="text-gray-400">Event</TableHead>
                  <TableHead className="text-gray-400">Priority</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConfigs.map((config) => (
                  <TableRow key={config.id} className="border-gray-700 hover:bg-gray-800">
                    <TableCell className="text-white font-medium">{config.name}</TableCell>
                    <TableCell className="text-gray-400">{series.find(s => s.id === config.series_id)?.name || config.series_id}</TableCell>
                    <TableCell className="text-gray-400">{config.series_class_id ? seriesClasses.find(c => c.id === config.series_class_id)?.class_name : '—'}</TableCell>
                    <TableCell className="text-gray-400">{config.season || '—'}</TableCell>
                    <TableCell className="text-gray-400">{config.event_id ? events.find(e => e.id === config.event_id)?.name || config.event_id : '—'}</TableCell>
                    <TableCell className="text-gray-400">{config.priority || 0}</TableCell>
                    <TableCell>
                      <Badge className={config.status === 'active' || config.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}>
                        {config.status === 'active' || config.is_active ? 'Active' : config.status || 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditingId(config.id); setOpenDialog(true); }} className="text-blue-400 hover:text-blue-300">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => updateMutation.mutate({ id: config.id, data: { is_active: !config.is_active } })} className={config.is_active ? 'text-orange-400 hover:text-orange-300' : 'text-green-400 hover:text-green-300'}>
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteWarning(config)} className="text-red-400 hover:text-red-300">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Editor Dialog */}
      <PointsConfigEditor
        open={openDialog}
        onOpenChange={setOpenDialog}
        configId={editingId}
        series={series}
        seriesClasses={seriesClasses}
        events={events}
        configs={configs}
        onSave={(data) => {
          if (editingId) {
            updateMutation.mutate({ id: editingId, data });
          } else {
            createMutation.mutate(data);
          }
        }}
      />

      {/* Delete Warning */}
      {deleteWarning && (
        <AlertDialog open={!!deleteWarning} onOpenChange={() => setDeleteWarning(null)}>
          <AlertDialogContent className="bg-gray-900 border-gray-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete Ruleset?</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                Are you sure you want to delete "{deleteWarning.name}"? This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogCancel className="border-gray-700">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteWarning.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

function PointsConfigEditor({ open, onOpenChange, configId, series, seriesClasses, events, configs, onSave }) {
  const [form, setForm] = useState({
    name: '',
    series_id: '',
    series_class_id: '',
    season: '',
    event_id: '',
    is_default: false,
    status: 'active',
    is_active: true,
    priority: 0,
    applies_to_session_types: ['Final'],
    points_by_position: [50, 44, 40, 36, 32, 30, 28, 26, 24, 22, 20, 18, 16, 14, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
    bonus_rules: { fastest_lap: 0, most_laps_led: 0, pole_award: 0 },
    tie_breaker_order: ['wins', 'seconds', 'thirds', 'best_finishes', 'latest_finish'],
    notes: ''
  });
  const [pointsText, setPointsText] = useState('');
  const [validationError, setValidationError] = useState('');

  const { data: config } = useQuery({
    queryKey: ['pointsConfig', configId],
    queryFn: () => configId ? base44.entities.PointsConfig.list().then(all => all.find(c => c.id === configId)) : null,
    enabled: !!configId
  });

  useEffect(() => {
    setValidationError('');
    if (config && open) {
      setForm(config);
      setPointsText((config.points_by_position || []).join(', '));
    } else if (!open) {
      setForm({
        name: '',
        series_id: '',
        series_class_id: '',
        season: '',
        event_id: '',
        is_default: false,
        status: 'active',
        is_active: true,
        priority: 0,
        applies_to_session_types: ['Final'],
        points_by_position: [50, 44, 40, 36, 32, 30, 28, 26, 24, 22, 20, 18, 16, 14, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
        bonus_rules: { fastest_lap: 0, most_laps_led: 0, pole_award: 0 },
        tie_breaker_order: ['wins', 'seconds', 'thirds', 'best_finishes', 'latest_finish'],
        notes: ''
      });
      setPointsText('');
    }
  }, [config, open]);

  const handleSave = () => {
    setValidationError('');
    
    if (form.is_default && !form.event_id && !form.series_class_id) {
      const otherDefaults = configs.filter(c =>
        c.id !== configId &&
        c.is_default === true &&
        c.series_id === form.series_id &&
        c.season === form.season &&
        !c.event_id &&
        !c.series_class_id
      );
      if (otherDefaults.length > 0) {
        setValidationError('Only one default ruleset allowed per series and season.');
        return;
      }
    }

    const points = pointsText.split(',').map(p => Number(p.trim())).filter(p => !isNaN(p));
    onSave({
      ...form,
      points_by_position: points.length > 0 ? points : form.points_by_position,
      is_active: form.status === 'active'
    });
  };

  const sessionTypeOptions = ['Practice', 'Qualifying', 'Heat', 'LCQ', 'Feature', 'Final', 'Time Attack', 'Other'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">{configId ? 'Edit Ruleset' : 'New Points Ruleset'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {validationError && (
            <Alert className="bg-red-500/10 border-red-600">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-600 text-sm">{validationError}</AlertDescription>
            </Alert>
          )}

          {/* Basic Info */}
          <div className="space-y-3">
            <h3 className="font-semibold text-white">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Name *</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-gray-800 border-gray-700 text-white" placeholder="e.g. 2026 Stock" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Series *</label>
                <Select value={form.series_id} onValueChange={(v) => setForm({ ...form, series_id: v })}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {series.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Season (optional)</label>
                <Input value={form.season || ''} onChange={(e) => setForm({ ...form, season: e.target.value })} className="bg-gray-800 border-gray-700 text-white" placeholder="e.g. 2026" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Class (optional)</label>
                <Select value={form.series_class_id || ''} onValueChange={(v) => setForm({ ...form, series_class_id: v || '' })}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue placeholder="All classes" /></SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value={null}>All classes</SelectItem>
                    {seriesClasses.filter(c => !form.series_id || c.series_id === form.series_id).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.class_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Event Override (optional)</label>
                <Select value={form.event_id || ''} onValueChange={(v) => setForm({ ...form, event_id: v || '' })}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value={null}>None</SelectItem>
                    {events.filter(e => !form.series_id || e.series_id === form.series_id).map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name} ({e.event_date})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Control Settings */}
          <div className="space-y-3">
            <h3 className="font-semibold text-white">Control Settings</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Priority (higher = preferred)</label>
                <Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} className="bg-gray-800 border-gray-700 text-white" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Status</label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs text-gray-400 h-full pt-6">
                  <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} className="rounded" />
                  Default for series/season
                </label>
              </div>
            </div>
          </div>

          {/* Session Types */}
          <div className="space-y-3">
            <h3 className="font-semibold text-white">Applies to Session Types</h3>
            <div className="flex flex-wrap gap-2">
              {sessionTypeOptions.map(type => (
                <label key={type} className="flex items-center gap-2 text-sm text-gray-400">
                  <input
                    type="checkbox"
                    checked={form.applies_to_session_types.includes(type)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setForm({ ...form, applies_to_session_types: [...form.applies_to_session_types, type] });
                      } else {
                        setForm({ ...form, applies_to_session_types: form.applies_to_session_types.filter(t => t !== type) });
                      }
                    }}
                    className="rounded"
                  />
                  {type}
                </label>
              ))}
            </div>
          </div>

          {/* Points Table */}
          <div className="space-y-3">
            <h3 className="font-semibold text-white">Points by Position</h3>
            <p className="text-xs text-gray-400">Comma-separated values (position 1, 2, 3, ...)</p>
            <Textarea
              value={pointsText}
              onChange={(e) => setPointsText(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white font-mono text-sm"
              rows={3}
              placeholder="50, 44, 40, 36, 32, 30, 28, 26, 24, 22, 20, 18, 16, 14, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1"
            />
          </div>

          {/* Bonus Rules */}
          <div className="space-y-3">
            <h3 className="font-semibold text-white">Bonus Points</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Fastest Lap</label>
                <Input type="number" value={form.bonus_rules.fastest_lap} onChange={(e) => setForm({ ...form, bonus_rules: { ...form.bonus_rules, fastest_lap: Number(e.target.value) } })} className="bg-gray-800 border-gray-700 text-white" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Most Laps Led</label>
                <Input type="number" value={form.bonus_rules.most_laps_led} onChange={(e) => setForm({ ...form, bonus_rules: { ...form.bonus_rules, most_laps_led: Number(e.target.value) } })} className="bg-gray-800 border-gray-700 text-white" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Pole Award</label>
                <Input type="number" value={form.bonus_rules.pole_award} onChange={(e) => setForm({ ...form, bonus_rules: { ...form.bonus_rules, pole_award: Number(e.target.value) } })} className="bg-gray-800 border-gray-700 text-white" />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <h3 className="font-semibold text-white">Notes</h3>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="bg-gray-800 border-gray-700 text-white"
              rows={2}
              placeholder="Admin notes about this ruleset..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-gray-700 text-gray-300">Cancel</Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">Save Ruleset</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}