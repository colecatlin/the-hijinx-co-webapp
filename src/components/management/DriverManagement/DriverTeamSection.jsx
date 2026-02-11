import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const DISCIPLINES = [
  'Stock Car',
  'Off Road',
  'Dirt Oval',
  'Snowmobile',
  'Dirt Bike',
  'Open Wheel',
  'Sports Car',
  'Touring Car',
  'Rally',
  'Drag',
  'Motorcycle',
  'Karting',
  'Water',
  'Alternative'
];

export default function DriverTeamSection({ driverId }) {
  const [formData, setFormData] = useState({
    team_id: '',
    class_name: '',
  });
  const [isSaved, setIsSaved] = useState(false);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [showAddClass, setShowAddClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [classList, setClassList] = useState([
    'Pro 4',
    'Pro 2',
    'Pro Lite',
    'Super Stock',
    'Stock Full',
    'Mod Kart',
    'Turbo',
    'Pro Buggy',
    'Trophy Truck',
    'Class 1'
  ]);

  const queryClient = useQueryClient();

  const { data: driver, isLoading } = useQuery({
    queryKey: ['driver', driverId],
    queryFn: () => base44.entities.Driver.filter({ id: driverId }),
    enabled: driverId && driverId !== 'new',
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  useEffect(() => {
    if (driver && driver.length > 0) {
      const driverData = driver[0];
      setFormData({
        team_id: driverData.team_id || '',
        class_name: driverData.class_name || '',
      });
    }
  }, [driver]);

  const updateMutation = useMutation({
    mutationFn: (data) => {
      return base44.functions.invoke('updateEntitySafely', {
        entity_type: 'Driver',
        entity_id: driverId,
        data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver', driverId] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      toast.success('Team information saved');
    },
  });

  const createTeamMutation = useMutation({
    mutationFn: (name) => base44.entities.Team.create({
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description_summary: 'New team',
      primary_discipline: driver?.[0]?.primary_discipline || 'Stock Car',
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

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleAddClass = () => {
    if (newClassName) {
      setClassList([...classList, newClassName]);
      const updatedData = { ...formData, class_name: newClassName };
      setFormData(updatedData);
      updateMutation.mutate(updatedData);
      setNewClassName('');
      setShowAddClass(false);
    }
  };

  const handleAddTeam = () => {
    if (newTeamName) {
      createTeamMutation.mutate(newTeamName);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (driverId === 'new') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Information</CardTitle>
          <CardDescription>Save driver details first to manage team information</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Please save the driver's core details before assigning a team.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Information</CardTitle>
        <CardDescription>Manage driver's team affiliation and class</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
                onClick={handleAddTeam}
                disabled={!newTeamName || createTeamMutation.isPending}
              >
                Add
              </Button>
              <Button
                variant="ghost"
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

        <div>
          <Label htmlFor="class_name">Class</Label>
          {showAddClass ? (
            <div className="flex gap-2 mt-2">
              <Input
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="New class name"
                className="flex-1"
              />
              <Button
                onClick={handleAddClass}
                disabled={!newClassName}
              >
                Add
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowAddClass(false);
                  setNewClassName('');
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <>
              <Select value={formData.class_name} onValueChange={(value) => setFormData({ ...formData, class_name: value })}>
                <SelectTrigger id="class_name" className="mt-2">
                  <SelectValue placeholder="Select class (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {classList.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                onClick={() => setShowAddClass(true)}
                className="text-xs text-blue-600 hover:text-blue-700 mt-2"
              >
                + Add new class
              </button>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="bg-gray-900 hover:bg-gray-800"
          >
            {updateMutation.isPending ? 'Saving...' : isSaved ? '✓ Saved' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}