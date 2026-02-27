import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import DateInput from '@/components/shared/DateInput';
import CountryFlag from '@/components/shared/CountryFlag';
import { Loader2, Check } from 'lucide-react';
import DriverManagersSection from './DriverManagersSection';
import LocationFields from '@/components/shared/LocationFields';

export default function DriverCoreDetailsSection({ driver }) {
  const [data, setData] = useState({
    first_name: driver.first_name || '',
    last_name: driver.last_name || '',
    date_of_birth: driver.date_of_birth || '',
    hometown_city: driver.hometown_city || '',
    hometown_state: driver.hometown_state || '',
    hometown_country: driver.hometown_country || 'USA',
    racing_base_city: driver.racing_base_city || '',
    racing_base_state: driver.racing_base_state || '',
    racing_base_country: driver.racing_base_country || '',
    primary_number: driver.primary_number || '',
    primary_discipline: driver.primary_discipline || '',
  });

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      console.log('Sending data to update:', data);
      const response = await base44.entities.Driver.update(driver.id, data);
      console.log('Update response:', response);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver', driver.id] });
      setSaved(true);
      setError('');
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err) => {
      console.error('Update error:', err);
      setError('Failed to save changes');
    },
  });

  const handleChange = (field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Core Details</CardTitle>
        <CardDescription>Manage basic driver information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>First Name</Label>
            <Input
              value={data.first_name}
              onChange={(e) => handleChange('first_name', e.target.value)}
              placeholder="Enter first name"
            />
          </div>
          <div className="space-y-2">
            <Label>Last Name</Label>
            <Input
              value={data.last_name}
              onChange={(e) => handleChange('last_name', e.target.value)}
              placeholder="Enter last name"
            />
          </div>

          <div className="space-y-2">
            <Label>Date of Birth</Label>
            <DateInput
              value={data.date_of_birth}
              onChange={(value) => handleChange('date_of_birth', value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Primary Number</Label>
            <Input
              value={data.primary_number}
              onChange={(e) => handleChange('primary_number', e.target.value)}
              placeholder="Car number"
            />
          </div>

          <div className="col-span-1 md:col-span-2">
            <LocationFields
              cityValue={data.hometown_city}
              stateValue={data.hometown_state}
              countryValue={data.hometown_country}
              onCityChange={(v) => handleChange('hometown_city', v)}
              onStateChange={(v) => handleChange('hometown_state', v)}
              onCountryChange={(v) => handleChange('hometown_country', v)}
              cityLabel="Hometown City"
              stateLabel="State/Region"
              countryLabel="Country"
            />
          </div>

          <div className="col-span-1 md:col-span-2">
            <LocationFields
              cityValue={data.racing_base_city}
              stateValue={data.racing_base_state}
              countryValue={data.racing_base_country}
              onCityChange={(v) => handleChange('racing_base_city', v)}
              onStateChange={(v) => handleChange('racing_base_state', v)}
              onCountryChange={(v) => handleChange('racing_base_country', v)}
              cityLabel="Racing Base City"
              stateLabel="State/Region"
              countryLabel="Country"
            />
          </div>

          <div className="space-y-2">
            <Label>Primary Discipline</Label>
            <Select value={data.primary_discipline} onValueChange={(value) => handleChange('primary_discipline', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select discipline" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Open Wheel">Open Wheel</SelectItem>
                <SelectItem value="Stock Car">Stock Car</SelectItem>
                <SelectItem value="Off Road">Off Road</SelectItem>
                <SelectItem value="Snowmobile">Snowmobile</SelectItem>
                <SelectItem value="Rallycross">Rallycross</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="gap-2"
          >
            {mutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : null}
            {saved ? 'Saved' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function DriverCoreDetailsSectionWithManagers({ driver }) {
  return (
    <div className="space-y-6">
      <DriverCoreDetailsSection driver={driver} />
      <DriverManagersSection driverId={driver.id} driver={driver} />
    </div>
  );
}