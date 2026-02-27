import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Loader2, Pencil } from 'lucide-react';

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Date(2000, i).toLocaleString('default', { month: 'long' }),
}));

export default function DriverProgramsList({ driverId }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [formData, setFormData] = useState({
    series_id: '',
    series_name: '',
    team_id: '',
    team_name: '',
    class_name: '',
    start_month: new Date().getMonth() + 1,
    start_year: new Date().getFullYear(),
    end_month: null,
    end_year: null,
    car_number: '',
    status: 'active',
    is_rookie: false,
    notes: ''
  });

  const queryClient = useQueryClient();

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ['driverPrograms', driverId],
    queryFn: () => base44.entities.DriverProgram.filter({ driver_id: driverId }, '-start_date'),
  });

  const { data: series = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['seriesClasses', formData.series_id],
    queryFn: () => base44.entities.SeriesClass.filter({ series_id: formData.series_id }),
    enabled: !!formData.series_id,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DriverProgram.create({ ...data, driver_id: driverId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverPrograms', driverId] });
      setShowAddModal(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DriverProgram.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverPrograms', driverId] });
      setEditingProgram(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DriverProgram.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverPrograms', driverId] });
    },
  });

  const resetForm = () => {
    setFormData({
      series_id: '',
      series_name: '',
      team_id: '',
      team_name: '',
      class_name: '',
      start_month: new Date().getMonth() + 1,
      start_year: new Date().getFullYear(),
      end_month: null,
      end_year: null,
      car_number: '',
      status: 'active',
      is_rookie: false,
      notes: ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingProgram) {
      updateMutation.mutate({ id: editingProgram.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (program) => {
    setEditingProgram(program);
    setFormData({
      series_id: program.series_id || '',
      series_name: program.series_name || '',
      team_id: program.team_id || '',
      team_name: program.team_name || '',
      class_name: program.class_name || '',
      start_month: program.start_month || new Date().getMonth() + 1,
      start_year: program.start_year || new Date().getFullYear(),
      end_month: program.end_month || null,
      end_year: program.end_year || null,
      car_number: program.car_number || '',
      status: program.status || 'active',
      is_rookie: program.is_rookie || false,
      notes: program.notes || ''
    });
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">Driver Programs</h2>
          <Button onClick={() => setShowAddModal(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Program
          </Button>
        </div>

        {programs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No programs added yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {programs.map((program) => (
              <div key={program.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{program.series_name}</h3>
                      <span className={`px-2 py-1 text-xs rounded ${
                        program.status === 'active' ? 'bg-green-100 text-green-800' :
                        program.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {program.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                       <div>
                         <span className="text-gray-500">Start Date:</span>
                         <span className="ml-2 font-medium">{program.start_date}</span>
                       </div>
                       {program.end_date && (
                         <div>
                           <span className="text-gray-500">End Date:</span>
                           <span className="ml-2 font-medium">{program.end_date}</span>
                         </div>
                       )}
                       {program.team_name && (
                         <div>
                           <span className="text-gray-500">Team:</span>
                           <span className="ml-2 font-medium">{program.team_name}</span>
                         </div>
                       )}
                       {program.class_name && (
                         <div>
                           <span className="text-gray-500">Class:</span>
                           <span className="ml-2 font-medium">{program.class_name}</span>
                         </div>
                       )}
                       {program.car_number && (
                         <div>
                           <span className="text-gray-500">Car #:</span>
                           <span className="ml-2 font-medium">{program.car_number}</span>
                         </div>
                       )}
                     </div>
                    {program.notes && (
                      <p className="mt-2 text-sm text-gray-600">{program.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(program)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(program.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={showAddModal || !!editingProgram} onOpenChange={(open) => {
        if (!open) {
          setShowAddModal(false);
          setEditingProgram(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingProgram ? 'Edit Driver Program' : 'Add Driver Program'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            {/* Series */}
            <div>
              <label className="block text-sm font-medium mb-2">Series *</label>
              <Select
                value={formData.series_id}
                onValueChange={(val) => {
                  const selectedSeries = series.find(s => s.id === val);
                  setFormData({ ...formData, series_id: val, series_name: selectedSeries?.name || '' });
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select series" /></SelectTrigger>
                <SelectContent>
                  {series.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Team</label>
                <Select
                  value={formData.team_id}
                  onValueChange={(val) => {
                    const selectedTeam = teams.find(t => t.id === val);
                    setFormData({ ...formData, team_id: val, team_name: selectedTeam?.name || '' });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Class</label>
                <Select
                  value={formData.class_name}
                  onValueChange={(val) => setFormData({ ...formData, class_name: val })}
                  disabled={!formData.series_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.series_id ? "Select class" : "Select series first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.class_name}>{c.class_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Car Number</label>
              <Input
                value={formData.car_number}
                onChange={(e) => setFormData({ ...formData, car_number: e.target.value })}
                placeholder="e.g., 99"
              />
            </div>

            {/* Start month/year */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Start Month</label>
                <Select value={String(formData.start_month)} onValueChange={(v) => setFormData({ ...formData, start_month: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Start Year</label>
                <Input
                  type="number"
                  value={formData.start_year}
                  onChange={(e) => setFormData({ ...formData, start_year: parseInt(e.target.value) })}
                />
              </div>
            </div>

            {/* Present checkbox */}
            <div className="flex items-center gap-3">
              <Checkbox
                id="is_present_modal"
                checked={formData.status === 'active'}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  status: checked ? 'active' : 'inactive',
                  end_month: checked ? null : formData.end_month,
                  end_year: checked ? null : formData.end_year,
                })}
              />
              <label htmlFor="is_present_modal" className="text-sm font-medium cursor-pointer select-none">
                Present — driver is currently active in this program
              </label>
            </div>

            {/* End month/year — only when not present */}
            {formData.status === 'inactive' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">End Month</label>
                  <Select value={String(formData.end_month || '')} onValueChange={(v) => setFormData({ ...formData, end_month: parseInt(v) })}>
                    <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">End Year</label>
                  <Input
                    type="number"
                    value={formData.end_year || ''}
                    onChange={(e) => setFormData({ ...formData, end_year: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="e.g., 2024"
                  />
                </div>
              </div>
            )}

            {/* Rookie */}
            <div className="flex items-center gap-3">
              <Checkbox
                id="is_rookie_modal"
                checked={!!formData.is_rookie}
                onCheckedChange={(checked) => setFormData({ ...formData, is_rookie: !!checked })}
              />
              <label htmlFor="is_rookie_modal" className="text-sm font-medium cursor-pointer select-none flex items-center gap-2">
                Rookie Year — mark this as a rookie season for this class
                {formData.is_rookie && (
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-yellow-400 text-black font-black text-xs">R</span>
                )}
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Notes</label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional program details"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => {
                setShowAddModal(false);
                setEditingProgram(null);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingProgram ? 'Update Program' : 'Add Program'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}