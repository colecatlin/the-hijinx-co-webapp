import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Edit2, CheckCircle2, Archive } from 'lucide-react';


export default function ManagePointsConfig() {
  const [isAdmin, setIsAdmin] = useState(false);
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState({ series_id: '', series_class_id: '', season_year: '', status: '' });
  const [activateWarning, setActivateWarning] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(user => {
      setIsAdmin(user?.role === 'admin');
    });
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
      setActivateWarning(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PointsConfig.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pointsConfigs'] })
  });

  const filteredConfigs = configs.filter(c => {
    if (filters.series_id && c.series_id !== filters.series_id) return false;
    if (filters.series_class_id && c.series_class_id !== filters.series_class_id) return false;
    if (filters.season_year && c.season_year !== filters.season_year) return false;
    if (filters.status && c.status !== filters.status) return false;
    return true;
  });

  const handleActivate = (config) => {
    const conflict = configs.find(c =>
      c.id !== config.id &&
      c.series_id === config.series_id &&
      (c.series_class_id || null) === (config.series_class_id || null) &&
      c.season_year === config.season_year &&
      c.status === 'Active'
    );

    if (conflict) {
      setActivateWarning({ config, conflict });
    } else {
      updateMutation.mutate({ id: config.id, data: { status: 'Active' } });
    }
  };

  const handleArchive = (id) => {
    updateMutation.mutate({ id, data: { status: 'Archived' } });
  };

  if (!isAdmin) {
    return <div className="p-6 text-center text-gray-400">Admin access required.</div>;
  }

  return (
    <div className="space-y-6 p-6 bg-gray-950 min-h-screen">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Points Configuration</h1>
          <Button onClick={() => { setEditingId(null); setOpenDialog(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> New Config
          </Button>
        </div>

        {/* Filters */}
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-6">
            <div className="grid grid-cols-4 gap-4">
              <Select value={filters.series_id} onValueChange={(v) => setFilters({ ...filters, series_id: v })}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue placeholder="Filter by Series" /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value={null}>All Series</SelectItem>
                  {series.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filters.season_year} onValueChange={(v) => setFilters({ ...filters, season_year: v })}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue placeholder="Filter by Season" /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value={null}>All Seasons</SelectItem>
                  {[...new Set(configs.map(c => c.season_year))].sort().reverse().map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue placeholder="Filter by Status" /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value={null}>All Status</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Archived">Archived</SelectItem>
                </SelectContent>
              </Select>
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
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Updated</TableHead>
                    <TableHead className="text-gray-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConfigs.map((config) => (
                    <TableRow key={config.id} className="border-gray-700 hover:bg-gray-800">
                      <TableCell className="text-white">{config.name || 'Untitled'}</TableCell>
                      <TableCell className="text-gray-400">{series.find(s => s.id === config.series_id)?.name || config.series_id}</TableCell>
                      <TableCell className="text-gray-400">{config.series_class_id ? seriesClasses.find(c => c.id === config.series_class_id)?.class_name : '—'}</TableCell>
                      <TableCell className="text-gray-400">{config.season_year}</TableCell>
                      <TableCell>
                        <Badge className={config.status === 'Active' ? 'bg-green-500/20 text-green-400' : config.status === 'Draft' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}>
                          {config.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-400 text-sm">{config.updated_date ? new Date(config.updated_date).toLocaleDateString() : '—'}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditingId(config.id); setOpenDialog(true); }} className="text-blue-400 hover:text-blue-300">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        {config.status === 'Draft' && (
                          <Button size="icon" variant="ghost" onClick={() => handleActivate(config)} className="text-green-400 hover:text-green-300">
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        )}
                        {config.status === 'Active' && (
                          <Button size="icon" variant="ghost" onClick={() => handleArchive(config.id)} className="text-orange-400 hover:text-orange-300">
                            <Archive className="w-4 h-4" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(config.id)} className="text-red-400 hover:text-red-300">
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
          onSave={(data) => {
            if (editingId) {
              updateMutation.mutate({ id: editingId, data });
            } else {
              createMutation.mutate(data);
            }
          }}
        />

        {/* Activation Warning */}
        {activateWarning && (
          <Dialog open={!!activateWarning} onOpenChange={() => setActivateWarning(null)}>
            <DialogContent className="bg-gray-900 border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-white">Activate Config?</DialogTitle>
              </DialogHeader>
              <p className="text-gray-400">
                There's already an active config for {activateWarning.series?.name} {activateWarning.config.series_class_id ? '/ ' + seriesClasses.find(c => c.id === activateWarning.config.series_class_id)?.class_name : ''} {activateWarning.config.season_year}.
                <br /> Activate this one to replace it?
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setActivateWarning(null)} className="border-gray-700">Cancel</Button>
                <Button
                  onClick={() => {
                    updateMutation.mutate({ id: activateWarning.config.id, data: { status: 'Active' } });
                  }}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  Activate & Replace
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          )}
          </div>
  );
}

function PointsConfigEditor({ open, onOpenChange, configId, series, seriesClasses, onSave }) {
  const [form, setForm] = useState({
    series_id: '',
    series_class_id: '',
    season_year: '',
    points_table_json: { '1': 25, '2': 20, '3': 16 }
  });

  const [pointsRows, setPointsRows] = useState([]);

  const { data: config } = useQuery({
    queryKey: ['pointsConfig', configId],
    queryFn: () => configId ? base44.entities.PointsConfig.list().then(all => all.find(c => c.id === configId)) : null,
    enabled: !!configId
  });

  useEffect(() => {
    if (config && open) {
      setForm(config);
      const rows = Object.entries(config.points_table_json || {}).map(([pos, pts]) => ({ position: Number(pos), points: pts })).sort((a, b) => a.position - b.position);
      setPointsRows(rows);
    } else if (!open) {
      setForm({ series_id: '', series_class_id: '', season_year: '', points_table_json: { '1': 25, '2': 20, '3': 16 } });
      setPointsRows([]);
    }
  }, [config, open]);

  const handleSave = () => {
    const table = {};
    pointsRows.forEach(row => {
      if (row.position && row.points !== '') table[String(row.position)] = Number(row.points);
    });

    onSave({
      ...form,
      points_table_json: table
    });
  };

  const addPointsRow = () => {
    setPointsRows([...pointsRows, { position: Math.max(0, ...pointsRows.map(r => r.position)) + 1, points: '' }]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">{configId ? 'Edit Config' : 'New Points Config'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Name</label>
              <Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-gray-800 border-gray-700 text-white" />
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
              <label className="text-xs text-gray-400 block mb-1">Series Class (optional)</label>
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
              <label className="text-xs text-gray-400 block mb-1">Season Year *</label>
              <Input value={form.season_year} onChange={(e) => setForm({ ...form, season_year: e.target.value })} className="bg-gray-800 border-gray-700 text-white" />
            </div>
          </div>

          <hr className="border-gray-700" />

          <div className="space-y-3">
            <h3 className="font-semibold text-white">Points Table</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {pointsRows.map((row, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input type="number" value={row.position} onChange={(e) => {
                    const newRows = [...pointsRows];
                    newRows[idx].position = Number(e.target.value);
                    setPointsRows(newRows);
                  }} className="bg-gray-800 border-gray-700 text-white w-20" placeholder="Position" />
                  <Input type="number" value={row.points} onChange={(e) => {
                    const newRows = [...pointsRows];
                    newRows[idx].points = Number(e.target.value);
                    setPointsRows(newRows);
                  }} className="bg-gray-800 border-gray-700 text-white flex-1" placeholder="Points" />
                  <Button size="sm" variant="ghost" onClick={() => setPointsRows(pointsRows.filter((_, i) => i !== idx))} className="text-red-400">Remove</Button>
                </div>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={addPointsRow} className="border-gray-700 text-gray-300">Add Position</Button>
          </div>

          <hr className="border-gray-700" />


        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-gray-700 text-gray-300">Cancel</Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">Save Config</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}