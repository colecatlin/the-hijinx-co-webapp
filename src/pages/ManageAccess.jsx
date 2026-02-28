import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Trash2, ChevronDown, ChevronRight, Users, Key, Search, Shield, RefreshCw, Zap, ArrowLeft } from 'lucide-react';
import { createPageUrl } from '@/components/utils';

const ENTITY_TYPES = ['Driver', 'Team', 'Track', 'Series', 'Event'];

function generateNumericId() {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

export default function ManageAccess() {
  const queryClient = useQueryClient();
  const [expandedEntity, setExpandedEntity] = useState(null); // "Driver:entityId"
  const [activeType, setActiveType] = useState('Driver');
  const [search, setSearch] = useState('');

  // Fetch all collaborators
  const { data: allCollaborators = [], isLoading: loadingCollaborators } = useQuery({
    queryKey: ['allCollaborators'],
    queryFn: () => base44.entities.EntityCollaborator.list(),
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

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto px-6 py-12">
        <Link to={createPageUrl('Management')} className="inline-flex items-center gap-1 text-xs font-mono text-gray-400 hover:text-[#232323] mb-6 transition-colors">
          <ArrowLeft className="w-3 h-3" /> Back to Management
        </Link>
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2">Access Management</h1>
          <p className="text-gray-600">View and revoke user access to entities across the platform.</p>
        </div>

        {/* Type tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {ENTITY_TYPES.map((type) => {
            const count = allCollaborators.filter((c) => c.entity_type === type).length;
            return (
              <button
                key={type}
                onClick={() => { setActiveType(type); setSearch(''); setExpandedEntity(null); }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
                  activeType === type
                    ? 'bg-gray-900 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-900'
                }`}
              >
                {type}
                {count > 0 && (
                  <span className={`text-xs rounded-full px-1.5 py-0.5 ${activeType === type ? 'bg-white text-gray-900' : 'bg-gray-100 text-gray-600'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bulk assign */}
        <div className="flex items-center justify-between mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div>
            <p className="text-sm font-semibold text-amber-900">Assign Access Codes to All Entities</p>
            <p className="text-xs text-amber-700 mt-0.5">Generates unique 8-digit codes for all Teams, Tracks, Series, and Events that don't have one yet.</p>
          </div>
          <Button
            size="sm"
            onClick={() => bulkAssignMutation.mutate()}
            disabled={bulkAssignMutation.isPending}
            className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 ml-4"
          >
            {bulkAssignMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Zap className="w-4 h-4 mr-2" />
            )}
            {bulkAssignMutation.isPending ? 'Assigning...' : 'Assign All Codes'}
          </Button>
        </div>

        {bulkAssignMutation.isSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
            ✓ Codes assigned: {Object.entries(bulkAssignMutation.data?.data?.results || {}).map(([k, v]) => `${v.updated} ${k}s`).join(', ')}
          </div>
        )}

        {/* Stats bar */}
        <div className="flex items-center gap-6 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="w-4 h-4" />
            <span><strong>{totalCollabsForType}</strong> total users with {activeType} access</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Shield className="w-4 h-4" />
            <span><strong>{filteredEntities.length}</strong> entities with codes</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${activeType}s...`}
            className="pl-9"
          />
        </div>

        {/* Entity list */}
        {loadingCollaborators || loadingEntities ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : filteredEntities.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            No {activeType}s with access codes found.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEntities.map((entity) => {
              const collabs = collabByEntity[entity.id] || [];
              const key = `${activeType}:${entity.id}`;
              const isExpanded = expandedEntity === key;
              const isRegenerating = regenerateCodeMutation.isPending &&
                regenerateCodeMutation.variables?.entityId === entity.id;

              return (
                <div key={entity.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Entity row */}
                  <div
                    className="flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleExpand(entity.id)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="text-gray-400">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{getEntityName(entity)}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {entity.numeric_id && (
                            <span className="flex items-center gap-1 text-xs text-gray-500 font-mono">
                              <Key className="w-3 h-3" />
                              {entity.numeric_id}
                            </span>
                          )}
                          {!entity.numeric_id && (
                            <span className="text-xs text-gray-400 italic">No code set</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <span className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                        <Users className="w-3 h-3" />
                        {collabs.length}
                      </span>
                      {entity.numeric_id && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 px-2"
                          onClick={() => regenerateCodeMutation.mutate({ entityId: entity.id })}
                          disabled={isRegenerating}
                          title="Regenerate access code (invalidates old code for new sign-ups)"
                        >
                          {isRegenerating ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                          <span className="ml-1">New Code</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Collaborators */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50">
                      {collabs.length === 0 ? (
                        <p className="px-6 py-4 text-sm text-gray-500 italic">No collaborators yet.</p>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {collabs.map((c) => (
                            <div key={c.id} className="flex items-center justify-between px-6 py-3">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{c.user_email}</p>
                                <p className="text-xs text-gray-500">
                                  Joined {c.created_date ? new Date(c.created_date).toLocaleDateString() : 'unknown'}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge variant={c.role === 'owner' ? 'default' : 'secondary'} className="text-xs">
                                  {c.role}
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteMutation.mutate(c.id)}
                                  disabled={deleteMutation.isPending}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                                >
                                  {deleteMutation.isPending ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}