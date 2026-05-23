import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { getPermissionsForRole, canTab } from '@/components/access/accessControl';
import BurnoutSpinner from '@/components/shared/BurnoutSpinner';
import EventBuilderForm from '@/components/management/EventBuilder/EventBuilderForm';
import RaceCoreHome from '@/components/registrationdashboard/RaceCoreHome';
import RaceCorePageHeader from '@/components/racecore/RaceCorePageHeader';
import IntegrationsManager from '@/components/registrationdashboard/IntegrationsManager';
import AnnouncerPackManager from '@/components/registrationdashboard/AnnouncerPackManager';
import RaceCoreQuickCreate from '@/components/registrationdashboard/RaceCoreQuickCreate';

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
import { AlertCircle, Gauge, Clock, ExternalLink } from 'lucide-react';
import { buildInvalidateAfterOperation } from '@/components/registrationdashboard/invalidationHelper';
import { QueryKeys } from '@/components/utils/queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

export default function RaceCoreDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showArchiveWarning, setShowArchiveWarning] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateType, setQuickCreateType] = useState('Driver');
  const queryClient = useQueryClient();

  const VALID_TABS = ['overview', 'eventBuilder', 'integrations', 'announcer_pack'];
  const rawTab = searchParams.get('tab') || 'overview';
  const activeTab = VALID_TABS.includes(rawTab) ? rawTab : 'overview';

  const [eventId, setEventId] = useState(searchParams.get('eventId') || '');
  const [editingEventId, setEditingEventId] = useState('');

  const invalidateAfterOperation = useMemo(
    () => buildInvalidateAfterOperation(queryClient),
    [queryClient]
  );

  // ── Auth ─────────────────────────────────────────────────────────────────
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

  const isAdmin = user?.role === 'admin';

  // ── Global data ───────────────────────────────────────────────────────────
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

  const { data: userEventCollaborators = [] } = useQuery({
    queryKey: ['userEventCollaborators', user?.id],
    queryFn: () => base44.entities.EntityCollaborator.filter({ user_id: user.id, entity_type: 'Event' }),
    enabled: !!user?.id && !isAdmin,
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

  // Role-filtered event list — admin sees all, collaborator-filtered for non-admin
  const dashboardEvents = useMemo(() => {
    if (isAdmin) return events;
    const allowedEventIds = new Set(userEventCollaborators.map((c) => c.entity_id));
    return events.filter((e) => allowedEventIds.has(e.id));
  }, [events, isAdmin, userEventCollaborators]);

  // ── Lightweight selectedEvent ─────────────────────────────────────────────
  const { data: selectedEvent } = useQuery({
    queryKey: QueryKeys.events.byId(eventId),
    queryFn: () => (eventId ? base44.entities.Event.get(eventId) : Promise.resolve(null)),
    enabled: !!isAuthenticated && !!eventId,
    ...DQ,
  });

  // dashboardContext: lightweight, eventId only
  const dashboardContext = useMemo(() => ({ eventId }), [eventId]);

  // ── Permissions ───────────────────────────────────────────────────────────

  const dashboardPermissions = useMemo(
    () => getPermissionsForRole(user?.role || 'public'),
    [user?.role]
  );

  const hasAnyAccess = VALID_TABS.some((key) => canTab(dashboardPermissions, key.replace('eventBuilder', 'event_builder')));

  // ── Effects ───────────────────────────────────────────────────────────────

  // Auth redirect
  useEffect(() => {
    if (authLoading === false && !isAuthenticated) {
      base44.auth.redirectToLogin(window.location.href);
    }
  }, [isAuthenticated, authLoading]);

  // Simple event auto-selection: pick first dashboardEvent when no eventId set
  useEffect(() => {
    if (!eventId && dashboardEvents.length > 0) {
      setEventId(dashboardEvents[0].id);
    }
  }, [dashboardEvents, eventId]);

  // Debounced URL write — eventId only (tab is already the URL source of truth)
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (eventId) params.set('eventId', eventId); else params.delete('eventId');
      setSearchParams(params, { replace: true });
    }, 250);
    return () => clearTimeout(timer);
  }, [eventId, setSearchParams]);

  // ── Handlers ──────────────────────────────────────────────────────────────


  const handleEventCreated = (newEventId) => {
    setEditingEventId(newEventId);
  };

  // ── Loading / auth guards ─────────────────────────────────────────────────
  if (authLoading || userLoading) {
    return (
      <div className="flex items-center justify-center min-h-full py-20">
        <BurnoutSpinner />
      </div>
    );
  }

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
              <p className="text-gray-300">You must be logged in to access RaceCore Dashboard.</p>
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

  if (!user) return null;

  if (!hasAnyAccess) {
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

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <>
      <RaceCorePageHeader
        icon={Gauge}
        title="RaceCore Command"
        subtitle="Global operational command center"
      />
      <div className="px-3 sm:px-5 py-5">
        <div className="w-full">

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
                  selectedEventId={editingEventId}
                  onEventCreated={(id) => {
                    handleEventCreated(id);
                    invalidateAfterOperation('event_updated', { eventId: id });
                  }}
                  isAdmin={isAdmin}
                  isLiveMode={selectedEvent?.status === 'Live'}
                  onArchiveAttempt={() => setShowArchiveWarning(true)}
                  canEditEventCore={isAdmin}
                />
              </div>
            )}

            {canTab(dashboardPermissions, 'integrations') && activeTab === 'integrations' && (
              <IntegrationsManager
                dashboardPermissions={dashboardPermissions}
                selectedEvent={selectedEvent}
                invalidateAfterOperation={invalidateAfterOperation}
              />
            )}

            {canTab(dashboardPermissions, 'announcer_pack') && activeTab === 'announcer_pack' && (
              <AnnouncerPackManager
                selectedEvent={selectedEvent}
                dashboardContext={dashboardContext}
              />
            )}

          </div>
        </div>
      </div>

      {/* Archive warning dialog */}
      <AlertDialog open={showArchiveWarning} onOpenChange={setShowArchiveWarning}>
        <AlertDialogContent className="bg-[#262626] border-gray-700">
          <AlertDialogTitle className="text-white">Event Currently Live</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            This event is currently marked as Live. Are you sure you want to archive it?
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel className="border-gray-700 text-gray-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => setShowArchiveWarning(false)}
              className="bg-red-600 hover:bg-red-700"
            >
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
            if (type === 'Event') queryClient.invalidateQueries({ queryKey: ['events'] });
            if (type === 'Track') queryClient.invalidateQueries({ queryKey: ['tracks'] });
            if (type === 'Series') queryClient.invalidateQueries({ queryKey: ['series'] });
            if (type === 'Driver') queryClient.invalidateQueries({ queryKey: ['drivers'] });
            if (type === 'Team') queryClient.invalidateQueries({ queryKey: ['teams'] });
          }}
        />
      )}
    </>
  );
}