import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ManageEntityAccess() {
  const [expandedEntity, setExpandedEntity] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const queryClient = useQueryClient();

  const { data: collaborators = [], isLoading } = useQuery({
    queryKey: ['allCollaborators'],
    queryFn: () => base44.entities.EntityCollaborator.list(),
  });

  const deleteAccessMutation = useMutation({
    mutationFn: (collaboratorId) => base44.entities.EntityCollaborator.delete(collaboratorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allCollaborators'] });
      setDeletingId(null);
    },
  });

  const groupedByEntity = collaborators.reduce((acc, collab) => {
    const key = `${collab.entity_type}-${collab.entity_id}`;
    if (!acc[key]) {
      acc[key] = {
        entity_type: collab.entity_type,
        entity_id: collab.entity_id,
        entity_name: collab.entity_name,
        collaborators: [],
      };
    }
    acc[key].collaborators.push(collab);
    return acc;
  }, {});

  const entityGroups = Object.values(groupedByEntity);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-12">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (entityGroups.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Manage Entity Access</CardTitle>
            <CardDescription>No collaborators assigned to any entities yet</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Entity Access</h1>
        <p className="text-gray-600">View and remove collaborator access to entities</p>
      </div>

      <div className="space-y-4">
        {entityGroups.map((group) => (
          <motion.div
            key={`${group.entity_type}-${group.entity_id}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() =>
                  setExpandedEntity(
                    expandedEntity === `${group.entity_type}-${group.entity_id}`
                      ? null
                      : `${group.entity_type}-${group.entity_id}`
                  )
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <CardTitle className="text-lg">{group.entity_name}</CardTitle>
                      <CardDescription>{group.entity_type}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary" className="ml-auto">
                    {group.collaborators.length} collaborator{group.collaborators.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>

              <AnimatePresence>
                {expandedEntity === `${group.entity_type}-${group.entity_id}` && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CardContent className="border-t border-gray-200 pt-4">
                      <div className="space-y-3">
                        {group.collaborators.map((collab) => (
                          <div
                            key={collab.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{collab.user_email}</p>
                              <p className="text-sm text-gray-500">Role: {collab.role}</p>
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
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}