import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Edit2, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

export default function ManageTab({ user }) {
  const navigate = useNavigate();
  const { data: collaborators = [], isLoading } = useQuery({
    queryKey: ['entityCollaborators', user?.email],
    queryFn: () => base44.entities.EntityCollaborator.filter({ user_email: user.email }),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (collaborators.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Manage Entities</CardTitle>
          <CardDescription>No entities under your management yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Once you verify an invitation code, you'll be able to manage entities here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <Card>
        <CardHeader>
          <CardTitle>Manage Entities</CardTitle>
          <CardDescription>
            {collaborators.length} entit{collaborators.length === 1 ? 'y' : 'ies'} under your management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {collaborators.map((collaborator) => (
              <div
                key={collaborator.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{collaborator.entity_name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {collaborator.entity_type}
                    </Badge>
                    <Badge
                      className="text-xs"
                      variant={collaborator.role === 'owner' ? 'default' : 'secondary'}
                    >
                      {collaborator.role}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-4"
                  onClick={() => {
                    navigate(createPageUrl('MyDashboard'));
                  }}
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  Manage
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}