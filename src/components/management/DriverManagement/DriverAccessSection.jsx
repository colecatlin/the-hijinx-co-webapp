import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';

export default function DriverAccessSection({ driverId }) {
  const [invitationEmail, setInvitationEmail] = useState('');
  const queryClient = useQueryClient();

  const { data: driver } = useQuery({
    queryKey: ['driver', driverId],
    queryFn: () => base44.entities.Driver.filter({ id: driverId }),
    enabled: driverId && driverId !== 'new',
  });

  const driverData = driver?.[0];

  const invitationMutation = useMutation({
    mutationFn: async (email) => {
      await base44.functions.invoke('createAndSendEntityInvitation', {
        email,
        entity_type: 'Driver',
        entity_id: driverId,
        entity_name: `${driverData.first_name} ${driverData.last_name}`,
        access_code: driverData.numeric_id,
        role: 'editor',
        expiration_days: 30
      });
      // Save email to driver contact_email field
      return base44.functions.invoke('updateEntitySafely', {
        entity_type: 'Driver',
        entity_id: driverId,
        data: { contact_email: email }
      });
    },
    onSuccess: () => {
      toast.success('Invitation sent successfully');
      setInvitationEmail('');
      queryClient.invalidateQueries({ queryKey: ['driver', driverId] });
    },
    onError: (error) => {
      toast.error(`Failed to send invitation: ${error.message}`);
    },
  });

  const handleSendInvitation = () => {
    if (!invitationEmail) {
      toast.error('Please enter an email address');
      return;
    }
    if (driverId === 'new') {
      toast.error('Please save the driver first before sending invitations');
      return;
    }
    invitationMutation.mutate(invitationEmail);
  };

  if (driverId === 'new') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access</CardTitle>
          <CardDescription>Manage driver access and invitations</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Save driver details first to send invitations</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Access</CardTitle>
        <CardDescription>Manage driver access and invitations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-semibold mb-4">Send Invitation</h3>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="invitation_email">Invite by Email</Label>
              <Input
                id="invitation_email"
                type="email"
                value={invitationEmail}
                onChange={(e) => setInvitationEmail(e.target.value)}
                placeholder="Enter email address"
                className="mt-2"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleSendInvitation}
                disabled={invitationMutation.isPending}
                variant="outline"
                className="gap-2"
              >
                <Mail className="w-4 h-4" />
                {invitationMutation.isPending ? 'Sending...' : 'Send Invite'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}