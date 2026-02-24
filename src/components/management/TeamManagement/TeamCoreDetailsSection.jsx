import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, RefreshCw } from 'lucide-react';
import LocationFields from '@/components/shared/LocationFields';

export default function TeamCoreDetailsSection({ teamId, onTeamCreated }) {
  const [formData, setFormData] = useState({ country: 'USA' });
  const [isSaved, setIsSaved] = useState(false);
  const [errors, setErrors] = useState({});
  const queryClient = useQueryClient();

  const { data: team, refetch } = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => base44.entities.Team.list({ id: teamId }),
    enabled: teamId !== 'new',
  });

  useEffect(() => {
    if (team && team.length > 0) {
      setFormData(team[0]);
    }
  }, [team]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Team.create(data),
    onSuccess: (newTeam) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setFormData(newTeam);
      toast.success('Team created');
      if (onTeamCreated) {
        onTeamCreated(newTeam);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Team.update(teamId, data),
    onSuccess: (updatedTeam) => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setFormData(updatedTeam);
      setIsSaved(true);
      toast.success('Team updated');
      setTimeout(() => setIsSaved(false), 2000);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file) => base44.integrations.Core.UploadFile({ file }),
    onSuccess: (data) => {
      setFormData({ ...formData, logo_url: data.file_url });
      toast.success('Image uploaded');
    },
  });

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
  };

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (name) => {
    const slug = generateSlug(name);
    setFormData({ ...formData, name, slug });
  };

  const validateForm = () => {
    const newErrors = {};
    const currentYear = new Date().getFullYear();
    
    if (!formData.name?.trim()) newErrors.name = 'Team name is required';
    if (!formData.headquarters_city?.trim()) newErrors.headquarters_city = 'City is required';
    if (!formData.headquarters_state?.trim()) newErrors.headquarters_state = 'State is required';
    if (!formData.country?.trim()) newErrors.country = 'Country is required';
    if (formData.founded_year && (formData.founded_year < 1900 || formData.founded_year > currentYear)) {
      newErrors.founded_year = `Year must be between 1900 and ${currentYear}`;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    const { id, created_date, updated_date, created_by, ...updateData } = formData;
    if (teamId === 'new') {
      createMutation.mutate(updateData);
    } else {
      updateMutation.mutate(updateData);
    }
  };

  const handleRefresh = () => {
    refetch();
    toast.success('Data refreshed');
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Team Name *</label>
            <Input
              value={formData.name || ''}
              onChange={(e) => handleNameChange(e.target.value)}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">Slug (auto-generated)</label>
            <Input
              value={formData.slug || ''}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="bg-gray-50"
            />
          </div>
        </div>

        <LocationFields
          cityValue={formData.headquarters_city}
          stateValue={formData.headquarters_state}
          countryValue={formData.country || 'USA'}
          onCityChange={(v) => setFormData({ ...formData, headquarters_city: v })}
          onStateChange={(v) => setFormData({ ...formData, headquarters_state: v })}
          onCountryChange={(v) => setFormData({ ...formData, country: v })}
          cityLabel="City *"
          stateLabel="State *"
          countryLabel="Country *"
          errors={errors}
        />

        <div>
          <label className="text-sm font-medium">Status</label>
          <Select value={formData.status || ''} onValueChange={(value) => setFormData({ ...formData, status: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Part Time">Part Time</SelectItem>
              <SelectItem value="Historic">Historic</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">Founded Year</label>
          <Input
            type="number"
            value={formData.founded_year || ''}
            onChange={(e) => setFormData({ ...formData, founded_year: parseInt(e.target.value) })}
            min="1900"
            max={new Date().getFullYear()}
            className={errors.founded_year ? 'border-red-500' : ''}
          />
          {errors.founded_year && <p className="text-xs text-red-500 mt-1">{errors.founded_year}</p>}
        </div>

        <div>
          <label className="text-sm font-medium">Description</label>
          <Textarea
            value={formData.description_summary || ''}
            onChange={(e) => setFormData({ ...formData, description_summary: e.target.value })}
            rows={4}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Logo</label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('team-logo-upload').click()}
              disabled={uploadMutation.isPending}
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploadMutation.isPending ? 'Uploading...' : 'Upload Image'}
            </Button>
            <input
              id="team-logo-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            {formData.logo_url && (
              <img src={formData.logo_url} alt="Team logo" className="h-10 rounded" />
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={updateMutation.isPending || createMutation.isPending}>
            {isSaved ? 'Saved' : (updateMutation.isPending || createMutation.isPending) ? 'Saving...' : teamId === 'new' ? 'Create Team' : 'Save Changes'}
          </Button>
          {teamId !== 'new' && (
            <Button variant="outline" onClick={handleRefresh} size="sm">
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}