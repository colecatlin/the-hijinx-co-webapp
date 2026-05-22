import React, { useState, useMemo, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { getPermissionsForRole, canTab } from '@/components/access/accessControl';
import BurnoutSpinner from '@/components/shared/BurnoutSpinner';
import EventBuilderForm from '@/components/management/EventBuilder/EventBuilderForm';
import RaceCoreHome from '@/components/registrationdashboard/RaceCoreHome';
import RaceCorePageHeader from '@/components/racecore/RaceCorePageHeader';
import ImportEntriesModal from '@/components/registrationdashboard/entries/ImportEntriesModal';
import IntegrationsManager from '@/components/registrationdashboard/IntegrationsManager';
import AnnouncerPackManager from '@/components/registrationdashboard/AnnouncerPackManager';
import RaceCoreQuickCreate from '@/components/registrationdashboard/RaceCoreQuickCreate';
import { Tabs, TabsList } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    AlertCircle,
    Flag,
    Gauge,
    Star,
    ArrowLeft,
    Clock,
    ExternalLink,
  } from 'lucide-react';
import { buildInvalidateAfterOperation } from '@/components/registrationdashboard/invalidationHelper';
import {
  getResolvedManagedEntities,
  getRaceCoreEntities,
} from '@/components/entities/entityResolver';
import { getValidPrimaryEntity } from '@/components/entities/entityPrimary';
import { hasEntityAccess } from '@/components/entities/entityPermissions';
import { QueryKeys } from '@/components/utils/queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

// ─── Dashboard-wide React Query tunables ────────────────────────────────────
// Canonical defaults live in queryDefaults.js; DQ is a convenience alias here.
const DQ = applyDefaultQueryOptions();

export default function RaceCoreDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showImportEntriesModal, setShowImportEntriesModal] = useState(false);
  const [showArchiveWarning, setShowArchiveWarning] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateType, setQuickCreateType] = useState('Driver');
  const queryClient = useQueryClient();

  const [organizationType, setOrganizationType] = useState(
    searchParams.get('orgType') || 'track'
  );
  const [organizationId, setOrganizationId] = useState(
    searchParams.get('orgId') || ''
  );
  const [seasonYear, setSeasonYear] = useState(
    searchParams.get('seasonYear') || ''
  );
  const [eventId, setEventId] = useState(
    searchParams.get('eventId') || ''
  );
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [editingEventId, setEditingEventId] = useState('');
  const [orgAccessDenied, setOrgAccessDenied] = useState(false);

  // Centralized invalidation helper – available to all tab components
  const invalidateAfterOperation = useMemo(
    () => buildInvalidateAfterOperation(queryClient),
    [queryClient]
  );

  const { data: isAuthenticated, isLoading: authLoading } = useQuery({
    queryKey: QueryKeys.auth.status(),
    queryFn: () => base44.auth.isAuthenticated(),
    ...DQ,
  });

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: QueryKeys.auth.me(),
    queryFn: () => base44.auth.me(),
    enabled: !!isAuthenticated,
    ...DQ,
  });

  const { data: tracks = [] } = useQuery({
    queryKey: QueryKeys.tracks.list(),
    queryFn: () => base44.entities.Track.list(),
    enabled: !!isAuthenticated,
    ...DQ,
  });

  const { data: seriesList = [] } = useQuery({
    queryKey: QueryKeys.series.list(),
    queryFn: () => base44.entities.Series.list(),
    enabled: !!isAuthenticated,
    ...DQ,
  });

  const { data: events = [] } = useQuery({
    queryKey: QueryKeys.events.list(),
    queryFn: () => base44.entities.Event.list(),
    enabled: !!isAuthenticated,
    ...DQ,
  });

  // Declared early so it can be used in query enabled conditions below
  const isAdmin = user?.role === 'admin';

  // Load Event collaborator records for current user (for non-admin filtering)
  const { data: userEventCollaborators = [] } = useQuery({
    queryKey: ['userEventCollaborators', user?.id],
    queryFn: () => base44.entities.EntityCollaborator.filter({ user_id: user.id, entity_type: 'Event' }),
    enabled: !!user?.id && !isAdmin,
    ...DQ,
  });

  // ── Shared dashboard context ──────────────────────────────────────────────
  const dashContext = useMemo(() => ({
    orgType: organizationType,
    orgId: organizationId,
    season: seasonYear,
    eventId: eventId,
  }), [organizationType, organizationId, seasonYear, eventId]);

  // dashboardContext alias for prop passing
  const dashboardContext = dashContext;

  // Fetch selected event details (must come before useDashboardQueries)
  const { data: selectedEvent, isLoading: selectedEventLoading } = useQuery({
    queryKey: QueryKeys.events.byId(eventId),
    queryFn: () => (eventId ? base44.entities.Event.get(eventId) : Promise.resolve(null)),
    enabled: !!isAuthenticated && !!eventId,
    ...DQ,
  });

  const { data: importLogs = [] } = useQuery({
    queryKey: ['importLogs'],
    queryFn: () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return base44.entities.ImportLog.filter({
        created_date: { $gte: thirtyDaysAgo.toISOString() },
      });
    },
    enabled: !!isAuthenticated,
    ...DQ,
  });

  // ── Dashboard events: filtered for non-admin users ──────────────────────────
  const dashboardEvents = useMemo(() => {
    if (isAdmin) return events;
    // Non-admin: only show events they have EntityCollaborator access to
    const allowedEventIds = new Set(userEventCollaborators.map((c) => c.entity_id));
    return events.filter((e) => allowedEventIds.has(e.id));
  }, [events, isAdmin, userEventCollaborators]);

  const filteredEvents = useMemo(() => {
    let filtered = [...events];

    // Non-admin: filter to only events the user has EntityCollaborator access to
    if (!isAdmin && user?.id) {
      const allowedEventIds = new Set(userEventCollaborators.map(c => c.entity_id));
      filtered = filtered.filter(e => allowedEventIds.has(e.id));
    }

    if (organizationType === 'track' && organizationId) {
      filtered = filtered.filter((e) => e.track_id === organizationId);
    } else if (organizationType === 'series' && organizationId) {
      const matchedSeries = seriesList.find((s) => s.id === organizationId);
      if (matchedSeries) {
        filtered = filtered.filter(
          (e) => e.series_id === organizationId || e.series_name === matchedSeries.name
        );
      }
    }

    if (seasonYear) {
      filtered = filtered.filter((e) => {
        if (e.season) return e.season === seasonYear;
        const eventYear = e.event_date ? new Date(e.event_date).getFullYear().toString() : null;
        return eventYear === seasonYear;
      });
    }

    filtered.sort((a, b) => new Date(b.event_date) - new Date(a.event_date));
    return filtered;
  }, [events, organizationType, organizationId, seasonYear, seriesList, isAdmin, user?.id, userEventCollaborators]);

  const seasons = useMemo(() => {
    const seasonSet = new Set();
    events.forEach((e) => {
      if (e.season) {
        seasonSet.add(e.season);
      } else if (e.event_date) {
        seasonSet.add(new Date(e.event_date).getFullYear().toString());
      }
    });
    return Array.from(seasonSet).sort((a, b) => b - a);
  }, [events]);

  // Get permissions from shared access control module
  const dashboardPermissions = useMemo(() => 
    getPermissionsForRole(user?.role || 'public'), 
    [user?.role]
  );

  // Check if user has any accessible tabs
  const availableTabs = useMemo(() => {
    const tabKeys = ['overview', 'event_builder', 'classes_sessions', 'entries', 'compliance', 'checkin', 'tech', 'results', 'points_standings', 'exports', 'integrations', 'audit_log', 'announcer', 'gate', 'race_control', 'announcer_pack', 'imports', 'media', 'media_portal', 'ops_center'];
    return tabKeys.filter(key => canTab(dashboardPermissions, key));
  }, [dashboardPermissions]);

  // Check entity access for non-admins via EntityCollaborator
  useEffect(() => {
    async function checkOrgAccess() {
      if (!organizationId || isAdmin) {
        setOrgAccessDenied(false);
        return;
      }
      if (!user?.id) return;
      const entityType = organizationType === 'track' ? 'Track' : 'Series';
      const allowed = await hasEntityAccess({ userId: user.id, entityType, entityId: organizationId });
      setOrgAccessDenied(!allowed);
    }
    checkOrgAccess();
  }, [organizationId, organizationType, isAdmin, user?.id]);

  // ── Debounced URL write (250 ms) ──────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (organizationType) params.set('orgType', organizationType); else params.delete('orgType');
      if (organizationId) params.set('orgId', organizationId); else params.delete('orgId');
      if (seasonYear) params.set('seasonYear', seasonYear); else params.delete('seasonYear');
      if (eventId) params.set('eventId', eventId); else params.delete('eventId');
      if (activeTab && activeTab !== 'overview') params.set('tab', activeTab); else params.delete('tab');
      setSearchParams(params, { replace: true });
    }, 250);
    return () => clearTimeout(timer);
  }, [organizationType, organizationId, seasonYear, eventId, activeTab, setSearchParams]);

  useEffect(() => {
    if (authLoading === false && !isAuthenticated) {
      base44.auth.redirectToLogin(window.location.href);
    }
  }, [isAuthenticated, authLoading]);

  // Resolved managed entities + primary entity (for header indicator and auto-select)
  const [resolvedEntities, setResolvedEntities] = useState([]);
  const [resolvedEntitiesLoaded, setResolvedEntitiesLoaded] = useState(false);
  useEffect(() => {
    if (!user?.id) return;
    getResolvedManagedEntities(user).then(resolved => {
      setResolvedEntities(resolved || []);
      setResolvedEntitiesLoaded(true);
    }).catch(() => {
      setResolvedEntities([]);
      setResolvedEntitiesLoaded(true);
    });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const primaryEntity = getValidPrimaryEntity(user, resolvedEntities);
  const raceCoreEntityList = getRaceCoreEntities(resolvedEntities);

  // Auto-select org from EntityCollaborator when no orgType/orgId in URL.
  // Priority: user's primary entity > single Race Core entity.
  // Direct links (orgType + orgId already in URL) are never overridden.
  const autoSelectAttemptedRef = useRef(false);
  useEffect(() => {
    if (autoSelectAttemptedRef.current) return;
    if (!resolvedEntitiesLoaded) return;
    const hasUrlOrg = !!searchParams.get('orgType') && !!searchParams.get('orgId');
    if (hasUrlOrg) { autoSelectAttemptedRef.current = true; return; }

    autoSelectAttemptedRef.current = true;

    const primaryRaceCore = primaryEntity?.is_racecore_entity ? primaryEntity : null;
    const singleEntity = raceCoreEntityList.length === 1 ? raceCoreEntityList[0] : null;
    const candidateEntity = primaryRaceCore || singleEntity || null;
    if (!candidateEntity) return;

    setOrganizationType(candidateEntity.entity_type.toLowerCase());
    setOrganizationId(candidateEntity.entity_id);
  }, [resolvedEntitiesLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fallback: if still no orgId after resolver runs, pick first in loaded list (existing behavior)
  useEffect(() => {
    if (!organizationId) {
      if (organizationType === 'track' && tracks.length > 0) {
        setOrganizationId(tracks[0].id);
      } else if (organizationType === 'series' && seriesList.length > 0) {
        setOrganizationId(seriesList[0].id);
      }
    }
  }, [organizationType, tracks, seriesList, organizationId]);

  useEffect(() => {
    if (!seasonYear && seasons.length > 0) {
      setSeasonYear(seasons[0]);
    }
  }, [seasons, seasonYear]);

  useEffect(() => {
    if (!eventId && filteredEvents.length > 0) {
      setEventId(filteredEvents[0].id);
    }
  }, [filteredEvents, eventId]);

  const handleCreateEvent = () => {
    setEditingEventId('');
    setActiveTab('eventBuilder');
  };

  const handleEventCreated = (newEventId) => {
    setEditingEventId(newEventId);
  };

  if (authLoading || userLoading) {
    return (
      <div className="flex items-center justify-center min-h-full py-20">
        <BurnoutSpinner />
      </div>
    );
  }

  // Handle unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-full py-20">
        <div className="bg-[#0A0A0A] flex items-center justify-center p-6">
          <Card className="bg-[#171717] border-gray-800 w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" /> Login Required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300">
                You must be logged in to access RaceCore Dashboard.
              </p>
              <Button
                onClick={() => base44.auth.redirectToLogin()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Log In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Handle org access denied for non-admins
  if (orgAccessDenied && organizationId && !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-full py-20 p-6">
        <div className="bg-[#0A0A0A] flex items-center justify-center p-6">
          <Card className="bg-[#171717] border-gray-800 w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400" /> No Access to this Race Core Context
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300">
                You do not manage this {organizationType === 'track' ? 'track' : 'series'}. Use an access code to link it to your account, or return to your dashboard.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => navigate(createPageUrl('MyDashboard'))}
                  className="w-full bg-[#232323] hover:bg-black text-white"
                >
                  Go to Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(createPageUrl('Profile') + '?tab=entities')}
                  className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  Open Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Handle authenticated users with no accessible tabs
  if (availableTabs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-full py-20">
        <div className="bg-[#0A0A0A] flex items-center justify-center">
          <Card className="bg-[#171717] border-gray-800 w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-500" /> Access Not Configured
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300">
                Your role does not have access to any dashboard features. Please contact an administrator.
              </p>
              <Button
                onClick={() => navigate(createPageUrl('Home'))}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white"
              >
                Return to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Workspace chooser: no org selected, multiple Race Core entities available, not admin
  const urlHasOrg = !!(searchParams.get('orgType') && searchParams.get('orgId'));
  const showWorkspaceChooser =
    !organizationId &&
    !urlHasOrg &&
    resolvedEntitiesLoaded &&
    raceCoreEntityList.length > 1;

  if (showWorkspaceChooser) {
    return (
      <div className="flex items-center justify-center min-h-full py-20 p-6">
        <div className="bg-[#0A0A0A] flex items-center justify-center p-6">
          <div className="w-full max-w-lg space-y-6">
            <div>
              <h1 className="text-2xl font-black text-white mb-1">Choose a Race Core Workspace</h1>
              <p className="text-gray-400 text-sm">Select the track or series you want to manage.</p>
            </div>
            <div className="space-y-3">
              {raceCoreEntityList.map(entity => {
                const isPrimary = entity.entity_id === primaryEntity?.entity_id;
                const Icon = entity.entity_type === 'Track' ? Flag : Gauge;
                return (
                  <button
                    key={entity.collaboration_id || entity.entity_id}
                    onClick={() => {
                      setOrganizationType(entity.entity_type.toLowerCase());
                      setOrganizationId(entity.entity_id);
                    }}
                    className="w-full flex items-center justify-between p-4 bg-[#171717] border border-gray-700 hover:border-gray-500 rounded-xl text-left transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#262626] flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-gray-300" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white text-sm">{entity.entity_name}</p>
                          {isPrimary && (
                            <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                              <Star className="w-3 h-3 inline mr-0.5" />Primary
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{entity.entity_type} · {entity.role}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 group-hover:text-white transition-colors">Open Race Core →</span>
                  </button>
                );
              })}
            </div>
            <Button variant="outline" onClick={() => navigate(createPageUrl('MyDashboard'))}
              className="border-gray-700 text-gray-400 hover:bg-gray-800 gap-2 text-sm">
              <ArrowLeft className="w-4 h-4" /> Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <RaceCorePageHeader
        icon={Gauge}
        title="RaceCore Command"
        subtitle="Global operational command center"
      />
      <div className="px-3 sm:px-5 py-5">
        {/* Workspace content — sidebar drives tab selection */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* TabsList hidden — navigation handled by RaceCoreSidebar */}
          <TabsList className="hidden" />

             {/* Lazy-mounted tabs: only render active tab content */}
             <div className="mt-0">
              {canTab(dashboardPermissions, 'overview') && activeTab === 'overview' && (
                <RaceCoreHome
                  dashboardPermissions={dashboardPermissions}
                  isAdmin={isAdmin}
                  user={user}
                  allEvents={dashboardEvents}
                  importLogs={importLogs}
                />
              )}

              {canTab(dashboardPermissions, 'event_builder') && activeTab === 'eventBuilder' && (
                <div className="space-y-4">
                  {selectedEvent && (
                    <div className="flex items-center justify-between bg-[#1a1a1a] border border-gray-800 rounded-lg px-4 py-3">
                      <p className="text-xs text-gray-400">Need to edit all event record fields in depth?</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/race-core/events/${selectedEvent.id}`)}
                        className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white gap-2"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open Event Deep Editor
                      </Button>
                    </div>
                  )}
                  <EventBuilderForm
                    dashboardContext={dashboardContext}
                    dashboardPermissions={dashboardPermissions}
                    selectedEventId={editingEventId}
                    onEventCreated={(id) => { handleEventCreated(id); invalidateAfterOperation('event_updated', { eventId: id }); }}
                    isAdmin={isAdmin}
                    isLiveMode={selectedEvent?.status === 'Live'}
                    onArchiveAttempt={() => setShowArchiveWarning(true)}
                    onSaved={() => invalidateAfterOperation('event_updated', { eventId: editingEventId || eventId })}
                    onStatusChanged={() => invalidateAfterOperation('event_status_changed', { eventId })}
                    canEditEventCore={isAdmin}
                    canApproveAsTrack={false}
                    canApproveAsSeries={false}
                  />
                </div>
              )}

              {canTab(dashboardPermissions, 'integrations') && activeTab === 'integrations' && (
                <IntegrationsManager 
                  dashboardContext={dashboardContext} 
                  dashboardPermissions={dashboardPermissions}
                  selectedEvent={selectedEvent}
                  invalidateAfterOperation={invalidateAfterOperation}
                />
              )}

              {canTab(dashboardPermissions, 'announcer_pack') && activeTab === 'announcer_pack' && (
                <AnnouncerPackManager
                  selectedEvent={selectedEvent}
                  dashboardContext={dashboardContext}
                  dashboardPermissions={dashboardPermissions}
                />
              )}


            </div>
          </Tabs>
        </div>

      {/* Modals */}
        <AlertDialog open={showArchiveWarning} onOpenChange={setShowArchiveWarning}>
          <AlertDialogContent className="bg-[#262626] border-gray-700">
            <AlertDialogTitle className="text-white">Event Currently Live</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This event is currently marked as Live. Are you sure you want to archive it?
            </AlertDialogDescription>
            <div className="flex gap-2 justify-end">
              <AlertDialogCancel className="border-gray-700 text-gray-300">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => setShowArchiveWarning(false)} className="bg-red-600 hover:bg-red-700">
                Archive Anyway
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Quick Create Modal (admin only) */}
        {isAdmin && (
          <RaceCoreQuickCreate
            open={quickCreateOpen}
            onClose={() => setQuickCreateOpen(false)}
            initialEntityType={quickCreateType}
            tracks={tracks}
            seriesList={seriesList}
            onCreated={(type) => {
              // Invalidate relevant lists so new entity appears in selectors immediately
              if (type === 'Event') queryClient.invalidateQueries({ queryKey: ['events'] });
              if (type === 'Track') queryClient.invalidateQueries({ queryKey: ['tracks'] });
              if (type === 'Series') queryClient.invalidateQueries({ queryKey: ['series'] });
              if (type === 'Driver') queryClient.invalidateQueries({ queryKey: ['drivers'] });
              if (type === 'Team') queryClient.invalidateQueries({ queryKey: ['teams'] });
            }}
          />
        )}

        {/* Import Entries CSV Modal */}
        <ImportEntriesModal
          isOpen={showImportEntriesModal}
          onClose={() => setShowImportEntriesModal(false)}
          selectedEvent={selectedEvent}
          dashboardPermissions={dashboardPermissions}
          invalidateAfterOperation={invalidateAfterOperation}
          existingEntries={[]}
        />


    </>
  );
}