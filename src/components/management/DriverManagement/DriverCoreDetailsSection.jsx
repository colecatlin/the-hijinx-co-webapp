import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import MediaUploader from '@/components/shared/MediaUploader';
import ImageCropModal from '@/components/shared/ImageCropModal';
import LocationFieldsWithPicker from '@/components/shared/LocationFieldsWithPicker';
import DateInput from '@/components/shared/DateInput';

const DISCIPLINES = [
  'Stock Car', 'Off Road', 'Dirt Oval', 'Snowmobile', 'Dirt Bike', 'Open Wheel',
  'Sports Car', 'Touring Car', 'Rally', 'Drag', 'Motorcycle', 'Karting', 'Water', 'Alternative'
];

export default function DriverCoreDetailsSection({ driverId, onSaveSuccess }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    contact_email: '',
    hometown_city: '',
    hometown_state: '',
    hometown_country: 'USA',
    racing_base_city: '',
    racing_base_state: '',
    racing_base_country: '',
    primary_number: '',
    primary_discipline: '',
    career_status: '',
    featured: false,
  });

  const [isSaved, setIsSaved] = useState(false);
  const [headshotUrl, setHeadshotUrl] = useState('');
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [tempHeadshotUrl, setTempHeadshotUrl] = useState(null);
  const queryClient = useQueryClient();

  const { data: driver, isLoading } = useQuery({
    queryKey: ['driver', driverId],
    queryFn: () => base44.entities.Driver.filter({ id: driverId }),
    enabled: driverId && driverId !== 'new',
  });



  const { data: mediaRecords = [] } = useQuery({
    queryKey: ['driverMedia', driverId],
    queryFn: () => base44.entities.DriverMedia.filter({ driver_id: driverId }),
    enabled: driverId && driverId !== 'new',
  });

  useEffect(() => {
   if (driverId === 'new') {
     setFormData({
       first_name: '',
       last_name: '',
       date_of_birth: '',
       contact_email: '',
       represented_by: '',
       hometown_city: '',
       hometown_state: '',
       hometown_country: 'USA',
       racing_base_city: '',
       racing_base_state: '',
       racing_base_country: '',
       primary_number: '',
       primary_discipline: '',
       featured: false,
     });
     setHeadshotUrl('');
   } else if (driver && driver.length > 0) {
     const driverData = driver[0];
     if (driverData) {
       setFormData({
         first_name: driverData.first_name || '',
         last_name: driverData.last_name || '',
         date_of_birth: driverData.date_of_birth || '',
         contact_email: driverData.contact_email || '',
         represented_by: driverData.represented_by || '',
         hometown_city: driverData.hometown_city || '',
         hometown_state: driverData.hometown_state || '',
         hometown_country: driverData.hometown_country || 'USA',
         racing_base_city: driverData.racing_base_city || '',
         racing_base_state: driverData.racing_base_state || '',
         racing_base_country: driverData.racing_base_country || '',
         primary_number: driverData.primary_number || '',
         primary_discipline: driverData.primary_discipline || '',
         career_status: driverData.career_status || '',
         featured: driverData.featured || false,
         });
     }
   }
  }, [driver, driverId]);

  useEffect(() => {
    if (mediaRecords.length > 0) {
      setHeadshotUrl(mediaRecords[0].headshot_url || '');
    }
  }, [mediaRecords]);

  const updateMutation = useMutation({
    mutationFn: (data) => {
      if (driverId === 'new') {
        return base44.entities.Driver.create(data);
      }
      return base44.functions.invoke('updateEntitySafely', {
        entity_type: 'Driver',
        entity_id: driverId,
        data
      });
    },
    onSuccess: (data) => {
      const idToInvalidate = driverId === 'new' ? data.id : driverId;
      queryClient.invalidateQueries({ queryKey: ['driver', idToInvalidate] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      toast.success('Driver details saved');
      if (driverId === 'new' && onSaveSuccess) {
        onSaveSuccess(data.id);
      } else if (onSaveSuccess) {
        onSaveSuccess();
      }
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



  const handleHeadshotUpload = (url) => {
    setTempHeadshotUrl(url);
    setCropModalOpen(true);
  };

  const handleCropSave = async (croppedUrl) => {
    try {
      setHeadshotUrl(croppedUrl);
      
      if (driverId !== 'new') {
        const mediaRecord = mediaRecords[0];
        if (mediaRecord) {
          await base44.entities.DriverMedia.update(mediaRecord.id, { headshot_url: croppedUrl });
        } else {
          await base44.entities.DriverMedia.create({ driver_id: driverId, headshot_url: croppedUrl });
        }
        queryClient.invalidateQueries({ queryKey: ['driverMedia', driverId] });
        toast.success('Headshot updated');
      }
      
      setCropModalOpen(false);
      setTempHeadshotUrl(null);
    } catch (error) {
      console.error('Error saving headshot:', error);
      toast.error('Failed to save headshot');
    }
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
        <div className="flex items-center gap-4 pb-2">
          <div className="shrink-0">
            {headshotUrl ? (
              <img src={headshotUrl} alt="Driver headshot" className="w-16 h-16 rounded-full object-cover border border-gray-200" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 text-xs">No photo</div>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Driver Photo</label>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={driverId === 'new'}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const { file_url } = await base44.integrations.Core.UploadFile({ file });
                  handleHeadshotUpload(file_url);
                }}
              />
              <span className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded border border-gray-300 bg-white hover:bg-gray-50 transition-colors ${driverId === 'new' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                Upload Photo
              </span>
            </label>
            {driverId === 'new' && (
              <p className="text-xs text-gray-400">Save driver first to upload photo</p>
            )}
          </div>
        </div>

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

        <div className="space-y-2">
          <Label>Date of Birth</Label>
          <div className="flex items-center gap-4">
            <DateInput
              value={formData.date_of_birth}
              onChange={(value) => handleInputChange('date_of_birth', value)}
            />
            {formData.date_of_birth && (
              <span className="text-sm text-gray-500">Age: {calculateAge(formData.date_of_birth)}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="contact_email">Contact Email</Label>
            <Input
              id="contact_email"
              type="email"
              value={formData.contact_email}
              onChange={(e) => handleInputChange('contact_email', e.target.value)}
              placeholder="Contact email address"
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="represented_by">Represented By</Label>
            <Input
              id="represented_by"
              value={formData.represented_by}
              onChange={(e) => handleInputChange('represented_by', e.target.value)}
              placeholder="Agent, manager, or agency name"
              className="mt-2"
            />
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold mb-4">Hometown</h3>
          <LocationFieldsWithPicker
            values={{
              city: formData.hometown_city,
              state: formData.hometown_state,
              country: formData.hometown_country,
            }}
            onFieldChange={(field, value) => handleInputChange(`hometown_${field}`, value)}
            showCoordinates={false}
          />
        </div>

        <div>
          <h3 className="font-semibold mb-4">Location</h3>
          <LocationFieldsWithPicker
            values={{
              city: formData.location_city,
              state: formData.location_state,
              country: formData.location_country,
            }}
            onFieldChange={(field, value) => handleInputChange(`location_${field}`, value)}
            showCoordinates={false}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="primary_number">Car/Bib Number</Label>
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

        <div>
          <Label>Career Status</Label>
          <Select value={formData.career_status || ''} onValueChange={(v) => handleInputChange('career_status', v)}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select career status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Novice">Novice — just starting out in organized competition</SelectItem>
              <SelectItem value="Amateur">Amateur — regular competitor, non-professional</SelectItem>
              <SelectItem value="Semi-Professional">Semi-Professional — partial income/sponsorship from racing</SelectItem>
              <SelectItem value="Professional">Professional — full-time, major sponsorship or salary</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <Checkbox
            id="featured"
            checked={formData.featured}
            onCheckedChange={(checked) => handleInputChange('featured', checked)}
          />
          <Label htmlFor="featured" className="text-sm font-medium cursor-pointer">
            Featured on homepage
          </Label>
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

        <ImageCropModal
          open={cropModalOpen}
          onClose={() => {
            setCropModalOpen(false);
            setTempHeadshotUrl(null);
          }}
          imageUrl={tempHeadshotUrl}
          onSave={handleCropSave}
          aspectRatio={3/4}
        />
      </CardContent>
    </Card>
  );
}