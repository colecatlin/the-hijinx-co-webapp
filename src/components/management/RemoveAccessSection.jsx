import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2 } from 'lucide-react';

export default function RemoveAccessSection({ entityType, entityId }) {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = React.useState(null);

  const { data: collaborators = [], isLoading } = useQuery({
    queryKey: ['entityCollaborators', entityType, entityId],
    queryFn: () =>
      base44.entities.EntityCollaborator.filter({
        entity_type: entityType,
        entity_id: entityId,
      }),
  });

  const deleteAccessMutation = useMutation({
    mutationFn: (collaboratorId) =>
      base44.entities.EntityCollaborator.delete(collaboratorId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['entityCollaborators', entityType, entityId],
      });
      setDeletingId(null);
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Collaborator Access</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (collaborators.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Collaborator Access</CardTitle>
          <CardDescription>No collaborators have access yet</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Collaborator Access</CardTitle>
        <CardDescription>
          {collaborators.length} user{collaborators.length !== 1 ? 's' : ''} with access
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {collaborators.map((collab) => (
          <div
            key={collab.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex-1">
              <p className="font-medium text-gray-900">{collab.user_email}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={collab.role === 'owner' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {collab.role}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDeletingId(collab.id);
                deleteAccessMutation.mutate(collab.id);
              }}
              disabled={deletingId === collab.id}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {deletingId === collab.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}