import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Trash2, Plus } from 'lucide-react';

export default function TeamRosterSection({ teamId }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    driver_id: '',
    start_year: new Date().getFullYear(),
    end_year: '',
    role: 'Driver',
    status: 'Active',
  });
  const queryClient = useQueryClient();

  const { data: roster = [], isLoading } = useQuery({
    queryKey: ['teamRoster', teamId],
    queryFn: () => base44.entities.TeamRoster.filter({ team_id: teamId }),
    enabled: !!teamId,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  const createRosterMutation = useMutation({
    mutationFn: (data) => base44.entities.TeamRoster.create({
      ...data,
      team_id: teamId,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamRoster', teamId] });
      setFormData({
        driver_id: '',
        start_year: new Date().getFullYear(),
        end_year: '',
        role: 'Driver',
        status: 'Active',
      });
      setShowAddForm(false);
      toast.success('Driver added to roster');
    },
  });

  const deleteRosterMutation = useMutation({
    mutationFn: (id) => base44.entities.TeamRoster.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamRoster', teamId] });
      toast.success('Driver removed from roster');
    },
  });

  const handleAddDriver = () => {
    if (!formData.driver_id) {
      toast.error('Driver is required');
      return;
    }
    createRosterMutation.mutate({
      driver_id: formData.driver_id,
      start_year: formData.start_year,
      end_year: formData.end_year ? parseInt(formData.end_year) : null,
      role: formData.role,
      status: formData.status,
    });
  };

  const getDriverName = (driverId) => {
    const driver = drivers.find(d => d.id === driverId);
    return driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown Driver';
  };

  if (isLoading) {
    return <Card className="p-6">Loading...</Card>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Roster</CardTitle>
            <CardDescription>Manage drivers on this team</CardDescription>
          </div>
          {!showAddForm && (
            <Button onClick={() => setShowAddForm(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Driver
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {showAddForm && (
          <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
            <h3 className="font-semibold text-sm">Add Driver</h3>

            <div>
              <Label htmlFor="driver_id">Driver *</Label>
              <Select value={formData.driver_id} onValueChange={(value) => setFormData({ ...formData, driver_id: value })}>
                <SelectTrigger id="driver_id" className="mt-2">
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger id="role" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Driver">Driver</SelectItem>
                    <SelectItem value="Reserve">Reserve</SelectItem>
                    <SelectItem value="Test">Test Driver</SelectItem>
                  </SelectContent>
                </Select>
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
                  </SelectContent>
                </Select>
              </div>

              <div></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_year">Start Year *</Label>
                <Input
                  id="start_year"
                  type="number"
                  min="1950"
                  max="2099"
                  value={formData.start_year}
                  onChange={(e) => setFormData({ ...formData, start_year: parseInt(e.target.value) })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="end_year">End Year</Label>
                <Input
                  id="end_year"
                  type="number"
                  min="1950"
                  max="2099"
                  value={formData.end_year}
                  onChange={(e) => setFormData({ ...formData, end_year: e.target.value })}
                  placeholder="blank = ongoing"
                  className="mt-2"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleAddDriver}
                disabled={createRosterMutation.isPending}
                className="bg-gray-900 hover:bg-gray-800"
              >
                {createRosterMutation.isPending ? 'Adding...' : 'Add Driver'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({
                    driver_id: '',
                    start_year: new Date().getFullYear(),
                    end_year: '',
                    role: 'Driver',
                    status: 'Active',
                  });
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {roster.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No drivers on roster</p>
          </div>
        ) : (
          <div className="space-y-3">
            {roster.map((member) => (
              <div key={member.id} className="border rounded-lg p-4 bg-white">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold">{getDriverName(member.driver_id)}</h4>
                    <div className="mt-2 grid grid-cols-4 gap-4 text-sm text-gray-600">
                      <div><span className="font-medium">Role:</span> {member.role}</div>
                      <div><span className="font-medium">Start:</span> {member.start_year}</div>
                      <div><span className="font-medium">End:</span> {member.end_year || 'Ongoing'}</div>
                      <div>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          member.status === 'Active' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {member.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteRosterMutation.mutate(member.id)}
                    disabled={deleteRosterMutation.isPending}
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