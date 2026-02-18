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
import LocationFields from '@/components/shared/LocationFields';

export default function DriverForm({ driver, onClose }) {
  const [formData, setFormData] = useState(driver || {
    first_name: '',
    last_name: '',
    slug: '',
    date_of_birth: '',
    hometown_city: '',
    hometown_state: '',
    hometown_country: 'USA',
    primary_number: '',
    primary_discipline: '',
  });

  const queryClient = useQueryClient();

  const generateUniqueNumericId = async () => {
    let numericId;
    let isUnique = false;
    
    while (!isUnique) {
      numericId = String(Math.floor(Math.random() * 90000000) + 10000000);
      const existing = await base44.entities.Driver.filter({ numeric_id: numericId });
      isUnique = existing.length === 0;
    }
    
    return numericId;
  };

  const generateSlugFromData = (firstName, lastName, numericId) => {
    const slugBase = `${firstName} ${lastName}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return `${slugBase}-${numericId}`;
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (driver) {
        return base44.entities.Driver.update(driver.id, data);
      }
      const numericId = await generateUniqueNumericId();
      const slug = generateSlugFromData(data.first_name, data.last_name, numericId);
      return base44.entities.Driver.create({ ...data, numeric_id: numericId, slug });
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
            <label className="block text-sm font-medium mb-2">Date of Birth (mm/dd/yyyy)</label>
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
              <label className="block text-sm font-medium mb-2">Hometown City *</label>
              <Input
                value={formData.hometown_city}
                onChange={(e) => handleChange('hometown_city', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">State/Region</label>
              <Input
                value={formData.hometown_state}
                onChange={(e) => handleChange('hometown_state', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Country *</label>
              <Select value={formData.hometown_country} onValueChange={(value) => handleChange('hometown_country', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USA">USA</SelectItem>
                  <SelectItem value="Canada">Canada</SelectItem>
                  <SelectItem value="Mexico">Mexico</SelectItem>
                  <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                  <SelectItem value="Australia">Australia</SelectItem>
                  <SelectItem value="Brazil">Brazil</SelectItem>
                  <SelectItem value="France">France</SelectItem>
                  <SelectItem value="Germany">Germany</SelectItem>
                  <SelectItem value="Italy">Italy</SelectItem>
                  <SelectItem value="Spain">Spain</SelectItem>
                  <SelectItem value="Japan">Japan</SelectItem>
                  <SelectItem value="China">China</SelectItem>
                  <SelectItem value="India">India</SelectItem>
                  <SelectItem value="Russia">Russia</SelectItem>
                  <SelectItem value="Sweden">Sweden</SelectItem>
                  <SelectItem value="Norway">Norway</SelectItem>
                  <SelectItem value="Finland">Finland</SelectItem>
                  <SelectItem value="Netherlands">Netherlands</SelectItem>
                  <SelectItem value="Belgium">Belgium</SelectItem>
                  <SelectItem value="Austria">Austria</SelectItem>
                  <SelectItem value="Switzerland">Switzerland</SelectItem>
                  <SelectItem value="Denmark">Denmark</SelectItem>
                  <SelectItem value="Poland">Poland</SelectItem>
                  <SelectItem value="Argentina">Argentina</SelectItem>
                  <SelectItem value="Chile">Chile</SelectItem>
                  <SelectItem value="New Zealand">New Zealand</SelectItem>
                  <SelectItem value="South Africa">South Africa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Primary Number *</label>
            <Input
              value={formData.primary_number}
              onChange={(e) => handleChange('primary_number', e.target.value)}
              placeholder="e.g., 24, #24"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Primary Discipline *</label>
            <Select value={formData.primary_discipline} onValueChange={(value) => handleChange('primary_discipline', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select discipline" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Stock Car">Stock Car</SelectItem>
                <SelectItem value="Off Road">Off Road</SelectItem>
                <SelectItem value="Dirt Oval">Dirt Oval</SelectItem>
                <SelectItem value="Snowmobile">Snowmobile</SelectItem>
                <SelectItem value="Dirt Bike">Dirt Bike</SelectItem>
                <SelectItem value="Open Wheel">Open Wheel</SelectItem>
                <SelectItem value="Sports Car">Sports Car</SelectItem>
                <SelectItem value="Touring Car">Touring Car</SelectItem>
                <SelectItem value="Rally">Rally</SelectItem>
                <SelectItem value="Drag">Drag</SelectItem>
                <SelectItem value="Motorcycle">Motorcycle</SelectItem>
                <SelectItem value="Karting">Karting</SelectItem>
                <SelectItem value="Water">Water</SelectItem>
                <SelectItem value="Alternative">Alternative</SelectItem>
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