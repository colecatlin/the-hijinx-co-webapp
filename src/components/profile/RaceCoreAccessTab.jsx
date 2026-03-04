import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Check, ExternalLink, Flag, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format, isPast } from 'date-fns';

function entityTypeBadgeClass(type) {
  switch (type) {
    case 'Driver': return 'bg-blue-100 text-blue-700';
    case 'Team': return 'bg-purple-100 text-purple-700';
    case 'Track': return 'bg-teal-100 text-teal-700';
    case 'Series': return 'bg-yellow-100 text-yellow-700';
    case 'Event': return 'bg-orange-100 text-orange-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="ml-1 p-1 text-gray-400 hover:text-gray-700 transition-colors" title="Copy">
      {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function buildEditorUrl(collab) {
  if (collab.entity_type === 'Driver') {
    return createPageUrl(`DriverEditor?id=${collab.entity_id}&accessCode=${collab.access_code}`);
  }
  return createPageUrl(`EntityEditor?entityType=${collab.entity_type}&entityId=${collab.entity_id}&accessCode=${collab.access_code}`);
}

function buildRaceCoreUrl(collab, entityData) {
  const base = createPageUrl('RegistrationDashboard');
  if (collab.entity_type === 'Track') {
    return `${base}?orgType=track&orgId=${collab.entity_id}`;
  }
  if (collab.entity_type === 'Series') {
    return `${base}?orgType=series&orgId=${collab.entity_id}`;
  }
  if (collab.entity_type === 'Event') {
    const event = entityData;
    const orgType = event?.series_id ? 'series' : 'track';
    const orgId = event?.series_id || event?.track_id || '';
    return `${base}?orgType=${orgType}&orgId=${orgId}&eventId=${collab.entity_id}&seasonYear=${event?.season || ''}`;
  }
  return `${base}?orgType=${collab.entity_type.toLowerCase()}&orgId=${collab.entity_id}`;
}

// Resolve entity names for all collaborators in one batch
function useEntityNames(collaborators) {
  const driverIds = collaborators.filter(c => c.entity_type === 'Driver').map(c => c.entity_id);
  const teamIds = collaborators.filter(c => c.entity_type === 'Team').map(c => c.entity_id);
  const trackIds = collaborators.filter(c => c.entity_type === 'Track').map(c => c.entity_id);
  const seriesIds = collaborators.filter(c => c.entity_type === 'Series').map(c => c.entity_id);
  const eventIds = collaborators.filter(c => c.entity_type === 'Event').map(c => c.entity_id);

  const { data: drivers = [] } = useQuery({
    queryKey: ['entityNames_drivers', driverIds.join(',')],
    queryFn: async () => driverIds.length ? base44.entities.Driver.list('-updated_date', 500) : [],
    enabled: driverIds.length > 0,
    staleTime: 60000,
    select: (all) => all.filter(d => driverIds.includes(d.id)),
  });
  const { data: teams = [] } = useQuery({
    queryKey: ['entityNames_teams', teamIds.join(',')],
    queryFn: async () => teamIds.length ? base44.entities.Team.list('-updated_date', 500) : [],
    enabled: teamIds.length > 0,
    staleTime: 60000,
    select: (all) => all.filter(t => teamIds.includes(t.id)),
  });
  const { data: tracks = [] } = useQuery({
    queryKey: ['entityNames_tracks', trackIds.join(',')],
    queryFn: async () => trackIds.length ? base44.entities.Track.list('-updated_date', 500) : [],
    enabled: trackIds.length > 0,
    staleTime: 60000,
    select: (all) => all.filter(t => trackIds.includes(t.id)),
  });
  const { data: seriesList = [] } = useQuery({
    queryKey: ['entityNames_series', seriesIds.join(',')],
    queryFn: async () => seriesIds.length ? base44.entities.Series.list('-updated_date', 500) : [],
    enabled: seriesIds.length > 0,
    staleTime: 60000,
    select: (all) => all.filter(s => seriesIds.includes(s.id)),
  });
  const { data: events = [] } = useQuery({
    queryKey: ['entityNames_events', eventIds.join(',')],
    queryFn: async () => eventIds.length ? base44.entities.Event.list('-event_date', 500) : [],
    enabled: eventIds.length > 0,
    staleTime: 60000,
    select: (all) => all.filter(e => eventIds.includes(e.id)),
  });

  const nameMap = {};
  const dataMap = {};
  drivers.forEach(d => { nameMap[d.id] = `${d.first_name} ${d.last_name}`; dataMap[d.id] = d; });
  teams.forEach(t => { nameMap[t.id] = t.name; dataMap[t.id] = t; });
  tracks.forEach(t => { nameMap[t.id] = t.name; dataMap[t.id] = t; });
  seriesList.forEach(s => { nameMap[s.id] = s.name; dataMap[s.id] = s; });
  events.forEach(e => { nameMap[e.id] = e.name; dataMap[e.id] = e; });

  return { nameMap, dataMap };
}

export default function RaceCoreAccessTab({ user }) {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState(null);

  const { data: collaborators = [], isLoading: collabLoading } = useQuery({
    queryKey: ['myCollaborations', user?.id],
    queryFn: () => base44.entities.EntityCollaborator.filter({ user_id: user.id }),
    enabled: !!user?.id,
    staleTime: 30000,
  });

  const { data: invitations = [], isLoading: invLoading } = useQuery({
    queryKey: ['myInvitations', user?.email],
    queryFn: () => base44.entities.Invitation.filter({ email: user.email, status: 'pending' }),
    enabled: !!user?.email,
    staleTime: 30000,
  });

  const allEntities = [...collaborators, ...invitations.map(i => ({ entity_id: i.entity_id, entity_type: i.entity_type }))];
  const { nameMap, dataMap } = useEntityNames(allEntities);

  const handleAccept = async (inv) => {
    setProcessingId(inv.id);
    try {
      await base44.entities.EntityCollaborator.create({
        user_id: user.id,
        user_email: user.email,
        entity_type: inv.entity_type,
        entity_id: inv.entity_id,
        entity_name: inv.entity_name || nameMap[inv.entity_id] || '',
        access_code: inv.code || '',
        role: 'editor',
      });
      await base44.entities.Invitation.update(inv.id, {
        status: 'accepted',
        accepted_date: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ['myInvitations', user.email] });
      queryClient.invalidateQueries({ queryKey: ['myCollaborations', user.id] });
      toast.success(`Accepted invitation for ${inv.entity_name || inv.entity_type}`);
    } catch {
      toast.error('Failed to accept invitation');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (inv) => {
    setProcessingId(inv.id);
    try {
      await base44.entities.Invitation.update(inv.id, { status: 'declined' });
      queryClient.invalidateQueries({ queryKey: ['myInvitations', user.email] });
      toast.success('Invitation declined');
    } catch {
      toast.error('Failed to decline invitation');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Section 1: My Access */}
      <div>
        <h2 className="text-xl font-bold mb-1">My Access</h2>
        <p className="text-sm text-gray-500 mb-4">Entities you own or collaborate on.</p>

        {collabLoading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}</div>
        ) : collaborators.length === 0 ? (
          <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
            <p className="text-gray-500 text-sm">No entity access yet. Accept an invitation or enter an access code in the Access tab.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Type</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Entity</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Role</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Access Code</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Added</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {collaborators.map(collab => {
                  const entityName = collab.entity_name || nameMap[collab.entity_id] || collab.entity_id;
                  const entityData = dataMap[collab.entity_id];
                  return (
                    <tr key={collab.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5">
                        <Badge className={`text-xs ${entityTypeBadgeClass(collab.entity_type)}`}>{collab.entity_type}</Badge>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{entityName}</td>
                      <td className="px-4 py-2.5 text-gray-500 capitalize">{collab.role}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center font-mono text-xs text-gray-600">
                          {collab.access_code || '—'}
                          {collab.access_code && <CopyButton value={collab.access_code} />}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">
                        {collab.created_date ? format(new Date(collab.created_date), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={() => { window.location.href = buildEditorUrl(collab); }}
                            title="Open Entity Editor"
                          >
                            <Flag className="w-3 h-3 mr-1" /> Edit
                          </Button>
                          {(collab.entity_type === 'Track' || collab.entity_type === 'Series' || collab.entity_type === 'Event') && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={() => { window.location.href = buildRaceCoreUrl(collab, entityData); }}
                              title="Open Race Core"
                            >
                              <ChevronRight className="w-3 h-3 mr-1" /> Race Core
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 2: Pending Invitations */}
      <div className="pt-4 border-t">
        <h2 className="text-xl font-bold mb-1">Pending Invitations</h2>
        <p className="text-sm text-gray-500 mb-4">Invitations sent to your email address.</p>

        {invLoading ? (
          <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}</div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
            <p className="text-gray-500 text-sm">No pending invitations.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Type</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Entity</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Invited By</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Expires</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invitations.map(inv => {
                  const expired = inv.expiration_date && isPast(new Date(inv.expiration_date));
                  const isProcessing = processingId === inv.id;
                  const entityName = inv.entity_name || nameMap[inv.entity_id] || inv.entity_id;
                  return (
                    <tr key={inv.id} className={`hover:bg-gray-50 transition-colors ${expired ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-2.5">
                        <Badge className={`text-xs ${entityTypeBadgeClass(inv.entity_type)}`}>{inv.entity_type}</Badge>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{entityName}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{inv.invited_by || '—'}</td>
                      <td className="px-4 py-2.5 text-xs">
                        {inv.expiration_date ? (
                          <span className={expired ? 'text-red-500' : 'text-gray-500'}>
                            {expired ? 'Expired' : format(new Date(inv.expiration_date), 'MMM d, yyyy')}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        {!expired && (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isProcessing}
                              onClick={() => handleDecline(inv)}
                              className="h-7 px-2 text-xs text-gray-500"
                            >
                              Decline
                            </Button>
                            <Button
                              size="sm"
                              disabled={isProcessing}
                              onClick={() => handleAccept(inv)}
                              className="h-7 px-2 text-xs bg-[#232323] hover:bg-[#1A3249] text-white border-0"
                            >
                              Accept
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}