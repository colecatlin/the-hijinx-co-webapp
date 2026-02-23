import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Trash2, Plus } from 'lucide-react';

export default function DriverProgramSection({ driverId }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    series_id: '',
    team_id: '',
    class_name: '',
    bib_number: '',
    start_year: '',
    end_year: '',
    program_status: 'Active',
  });
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [showAddSeries, setShowAddSeries] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState('');

  const queryClient = useQueryClient();

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ['driverPrograms', driverId],
    queryFn: () => base44.entities.DriverProgram.filter({ driver_id: driverId }),
    enabled: driverId && driverId !== 'new',
  });

  const { data: series = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const createProgramMutation = useMutation({
    mutationFn: (data) => base44.entities.DriverProgram.create({
      ...data,
      driver_id: driverId,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverPrograms', driverId] });
      setFormData({
        series_id: '',
        team_id: '',
        class_name: '',
        bib_number: '',
        start_month_year: '',
        end_month_year: '',
        program_status: 'Active',
      });
      setShowAddForm(false);
      toast.success('Program added');
    },
  });

  const updateProgramMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DriverProgram.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverPrograms', driverId] });
      toast.success('Program updated');
    },
  });

  const deleteProgramMutation = useMutation({
    mutationFn: (id) => base44.entities.DriverProgram.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverPrograms', driverId] });
      toast.success('Program deleted');
    },
  });

  const createTeamMutation = useMutation({
    mutationFn: (name) => base44.entities.Team.create({
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 8),
      description_summary: 'New team',
      primary_discipline: 'Stock Car',
      team_level: 'Regional',
      status: 'Active'
    }),
    onSuccess: (newTeam) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setFormData({ ...formData, team_id: newTeam.id });
      setNewTeamName('');
      setShowAddTeam(false);
      toast.success('Team created');
    },
  });

  const createSeriesMutation = useMutation({
    mutationFn: (name) => base44.entities.Series.create({
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 8),
      description_summary: 'New series',
      discipline: 'Stock Car',
      competition_level: 'Amateur',
      status: 'Active'
    }),
    onSuccess: (newSeries) => {
      queryClient.invalidateQueries({ queryKey: ['series'] });
      setFormData({ ...formData, series_id: newSeries.id });
      setNewSeriesName('');
      setShowAddSeries(false);
      toast.success('Series created');
    },
  });

  const handleAddProgram = () => {
    if (!formData.series_id || !formData.class_name || !formData.bib_number || !formData.start_month_year) {
      toast.error('Series, class, bib number, and start date are required');
      return;
    }
    createProgramMutation.mutate(formData);
  };

  const getSeriesName = (seriesId) => {
    const s = series.find(s => s.id === seriesId);
    return s ? s.name : 'Unknown Series';
  };

  const getTeamName = (teamId) => {
    if (!teamId) return '—';
    const t = teams.find(t => t.id === teamId);
    return t ? t.name : 'Unknown Team';
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (driverId === 'new') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Programs</CardTitle>
          <CardDescription>Save driver details first to manage programs</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Please save the driver's core details before adding programs.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Programs</CardTitle>
            <CardDescription>Manage driver's racing programs across series, teams, and classes</CardDescription>
          </div>
          {!showAddForm && (
            <Button onClick={() => setShowAddForm(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Program
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {showAddForm && (
          <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
            <h3 className="font-semibold text-sm">New Program</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="series_id">Series *</Label>
                {showAddSeries ? (
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={newSeriesName}
                      onChange={(e) => setNewSeriesName(e.target.value)}
                      placeholder="New series name"
                      className="flex-1"
                    />
                    <Button
                      onClick={() => createSeriesMutation.mutate(newSeriesName)}
                      disabled={!newSeriesName || createSeriesMutation.isPending}
                      size="sm"
                    >
                      Add
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowAddSeries(false);
                        setNewSeriesName('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <Select value={formData.series_id} onValueChange={(value) => setFormData({ ...formData, series_id: value })}>
                      <SelectTrigger id="series_id" className="mt-2">
                        <SelectValue placeholder="Select series" />
                      </SelectTrigger>
                      <SelectContent>
                        {series.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      onClick={() => setShowAddSeries(true)}
                      className="text-xs text-blue-600 hover:text-blue-700 mt-2"
                    >
                      + Add new series
                    </button>
                  </>
                )}
              </div>

              <div>
                <Label htmlFor="team_id">Team</Label>
                {showAddTeam ? (
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      placeholder="New team name"
                      className="flex-1"
                    />
                    <Button
                      onClick={() => createTeamMutation.mutate(newTeamName)}
                      disabled={!newTeamName || createTeamMutation.isPending}
                      size="sm"
                    >
                      Add
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowAddTeam(false);
                        setNewTeamName('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <Select value={formData.team_id} onValueChange={(value) => setFormData({ ...formData, team_id: value })}>
                      <SelectTrigger id="team_id" className="mt-2">
                        <SelectValue placeholder="Select team (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>None</SelectItem>
                        {teams.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      onClick={() => setShowAddTeam(true)}
                      className="text-xs text-blue-600 hover:text-blue-700 mt-2"
                    >
                      + Add new team
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="class_name">Class *</Label>
                <Input
                  id="class_name"
                  value={formData.class_name}
                  onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                  placeholder="e.g., Pro 4, Stock Full"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="bib_number">Bib/Car Number *</Label>
                <Input
                  id="bib_number"
                  value={formData.bib_number}
                  onChange={(e) => setFormData({ ...formData, bib_number: e.target.value })}
                  placeholder="e.g., 23"
                  className="mt-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="start_month_year">Start Month/Year *</Label>
                <Input
                  id="start_month_year"
                  type="text"
                  value={formData.start_month_year}
                  onChange={(e) => setFormData({ ...formData, start_month_year: e.target.value })}
                  placeholder="MM/YYYY"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="end_month_year">End Month/Year</Label>
                <Input
                  id="end_month_year"
                  type="text"
                  value={formData.end_month_year}
                  onChange={(e) => setFormData({ ...formData, end_month_year: e.target.value })}
                  placeholder="MM/YYYY (blank for Present)"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="program_status">Status</Label>
                <Select value={formData.program_status} onValueChange={(value) => setFormData({ ...formData, program_status: value })}>
                  <SelectTrigger id="program_status" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Past">Past</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleAddProgram}
                disabled={createProgramMutation.isPending}
                className="bg-gray-900 hover:bg-gray-800"
              >
                {createProgramMutation.isPending ? 'Adding...' : 'Add Program'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({
                    series_id: '',
                    team_id: '',
                    class_name: '',
                    bib_number: '',
                    start_month_year: '',
                    end_month_year: '',
                    program_status: 'Active',
                  });
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {programs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No programs added yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {programs.map((program) => (
              <div key={program.id} className="border rounded-lg p-4 bg-white">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{getSeriesName(program.series_id)}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        program.program_status === 'Active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {program.program_status}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
                      <div><span className="font-medium">Team:</span> {getTeamName(program.team_id)}</div>
                      <div><span className="font-medium">Class:</span> {program.class_name}</div>
                      <div><span className="font-medium">Number:</span> {program.bib_number}</div>
                      <div><span className="font-medium">Dates:</span> {program.start_month_year} - {program.end_month_year || 'Present'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteProgramMutation.mutate(program.id)}
                      disabled={deleteProgramMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}