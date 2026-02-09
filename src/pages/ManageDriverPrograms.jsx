import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, Edit2, Plus } from 'lucide-react';
import { createPageUrl } from '@/components/utils';
import { Link } from 'react-router-dom';

export default function ManageDriverPrograms() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProgram, setEditingProgram] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    driver_id: '',
    series_id: '',
    team_id: '',
    class_name: '',
    bib_number: '',
    season_start_year: new Date().getFullYear(),
    season_end_year: null,
    program_status: 'Active',
    is_primary: false,
  });

  const queryClient = useQueryClient();

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ['driverPrograms'],
    queryFn: () => base44.entities.DriverProgram.list('-updated_date', 500),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  const { data: series = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DriverProgram.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverPrograms'] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingProgram) {
        return base44.entities.DriverProgram.update(editingProgram.id, data);
      }
      return base44.entities.DriverProgram.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverPrograms'] });
      setShowForm(false);
      setEditingProgram(null);
      setFormData({
        driver_id: '',
        series_id: '',
        team_id: '',
        class_name: '',
        bib_number: '',
        season_start_year: new Date().getFullYear(),
        season_end_year: null,
        program_status: 'Active',
        is_primary: false,
      });
    },
  });

  const handleSubmit = () => {
    if (!formData.driver_id || !formData.series_id || !formData.class_name || !formData.bib_number) {
      alert('Please fill in all required fields');
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleEdit = (program) => {
    setEditingProgram(program);
    setFormData(program);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this program?')) {
      deleteMutation.mutate(id);
    }
  };

  const filteredPrograms = programs.filter(program => {
    const driver = drivers.find(d => d.id === program.driver_id);
    const series = series.find(s => s.id === program.series_id);
    const driverName = driver ? `${driver.first_name} ${driver.last_name}` : '';
    const seriesName = series?.name || '';
    return driverName.toLowerCase().includes(searchQuery.toLowerCase()) || 
           seriesName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (isLoading) {
    return (
      <PageShell>
        <div className="max-w-7xl mx-auto px-6 py-12">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-black">Driver Programs</h1>
          <Button onClick={() => { setShowForm(true); setEditingProgram(null); }} className="bg-gray-900">
            <Plus className="w-4 h-4 mr-2" />
            Add Program
          </Button>
        </div>

        {showForm && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 space-y-4">
            <h2 className="text-xl font-bold">{editingProgram ? 'Edit' : 'New'} Program</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Driver *</label>
                <Select value={formData.driver_id} onValueChange={(value) => setFormData({...formData, driver_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map(d => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.first_name} {d.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Series *</label>
                <Select value={formData.series_id} onValueChange={(value) => setFormData({...formData, series_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select series" />
                  </SelectTrigger>
                  <SelectContent>
                    {series.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Team</label>
                <Select value={formData.team_id || ''} onValueChange={(value) => setFormData({...formData, team_id: value || null})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    {teams.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Class Name *</label>
                <Input
                  value={formData.class_name}
                  onChange={(e) => setFormData({...formData, class_name: e.target.value})}
                  placeholder="e.g., Pro, Modified"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Bib Number *</label>
                <Input
                  value={formData.bib_number}
                  onChange={(e) => setFormData({...formData, bib_number: e.target.value})}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Start Year *</label>
                <Input
                  type="number"
                  value={formData.season_start_year}
                  onChange={(e) => setFormData({...formData, season_start_year: parseInt(e.target.value)})}
                />
              </div>

              <div>
                <label className="text-sm font-medium">End Year</label>
                <Input
                  type="number"
                  value={formData.season_end_year || ''}
                  onChange={(e) => setFormData({...formData, season_end_year: e.target.value ? parseInt(e.target.value) : null})}
                  placeholder="Leave blank for ongoing"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={formData.program_status} onValueChange={(value) => setFormData({...formData, program_status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Past">Past</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  checked={formData.is_primary}
                  onChange={(e) => setFormData({...formData, is_primary: e.target.checked})}
                  id="primary"
                />
                <label htmlFor="primary" className="text-sm font-medium">Primary Program</label>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saveMutation.isPending} className="bg-gray-900">
                {saveMutation.isPending ? 'Saving...' : 'Save Program'}
              </Button>
            </div>
          </div>
        )}

        <div className="mb-6">
          <Input
            placeholder="Search by driver or series..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-semibold">Driver</th>
                <th className="text-left px-6 py-3 text-sm font-semibold">Series</th>
                <th className="text-left px-6 py-3 text-sm font-semibold">Class</th>
                <th className="text-left px-6 py-3 text-sm font-semibold">Team</th>
                <th className="text-left px-6 py-3 text-sm font-semibold">Years</th>
                <th className="text-left px-6 py-3 text-sm font-semibold">Status</th>
                <th className="text-right px-6 py-3 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPrograms.length > 0 ? (
                filteredPrograms.map((program) => {
                  const driver = drivers.find(d => d.id === program.driver_id);
                  const ser = series.find(s => s.id === program.series_id);
                  const team = teams.find(t => t.id === program.team_id);
                  const years = program.season_end_year ? `${program.season_start_year}–${program.season_end_year}` : `${program.season_start_year}–Present`;
                  return (
                    <tr key={program.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-3">
                        {driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown'}
                      </td>
                      <td className="px-6 py-3">{ser?.name}</td>
                      <td className="px-6 py-3">{program.class_name}</td>
                      <td className="px-6 py-3">{team?.name || '—'}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{years}</td>
                      <td className="px-6 py-3">
                        <span className={`text-xs px-2 py-1 rounded ${program.program_status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {program.program_status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right space-x-2">
                        <button onClick={() => handleEdit(program)} className="text-gray-600 hover:text-gray-900">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(program.id)} className="text-red-600 hover:text-red-900">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    No programs found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Link to={createPageUrl('Management')} className="inline-block mt-8">
          <Button variant="outline">Back to Management</Button>
        </Link>
      </div>
    </PageShell>
  );
}