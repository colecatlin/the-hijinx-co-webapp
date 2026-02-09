import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, Edit2, Plus } from 'lucide-react';
import { createPageUrl } from '@/components/utils';
import { Link } from 'react-router-dom';

const specialties = ['Oval Track', 'Road Course', 'Dirt', 'Street Circuit', 'Wet Weather', 'Qualifying', 'Racecraft', 'Consistency', 'Adaptability'];

export default function ManageDriverPerformance() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPerf, setEditingPerf] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    driver_id: '',
    highlights: '',
    championships: '',
    notable_wins: '',
    specialties: [],
    recent_form: 'Unknown',
    career_stats: '',
    performance_notes: '',
  });

  const queryClient = useQueryClient();

  const { data: performances = [], isLoading } = useQuery({
    queryKey: ['driverPerformance'],
    queryFn: () => base44.entities.DriverPerformance.list('-updated_date', 500),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DriverPerformance.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverPerformance'] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingPerf) {
        return base44.entities.DriverPerformance.update(editingPerf.id, data);
      }
      return base44.entities.DriverPerformance.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverPerformance'] });
      setShowForm(false);
      setEditingPerf(null);
      setFormData({
        driver_id: '',
        highlights: '',
        championships: '',
        notable_wins: '',
        specialties: [],
        recent_form: 'Unknown',
        career_stats: '',
        performance_notes: '',
      });
    },
  });

  const handleSubmit = () => {
    if (!formData.driver_id) {
      alert('Please select a driver');
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleEdit = (p) => {
    setEditingPerf(p);
    setFormData(p);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure?')) {
      deleteMutation.mutate(id);
    }
  };

  const filteredPerf = performances.filter(p => {
    const driver = drivers.find(d => d.id === p.driver_id);
    return !driver || `${driver.first_name} ${driver.last_name}`.toLowerCase().includes(searchQuery.toLowerCase());
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
          <h1 className="text-4xl font-black">Driver Performance</h1>
          <Button onClick={() => { setShowForm(true); setEditingPerf(null); }} className="bg-gray-900">
            <Plus className="w-4 h-4 mr-2" />
            Add Performance
          </Button>
        </div>

        {showForm && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 space-y-4">
            <h2 className="text-xl font-bold">{editingPerf ? 'Edit' : 'New'} Performance</h2>
            
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
              <label className="text-sm font-medium">Recent Form</label>
              <Select value={formData.recent_form} onValueChange={(value) => setFormData({...formData, recent_form: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hot">Hot</SelectItem>
                  <SelectItem value="Steady">Steady</SelectItem>
                  <SelectItem value="Slump">Slump</SelectItem>
                  <SelectItem value="Unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Specialties</label>
              <div className="grid grid-cols-3 gap-2">
                {specialties.map(spec => (
                  <label key={spec} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.specialties?.includes(spec)}
                      onChange={(e) => {
                        const updated = e.target.checked
                          ? [...(formData.specialties || []), spec]
                          : formData.specialties?.filter(s => s !== spec) || [];
                        setFormData({...formData, specialties: updated});
                      }}
                    />
                    <span className="text-sm">{spec}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Highlights</label>
              <Textarea value={formData.highlights} onChange={(e) => setFormData({...formData, highlights: e.target.value})} rows={2} />
            </div>

            <div>
              <label className="text-sm font-medium">Championships</label>
              <Textarea value={formData.championships} onChange={(e) => setFormData({...formData, championships: e.target.value})} rows={2} />
            </div>

            <div>
              <label className="text-sm font-medium">Notable Wins</label>
              <Textarea value={formData.notable_wins} onChange={(e) => setFormData({...formData, notable_wins: e.target.value})} rows={2} />
            </div>

            <div>
              <label className="text-sm font-medium">Career Stats</label>
              <Textarea value={formData.career_stats} onChange={(e) => setFormData({...formData, career_stats: e.target.value})} rows={2} />
            </div>

            <div>
              <label className="text-sm font-medium">Performance Notes</label>
              <Textarea value={formData.performance_notes} onChange={(e) => setFormData({...formData, performance_notes: e.target.value})} rows={2} />
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saveMutation.isPending} className="bg-gray-900">
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        )}

        <div className="mb-6">
          <Input placeholder="Search by driver..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-semibold">Driver</th>
                <th className="text-left px-6 py-3 text-sm font-semibold">Form</th>
                <th className="text-left px-6 py-3 text-sm font-semibold">Specialties</th>
                <th className="text-right px-6 py-3 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPerf.length > 0 ? (
                filteredPerf.map((p) => {
                  const driver = drivers.find(d => d.id === p.driver_id);
                  return (
                    <tr key={p.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-3">
                        {driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown'}
                      </td>
                      <td className="px-6 py-3 text-sm">{p.recent_form}</td>
                      <td className="px-6 py-3 text-sm">{p.specialties?.length || 0} specialty(ies)</td>
                      <td className="px-6 py-3 text-right space-x-2">
                        <button onClick={() => handleEdit(p)} className="text-gray-600 hover:text-gray-900">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-900">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">No performance data found</td>
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