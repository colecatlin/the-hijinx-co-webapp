import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

export default function TeamPartnersSection({ teamId }) {
  const [formData, setFormData] = useState({});
  const [isSaved, setIsSaved] = useState(false);
  const queryClient = useQueryClient();

  const { data: teamPartners, isLoading } = useQuery({
    queryKey: ['teamPartners', teamId],
    queryFn: () => base44.entities.TeamPartner.filter({ team_id: teamId }),
    enabled: !!teamId,
  });

  useEffect(() => {
    if (teamPartners && teamPartners.length > 0) {
      setFormData(teamPartners[0]);
    }
  }, [teamPartners]);

  const updateMutation = useMutation({
    mutationFn: (data) => {
      if (formData.id) {
        return base44.entities.TeamPartner.update(formData.id, data);
      } else {
        return base44.entities.TeamPartner.create({ ...data, team_id: teamId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamPartners', teamId] });
      setIsSaved(true);
      toast.success('Team partners updated');
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
        <p className="text-gray-600">Team Partners section</p>
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {isSaved ? 'Saved' : updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </Card>
  );
}