import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, X, Trash2 } from 'lucide-react';
import DriverAccessForm from './DriverAccessForm';

export default function DriverManagersSection({ driverId, driver }) {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: managers = [], isLoading } = useQuery({
    queryKey: ['driverManagers', driverId],
    queryFn: () => base44.entities.EntityCollaborator.filter({
      entity_type: 'Driver',
      entity_id: driverId,
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: (managerId) => base44.entities.EntityCollaborator.delete(managerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverManagers', driverId] });
    },
  });

  const isAdmin = currentUser?.role === 'admin';

  if (isLoading || userLoading) {
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

  // Only show this section to admins
  if (!isAdmin) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Access Management</CardTitle>
        <CardDescription>Users with access to manage this driver</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {showForm && driver && <DriverAccessForm driver={driver} />}

        <div className="flex justify-end">
          <Button
            onClick={() => setShowForm(!showForm)}
            variant={showForm ? 'outline' : 'default'}
            size="sm"
            className="gap-2"
          >
            {showForm ? (
              <>
                <X className="w-4 h-4" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Grant Access
              </>
            )}
          </Button>
        </div>

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
                <div className="flex items-center gap-2">
                  <Badge variant={manager.role === 'owner' ? 'default' : 'secondary'}>
                    {manager.role}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(manager.id)}
                    disabled={deleteMutation.isPending}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}