import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function TeamPerformanceSection({ teamId }) {
  const [formData, setFormData] = useState({
    championships: '',
    pole_positions: '',
    wins: '',
    podiums: '',
    best_finish: '',
    best_season_year: '',
    notes: '',
  });
  const [isSaved, setIsSaved] = useState(false);
  const queryClient = useQueryClient();

  const { data: teamPerformance, isLoading } = useQuery({
    queryKey: ['teamPerformance', teamId],
    queryFn: () => base44.entities.TeamPerformance.filter({ team_id: teamId }),
    enabled: !!teamId,
  });

  useEffect(() => {
    if (teamPerformance && teamPerformance.length > 0) {
      setFormData(teamPerformance[0]);
    }
  }, [teamPerformance]);

  const updateMutation = useMutation({
    mutationFn: (data) => {
      if (formData.id) {
        return base44.entities.TeamPerformance.update(formData.id, data);
      } else {
        return base44.entities.TeamPerformance.create({ ...data, team_id: teamId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamPerformance', teamId] });
      setIsSaved(true);
      toast.success('Team performance updated');
      setTimeout(() => setIsSaved(false), 2000);
    },
  });

  const handleSave = () => {
    const { id, created_date, updated_date, created_by, ...updateData } = formData;
    const numericData = {
      ...updateData,
      championships: updateData.championships ? parseInt(updateData.championships) : null,
      pole_positions: updateData.pole_positions ? parseInt(updateData.pole_positions) : null,
      wins: updateData.wins ? parseInt(updateData.wins) : null,
      podiums: updateData.podiums ? parseInt(updateData.podiums) : null,
    };
    updateMutation.mutate(numericData);
  };

  if (isLoading) {
    return <Card className="p-6">Loading...</Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance</CardTitle>
        <CardDescription>Team's competitive achievements and records</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="championships">Championships</Label>
            <Input
              id="championships"
              type="number"
              min="0"
              value={formData.championships || ''}
              onChange={(e) => setFormData({ ...formData, championships: e.target.value })}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="wins">Wins</Label>
            <Input
              id="wins"
              type="number"
              min="0"
              value={formData.wins || ''}
              onChange={(e) => setFormData({ ...formData, wins: e.target.value })}
              className="mt-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="pole_positions">Pole Positions</Label>
            <Input
              id="pole_positions"
              type="number"
              min="0"
              value={formData.pole_positions || ''}
              onChange={(e) => setFormData({ ...formData, pole_positions: e.target.value })}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="podiums">Podiums</Label>
            <Input
              id="podiums"
              type="number"
              min="0"
              value={formData.podiums || ''}
              onChange={(e) => setFormData({ ...formData, podiums: e.target.value })}
              className="mt-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="best_finish">Best Finish</Label>
            <Input
              id="best_finish"
              value={formData.best_finish || ''}
              onChange={(e) => setFormData({ ...formData, best_finish: e.target.value })}
              placeholder="e.g., 1st, 2nd place"
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="best_season_year">Best Season Year</Label>
            <Input
              id="best_season_year"
              type="number"
              min="1950"
              max="2099"
              value={formData.best_season_year || ''}
              onChange={(e) => setFormData({ ...formData, best_season_year: e.target.value })}
              className="mt-2"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional performance achievements or records"
            className="mt-2"
            rows={4}
          />
        </div>

        <Button onClick={handleSave} disabled={updateMutation.isPending} className="w-full">
          {isSaved ? 'Saved' : updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </CardContent>
    </Card>
  );
}