import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Trash2, ArrowLeft, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

export default function ManageEntityAccess() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: collaborators = [], isLoading: collaboratorsLoading } = useQuery({
    queryKey: ['allEntityCollaborators'],
    queryFn: () => base44.asServiceRole.entities.EntityCollaborator.list(),
    enabled: !!user && user.role === 'admin',
  });

  const deleteCollaboratorMutation = useMutation({
    mutationFn: (id) => base44.asServiceRole.entities.EntityCollaborator.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allEntityCollaborators'] });
      toast.success('Access removed successfully.');
    },
    onError: (error) => {
      toast.error('Failed to remove access: ' + error.message);
    },
  });

  if (userLoading || collaboratorsLoading) {
    return (
      <PageShell>
        <div className="max-w-7xl mx-auto px-6 py-12 flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </PageShell>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <PageShell>
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-500">You must be an admin to view this page.</p>
        </div>
      </PageShell>
    );
  }

  const filteredCollaborators = collaborators.filter(c =>
    c.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.entity_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.entity_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl('Management'))}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Management
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Manage Entity Access</CardTitle>
            <CardDescription>
              View and revoke user access to specific entities. {collaborators.length} total access grant{collaborators.length !== 1 ? 's' : ''}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by email, entity name, or type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {filteredCollaborators.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User Email</TableHead>
                      <TableHead>Entity Type</TableHead>
                      <TableHead>Entity Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCollaborators.map((collaborator) => (
                      <TableRow key={collaborator.id}>
                        <TableCell className="font-mono text-sm">{collaborator.user_email}</TableCell>
                        <TableCell>{collaborator.entity_type}</TableCell>
                        <TableCell>{collaborator.entity_name}</TableCell>
                        <TableCell>
                          <span className={`text-xs font-medium px-2 py-1 rounded ${
                            collaborator.role === 'owner' 
                              ? 'bg-red-100 text-red-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {collaborator.role}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (confirm('Are you sure you want to revoke this access?')) {
                                deleteCollaboratorMutation.mutate(collaborator.id);
                              }
                            }}
                            disabled={deleteCollaboratorMutation.isPending}
                          >
                            {deleteCollaboratorMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  {searchQuery ? 'No access records match your search.' : 'No entity access records found.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}