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
  'Open Wheel',
  'Stock Car',
  'Off Road',
  'Snowmobile',
  'Rallycross',
  'Other'
];

export default function DriverCoreDetailsSection({ driverId }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    nationality: '',
    hometown_city: '',
    hometown_state: '',
    hometown_country: '',
    location_city: '',
    location_state: '',
    location_country: '',
    primary_number: '',
    primary_discipline: '',
  });

  const [isSaved, setIsSaved] = useState(false);
  const queryClient = useQueryClient();

  const { data: driver, isLoading } = useQuery({
    queryKey: ['driver', driverId],
    queryFn: () => base44.entities.Driver.filter({ id: driverId }),
    enabled: !!driverId,
  });

  useEffect(() => {
    if (driver && driver.length > 0) {
      const driverData = driver[0];
      if (driverData) {
        setFormData({
          first_name: driverData.first_name || '',
          last_name: driverData.last_name || '',
          date_of_birth: driverData.date_of_birth || '',
          nationality: driverData.nationality || '',
          hometown_city: driverData.hometown_city || '',
          hometown_state: driverData.hometown_state || '',
          hometown_country: driverData.hometown_country || '',
          location_city: driverData.location_city || '',
          location_state: driverData.location_state || '',
          location_country: driverData.location_country || '',
          primary_number: driverData.primary_number || '',
          primary_discipline: driverData.primary_discipline || '',
        });
      }
    }
  }, [driver, driverId]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Driver.update(driverId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver', driverId] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      toast.success('Driver details saved');
    },
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return '';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleSave = () => {
    if (!formData.first_name || !formData.last_name) {
      toast.error('First and last name are required');
      return;
    }
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Core Details</CardTitle>
        <CardDescription>Edit basic driver information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="first_name">First Name</Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={(e) => handleInputChange('first_name', e.target.value)}
              placeholder="First name"
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="last_name">Last Name</Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={(e) => handleInputChange('last_name', e.target.value)}
              placeholder="Last name"
              className="mt-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="date_of_birth">Date of Birth</Label>
            <Input
              id="date_of_birth"
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label>Age</Label>
            <div className="mt-2 h-9 px-3 py-2 rounded-md border border-input bg-gray-50 flex items-center text-sm">
              {calculateAge(formData.date_of_birth) || '—'}
            </div>
          </div>
          <div>
            <Label htmlFor="nationality">Nationality</Label>
            <Input
              id="nationality"
              value={formData.nationality}
              onChange={(e) => handleInputChange('nationality', e.target.value)}
              placeholder="Nationality"
              className="mt-2"
            />
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold mb-4">Hometown</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="hometown_city">City</Label>
              <Input
                id="hometown_city"
                value={formData.hometown_city}
                onChange={(e) => handleInputChange('hometown_city', e.target.value)}
                placeholder="City"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="hometown_state">State/Region</Label>
              <Input
                id="hometown_state"
                value={formData.hometown_state}
                onChange={(e) => handleInputChange('hometown_state', e.target.value)}
                placeholder="State"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="hometown_country">Country</Label>
              <Input
                id="hometown_country"
                value={formData.hometown_country}
                onChange={(e) => handleInputChange('hometown_country', e.target.value)}
                placeholder="Country"
                className="mt-2"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-4">Current Racing Base</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="location_city">City</Label>
              <Input
                id="location_city"
                value={formData.location_city}
                onChange={(e) => handleInputChange('location_city', e.target.value)}
                placeholder="City"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="location_state">State/Region</Label>
              <Input
                id="location_state"
                value={formData.location_state}
                onChange={(e) => handleInputChange('location_state', e.target.value)}
                placeholder="State"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="location_country">Country</Label>
              <Input
                id="location_country"
                value={formData.location_country}
                onChange={(e) => handleInputChange('location_country', e.target.value)}
                placeholder="Country"
                className="mt-2"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="primary_number">Primary Number</Label>
            <Input
              id="primary_number"
              value={formData.primary_number}
              onChange={(e) => handleInputChange('primary_number', e.target.value)}
              placeholder="Car/bib number"
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="primary_discipline">Primary Discipline</Label>
            <Select value={formData.primary_discipline} onValueChange={(value) => handleInputChange('primary_discipline', value)}>
              <SelectTrigger id="primary_discipline" className="mt-2">
                <SelectValue placeholder="Select discipline" />
              </SelectTrigger>
              <SelectContent>
                {DISCIPLINES.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
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