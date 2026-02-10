import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2 } from 'lucide-react';

export default function AccessCard({ entityType }) {
  const queryClient = useQueryClient();

  const { data: collaborators = [], isLoading } = useQuery({
    queryKey: ['entityCollaborators', entityType],
    queryFn: () => base44.entities.EntityCollaborator.filter({ entity_type: entityType }),
  });

  const deleteMutation = useMutation({
    mutationFn: (collaboratorId) => base44.entities.EntityCollaborator.delete(collaboratorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entityCollaborators', entityType] });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{entityType} Access</CardTitle>
          <CardDescription>Users with access to manage {entityType} entities.</CardDescription>
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
        <CardTitle>{entityType} Access</CardTitle>
        <CardDescription>Users with access to manage {entityType} entities.</CardDescription>
      </CardHeader>
      <CardContent>
        {collaborators.length === 0 ? (
          <p className="text-sm text-gray-500">No users have access to any {entityType} entity yet.</p>
        ) : (
          <div className="space-y-3">
            {collaborators.map((collaborator) => (
              <div
                key={collaborator.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{collaborator.entity_name || 'Unknown Entity'}</p>
                  <p className="text-xs text-gray-500">{collaborator.user_email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={collaborator.role === 'owner' ? 'default' : 'secondary'}>
                    {collaborator.role}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(collaborator.id)}
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