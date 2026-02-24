import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Loader2 } from 'lucide-react';

export default function DriverProgramsSection({ driverId }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    series_id: '',
    team_id: '',
    class_name: '',
    car_number: '',
    start_month: new Date().getMonth() + 1,
    start_year: new Date().getFullYear(),
    end_month: null,
    end_year: null,
    status: 'active',
    notes: '',
  });

  const queryClient = useQueryClient();

  const { data: programs = [] } = useQuery({
    queryKey: ['driverPrograms', driverId],
    queryFn: () => base44.entities.DriverProgram.filter({ driver_id: driverId }, '-updated_date', 100),
  });

  const { data: series = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses', formData.series_id],
    queryFn: () => base44.entities.SeriesClass.filter({ series_id: formData.series_id, active: true }),
    enabled: !!formData.series_id,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DriverProgram.create({ ...data, driver_id: driverId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverPrograms', driverId] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.DriverProgram.update(editingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverPrograms', driverId] });
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
    setShowForm(false);
    setEditingId(null);
    setFormData({
      series_id: '',
      team_id: '',
      class_name: '',
      car_number: '',
      start_month: new Date().getMonth() + 1,
      start_year: new Date().getFullYear(),
      end_month: null,
      end_year: null,
      status: 'active',
      notes: '',
    });
  };

  const handleEdit = (program) => {
    setFormData({
      series_id: program.series_id || '',
      team_id: program.team_id || '',
      class_name: program.class_name || '',
      car_number: program.car_number || '',
      start_month: program.start_month || 1,
      start_year: program.start_year || new Date().getFullYear(),
      end_month: program.end_month || null,
      end_year: program.end_year || null,
      status: program.status || 'active',
      notes: program.notes || '',
    });
    setEditingId(program.id);
    setShowForm(true);
  };

  const validateForm = () => {
    if (!formData.series_id) return 'Series is required';
    if (!formData.start_month || !formData.start_year) return 'Start date is required';
    if (formData.status === 'inactive' && (!formData.end_month || !formData.end_year)) return 'End date is required for inactive programs';
    return null;
  };

  const handleSubmit = () => {
    const error = validateForm();
    if (error) {
      alert(error);
      return;
    }
    if (editingId) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const getSeriesName = (seriesId) => series.find((s) => s.id === seriesId)?.name || 'Unknown';
  const getTeamName = (teamId) => teams.find((t) => t.id === teamId)?.name || 'Unknown';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Racing Programs</CardTitle>
        <CardDescription>Manage series participation and team assignments</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* List */}
        <div className="space-y-3">
          {programs.map((program) => (
            <div key={program.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
              <div className="flex-1">
                <p className="font-medium">{getSeriesName(program.series_id)}</p>
                <p className="text-sm text-gray-600">
                  {program.class_name} • #{program.bib_number} • {program.season_start_year}-
                  {program.season_end_year || 'Present'}
                </p>
                {program.team_id && <p className="text-sm text-gray-500">Team: {getTeamName(program.team_id)}</p>}
                {program.is_primary && <p className="text-xs text-blue-600 font-medium">Primary Program</p>}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(program)}>
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(program.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {programs.length === 0 && <p className="text-gray-500 text-sm">No programs added yet.</p>}
        </div>

        {/* Form */}
        {showForm && (
          <div className="border-t pt-6 space-y-4">
            <h3 className="font-semibold">{editingId ? 'Edit Program' : 'Add Program'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Series</Label>
                <Select value={formData.series_id} onValueChange={(value) => setFormData({ ...formData, series_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select series" />
                  </SelectTrigger>
                  <SelectContent>
                    {series.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Team (Optional)</Label>
                <Select value={formData.team_id} onValueChange={(value) => setFormData({ ...formData, team_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Class</Label>
                {seriesClasses.length > 0 ? (
                  <Select value={formData.class_name} onValueChange={(value) => setFormData({ ...formData, class_name: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {seriesClasses.map((cls) => (
                        <SelectItem key={cls.id} value={cls.class_name}>
                          {cls.class_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={formData.class_name}
                    onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                    placeholder="e.g., Pro 4, Super Stock"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>Bib Number</Label>
                <Input
                  value={formData.bib_number}
                  onChange={(e) => setFormData({ ...formData, bib_number: e.target.value })}
                  placeholder="Car number"
                />
              </div>

              <div className="space-y-2">
                <Label>Start Year</Label>
                <Input
                  type="number"
                  value={formData.season_start_year}
                  onChange={(e) => setFormData({ ...formData, season_start_year: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>End Year</Label>
                <Input
                  type="number"
                  value={formData.season_end_year || ''}
                  onChange={(e) => setFormData({ ...formData, season_end_year: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Leave blank for ongoing"
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.program_status} onValueChange={(value) => setFormData({ ...formData, program_status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Past">Past</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_primary}
                    onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                  />
                  Primary Program
                </Label>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingId ? 'Update' : 'Add'} Program
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {!showForm && (
          <Button onClick={() => setShowForm(true)} variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Program
          </Button>
        )}
      </CardContent>
    </Card>
  );
}