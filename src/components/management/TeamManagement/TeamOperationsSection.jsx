import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function TeamOperationsSection({ teamId }) {
  const [formData, setFormData] = useState({
    headquarters_address: '',
    facility_details: '',
    employee_count: '',
    primary_contact_name: '',
    primary_contact_email: '',
    primary_contact_phone: '',
    operations_notes: '',
  });
  const [isSaved, setIsSaved] = useState(false);
  const queryClient = useQueryClient();

  const { data: teamOperations, isLoading } = useQuery({
    queryKey: ['teamOperations', teamId],
    queryFn: () => base44.entities.TeamOperations.filter({ team_id: teamId }),
    enabled: !!teamId,
  });

  useEffect(() => {
    if (teamOperations && teamOperations.length > 0) {
      setFormData(teamOperations[0]);
    }
  }, [teamOperations]);

  const updateMutation = useMutation({
    mutationFn: (data) => {
      if (formData.id) {
        return base44.entities.TeamOperations.update(formData.id, data);
      } else {
        return base44.entities.TeamOperations.create({ ...data, team_id: teamId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamOperations', teamId] });
      setIsSaved(true);
      toast.success('Team operations updated');
      setTimeout(() => setIsSaved(false), 2000);
    },
  });

  const handleSave = () => {
    const { id, created_date, updated_date, created_by, ...updateData } = formData;
    const numericData = {
      ...updateData,
      employee_count: updateData.employee_count ? parseInt(updateData.employee_count) : null,
    };
    updateMutation.mutate(numericData);
  };

  if (isLoading) {
    return <Card className="p-6">Loading...</Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Operations</CardTitle>
        <CardDescription>Manage team's operational details and contacts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="headquarters_address">Headquarters Address</Label>
          <Input
            id="headquarters_address"
            value={formData.headquarters_address || ''}
            onChange={(e) => setFormData({ ...formData, headquarters_address: e.target.value })}
            placeholder="Full address"
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="facility_details">Facility Details</Label>
          <Textarea
            id="facility_details"
            value={formData.facility_details || ''}
            onChange={(e) => setFormData({ ...formData, facility_details: e.target.value })}
            placeholder="Description of facilities and equipment"
            className="mt-2"
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="employee_count">Employee Count</Label>
          <Input
            id="employee_count"
            type="number"
            min="0"
            value={formData.employee_count || ''}
            onChange={(e) => setFormData({ ...formData, employee_count: e.target.value })}
            className="mt-2"
          />
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold text-sm mb-4">Primary Contact</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primary_contact_name">Name</Label>
              <Input
                id="primary_contact_name"
                value={formData.primary_contact_name || ''}
                onChange={(e) => setFormData({ ...formData, primary_contact_name: e.target.value })}
                placeholder="Full name"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="primary_contact_email">Email</Label>
              <Input
                id="primary_contact_email"
                type="email"
                value={formData.primary_contact_email || ''}
                onChange={(e) => setFormData({ ...formData, primary_contact_email: e.target.value })}
                placeholder="email@example.com"
                className="mt-2"
              />
            </div>
          </div>

          <div className="mt-4">
            <Label htmlFor="primary_contact_phone">Phone</Label>
            <Input
              id="primary_contact_phone"
              type="tel"
              value={formData.primary_contact_phone || ''}
              onChange={(e) => setFormData({ ...formData, primary_contact_phone: e.target.value })}
              placeholder="+1 (555) 000-0000"
              className="mt-2"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="operations_notes">Operations Notes</Label>
          <Textarea
            id="operations_notes"
            value={formData.operations_notes || ''}
            onChange={(e) => setFormData({ ...formData, operations_notes: e.target.value })}
            placeholder="Additional operational information"
            className="mt-2"
            rows={3}
          />
        </div>

        <Button onClick={handleSave} disabled={updateMutation.isPending} className="w-full">
          {isSaved ? 'Saved' : updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </CardContent>
    </Card>
  );
}