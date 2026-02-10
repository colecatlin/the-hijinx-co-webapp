import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

export default function DriverManagersSection({ driverId }) {
  const { data: managers = [], isLoading } = useQuery({
    queryKey: ['driverManagers', driverId],
    queryFn: () => base44.entities.EntityCollaborator.filter({
      entity_type: 'Driver',
      entity_id: driverId,
    }),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Management</CardTitle>
          <CardDescription>Users with access to manage this driver</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Access Management</CardTitle>
        <CardDescription>Users with access to manage this driver</CardDescription>
      </CardHeader>
      <CardContent>
        {managers.length === 0 ? (
          <p className="text-sm text-gray-500">No users have access to manage this driver yet.</p>
        ) : (
          <div className="space-y-3">
            {managers.map((manager) => (
              <div
                key={manager.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{manager.user_email}</p>
                </div>
                <Badge variant={manager.role === 'owner' ? 'default' : 'secondary'}>
                  {manager.role}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}