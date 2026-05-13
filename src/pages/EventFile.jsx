/**
 * REVISION R8G Part 3 — EventFile consumes RaceControlProvider
 * - user/isAuthenticated/isAdmin/invalidateAfterOperation sourced from provider
 * - eventPermissions derived via getEventPermissions and passed into workspace
 * - All existing behavior preserved; no module gating yet
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import BurnoutSpinner from '@/components/shared/BurnoutSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft, ChevronRight, Flag } from 'lucide-react';
import EventWorkspaceContainer from '@/components/registrationdashboard/workspace/EventWorkspaceContainer';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import useEventFileAdminOverride from '@/components/registrationdashboard/workspace/useEventFileAdminOverride';
import { useRaceControl } from '@/components/racecontrol/RaceControlProvider';

const DQ = applyDefaultQueryOptions();

// Valid panel IDs — centralized here for EventFile route validation
// (Container also validates via WORKSPACE_PANELS for defense-in-depth)
const VALID_PANELS = new Set([
  'overview', 'schedule', 'sessions', 'results', 'entries',
  'compliance', 'checkin', 'exports', 'imports',
  'standings', 'media', 'activity', 'settings',
]);

function toSafePanel(raw) {
  if (!raw || !VALID_PANELS.has(raw)) return 'overview';
  return raw;
}

// ── Compact breadcrumb strip ────────────────────────────────────────────────
function EventFileBreadcrumb({ eventName, onBack }) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-2 text-xs border-b border-gray-800/60 flex-shrink-0"
      style={{ background: 'rgba(8,10,12,0.95)' }}
    >
      <Flag className="w-3 h-3 text-teal-500 flex-shrink-0" />
      <button
        onClick={onBack}
        className="text-gray-500 hover:text-gray-300 transition-colors font-medium"
      >
        RaceCore
      </button>
      <ChevronRight className="w-3 h-3 text-gray-700 flex-shrink-0" />
      <button
        onClick={onBack}
        className="text-gray-500 hover:text-gray-300 transition-colors"
        title="/race-control/events"
      >
        Events
      </button>
      <ChevronRight className="w-3 h-3 text-gray-700 flex-shrink-0" />
      <span className="text-gray-200 font-semibold truncate max-w-xs">
        {eventName || '—'}
      </span>
      <div className="flex-1" />
      <button
        onClick={onBack}
        className="flex items-center gap-1 px-2.5 py-1 rounded border border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700 transition-colors"
      >
        <ArrowLeft className="w-3 h-3" />
        <span>Back</span>
      </button>
    </div>
  );
}

// ── Error / auth states — minimal, no PageShell ─────────────────────────────
function FullscreenCard({ children }) {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
      {children}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function EventFile() {
  const { eventId, panel } = useParams();
  const navigate = useNavigate();

  // Validate panel from route — D3 fix
  const safePanel = toSafePanel(panel);

  const [standingsDirty, setStandingsDirty] = useState(false);
  const [standingsLastCalculatedAt, setStandingsLastCalculatedAt] = useState(null);

  // ── Auth — sourced from RaceControlProvider ───────────────────────────────
  const {
    user,
    isAuthenticated,
    isAdmin,
    isLoading: providerLoading,
    invalidateAfterOperation,
    getEventPermissions,
  } = useRaceControl();

  // ── Event ─────────────────────────────────────────────────────────────────
  const { data: selectedEvent, isLoading: eventLoading, error: eventError } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => (eventId ? base44.entities.Event.get(eventId) : Promise.resolve(null)),
    enabled: !!isAuthenticated && !!eventId,
    ...DQ,
  });

  // ── Track + Series (derived from event) ───────────────────────────────────
  const { data: selectedTrack } = useQuery({
    queryKey: ['track', selectedEvent?.track_id],
    queryFn: () => base44.entities.Track.get(selectedEvent.track_id),
    enabled: !!isAuthenticated && !!selectedEvent?.track_id,
    ...DQ,
  });

  const { data: selectedSeries } = useQuery({
    queryKey: ['series', selectedEvent?.series_id],
    queryFn: () => base44.entities.Series.get(selectedEvent.series_id),
    enabled: !!isAuthenticated && !!selectedEvent?.series_id,
    ...DQ,
  });

  // ── Derived context fields ────────────────────────────────────────────────

  // D1: organizationType derived from event relationships
  const organizationType = selectedEvent
    ? (selectedEvent.track_id ? 'track' : selectedEvent.series_id ? 'series' : null)
    : null;

  const organizationId = organizationType === 'track'
    ? selectedEvent?.track_id
    : organizationType === 'series'
      ? selectedEvent?.series_id
      : null;

  const seasonYear = useMemo(() => {
    if (!selectedEvent) return '';
    if (selectedEvent.season) return selectedEvent.season;
    if (selectedEvent.event_date) return new Date(selectedEvent.event_date).getFullYear().toString();
    return '';
  }, [selectedEvent]);

  // D2: dashboardContext with full shape matching RegistrationDashboard
  const dashboardContext = useMemo(() => ({
    eventId: selectedEvent?.id || '',
    selectedEventId: selectedEvent?.id || '',
    organizationType,
    orgType: organizationType,
    organizationId: organizationId || '',
    orgId: organizationId || '',
    seasonYear,
    selectedSeason: seasonYear,
    season: seasonYear,
    routeMode: true,
  }), [selectedEvent?.id, organizationType, organizationId, seasonYear]);

  // ── Stable callbacks ──────────────────────────────────────────────────────

  // R8F Part 3: real override confirmation + audit log (replaces async () => true no-op)
  const { requireAdminOverride, OverrideDialog } = useEventFileAdminOverride({
    eventId,
    user,
    selectedEvent,
  });

  // Part 8: memoized callbacks
  const handleSetStandingsDirty = useCallback(() => setStandingsDirty(true), []);
  const handleClearDirty = useCallback(() => setStandingsDirty(false), []);

  const handleResultsProvisional = useCallback(() => {
    invalidateAfterOperation('results_published_provisional', { eventId });
    invalidateAfterOperation('session_status_changed', { eventId });
  }, [invalidateAfterOperation, eventId]);

  const handleResultsOfficial = useCallback(() => {
    invalidateAfterOperation('results_published_official', { eventId });
    invalidateAfterOperation('session_status_changed', { eventId });
  }, [invalidateAfterOperation, eventId]);

  const handleResultsLocked = useCallback(() => {
    invalidateAfterOperation('results_locked', { eventId });
    invalidateAfterOperation('session_status_changed', { eventId });
  }, [invalidateAfterOperation, eventId]);

  const handleStandingsCalculated = useCallback(() => {
    setStandingsLastCalculatedAt(new Date().toISOString());
    invalidateAfterOperation('standings_recalculated', {
      seriesId: selectedEvent?.series_id,
      eventId,
    });
  }, [invalidateAfterOperation, eventId, selectedEvent?.series_id]);

  // Part 7: onLegacyTabChange — handle eventBuilder redirect in standalone mode
  const handleLegacyTabChange = useCallback((tab) => {
    if (tab === 'eventBuilder' && eventId) {
      navigate(`/RegistrationDashboard?tab=eventBuilder&eventId=${eventId}`);
    }
    // other legacy tabs: no-op for now
  }, [navigate, eventId]);

  // Back navigation — to Event Directory (R8D)
  const handleBack = useCallback(() => {
    navigate('/race-control/events');
  }, [navigate]);

  // ── Event-scoped permissions (R8G Part 3) ─────────────────────────────────
  const eventPermissions = useMemo(() => getEventPermissions({
    eventId: selectedEvent?.id,
    trackId: selectedEvent?.track_id,
    seriesId: selectedEvent?.series_id,
  }), [getEventPermissions, selectedEvent?.id, selectedEvent?.track_id, selectedEvent?.series_id]);

  // ── Dashboard permissions (existing — unchanged) ───────────────────────────
  const dashboardPermissions = useMemo(() => {
    if (isAdmin) {
      return {
        overview: true, event_builder: true, classes_sessions: true,
        entries: true, compliance: true, checkin: true, tech: true,
        results: true, points_standings: true, exports: true,
        integrations: true, audit_log: true, announcer: true,
        gate: true, race_control: true, announcer_pack: true,
        imports: true, media: true, media_portal: true, ops_center: true,
      };
    }
    return {
      overview: true, classes_sessions: true, entries: true,
      compliance: true, checkin: true, tech: true, results: true,
      points_standings: true, audit_log: true,
    };
  }, [isAdmin]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (providerLoading || eventLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <BurnoutSpinner />
      </div>
    );
  }

  // ── Auth required ─────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <FullscreenCard>
        <Card className="bg-[#171717] border-gray-800 w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" /> Login Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-300 text-sm">You must be logged in to access event operations.</p>
            <Button
              onClick={() => base44.auth.redirectToLogin(window.location.href)}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Log In
            </Button>
          </CardContent>
        </Card>
      </FullscreenCard>
    );
  }

  // ── Event not found ───────────────────────────────────────────────────────
  if (eventError || (!eventLoading && !selectedEvent)) {
    return (
      <FullscreenCard>
        <Card className="bg-[#171717] border-gray-800 w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" /> Event Not Found
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-300 text-sm">This event doesn't exist or you don't have access to it.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBack} className="flex-1 gap-2">
                <ArrowLeft className="w-4 h-4" /> Go Back
              </Button>
              <Button
                  onClick={() => navigate('/race-control/events')}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Events List
                </Button>
            </div>
          </CardContent>
        </Card>
      </FullscreenCard>
    );
  }

  // ── Workspace render — D9: full-height, no PageShell ─────────────────────
  // L1 fix: use h-full + overflow-hidden instead of height:100vh to work
  // correctly inside global Layout's <main className="flex-1"> wrapper.
  return (
    <div className="flex flex-col h-full min-h-0 bg-[#050505] text-white overflow-hidden">
      {/* R8F Part 3: Admin override confirmation dialog */}
      <OverrideDialog />

      {/* D8: Compact breadcrumb strip */}
      <EventFileBreadcrumb
        eventName={selectedEvent.name}
        onBack={handleBack}
      />

      {/* Workspace fills remaining height */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <EventWorkspaceContainer
          selectedEvent={selectedEvent}
          selectedTrack={selectedTrack}
          selectedSeries={selectedSeries}
          eventId={eventId}
          organizationType={organizationType}         // D1: derived
          organizationId={organizationId}             // D1: derived
          seasonYear={seasonYear}
          dashboardContext={dashboardContext}          // D2: complete shape
          dashboardPermissions={dashboardPermissions}
          isAdmin={isAdmin}
          user={user}
          requireAdminOverride={requireAdminOverride}
          invalidateAfterOperation={invalidateAfterOperation}
          standingsDirty={standingsDirty}
          standingsLastCalculatedAt={standingsLastCalculatedAt}
          onSetStandingsDirty={handleSetStandingsDirty}
          onResultsProvisional={handleResultsProvisional}
          onResultsOfficial={handleResultsOfficial}
          onResultsLocked={handleResultsLocked}
          sessions={[]}
          onClearDirty={handleClearDirty}
          onStandingsCalculated={handleStandingsCalculated}
          onShowOverrideDialog={() => {}}
          onLegacyTabChange={handleLegacyTabChange}   // Part 7: eventBuilder redirect
          initialPanel={safePanel}                    // D4: route panel via initialPanel
          pendingWorkspacePanel={null}                // D4: not used in route mode
          onPendingPanelApplied={() => {}}
          eventPermissions={eventPermissions}         // R8G Part 3: provider-derived permissions
        />
      </div>
    </div>
  );
}