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

export default function ManageDriverPartnership() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPart, setEditingPart] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    driver_id: '',
    partner_name: '',
    partner_type: 'Primary Sponsor',
    active: true,
    website_url: '',
    notes: '',
  });

  const queryClient = useQueryClient();

  const { data: partnerships = [], isLoading } = useQuery({
    queryKey: ['driverPartnership'],
    queryFn: () => base44.entities.DriverPartnership.list('-updated_date', 500),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DriverPartnership.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverPartnership'] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingPart) {
        return base44.entities.DriverPartnership.update(editingPart.id, data);
      }
      return base44.entities.DriverPartnership.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverPartnership'] });
      setShowForm(false);
      setEditingPart(null);
      setFormData({
        driver_id: '',
        partner_name: '',
        partner_type: 'Primary Sponsor',
        active: true,
        website_url: '',
        notes: '',
      });
    },
  });

  const handleSubmit = () => {
    if (!formData.driver_id || !formData.partner_name) {
      alert('Please fill in driver and partner name');
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleEdit = (p) => {
    setEditingPart(p);
    setFormData(p);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure?')) {
      deleteMutation.mutate(id);
    }
  };

  const filteredParts = partnerships.filter(p => {
    const driver = drivers.find(d => d.id === p.driver_id);
    return !driver || `${driver.first_name} ${driver.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
           p.partner_name.toLowerCase().includes(searchQuery.toLowerCase());
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
          <h1 className="text-4xl font-black">Driver Partnerships</h1>
          <Button onClick={() => { setShowForm(true); setEditingPart(null); }} className="bg-gray-900">
            <Plus className="w-4 h-4 mr-2" />
            Add Partnership
          </Button>
        </div>

        {showForm && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 space-y-4">
            <h2 className="text-xl font-bold">{editingPart ? 'Edit' : 'New'} Partnership</h2>
            
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
              <label className="text-sm font-medium">Partner Name *</label>
              <Input value={formData.partner_name} onChange={(e) => setFormData({...formData, partner_name: e.target.value})} required />
            </div>

            <div>
              <label className="text-sm font-medium">Partnership Type</label>
              <Select value={formData.partner_type} onValueChange={(value) => setFormData({...formData, partner_type: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Primary Sponsor">Primary Sponsor</SelectItem>
                  <SelectItem value="Associate Sponsor">Associate Sponsor</SelectItem>
                  <SelectItem value="Technical Partner">Technical Partner</SelectItem>
                  <SelectItem value="Equipment">Equipment</SelectItem>
                  <SelectItem value="Media">Media</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Website URL</label>
              <Input value={formData.website_url} onChange={(e) => setFormData({...formData, website_url: e.target.value})} type="url" />
            </div>

            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={3} />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({...formData, active: e.target.checked})}
                id="active"
              />
              <label htmlFor="active" className="text-sm font-medium">Active</label>
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
          <Input placeholder="Search by driver or partner..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-semibold">Driver</th>
                <th className="text-left px-6 py-3 text-sm font-semibold">Partner</th>
                <th className="text-left px-6 py-3 text-sm font-semibold">Type</th>
                <th className="text-left px-6 py-3 text-sm font-semibold">Status</th>
                <th className="text-right px-6 py-3 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredParts.length > 0 ? (
                filteredParts.map((p) => {
                  const driver = drivers.find(d => d.id === p.driver_id);
                  return (
                    <tr key={p.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-3">
                        {driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown'}
                      </td>
                      <td className="px-6 py-3">{p.partner_name}</td>
                      <td className="px-6 py-3 text-sm">{p.partner_type}</td>
                      <td className="px-6 py-3">
                        <span className={`text-xs px-2 py-1 rounded ${p.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {p.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
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
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">No partnerships found</td>
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