import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function TeamCoreDetailsSection({ teamId }) {
  const [formData, setFormData] = useState({});
  const [isSaved, setIsSaved] = useState(false);
  const queryClient = useQueryClient();

  const { data: team } = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => base44.entities.Team.list({ id: teamId }),
  });

  useEffect(() => {
    if (team && team.length > 0) {
      setFormData(team[0]);
    }
  }, [team]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Team.update(teamId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      setIsSaved(true);
      toast.success('Team updated');
      setTimeout(() => setIsSaved(false), 2000);
    },
  });

  const handleSave = () => {
    const { id, created_date, updated_date, created_by, ...updateData } = formData;
    updateMutation.mutate(updateData);
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Team Name</label>
            <Input
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Slug</label>
            <Input
              value={formData.slug || ''}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
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
            <Input
              value={formData.country || 'USA'}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            />
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

        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {isSaved ? 'Saved' : updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </Card>
  );
}