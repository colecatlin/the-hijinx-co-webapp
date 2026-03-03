import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Trash2, ChevronDown, ChevronRight, Users, Key, Search, Shield, RefreshCw, Zap, Clock } from 'lucide-react';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ENTITY_TYPES = ['Driver', 'Team', 'Track', 'Series', 'Event'];

function generateNumericId() {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

export default function ManageAccess() {
  const queryClient = useQueryClient();
  const [expandedEntity, setExpandedEntity] = useState(null); // "Driver:entityId"
  const [activeType, setActiveType] = useState('Driver');
  const [search, setSearch] = useState('');

  const [invitationTypeFilter, setInvitationTypeFilter] = useState('all');
  const [invitationRoleFilter, setInvitationRoleFilter] = useState('all');
  const [collabTypeFilter, setCollabTypeFilter] = useState('all');
  const [collabRoleFilter, setCollabRoleFilter] = useState('all');

  // Fetch all collaborators
  const { data: allCollaborators = [], isLoading: loadingCollaborators } = useQuery({
    queryKey: ['allCollaborators'],
    queryFn: () => base44.entities.EntityCollaborator.list(),
  });

  // Fetch all invitations
  const { data: allInvitations = [], isLoading: loadingInvitations } = useQuery({
    queryKey: ['allInvitations'],
    queryFn: () => base44.entities.Invitation.list(),
  });

  // Fetch entities for active type
  const { data: entities = [], isLoading: loadingEntities } = useQuery({
    queryKey: ['accessEntities', activeType],
    queryFn: () => {
      const entityMap = {
        Driver: base44.entities.Driver,
        Team: base44.entities.Team,
        Track: base44.entities.Track,
        Series: base44.entities.Series,
        Event: base44.entities.Event,
      };
      return entityMap[activeType].list();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EntityCollaborator.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allCollaborators'] }),
  });

  const revokeCollaboratorMutation = useMutation({
    mutationFn: (id) => base44.entities.EntityCollaborator.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allCollaborators'] }),
  });

  const bulkAssignMutation = useMutation({
    mutationFn: () => base44.functions.invoke('assignEntityNumericIds', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessEntities', activeType] });
      queryClient.invalidateQueries({ queryKey: ['allCollaborators'] });
    },
  });

  const regenerateCodeMutation = useMutation({
    mutationFn: async ({ entityId }) => {
      const newCode = generateNumericId();
      const entityMap = {
        Driver: base44.entities.Driver,
        Team: base44.entities.Team,
        Track: base44.entities.Track,
        Series: base44.entities.Series,
        Event: base44.entities.Event,
      };
      await entityMap[activeType].update(entityId, { numeric_id: newCode });
      // Also update all collaborator records with the new code
      const affected = allCollaborators.filter(
        (c) => c.entity_type === activeType && c.entity_id === entityId
      );
      await Promise.all(
        affected.map((c) =>
          base44.entities.EntityCollaborator.update(c.id, { access_code: newCode })
        )
      );
      return newCode;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allCollaborators'] });
      queryClient.invalidateQueries({ queryKey: ['accessEntities', activeType] });
    },
  });

  // Group collaborators by entity for fast lookup
  const collabByEntity = useMemo(() => {
    const map = {};
    allCollaborators
      .filter((c) => c.entity_type === activeType)
      .forEach((c) => {
        if (!map[c.entity_id]) map[c.entity_id] = [];
        map[c.entity_id].push(c);
      });
    return map;
  }, [allCollaborators, activeType]);

  // Entities with at least one collaborator OR that have a code
  const filteredEntities = useMemo(() => {
    return entities
      .filter((e) => {
        const name = `${e.first_name || ''} ${e.last_name || ''} ${e.name || ''}`.toLowerCase();
        return name.includes(search.toLowerCase());
      })
      .filter((e) => e.numeric_id || collabByEntity[e.id]?.length > 0);
  }, [entities, search, collabByEntity]);

  const totalCollabsForType = allCollaborators.filter((c) => c.entity_type === activeType).length;

  const getEntityName = (e) =>
    e.first_name ? `${e.first_name} ${e.last_name}` : e.name || e.id;

  const toggleExpand = (entityId) => {
    const key = `${activeType}:${entityId}`;
    setExpandedEntity(expandedEntity === key ? null : key);
  };

  const filteredInvitations = useMemo(() => {
    return allInvitations.filter(inv => {
      const typeMatch = invitationTypeFilter === 'all' || inv.entity_type === invitationTypeFilter;
      const roleMatch = invitationRoleFilter === 'all' || inv.role === invitationRoleFilter;
      return typeMatch && roleMatch;
    });
  }, [allInvitations, invitationTypeFilter, invitationRoleFilter]);

  const filteredCollaborators = useMemo(() => {
    return allCollaborators.filter(collab => {
      const typeMatch = collabTypeFilter === 'all' || collab.entity_type === collabTypeFilter;
      const roleMatch = collabRoleFilter === 'all' || collab.role === collabRoleFilter;
      return typeMatch && roleMatch;
    });
  }, [allCollaborators, collabTypeFilter, collabRoleFilter]);

  return (
    <ManagementLayout currentPage="ManageAccess">
      <ManagementShell title="Access Management" subtitle="View and manage user access to entities across the platform" maxWidth="max-w-6xl">

        {/* Tabs */}
        <Tabs defaultValue="collaborators" className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invitations">Pending Invitations ({allInvitations.length})</TabsTrigger>
            <TabsTrigger value="collaborators">Active Collaborators ({allCollaborators.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="invitations" className="space-y-6">
            {/* Invitations Filters */}
            <div className="flex gap-3 mb-4 flex-wrap">
              <select
                value={invitationTypeFilter}
                onChange={(e) => setInvitationTypeFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
              >
                <option value="all">All Entity Types</option>
                {ENTITY_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <select
                value={invitationRoleFilter}
                onChange={(e) => setInvitationRoleFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
              >
                <option value="all">All Roles</option>
                <option value="owner">Owner</option>
                <option value="editor">Editor</option>
              </select>
            </div>

            {loadingInvitations ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : filteredInvitations.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-white border border-gray-200 rounded-lg">
                No pending invitations
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase text-gray-600">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase text-gray-600">Entity</th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase text-gray-600">Entity ID</th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase text-gray-600">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase text-gray-600">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase text-gray-600">Sent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredInvitations.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm">{inv.email}</td>
                        <td className="px-6 py-4 text-sm">{inv.entity_type}</td>
                        <td className="px-6 py-4 text-sm font-mono text-gray-500">{inv.entity_id}</td>
                        <td className="px-6 py-4">
                          <Badge variant={inv.role === 'owner' ? 'default' : 'secondary'} className="text-xs">
                            {inv.role}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${
                            inv.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            inv.status === 'accepted' ? 'bg-green-100 text-green-800' :
                            inv.status === 'expired' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {inv.created_date ? new Date(inv.created_date).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="collaborators" className="space-y-6">
            {/* Collaborators Filters */}
            <div className="flex gap-3 mb-4 flex-wrap">
              <select
                value={collabTypeFilter}
                onChange={(e) => setCollabTypeFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
              >
                <option value="all">All Entity Types</option>
                {ENTITY_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <select
                value={collabRoleFilter}
                onChange={(e) => setCollabRoleFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
              >
                <option value="all">All Roles</option>
                <option value="owner">Owner</option>
                <option value="editor">Editor</option>
              </select>
            </div>

            {loadingCollaborators ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : filteredCollaborators.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-white border border-gray-200 rounded-lg">
                No active collaborators
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase text-gray-600">User Email</th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase text-gray-600">Entity Type</th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase text-gray-600">Entity ID</th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase text-gray-600">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase text-gray-600">Since</th>
                      <th className="px-6 py-3 text-right text-xs font-bold uppercase text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredCollaborators.map((collab) => (
                      <tr key={collab.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm">{collab.user_email}</td>
                        <td className="px-6 py-4 text-sm">{collab.entity_type}</td>
                        <td className="px-6 py-4 text-sm font-mono text-gray-500">{collab.entity_id}</td>
                        <td className="px-6 py-4">
                          <Badge variant={collab.role === 'owner' ? 'default' : 'secondary'} className="text-xs">
                            {collab.role}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {collab.created_date ? new Date(collab.created_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (window.confirm(`Revoke access for ${collab.user_email}?`)) {
                                revokeCollaboratorMutation.mutate(collab.id);
                              }
                            }}
                            disabled={revokeCollaboratorMutation.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2 text-xs"
                          >
                            {revokeCollaboratorMutation.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>


      </ManagementShell>
    </ManagementLayout>
  );
}