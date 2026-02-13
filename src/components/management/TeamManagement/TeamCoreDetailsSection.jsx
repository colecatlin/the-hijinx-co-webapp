import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';

const COUNTRIES = [
  'USA',
  'Canada',
  'Mexico',
  'United Kingdom',
  'Australia',
  'Brazil',
  'France',
  'Germany',
  'Italy',
  'Spain',
  'Japan',
  'China',
  'India',
  'Russia',
  'Sweden',
  'Norway',
  'Finland',
  'Netherlands',
  'Belgium',
  'Austria',
  'Switzerland',
  'Denmark',
  'Poland',
  'Argentina',
  'Chile',
  'New Zealand',
  'South Africa'
];

export default function TeamCoreDetailsSection({ teamId, onTeamCreated }) {
  const [formData, setFormData] = useState({});
  const [isSaved, setIsSaved] = useState(false);
  const queryClient = useQueryClient();

  const { data: team } = useQuery({
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
      toast.success('Team created');
      if (onTeamCreated) {
        onTeamCreated(newTeam);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Team.update(teamId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
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

  const handleSave = () => {
    const { id, created_date, updated_date, created_by, ...updateData } = formData;
    if (teamId === 'new') {
      createMutation.mutate(updateData);
    } else {
      updateMutation.mutate(updateData);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Team Name</label>
            <Input
              value={formData.name || ''}
              onChange={(e) => handleNameChange(e.target.value)}
            />
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

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">City</label>
            <Input
              value={formData.headquarters_city || ''}
              onChange={(e) => setFormData({ ...formData, headquarters_city: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">State</label>
            <Input
              value={formData.headquarters_state || ''}
              onChange={(e) => setFormData({ ...formData, headquarters_state: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Country</label>
            <Select value={formData.country || 'USA'} onValueChange={(value) => setFormData({ ...formData, country: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Discipline</label>
            <Select value={formData.primary_discipline || ''} onValueChange={(value) => setFormData({ ...formData, primary_discipline: value })}>
              <SelectTrigger>
                <SelectValue />
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
            <label className="text-sm font-medium">Level</label>
            <Select value={formData.team_level || ''} onValueChange={(value) => setFormData({ ...formData, team_level: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Local">Local</SelectItem>
                <SelectItem value="Regional">Regional</SelectItem>
                <SelectItem value="National">National</SelectItem>
                <SelectItem value="International">International</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
        </div>

        <div>
          <label className="text-sm font-medium">Founded Year</label>
          <Input
            type="number"
            value={formData.founded_year || ''}
            onChange={(e) => setFormData({ ...formData, founded_year: parseInt(e.target.value) })}
          />
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

        <Button onClick={handleSave} disabled={updateMutation.isPending || createMutation.isPending}>
          {isSaved ? 'Saved' : (updateMutation.isPending || createMutation.isPending) ? 'Saving...' : teamId === 'new' ? 'Create Team' : 'Save Changes'}
        </Button>
      </div>
    </Card>
  );
}