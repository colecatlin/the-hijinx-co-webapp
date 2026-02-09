import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Loader2 } from 'lucide-react';

const partnerTypes = [
  'Primary Sponsor',
  'Associate Sponsor',
  'Technical Partner',
  'Equipment',
  'Media',
];

export default function DriverPartnershipSection({ driverId }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    partner_name: '',
    partner_type: 'Primary Sponsor',
    active: true,
    website_url: '',
    notes: '',
  });

  const queryClient = useQueryClient();

  const { data: partnerships = [] } = useQuery({
    queryKey: ['driverPartnerships', driverId],
    queryFn: () => base44.entities.DriverPartnership.filter({ driver_id: driverId }, '-updated_date', 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DriverPartnership.create({ ...data, driver_id: driverId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverPartnerships', driverId] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.DriverPartnership.update(editingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverPartnerships', driverId] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DriverPartnership.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverPartnerships', driverId] });
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      partner_name: '',
      partner_type: 'Primary Sponsor',
      active: true,
      website_url: '',
      notes: '',
    });
  };

  const handleEdit = (partnership) => {
    setFormData(partnership);
    setEditingId(partnership.id);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!formData.partner_name) {
      alert('Please enter a partner name');
      return;
    }
    if (editingId) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Partnerships & Sponsors</CardTitle>
        <CardDescription>Manage sponsors and partners</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* List */}
        <div className="space-y-3">
          {partnerships.map((partnership) => (
            <div key={partnership.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
              <div className="flex-1">
                <p className="font-medium">{partnership.partner_name}</p>
                <p className="text-sm text-gray-600">
                  {partnership.partner_type} {partnership.active ? '(Active)' : '(Inactive)'}
                </p>
                {partnership.website_url && (
                  <a href={partnership.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                    {partnership.website_url}
                  </a>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(partnership)}>
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(partnership.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {partnerships.length === 0 && <p className="text-gray-500 text-sm">No partnerships added yet.</p>}
        </div>

        {/* Form */}
        {showForm && (
          <div className="border-t pt-6 space-y-4">
            <h3 className="font-semibold">{editingId ? 'Edit Partnership' : 'Add Partnership'}</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Partner Name</Label>
                <Input
                  value={formData.partner_name}
                  onChange={(e) => setFormData({ ...formData, partner_name: e.target.value })}
                  placeholder="Company or sponsor name"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Partner Type</Label>
                  <Select value={formData.partner_type} onValueChange={(value) => setFormData({ ...formData, partner_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {partnerTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    />
                    Active
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Website URL</Label>
                <Input
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Partnership details..."
                  rows={4}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingId ? 'Update' : 'Add'} Partnership
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
            Add Partnership
          </Button>
        )}
      </CardContent>
    </Card>
  );
}