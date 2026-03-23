import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Pencil, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react';
import CompetitionLevelBadge from '@/components/competition/CompetitionLevelBadge';
import GeographicScopeTag from '@/components/competition/GeographicScopeTag';

const LEVEL_OPTIONS = [
  { value: 1, label: '1 — Foundation' },
  { value: 2, label: '2 — Development' },
  { value: 3, label: '3 — National' },
  { value: 4, label: '4 — Premier' },
  { value: 5, label: '5 — World' },
];

const SCOPE_OPTIONS = ['Local', 'Regional', 'National', 'International', 'Global'];
const SCORE_FIELDS = [
  { key: 'media_score', label: 'Media Score', desc: 'TV / streaming reach' },
  { key: 'attendance_score', label: 'Attendance Score', desc: 'Event attendance' },
  { key: 'purse_score', label: 'Purse Score', desc: 'Prize money' },
  { key: 'manufacturer_score', label: 'Manufacturer Score', desc: 'OEM involvement' },
  { key: 'geographic_diversity_score', label: 'Geographic Diversity', desc: 'Spread of competitor origins' },
  { key: 'team_budget_score', label: 'Team Budget Score', desc: 'Average team budget scale' },
];

const emptyForm = {
  class_name: '',
  description_summary: '',
  vehicle_type: '',
  competition_level: '',
  geographic_scope: '',
  sort_order: '',
  media_score: '',
  attendance_score: '',
  purse_score: '',
  manufacturer_score: '',
  geographic_diversity_score: '',
  team_budget_score: '',
  notes: '',
  active: true,
};

function computeScoreTotal(data) {
  return SCORE_FIELDS.reduce((sum, f) => sum + (Number(data[f.key]) || 0), 0);
}

function sortClasses(classes) {
  return [...classes].sort((a, b) => {
    const aHasOrder = a.sort_order != null;
    const bHasOrder = b.sort_order != null;
    if (aHasOrder && bHasOrder) return a.sort_order - b.sort_order;
    if (aHasOrder) return -1;
    if (bHasOrder) return 1;
    return (b.competition_level || 0) - (a.competition_level || 0);
  });
}

export default function SeriesClassesSection({ seriesId, userRole = 'admin' }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const isAdmin = userRole === 'admin';

  const { data: classes = [] } = useQuery({
    queryKey: ['seriesClasses', seriesId],
    queryFn: () => base44.entities.SeriesClass.filter({ series_id: seriesId }),
    enabled: !!seriesId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SeriesClass.create({ series_id: seriesId, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seriesClasses', seriesId] });
      setEditing(null);
      setFormData(emptyForm);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.SeriesClass.update(editing, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seriesClasses', seriesId] });
      setEditing(null);
      setFormData(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SeriesClass.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['seriesClasses', seriesId] }),
  });

  const reorderMutation = useMutation({
    mutationFn: ({ id, sort_order }) => base44.entities.SeriesClass.update(id, { sort_order }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['seriesClasses', seriesId] }),
  });

  const handleMove = (sorted, index, direction) => {
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;
    // Assign explicit sort_order to both swapped items
    const itemA = sorted[index];
    const itemB = sorted[swapIndex];
    reorderMutation.mutate({ id: itemA.id, sort_order: swapIndex });
    reorderMutation.mutate({ id: itemB.id, sort_order: index });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      competition_level: formData.competition_level ? Number(formData.competition_level) : null,
      ...SCORE_FIELDS.reduce((acc, f) => {
        acc[f.key] = formData[f.key] ? Number(formData[f.key]) : null;
        return acc;
      }, {}),
    };
    if (editing && editing !== 'new') {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const startEdit = (cls) => {
    setFormData({
      class_name: cls.class_name || '',
      description_summary: cls.description_summary || '',
      vehicle_type: cls.vehicle_type || '',
      competition_level: cls.competition_level || '',
      geographic_scope: cls.geographic_scope || '',
      sort_order: cls.sort_order ?? '',
      media_score: cls.media_score || '',
      attendance_score: cls.attendance_score || '',
      purse_score: cls.purse_score || '',
      manufacturer_score: cls.manufacturer_score || '',
      geographic_diversity_score: cls.geographic_diversity_score || '',
      team_budget_score: cls.team_budget_score || '',
      notes: cls.notes || '',
      active: cls.active !== false,
    });
    setEditing(cls.id);
  };

  if (editing) {
    const scoreTotal = computeScoreTotal(formData);
    return (
      <Card>
        <CardHeader>
          <CardTitle>{editing === 'new' ? 'Add Class' : 'Edit Class'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Basic info — editable by all */}
            <div className="space-y-4">
              <div>
                <Label>Class Name *</Label>
                <Input className="mt-1" placeholder="e.g. Pro 4, 450 MX, GTD" value={formData.class_name} onChange={(e) => setFormData({...formData, class_name: e.target.value})} required />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea className="mt-1" placeholder="Brief description of this class" value={formData.description_summary} onChange={(e) => setFormData({...formData, description_summary: e.target.value})} />
              </div>
              <div>
                <Label>Vehicle Type</Label>
                <Input className="mt-1" placeholder="e.g. Trophy Truck, Stock SXS" value={formData.vehicle_type} onChange={(e) => setFormData({...formData, vehicle_type: e.target.value})} />
              </div>
            </div>

            {/* Competition classification — admin only */}
            <div className={`border rounded-lg p-4 space-y-4 ${!isAdmin ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold">Competition Classification</h3>
                {!isAdmin && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Admin only</span>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Competition Level</Label>
                  <Select value={String(formData.competition_level)} onValueChange={(v) => setFormData({...formData, competition_level: v})} disabled={!isAdmin}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>
                      {LEVEL_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Geographic Scope</Label>
                  <Select value={formData.geographic_scope} onValueChange={(v) => setFormData({...formData, geographic_scope: v})} disabled={!isAdmin}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select scope" /></SelectTrigger>
                    <SelectContent>
                      {SCOPE_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Scoring Metrics (1–10 each)</Label>
                  {scoreTotal > 0 && (
                    <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">Total: {scoreTotal}</span>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {SCORE_FIELDS.map(f => (
                    <div key={f.key}>
                      <label className="text-[11px] font-medium text-gray-600">{f.label}</label>
                      <p className="text-[10px] text-gray-400 mb-1">{f.desc}</p>
                      <Input
                        type="number" min={1} max={10} placeholder="—"
                        value={formData[f.key]}
                        onChange={(e) => setFormData({...formData, [f.key]: e.target.value})}
                        className="text-sm"
                        disabled={!isAdmin}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea className="mt-1" placeholder="Internal notes" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox checked={formData.active} onCheckedChange={(checked) => setFormData({...formData, active: checked})} />
              <label className="text-sm">Active</label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="bg-[#232323]">Save Class</Button>
              <Button type="button" variant="outline" onClick={() => { setEditing(null); setFormData(emptyForm); }}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  const activeClasses = classes.filter(c => c.active !== false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Racing Classes</CardTitle>
          {activeClasses.length === 0 && (
            <div className="flex items-center gap-1.5 text-amber-600 text-xs mt-1">
              <AlertCircle className="w-3 h-3" />
              No active classes — series competition level cannot be derived
            </div>
          )}
        </div>
        <Button size="sm" onClick={() => { setFormData(emptyForm); setEditing('new'); }}>
          <Plus className="w-4 h-4 mr-1" />
          Add Class
        </Button>
      </CardHeader>
      <CardContent>
        {classes.length > 0 ? (
          <div className="space-y-3">
            {classes.map(cls => {
              const scoreTotal = computeScoreTotal(cls);
              return (
                <div key={cls.id} className="border border-gray-200 rounded-lg p-4 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <p className="font-semibold">{cls.class_name}</p>
                      {cls.competition_level && <CompetitionLevelBadge level={cls.competition_level} size="sm" />}
                      {cls.geographic_scope && <GeographicScopeTag scope={cls.geographic_scope} size="sm" />}
                    </div>
                    {cls.description_summary && <p className="text-sm text-gray-600 mb-1">{cls.description_summary}</p>}
                    {cls.vehicle_type && <p className="text-xs text-gray-400">Vehicle: {cls.vehicle_type}</p>}
                    {scoreTotal > 0 && <p className="text-xs text-gray-400 mt-1">Score total: {scoreTotal}</p>}
                    <span className={`inline-block mt-2 px-2 py-0.5 text-xs font-semibold rounded ${cls.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {cls.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(cls)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(cls.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No classes added yet. Add at least one active class to derive competition level.</p>
        )}
      </CardContent>
    </Card>
  );
}