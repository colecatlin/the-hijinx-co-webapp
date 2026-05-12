/**
 * REVISION R8G Part 2 — RaceControlProvider
 *
 * Provides shared user/auth/permission/collaboration context for all
 * /race-control/* routes. Wraps the route subtree via RaceControlLayout.
 *
 * Design constraints:
 * - Does NOT wrap RegistrationDashboard
 * - Does NOT modify any protected operational systems
 * - useRaceControl() is FAIL-SAFE outside the provider (returns safe defaults)
 * - Permission derivation is additive — no existing consumers changed
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { buildInvalidateAfterOperation } from '@/components/registrationdashboard/invalidationHelper';

const DQ = applyDefaultQueryOptions();

// ── Default permissions (viewer — no event context) ───────────────────────────
export const DEFAULT_EVENT_PERMISSIONS = Object.freeze({
  role: 'viewer',
  source: 'default',
  canViewOverview: true,
  canViewSchedule: true,
  canManageSessions: false,
  canManageResults: false,
  canManageEntries: false,
  canManageCompliance: false,
  canManageStandings: false,
  canManageCheckIn: false,
  canManageMedia: false,
  canViewActivity: false,
  canManageSettings: false,
  canPublishResults: false,
  canLockSession: false,
  canOverrideSession: false,
  canEditEntries: false,
  canEditMedia: false,
});

const ADMIN_EVENT_PERMISSIONS = Object.freeze({
  role: 'platform_admin',
  source: 'platform_admin',
  canViewOverview: true,
  canViewSchedule: true,
  canManageSessions: true,
  canManageResults: true,
  canManageEntries: true,
  canManageCompliance: true,
  canManageStandings: true,
  canManageCheckIn: true,
  canManageMedia: true,
  canViewActivity: true,
  canManageSettings: true,
  canPublishResults: true,
  canLockSession: true,
  canOverrideSession: true,
  canEditEntries: true,
  canEditMedia: true,
});

// ── Safe defaults returned when hook is used outside provider ─────────────────
const SAFE_DEFAULTS = {
  user: null,
  isAuthenticated: false,
  isAdmin: false,
  myCollaborations: [],
  isLoading: false,
  error: null,
  invalidateAfterOperation: () => {},
  getEventPermissions: () => DEFAULT_EVENT_PERMISSIONS,
  canAccessEventModule: () => false,
  canPerformEventAction: () => false,
};

// ── Context ───────────────────────────────────────────────────────────────────
const RaceControlContext = createContext(null);

// ── Permission derivation ─────────────────────────────────────────────────────
function deriveEventPermissions({ isAdmin, collaborations, eventId, trackId, seriesId }) {
  if (isAdmin) return ADMIN_EVENT_PERMISSIONS;

  const collabs = collaborations || [];

  // Find event-level collaborator record
  const eventCollab = collabs.find(
    c => c.entity_type === 'Event' && c.entity_id === eventId
  );
  // Find track-level collaborator record
  const trackCollab = trackId
    ? collabs.find(c => c.entity_type === 'Track' && c.entity_id === trackId)
    : null;
  // Find series-level collaborator record
  const seriesCollab = seriesId
    ? collabs.find(c => c.entity_type === 'Series' && c.entity_id === seriesId)
    : null;

  const isEventOwner  = eventCollab?.role === 'owner';
  const isEventEditor = !!eventCollab && ['owner', 'editor'].includes(eventCollab.role);
  const isTrackOp     = !!trackCollab && ['owner', 'editor'].includes(trackCollab.role);
  const isSeriesOp    = !!seriesCollab && ['owner', 'editor'].includes(seriesCollab.role);

  // ── event_owner ────────────────────────────────────────────────────────────
  if (isEventOwner) {
    return {
      role: 'event_owner',
      source: 'event_collaborator',
      canViewOverview: true,
      canViewSchedule: true,
      canManageSessions: true,
      canManageResults: true,
      canManageEntries: true,
      canManageCompliance: true,
      canManageStandings: true,
      canManageCheckIn: true,
      canManageMedia: true,
      canViewActivity: true,
      canManageSettings: true,
      canPublishResults: true,
      canLockSession: true,
      canOverrideSession: false, // only platform_admin
      canEditEntries: true,
      canEditMedia: true,
    };
  }

  // ── event_editor ───────────────────────────────────────────────────────────
  if (isEventEditor) {
    return {
      role: 'event_editor',
      source: 'event_collaborator',
      canViewOverview: true,
      canViewSchedule: true,
      canManageSessions: true,
      canManageResults: true,
      canManageEntries: true,
      canManageCompliance: true,
      canManageStandings: true,
      canManageCheckIn: true,
      canManageMedia: true,
      canViewActivity: true,
      canManageSettings: false,
      canPublishResults: false,
      canLockSession: false,
      canOverrideSession: false,
      canEditEntries: true,
      canEditMedia: true,
    };
  }

  // ── Composite: track_operator + series_operator can both apply ─────────────
  if (isTrackOp || isSeriesOp) {
    return {
      role: isTrackOp && isSeriesOp ? 'track_and_series_operator' : isTrackOp ? 'track_operator' : 'series_operator',
      source: 'org_collaborator',
      canViewOverview: true,
      canViewSchedule: true,
      // Series operators: sessions/results/standings
      canManageSessions: isSeriesOp,
      canManageResults: isSeriesOp,
      canManageStandings: isSeriesOp,
      // Track operators: entries/compliance/checkin
      canManageEntries: isTrackOp,
      canManageCompliance: isTrackOp,
      canManageCheckIn: isTrackOp,
      // Media: neither by default without event collab
      canManageMedia: false,
      canViewActivity: isTrackOp || isSeriesOp,
      canManageSettings: false,
      canPublishResults: isSeriesOp,
      canLockSession: false,
      canOverrideSession: false,
      canEditEntries: isTrackOp,
      canEditMedia: false,
    };
  }

  // ── viewer (no collaborator record) ────────────────────────────────────────
  return { ...DEFAULT_EVENT_PERMISSIONS };
}

// ── Module key → permission key map ──────────────────────────────────────────
const MODULE_PERMISSION_MAP = {
  overview:    'canViewOverview',
  schedule:    'canViewSchedule',
  sessions:    'canManageSessions',
  results:     'canManageResults',
  entries:     'canManageEntries',
  compliance:  'canManageCompliance',
  standings:   'canManageStandings',
  checkin:     'canManageCheckIn',
  media:       'canManageMedia',
  activity:    'canViewActivity',
  settings:    'canManageSettings',
};

const ACTION_PERMISSION_MAP = {
  publish_results:  'canPublishResults',
  lock_session:     'canLockSession',
  override_session: 'canOverrideSession',
  edit_entries:     'canEditEntries',
  edit_media:       'canEditMedia',
  manage_settings:  'canManageSettings',
};

// ── Provider ──────────────────────────────────────────────────────────────────
export function RaceControlProvider({ children }) {
  const queryClient = useQueryClient();

  const { data: isAuthenticated, isLoading: authLoading } = useQuery({
    queryKey: ['isAuthenticated'],
    queryFn: () => base44.auth.isAuthenticated(),
    ...DQ,
  });

  const { data: user, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    enabled: !!isAuthenticated,
    ...DQ,
  });

  const isAdmin = user?.role === 'admin';

  // Load all EntityCollaborator records for the current user
  const { data: myCollaborations = [], isLoading: collabLoading } = useQuery({
    queryKey: ['myCollaborations', user?.id],
    queryFn: () => base44.entities.EntityCollaborator.filter({ user_id: user.id }),
    enabled: !!user?.id && !isAdmin, // admins don't need collab lookup
    ...DQ,
  });

  const isLoading = authLoading || userLoading || collabLoading;

  // Stable invalidation helper bound to this queryClient
  const invalidateAfterOperation = useMemo(
    () => buildInvalidateAfterOperation(queryClient),
    [queryClient]
  );

  const getEventPermissions = useMemo(() => {
    return ({ eventId, trackId, seriesId } = {}) => {
      return deriveEventPermissions({
        isAdmin,
        collaborations: myCollaborations,
        eventId,
        trackId,
        seriesId,
      });
    };
  }, [isAdmin, myCollaborations]);

  const canAccessEventModule = useMemo(() => {
    return (eventContext, moduleKey) => {
      const perms = getEventPermissions(eventContext);
      const permKey = MODULE_PERMISSION_MAP[moduleKey];
      return permKey ? !!perms[permKey] : false;
    };
  }, [getEventPermissions]);

  const canPerformEventAction = useMemo(() => {
    return (eventContext, actionKey) => {
      const perms = getEventPermissions(eventContext);
      const permKey = ACTION_PERMISSION_MAP[actionKey];
      return permKey ? !!perms[permKey] : false;
    };
  }, [getEventPermissions]);

  const value = useMemo(() => ({
    user,
    isAuthenticated: !!isAuthenticated,
    isAdmin,
    myCollaborations,
    isLoading,
    error: userError || null,
    invalidateAfterOperation,
    getEventPermissions,
    canAccessEventModule,
    canPerformEventAction,
  }), [
    user, isAuthenticated, isAdmin, myCollaborations, isLoading,
    userError, invalidateAfterOperation, getEventPermissions,
    canAccessEventModule, canPerformEventAction,
  ]);

  return (
    <RaceControlContext.Provider value={value}>
      {children}
    </RaceControlContext.Provider>
  );
}

// ── Hook — fail-safe outside provider ────────────────────────────────────────
export function useRaceControl() {
  const ctx = useContext(RaceControlContext);
  // If used outside provider, return safe defaults — does NOT throw.
  // This protects RegistrationDashboard embedded mode.
  if (!ctx) return SAFE_DEFAULTS;
  return ctx;
}

export default RaceControlProvider;