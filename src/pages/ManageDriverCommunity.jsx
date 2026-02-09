import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, Edit2, Plus } from 'lucide-react';
import { createPageUrl } from '@/components/utils';
import { Link } from 'react-router-dom';

export default function ManageDriverCommunity() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCom, setEditingCom] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    driver_id: '',
    youth_programs: '',
    charity_involvement: '',
    mentoring: '',
    legacy_notes: '',
    community_notes: '',
  });

  const queryClient = useQueryClient();

  const { data: communities = [], isLoading } = useQuery({
    queryKey: ['driverCommunity'],
    queryFn: () => base44.entities.DriverCommunity.list('-updated_date', 500),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DriverCommunity.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverCommunity'] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingCom) {
        return base44.entities.DriverCommunity.update(editingCom.id, data);
      }
      return base44.entities.DriverCommunity.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverCommunity'] });
      setShowForm(false);
      setEditingCom(null);
      setFormData({
        driver_id: '',
        youth_programs: '',
        charity_involvement: '',
        mentoring: '',
        legacy_notes: '',
        community_notes: '',
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

  const handleEdit = (c) => {
    setEditingCom(c);
    setFormData(c);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure?')) {
      deleteMutation.mutate(id);
    }
  };

  const filteredCom = communities.filter(c => {
    const driver = drivers.find(d => d.id === c.driver_id);
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
          <h1 className="text-4xl font-black">Driver Community</h1>
          <Button onClick={() => { setShowForm(true); setEditingCom(null); }} className="bg-gray-900">
            <Plus className="w-4 h-4 mr-2" />
            Add Community
          </Button>
        </div>

        {showForm && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 space-y-4">
            <h2 className="text-xl font-bold">{editingCom ? 'Edit' : 'New'} Community</h2>
            
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
              <label className="text-sm font-medium">Youth Programs</label>
              <Textarea value={formData.youth_programs} onChange={(e) => setFormData({...formData, youth_programs: e.target.value})} rows={3} />
            </div>

            <div>
              <label className="text-sm font-medium">Charity Involvement</label>
              <Textarea value={formData.charity_involvement} onChange={(e) => setFormData({...formData, charity_involvement: e.target.value})} rows={3} />
            </div>

            <div>
              <label className="text-sm font-medium">Mentoring</label>
              <Textarea value={formData.mentoring} onChange={(e) => setFormData({...formData, mentoring: e.target.value})} rows={3} />
            </div>

            <div>
              <label className="text-sm font-medium">Legacy Notes</label>
              <Textarea value={formData.legacy_notes} onChange={(e) => setFormData({...formData, legacy_notes: e.target.value})} rows={3} />
            </div>

            <div>
              <label className="text-sm font-medium">Community Notes</label>
              <Textarea value={formData.community_notes} onChange={(e) => setFormData({...formData, community_notes: e.target.value})} rows={3} />
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
          <input
            type="text"
            placeholder="Search by driver..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg"
          />
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-semibold">Driver</th>
                <th className="text-left px-6 py-3 text-sm font-semibold">Info</th>
                <th className="text-right px-6 py-3 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCom.length > 0 ? (
                filteredCom.map((c) => {
                  const driver = drivers.find(d => d.id === c.driver_id);
                  const hasInfo = [c.youth_programs, c.charity_involvement, c.mentoring].filter(Boolean).length;
                  return (
                    <tr key={c.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-3">
                        {driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown'}
                      </td>
                      <td className="px-6 py-3 text-sm">{hasInfo} section(s) filled</td>
                      <td className="px-6 py-3 text-right space-x-2">
                        <button onClick={() => handleEdit(c)} className="text-gray-600 hover:text-gray-900">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-900">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="3" className="px-6 py-8 text-center text-gray-500">No community data found</td>
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