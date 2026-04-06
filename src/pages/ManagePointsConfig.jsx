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
import { Plus, Edit2, Trash2, CheckCircle2, AlertCircle, Trophy, Settings2, ChevronRight, Zap } from 'lucide-react';

function PointsRuleSetEditor({ open, onOpenChange, rulesetId, series, tracks, seriesClasses, rulesets, onSave }) {
  const [form, setForm] = useState({
    name: '',
    series_id: '',
    track_id: '',
    series_class_id: '',
    season: '',
    status: 'draft',
    priority: 0,
    applies_to_session_types: ['Final'],
    points_table_json: '',
    bonus_rules_json: '',
    drop_rounds_json: '',
    tiebreaker_order_json: '',
    notes: ''
  });
  const [validationError, setValidationError] = useState('');

  const { data: ruleset } = useQuery({
    queryKey: ['pointsRuleSet', rulesetId],
    queryFn: () => rulesetId ? base44.entities.PointsRuleSet.get(rulesetId) : null,
    enabled: !!rulesetId
  });

  useEffect(() => {
    setValidationError('');
    if (ruleset && open) {
      setForm(ruleset);
    } else if (!open) {
      setForm({
        name: '',
        series_id: '',
        track_id: '',
        series_class_id: '',
        season: '',
        status: 'draft',
        priority: 0,
        applies_to_session_types: ['Final'],
        points_table_json: '',
        bonus_rules_json: '',
        drop_rounds_json: '',
        tiebreaker_order_json: '',
        notes: ''
      });
    }
  }, [ruleset, open]);

  const handleSave = () => {
    setValidationError('');
    if (!form.name.trim()) {
      setValidationError('Name is required');
      return;
    }
    if (!form.series_id && !form.track_id) {
      setValidationError('Series or Track is required');
      return;
    }
    if (!form.points_table_json.trim()) {
      setValidationError('Points table JSON is required');
      return;
    }
    
    try {
      JSON.parse(form.points_table_json);
    } catch (e) {
      setValidationError('Points table JSON is invalid');
      return;
    }

    onSave({
      ...form,
      series_id: form.series_id || null,
      track_id: form.track_id || null,
      series_class_id: form.series_class_id || null,
      season: form.season || null
    });
  };

  const sessionTypeOptions = ['Practice', 'Qualifying', 'Heat', 'LCQ', 'Final'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0d0d0d] border border-[#f5ff00]/20 max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#f5ff00] via-[#ffd700] to-[#f5ff00]" />
        <DialogHeader>
          <DialogTitle className="text-white text-lg font-black tracking-tight">{rulesetId ? '✏️ Edit Rule Set' : '⚡ New Points Rule Set'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {validationError && (
            <Alert className="bg-red-500/10 border-red-500">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-400 text-sm">{validationError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label className="text-xs text-[#f5ff00] font-bold uppercase tracking-widest block">Name *</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-[#1a1a1a] border-[#f5ff00]/30 text-white focus:border-[#f5ff00]" placeholder="e.g. 2026 Stock Points" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-[#f5ff00] font-bold uppercase tracking-widest block">Series</label>
              <Select value={form.series_id} onValueChange={(v) => setForm({ ...form, series_id: v })}>
                <SelectTrigger className="bg-[#1a1a1a] border-[#f5ff00]/30 text-white"><SelectValue placeholder="Select series" /></SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#f5ff00]/30">
                  <SelectItem value={null}>None</SelectItem>
                  {series.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-[#f5ff00] font-bold uppercase tracking-widest block">Track</label>
              <Select value={form.track_id} onValueChange={(v) => setForm({ ...form, track_id: v })}>
                <SelectTrigger className="bg-[#1a1a1a] border-[#f5ff00]/30 text-white"><SelectValue placeholder="Select track" /></SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#f5ff00]/30">
                  <SelectItem value={null}>None</SelectItem>
                  {tracks.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-[#f5ff00] font-bold uppercase tracking-widest block">Class</label>
              <Select value={form.series_class_id || ''} onValueChange={(v) => setForm({ ...form, series_class_id: v || null })}>
                <SelectTrigger className="bg-[#1a1a1a] border-[#f5ff00]/30 text-white"><SelectValue placeholder="All classes" /></SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#f5ff00]/30">
                  <SelectItem value={null}>All classes</SelectItem>
                  {seriesClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.class_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-[#f5ff00] font-bold uppercase tracking-widest block">Season</label>
              <Input value={form.season || ''} onChange={(e) => setForm({ ...form, season: e.target.value })} className="bg-[#1a1a1a] border-[#f5ff00]/30 text-white focus:border-[#f5ff00]" placeholder="e.g. 2026" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-[#f5ff00] font-bold uppercase tracking-widest block">Status</label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="bg-[#1a1a1a] border-[#f5ff00]/30 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#f5ff00]/30">
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-[#f5ff00] font-bold uppercase tracking-widest block">Priority</label>
              <Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} className="bg-[#1a1a1a] border-[#f5ff00]/30 text-white focus:border-[#f5ff00]" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-[#f5ff00] font-bold uppercase tracking-widest block">Applies to Session Types</label>
            <div className="flex flex-wrap gap-2">
              {sessionTypeOptions.map(type => (
                <label key={type} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={form.applies_to_session_types.includes(type)} onChange={(e) => {
                    if (e.target.checked) {
                      setForm({ ...form, applies_to_session_types: [...form.applies_to_session_types, type] });
                    } else {
                      setForm({ ...form, applies_to_session_types: form.applies_to_session_types.filter(t => t !== type) });
                    }
                  }} className="accent-[#f5ff00]" />
                  {type}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-[#f5ff00] font-bold uppercase tracking-widest block">Points Table JSON *</label>
            <Textarea value={form.points_table_json} onChange={(e) => setForm({ ...form, points_table_json: e.target.value })} className="bg-[#1a1a1a] border-[#f5ff00]/30 text-green-400 font-mono text-xs min-h-[100px] focus:border-[#f5ff00]" placeholder='{"positions": {"1": 50, "2": 45}, "default": 0}' />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-[#f5ff00] font-bold uppercase tracking-widest block">Bonus Rules JSON <span className="text-gray-600 normal-case font-normal">(optional)</span></label>
            <Textarea value={form.bonus_rules_json} onChange={(e) => setForm({ ...form, bonus_rules_json: e.target.value })} className="bg-[#1a1a1a] border-[#f5ff00]/30 text-green-400 font-mono text-xs min-h-[60px] focus:border-[#f5ff00]" placeholder='{"fastest_lap": 1, "most_laps_led": 1, "pole": 1}' />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-[#f5ff00] font-bold uppercase tracking-widest block">Drop Rounds JSON <span className="text-gray-600 normal-case font-normal">(optional)</span></label>
            <Textarea value={form.drop_rounds_json} onChange={(e) => setForm({ ...form, drop_rounds_json: e.target.value })} className="bg-[#1a1a1a] border-[#f5ff00]/30 text-green-400 font-mono text-xs min-h-[60px] focus:border-[#f5ff00]" placeholder='{"enabled": true, "drop_count": 1}' />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-[#f5ff00] font-bold uppercase tracking-widest block">Tiebreaker Order JSON <span className="text-gray-600 normal-case font-normal">(optional)</span></label>
            <Textarea value={form.tiebreaker_order_json} onChange={(e) => setForm({ ...form, tiebreaker_order_json: e.target.value })} className="bg-[#1a1a1a] border-[#f5ff00]/30 text-green-400 font-mono text-xs min-h-[60px] focus:border-[#f5ff00]" placeholder='["wins", "seconds", "thirds", "best_finish", "most_starts"]' />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-[#f5ff00] font-bold uppercase tracking-widest block">Notes</label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-[#1a1a1a] border-[#f5ff00]/30 text-white text-sm focus:border-[#f5ff00]" rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-white/20 text-gray-400 hover:bg-white/10">Cancel</Button>
          <Button onClick={handleSave} className="bg-[#f5ff00] text-black font-bold hover:bg-[#e6f000]">Save Rule Set</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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

  const { data: rulesets = [] } = useQuery({
    queryKey: ['pointsRuleSets'],
    queryFn: () => base44.entities.PointsRuleSet.list().catch(() => [])
  });

  const { data: series = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list()
  });

  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.list().catch(() => [])
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

  const createRulesetMutation = useMutation({
    mutationFn: (data) => base44.entities.PointsRuleSet.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pointsRuleSets'] });
      setOpenDialog(false);
      setEditingId(null);
    }
  });

  const updateRulesetMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PointsRuleSet.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pointsRuleSets'] });
      setOpenDialog(false);
      setEditingId(null);
    }
  });

  const deleteRulesetMutation = useMutation({
    mutationFn: (id) => base44.entities.PointsRuleSet.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pointsRuleSets'] });
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
    return <div className="p-6 text-center text-gray-400 bg-[#080808] min-h-screen flex items-center justify-center"><span className="text-lg">🔒 Admin access required.</span></div>;
  }

  return (
    <div className="bg-[#080808] min-h-screen">

      {/* ── PAGE HEADER ── */}
      <div className="border-b border-white/10 bg-[#0d0d0d]">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#f5ff00] flex items-center justify-center">
                <Trophy className="w-5 h-5 text-black" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">Points Configuration</h1>
                <p className="text-xs text-gray-500 mt-0.5 uppercase tracking-widest">Championship Points Engine</p>
              </div>
            </div>
            <Button
              onClick={() => { setEditingId(null); setOpenDialog(true); }}
              className="bg-[#f5ff00] text-black font-bold hover:bg-[#e6f000] h-10 px-5 gap-2"
            >
              <Plus className="w-4 h-4" /> New Rule Set
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-12">

        {/* ══ PART 1: POINTS RULE SETS ══ */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-[#f5ff00] text-xs font-black uppercase tracking-[0.2em]">Part 01</span>
              <ChevronRight className="w-3 h-3 text-[#f5ff00]" />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">Points Rule Sets</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-[#f5ff00]/30 to-transparent" />
            <Badge className="bg-[#f5ff00]/10 text-[#f5ff00] border border-[#f5ff00]/30 text-xs font-bold">{rulesets.length} sets</Badge>
          </div>

          <div className="rounded-xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 bg-white/5">
                    <TableHead className="text-[#f5ff00] text-xs font-bold uppercase tracking-wider">Name</TableHead>
                    <TableHead className="text-[#f5ff00] text-xs font-bold uppercase tracking-wider">Series / Track</TableHead>
                    <TableHead className="text-[#f5ff00] text-xs font-bold uppercase tracking-wider">Class</TableHead>
                    <TableHead className="text-[#f5ff00] text-xs font-bold uppercase tracking-wider">Season</TableHead>
                    <TableHead className="text-[#f5ff00] text-xs font-bold uppercase tracking-wider">Session Types</TableHead>
                    <TableHead className="text-[#f5ff00] text-xs font-bold uppercase tracking-wider">Priority</TableHead>
                    <TableHead className="text-[#f5ff00] text-xs font-bold uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-[#f5ff00] text-xs font-bold uppercase tracking-wider text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rulesets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <Zap className="w-8 h-8 text-[#f5ff00]/20" />
                          <p className="text-gray-600 text-sm">No rule sets yet — create your first one</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : rulesets.map((rs) => (
                    <TableRow key={rs.id} className="border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell className="text-white font-semibold">{rs.name}</TableCell>
                      <TableCell className="text-gray-400 text-sm">
                        {rs.series_id ? series.find(s => s.id === rs.series_id)?.name : tracks.find(t => t.id === rs.track_id)?.name || '—'}
                      </TableCell>
                      <TableCell className="text-gray-400 text-sm">{rs.series_class_id ? seriesClasses.find(c => c.id === rs.series_class_id)?.class_name : '—'}</TableCell>
                      <TableCell className="text-gray-400 text-sm">{rs.season || '—'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(rs.applies_to_session_types || []).map(t => (
                            <span key={t} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-gray-300">{t}</span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-[#f5ff00] font-black text-sm">{rs.priority || 0}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={rs.status === 'active'
                          ? 'bg-[#f5ff00]/20 text-[#f5ff00] border border-[#f5ff00]/40 font-bold'
                          : 'bg-white/5 text-gray-500 border border-white/10'
                        }>
                          {rs.status || 'draft'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => { setEditingId(rs.id); setOpenDialog(true); }} className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8">
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => updateRulesetMutation.mutate({ id: rs.id, data: { status: rs.status === 'active' ? 'draft' : 'active' } })} className={rs.status === 'active' ? 'text-orange-400 hover:bg-orange-400/10 h-8 w-8' : 'text-[#f5ff00] hover:bg-[#f5ff00]/10 h-8 w-8'}>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setDeleteWarning(rs)} className="text-red-500 hover:bg-red-500/10 h-8 w-8">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </section>

        {/* ══ PART 2: LEGACY CONFIGS ══ */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 text-xs font-black uppercase tracking-[0.2em]">Part 02</span>
              <ChevronRight className="w-3 h-3 text-cyan-400" />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">Legacy Configs</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-cyan-400/30 to-transparent" />
            <Badge className="bg-cyan-400/10 text-cyan-400 border border-cyan-400/30 text-xs font-bold">{filteredConfigs.length} configs</Badge>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 gap-4 mb-4 p-4 rounded-xl bg-white/5 border border-white/10">
            <div>
              <label className="text-xs text-cyan-400 font-bold uppercase tracking-widest block mb-2">Filter by Series</label>
              <Select value={filters.series_id} onValueChange={(v) => setFilters({ ...filters, series_id: v })}>
                <SelectTrigger className="bg-[#1a1a1a] border-cyan-400/30 text-white">
                  <SelectValue placeholder="All Series" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/10">
                  <SelectItem value={null}>All Series</SelectItem>
                  {series.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-cyan-400 font-bold uppercase tracking-widest block mb-2">Filter by Season</label>
              <Select value={filters.season} onValueChange={(v) => setFilters({ ...filters, season: v })}>
                <SelectTrigger className="bg-[#1a1a1a] border-cyan-400/30 text-white">
                  <SelectValue placeholder="All Seasons" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/10">
                  <SelectItem value={null}>All Seasons</SelectItem>
                  {uniqueSeasons.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 bg-white/5">
                    <TableHead className="text-cyan-400 text-xs font-bold uppercase tracking-wider">Name</TableHead>
                    <TableHead className="text-cyan-400 text-xs font-bold uppercase tracking-wider">Series</TableHead>
                    <TableHead className="text-cyan-400 text-xs font-bold uppercase tracking-wider">Class</TableHead>
                    <TableHead className="text-cyan-400 text-xs font-bold uppercase tracking-wider">Season</TableHead>
                    <TableHead className="text-cyan-400 text-xs font-bold uppercase tracking-wider">Event</TableHead>
                    <TableHead className="text-cyan-400 text-xs font-bold uppercase tracking-wider">Priority</TableHead>
                    <TableHead className="text-cyan-400 text-xs font-bold uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-cyan-400 text-xs font-bold uppercase tracking-wider text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConfigs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <Settings2 className="w-8 h-8 text-cyan-400/20" />
                          <p className="text-gray-600 text-sm">No legacy configs found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredConfigs.map((config) => (
                    <TableRow key={config.id} className="border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell className="text-white font-semibold">{config.name}</TableCell>
                      <TableCell className="text-gray-400 text-sm">{series.find(s => s.id === config.series_id)?.name || config.series_id}</TableCell>
                      <TableCell className="text-gray-400 text-sm">{config.series_class_id ? seriesClasses.find(c => c.id === config.series_class_id)?.class_name : '—'}</TableCell>
                      <TableCell className="text-gray-400 text-sm">{config.season || '—'}</TableCell>
                      <TableCell className="text-gray-400 text-sm">{config.event_id ? events.find(e => e.id === config.event_id)?.name || config.event_id : '—'}</TableCell>
                      <TableCell>
                        <span className="text-cyan-400 font-black text-sm">{config.priority || 0}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={config.status === 'active' || config.is_active
                          ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/40 font-bold'
                          : 'bg-white/5 text-gray-500 border border-white/10'
                        }>
                          {config.status === 'active' || config.is_active ? 'Active' : config.status || 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => { setEditingId(config.id); setOpenDialog(true); }} className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8">
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => updateMutation.mutate({ id: config.id, data: { is_active: !config.is_active } })} className={config.is_active ? 'text-orange-400 hover:bg-orange-400/10 h-8 w-8' : 'text-cyan-400 hover:bg-cyan-400/10 h-8 w-8'}>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setDeleteWarning(config)} className="text-red-500 hover:bg-red-500/10 h-8 w-8">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </section>

      </div>

      {/* Editor Dialog */}
      {editingId ? (
        <PointsRuleSetEditor
          open={openDialog}
          onOpenChange={setOpenDialog}
          rulesetId={editingId}
          series={series}
          tracks={tracks}
          seriesClasses={seriesClasses}
          rulesets={rulesets}
          onSave={(data) => {
            updateRulesetMutation.mutate({ id: editingId, data });
          }}
        />
      ) : (
        <PointsRuleSetEditor
          open={openDialog}
          onOpenChange={setOpenDialog}
          rulesetId={null}
          series={series}
          tracks={tracks}
          seriesClasses={seriesClasses}
          rulesets={rulesets}
          onSave={(data) => {
            createRulesetMutation.mutate(data);
          }}
        />
      )}

      {/* Delete Warning */}
      {deleteWarning && (
        <AlertDialog open={!!deleteWarning} onOpenChange={() => setDeleteWarning(null)}>
          <AlertDialogContent className="bg-[#0d0d0d] border border-red-500/30">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-red-500" />
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white font-black">⚠️ Delete Ruleset?</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                Are you sure you want to delete <span className="text-white font-semibold">"{deleteWarning.name}"</span>? This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogCancel className="border-white/20 text-gray-400 hover:bg-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (deleteWarning.points_table_json !== undefined) {
                deleteRulesetMutation.mutate(deleteWarning.id);
              } else {
                deleteMutation.mutate(deleteWarning.id);
              }
            }} className="bg-red-600 hover:bg-red-700 font-bold">Delete</AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

function PointsConfigEditor({ open, onOpenChange, configId, series, seriesClasses, events, configs, onSave }) {
  // Legacy PointsConfig editor - kept for backward compatibility
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
          };