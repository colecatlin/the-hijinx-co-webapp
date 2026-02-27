import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Trash2, Plus } from 'lucide-react';

export default function TeamVehiclesSection({ teamId }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    number: '',
    year: new Date().getFullYear(),
    make: '',
    model: '',
    class_name: '',
    status: 'Active',
    notes: '',
  });
  const queryClient = useQueryClient();

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['teamVehicles', teamId],
    queryFn: () => base44.entities.TeamVehicle.filter({ team_id: teamId }),
    enabled: !!teamId,
  });

  const createVehicleMutation = useMutation({
    mutationFn: (data) => base44.entities.TeamVehicle.create({
      ...data,
      team_id: teamId,
      year: parseInt(data.year),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamVehicles', teamId] });
      setFormData({
        number: '',
        year: new Date().getFullYear(),
        make: '',
        model: '',
        class_name: '',
        status: 'Active',
        notes: '',
      });
      setShowAddForm(false);
      toast.success('Vehicle added');
    },
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: (id) => base44.entities.TeamVehicle.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamVehicles', teamId] });
      toast.success('Vehicle deleted');
    },
  });

  const handleAddVehicle = () => {
    if (!formData.number) {
      toast.error('Vehicle number is required');
      return;
    }
    createVehicleMutation.mutate(formData);
  };

  if (isLoading) {
    return <Card className="p-6">Loading...</Card>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Vehicles</CardTitle>
            <CardDescription>Manage team's cars and vehicles</CardDescription>
          </div>
          {!showAddForm && (
            <Button onClick={() => setShowAddForm(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Vehicle
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {showAddForm && (
          <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
            <h3 className="font-semibold text-sm">New Vehicle</h3>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="number">Number *</Label>
                <Input
                  id="number"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  placeholder="e.g., 23"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  min="1950"
                  max="2099"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger id="status" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="In Build">In Build</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="make">Make</Label>
                <Input
                  id="make"
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  placeholder="e.g., Chevrolet"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="e.g., Silverado"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="class_name">Class</Label>
                <Input
                  id="class_name"
                  value={formData.class_name}
                  onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                  placeholder="e.g., Stock"
                  className="mt-2"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Vehicle specifications or notes"
                className="mt-2"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleAddVehicle}
                disabled={createVehicleMutation.isPending}
                className="bg-gray-900 hover:bg-gray-800"
              >
                {createVehicleMutation.isPending ? 'Adding...' : 'Add Vehicle'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({
                    number: '',
                    year: new Date().getFullYear(),
                    make: '',
                    model: '',
                    class_name: '',
                    status: 'Active',
                    notes: '',
                  });
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {vehicles.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No vehicles added yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="border rounded-lg p-4 bg-white">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold">#{vehicle.number} - {vehicle.year} {vehicle.make} {vehicle.model}</h4>
                    <div className="mt-2 grid grid-cols-3 gap-4 text-sm text-gray-600">
                      <div><span className="font-medium">Class:</span> {vehicle.class_name || '—'}</div>
                      <div>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          vehicle.status === 'Active' 
                            ? 'bg-green-100 text-green-700' 
                            : vehicle.status === 'In Build'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {vehicle.status}
                        </span>
                      </div>
                    </div>
                    {vehicle.notes && (
                      <div className="mt-3 text-sm text-gray-500 italic">{vehicle.notes}</div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteVehicleMutation.mutate(vehicle.id)}
                    disabled={deleteVehicleMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}