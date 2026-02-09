import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

export default function TeamPerformanceSection({ teamId }) {
  const [formData, setFormData] = useState({});
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
    updateMutation.mutate(updateData);
  };

  if (isLoading) {
    return <Card className="p-6">Loading...</Card>;
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <p className="text-gray-600">Team Performance section</p>
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {isSaved ? 'Saved' : updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </Card>
  );
}