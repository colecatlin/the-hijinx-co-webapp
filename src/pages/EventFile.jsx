/**
 * REVISION R8B — EventFile
 * Standalone event-first page/route.
 * Maps /race-control/events/:eventId routes to EventWorkspaceContainer.
 * Accepts optional panel param to set initial workspace panel.
 * 
 * This is the event file metaphor:
 * - open an event URI → EventFile opens
 * - render full event workspace immediately
 * - no global context needed
 * 
 * TODO: Future (R8D) - Route panel switching (URL → eventWorkspacePanel sync)
 */

import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageShell from '@/components/shared/PageShell';
import BurnoutSpinner from '@/components/shared/BurnoutSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import EventWorkspaceContainer from '@/components/registrationdashboard/workspace/EventWorkspaceContainer';
import { buildInvalidateAfterOperation } from '@/components/registrationdashboard/invalidationHelper';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

export default function EventFile() {
  const { eventId, panel } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [standingsDirty, setStandingsDirty] = useState(false);
  const [standingsLastCalculatedAt, setStandingsLastCalculatedAt] = useState(null);

  // Auth
  const { data: isAuthenticated, isLoading: authLoading } = useQuery({
    queryKey: ['isAuthenticated'],
    queryFn: () => base44.auth.isAuthenticated(),
    ...DQ,
  });

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    enabled: !!isAuthenticated,
    ...DQ,
  });

  // Event
  const { data: selectedEvent, isLoading: eventLoading, error: eventError } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => (eventId ? base44.entities.Event.get(eventId) : Promise.resolve(null)),
    enabled: !!isAuthenticated && !!eventId,
    ...DQ,
  });

  // Track (derived from event)
  const { data: selectedTrack } = useQuery({
    queryKey: ['track', selectedEvent?.track_id],
    queryFn: () => (selectedEvent?.track_id ? base44.entities.Track.get(selectedEvent.track_id) : Promise.resolve(null)),
    enabled: !!isAuthenticated && !!selectedEvent?.track_id,
    ...DQ,
  });

  // Series (derived from event)
  const { data: selectedSeries } = useQuery({
    queryKey: ['series', selectedEvent?.series_id],
    queryFn: () => (selectedEvent?.series_id ? base44.entities.Series.get(selectedEvent.series_id) : Promise.resolve(null)),
    enabled: !!isAuthenticated && !!selectedEvent?.series_id,
    ...DQ,
  });

  // Derive context
  const seasonYear = useMemo(() => {
    if (!selectedEvent) return '';
    if (selectedEvent.season) return selectedEvent.season;
    if (selectedEvent.event_date) return new Date(selectedEvent.event_date).getFullYear().toString();
    return '';
  }, [selectedEvent]);

  const dashboardContext = useMemo(() => ({
    eventId: selectedEvent?.id || '',
    seasonYear,
    // Note: no orgType/orgId in standalone mode
    // Instead derived from event
  }), [selectedEvent?.id, seasonYear]);

  // Safe defaults for callbacks when running standalone
  const invalidateAfterOperation = useMemo(
    () => buildInvalidateAfterOperation(queryClient),
    [queryClient]
  );

  // Safe default: always allow override in standalone mode (no admin dialog visible yet)
  const requireAdminOverride = useMemo(() => {
    return async () => true;
  }, []);

  // Safe defaults for protected system callbacks
  const handleResultsProvisional = () => {
    invalidateAfterOperation('results_published_provisional', { eventId });
    invalidateAfterOperation('session_status_changed', { eventId });
  };

  const handleResultsOfficial = () => {
    invalidateAfterOperation('results_published_official', { eventId });
    invalidateAfterOperation('session_status_changed', { eventId });
  };

  const handleResultsLocked = () => {
    invalidateAfterOperation('results_locked', { eventId });
    invalidateAfterOperation('session_status_changed', { eventId });
  };

  const handleStandingsCalculated = () => {
    setStandingsLastCalculatedAt(new Date().toISOString());
    invalidateAfterOperation('standings_recalculated', {
      seriesId: selectedEvent?.series_id,
      eventId,
    });
  };

  // Permissions: derive from user role (admin = full access)
  const isAdmin = user?.role === 'admin';
  const dashboardPermissions = useMemo(() => {
    // Simplified: admins get all tabs
    if (isAdmin) {
      return {
        overview: true,
        event_builder: true,
        classes_sessions: true,
        entries: true,
        compliance: true,
        checkin: true,
        tech: true,
        results: true,
        points_standings: true,
        exports: true,
        integrations: true,
        audit_log: true,
        announcer: true,
        gate: true,
        race_control: true,
        announcer_pack: true,
        imports: true,
        media: true,
        media_portal: true,
        ops_center: true,
      };
    }
    // Users get operational tabs only
    return {
      overview: true,
      classes_sessions: true,
      entries: true,
      compliance: true,
      checkin: true,
      tech: true,
      results: true,
      points_standings: true,
      audit_log: true,
    };
  }, [isAdmin]);

  // Loading state
  if (authLoading || userLoading || eventLoading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center min-h-screen">
          <BurnoutSpinner />
        </div>
      </PageShell>
    );
  }

  // Auth required
  if (!isAuthenticated) {
    return (
      <PageShell>
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
          <Card className="bg-[#171717] border-gray-800 w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400" /> Login Required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300">You must be logged in to access event operations.</p>
              <Button
                onClick={() => base44.auth.redirectToLogin(window.location.href)}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Log In
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageShell>
    );
  }

  // Event not found
  if (eventError || !selectedEvent) {
    return (
      <PageShell>
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
          <Card className="bg-[#171717] border-gray-800 w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400" /> Event Not Found
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300">The event you're looking for doesn't exist or you don't have access to it.</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate(-1)}
                  className="flex-1 gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Go Back
                </Button>
                <Button
                  onClick={() => navigate('/RegistrationDashboard')}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Events List
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageShell>
    );
  }

  // Render workspace
  return (
    <PageShell>
      <div className="min-h-screen bg-[#0A0A0A]">
        <EventWorkspaceContainer
          selectedEvent={selectedEvent}
          selectedTrack={selectedTrack}
          selectedSeries={selectedSeries}
          eventId={eventId}
          organizationType="track" // placeholder: could be track or series
          organizationId={selectedEvent?.track_id || selectedEvent?.series_id || ''}
          seasonYear={seasonYear}
          dashboardContext={dashboardContext}
          dashboardPermissions={dashboardPermissions}
          isAdmin={isAdmin}
          user={user}
          requireAdminOverride={requireAdminOverride}
          invalidateAfterOperation={invalidateAfterOperation}
          standingsDirty={standingsDirty}
          standingsLastCalculatedAt={standingsLastCalculatedAt}
          onSetStandingsDirty={() => setStandingsDirty(true)}
          onResultsProvisional={handleResultsProvisional}
          onResultsOfficial={handleResultsOfficial}
          onResultsLocked={handleResultsLocked}
          sessions={[]} // fetched internally by EventWorkspaceContainer
          onClearDirty={() => setStandingsDirty(false)}
          onStandingsCalculated={handleStandingsCalculated}
          onShowOverrideDialog={() => {}} // no-op in standalone
          onLegacyTabChange={() => {}} // no-op in standalone
          pendingWorkspacePanel={panel} // pass route panel as initial panel
          onPendingPanelApplied={() => {}} // no-op
        />
      </div>
    </PageShell>
  );
}