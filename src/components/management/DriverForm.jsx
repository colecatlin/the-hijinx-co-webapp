import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import DateInput from '@/components/shared/DateInput';

export default function DriverForm({ driver, onClose }) {
  const [formData, setFormData] = useState(driver || {
    first_name: '',
    last_name: '',
    slug: '',
    hometown_city: '',
    hometown_state: '',
    country: 'USA',
    date_of_birth: '',
    status: 'Active',
    description_summary: '',
    primary_discipline: '',
    content_value: 'Unknown',
  });

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (driver) {
        return base44.entities.Driver.update(driver.id, data);
      }
      return base44.entities.Driver.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-generate slug and display name from first/last name
    if ((field === 'first_name' || field === 'last_name') && !driver) {
      const first = field === 'first_name' ? value : formData.first_name;
      const last = field === 'last_name' ? value : formData.last_name;
      const displayName = `${first} ${last}`.trim();
      const slug = displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setFormData(prev => ({ ...prev, display_name: displayName, slug }));
    }
  };

  return (
    <PageShell>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-4xl font-black">
            {driver ? 'Edit Driver' : 'Add Driver'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-white border border-gray-200 rounded-lg p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">First Name *</label>
              <Input
                value={formData.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Last Name *</label>
              <Input
                value={formData.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
                required
              />
            </div>
          </div>



          <div>
            <label className="block text-sm font-medium mb-2">Date of Birth</label>
            <DateInput
              value={formData.date_of_birth}
              onChange={(value) => handleChange('date_of_birth', value)}
            />
            {formData.date_of_birth && (
              <div className="text-sm text-gray-600 mt-2">
                Age: {calculateAge(formData.date_of_birth)} years old
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">City</label>
              <Input
                value={formData.hometown_city}
                onChange={(e) => handleChange('hometown_city', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">State</label>
              <Input
                value={formData.hometown_state}
                onChange={(e) => handleChange('hometown_state', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Country</label>
              <Input
                value={formData.country}
                onChange={(e) => handleChange('country', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Primary Discipline *</label>
            <Select value={formData.primary_discipline} onValueChange={(value) => handleChange('primary_discipline', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select discipline" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Off Road">Off Road</SelectItem>
                <SelectItem value="Snowmobile">Snowmobile</SelectItem>
                <SelectItem value="Asphalt Oval">Asphalt Oval</SelectItem>
                <SelectItem value="Road Racing">Road Racing</SelectItem>
                <SelectItem value="Rallycross">Rallycross</SelectItem>
                <SelectItem value="Drag Racing">Drag Racing</SelectItem>
                <SelectItem value="Mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Status *</label>
            <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Part Time">Part Time</SelectItem>
                <SelectItem value="Retired">Retired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description Summary * (2-3 sentences, 360 chars max)</label>
            <Textarea
              value={formData.description_summary}
              onChange={(e) => handleChange('description_summary', e.target.value)}
              required
              rows={4}
              maxLength={360}
            />
            <div className="text-xs text-gray-500 mt-1">
              {formData.description_summary?.length || 0}/360
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Content Value</label>
            <Select value={formData.content_value} onValueChange={(value) => handleChange('content_value', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending} className="bg-gray-900">
              {saveMutation.isPending ? 'Saving...' : driver ? 'Update Driver' : 'Create Driver'}
            </Button>
          </div>
        </form>
      </div>
    </PageShell>
  );
}