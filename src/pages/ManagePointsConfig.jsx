import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, RefreshCw, ExternalLink, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { createPageUrl } from '@/components/utils';
import ManagementLayout from '@/components/management/ManagementLayout';

function ConfigForm({ config, series, onSave, onCancel }) {
  const [form, setForm] = useState(config || {
    series_id: '',
    series_name: '',
    season_year: new Date().getFullYear().toString(),
    spreadsheet_id: '',
    spreadsheet_url: '',
    sanctioning_body: '',
    classes: [],
    status: 'active',
    notes: '',
  });
  const [classInput, setClassInput] = useState('');

  const handleUrlChange = (url) => {
    setForm(f => {
      const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      return { ...f, spreadsheet_url: url, spreadsheet_id: match ? match[1] : f.spreadsheet_id };
    });
  };

  const handleSeriesChange = (seriesId) => {
    const found = series.find(s => s.id === seriesId);
    setForm(f => ({ ...f, series_id: seriesId, series_name: found?.name || '' }));
  };

  const addClass = () => {
    const trimmed = classInput.trim();
    if (trimmed && !form.classes.includes(trimmed)) {
      setForm(f => ({ ...f, classes: [...f.classes, trimmed] }));
      setClassInput('');
    }
  };

  const removeClass = (cls) => {
    setForm(f => ({ ...f, classes: f.classes.filter(c => c !== cls) }));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Series</Label>
          <Select value={form.series_id} onValueChange={handleSeriesChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select series..." />
            </SelectTrigger>
            <SelectContent>
              {series.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Season Year</Label>
          <Input value={form.season_year} onChange={e => setForm(f => ({ ...f, season_year: e.target.value }))} placeholder="2026" />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Sanctioning Body Name</Label>
        <Input value={form.sanctioning_body} onChange={e => setForm(f => ({ ...f, sanctioning_body: e.target.value }))} placeholder="e.g., SCORE International" />
      </div>
      <div className="space-y-1">
        <Label>Google Sheet URL</Label>
        <Input value={form.spreadsheet_url} onChange={e => handleUrlChange(e.target.value)} placeholder="Paste full Google Sheets URL..." />
        {form.spreadsheet_id && (
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <CheckCircle className="w-3 h-3" /> Sheet ID detected: {form.spreadsheet_id.slice(0, 20)}...
          </p>
        )}
      </div>
      <div className="space-y-1">
        <Label>Class Tabs <span className="text-gray-400 text-xs">(must match sheet tab names exactly)</span></Label>
        <div className="flex gap-2">
          <Input value={classInput} onChange={e => setClassInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addClass()} placeholder="e.g., Pro 4" />
          <Button type="button" variant="outline" onClick={addClass}>Add</Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {form.classes.map(cls => (
            <Badge key={cls} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeClass(cls)}>
              {cls} ×
            </Badge>
          ))}
        </div>
      </div>
      <div className="space-y-1">
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={!form.series_name || !form.spreadsheet_id}>Save</Button>
      </div>
    </div>
  );
}

export default function ManagePointsConfig() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [recalculating, setRecalculating] = useState(null);

  const { data: configs = [] } = useQuery({
    queryKey: ['pointsConfigs'],
    queryFn: () => base44.entities.PointsConfig.list(),
  });

  const { data: series = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing?.id
      ? base44.entities.PointsConfig.update(editing.id, data)
      : base44.entities.PointsConfig.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pointsConfigs'] });
      setDialogOpen(false);
      setEditing(null);
      toast.success('Points config saved.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PointsConfig.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pointsConfigs'] });
      toast.success('Config deleted.');
    },
  });

  const handleRecalculate = async (config) => {
    setRecalculating(config.id);
    try {
      const res = await base44.functions.invoke('recalculateStandings', {
        series_name: config.series_name,
        season_year: config.season_year,
      });
      const processed = res.data?.processed || [];
      toast.success(`Recalculated standings for ${processed.length} class(es).`);
      queryClient.invalidateQueries({ queryKey: ['standings'] });
    } catch (e) {
      toast.error('Recalculation failed: ' + e.message);
    }
    setRecalculating(null);
  };

  return (
    <ManagementLayout currentPage="ManagePointsConfig">
      <div className="max-w-5xl mx-auto px-6 py-10">
      <Link to={createPageUrl('Management')} className="inline-flex items-center gap-1 text-xs font-mono text-gray-400 hover:text-[#232323] mb-6 transition-colors">
        <ArrowLeft className="w-3 h-3" /> Back to Management
      </Link>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-[#232323]">Points Configuration</h1>
          <p className="text-gray-500 mt-1">Link Google Sheets to series for automated standings calculation.</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Config
        </Button>
      </div>

      <div className="space-y-4">
        {configs.map(config => (
          <Card key={config.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{config.series_name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={config.status === 'active' ? 'default' : 'secondary'}>{config.status}</Badge>
                    <span className="text-sm text-gray-500">{config.season_year}</span>
                    {config.sanctioning_body && <span className="text-sm text-gray-400">· {config.sanctioning_body}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {config.spreadsheet_url && (
                    <a href={config.spreadsheet_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon"><ExternalLink className="w-4 h-4" /></Button>
                    </a>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRecalculate(config)}
                    disabled={recalculating === config.id}
                  >
                    <RefreshCw className={`w-4 h-4 mr-1 ${recalculating === config.id ? 'animate-spin' : ''}`} />
                    Recalculate
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(config); setDialogOpen(true); }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(config.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(config.classes || []).map(cls => (
                  <Badge key={cls} variant="outline">{cls}</Badge>
                ))}
                {config.spreadsheet_id && (
                  <span className="text-xs text-gray-400 ml-auto">Sheet ID: {config.spreadsheet_id.slice(0, 16)}…</span>
                )}
              </div>
              {config.notes && <p className="text-xs text-gray-400 mt-2">{config.notes}</p>}
            </CardContent>
          </Card>
        ))}
        {configs.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            No points configurations yet. Add one to get started.
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Points Config' : 'New Points Config'}</DialogTitle>
          </DialogHeader>
          <ConfigForm
            config={editing}
            series={series}
            onSave={(data) => saveMutation.mutate(data)}
            onCancel={() => { setDialogOpen(false); setEditing(null); }}
          />
        </DialogContent>
      </Dialog>
      </div>
    </ManagementLayout>
  );
}