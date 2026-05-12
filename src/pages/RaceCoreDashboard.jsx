import React, { useState, useMemo, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { getPermissionsForRole, canTab, canAction } from '@/components/access/accessControl';
import { canManageEntity } from '@/components/access/entityAccess';
import PageShell from '@/components/shared/PageShell';
import BurnoutSpinner from '@/components/shared/BurnoutSpinner';
import EventBuilderForm from '@/components/management/EventBuilder/EventBuilderForm';
import OverviewGrid from '@/components/registrationdashboard/OverviewGrid';
import RaceCoreHome from '@/components/registrationdashboard/RaceCoreHome';
import ClassSessionBuilder from '@/components/registrationdashboard/ClassSessionBuilder';
import EntriesManager from '@/components/registrationdashboard/EntriesManager';
import ImportEntriesModal from '@/components/registrationdashboard/entries/ImportEntriesModal';
import DriverRegistrationPanel from '@/components/registrationdashboard/DriverRegistrationPanel';
import ComplianceManager from '@/components/registrationdashboard/ComplianceManager';
import CheckInManager from '@/components/registrationdashboard/CheckInManager';
import TechManager from '@/components/registrationdashboard/TechManager';
import ResultsManager from '@/components/registrationdashboard/ResultsManager';
import AnnouncerPanel from '@/components/registrationdashboard/AnnouncerPanel';
import AnnouncerMode from '@/components/registrationdashboard/AnnouncerMode';
import AnnouncerManager from '@/components/registrationdashboard/AnnouncerManager';
import AnnouncerConsole from '@/components/registrationdashboard/AnnouncerConsole';
import AnnouncerPackManager from '@/components/registrationdashboard/AnnouncerPackManager';
import GateMode from '@/components/registrationdashboard/GateMode';
import GateManagerRefactored from '@/components/registrationdashboard/GateManagerRefactored';
import GateAttendantConsole from '@/components/registrationdashboard/GateAttendantConsole';
import GateConsole from '@/components/registrationdashboard/GateConsole';
import RaceControlConsole from '@/components/registrationdashboard/RaceControlConsole';
import RaceControlManager from '@/components/registrationdashboard/RaceControlManager';
import CSVImportManager from '@/components/registrationdashboard/CSVImportManager';
import PointsAndStandingsManager from '@/components/registrationdashboard/PointsAndStandingsManager';
import ExportsManager from '@/components/registrationdashboard/ExportsManager';
import IntegrationsManager from '@/components/registrationdashboard/IntegrationsManager';
import AuditLogManager from '@/components/registrationdashboard/AuditLogManager';
import MediaTabContent from '@/components/registrationdashboard/MediaTabContent';
import MediaGovernanceManager from '@/components/registrationdashboard/MediaGovernanceManager';
import MediaPortal from '@/components/registrationdashboard/media/MediaPortal';
import EventWorkspaceHeader from '@/components/registrationdashboard/EventWorkspaceHeader';
import RaceCoreSidebar from '@/components/registrationdashboard/RaceCoreSidebar';
import EventSwitcher from '@/components/registrationdashboard/EventSwitcher';
import SeasonCalendarManager from '@/components/registrationdashboard/SeasonCalendarManager';
import PaddockManager from '@/components/registrationdashboard/PaddockManager';
import RaceControlPanel from '@/components/registrationdashboard/RaceControlPanel';
import TimingSyncManager from '@/components/registrationdashboard/TimingSyncManager';
import GateManager from '@/components/registrationdashboard/GateManager';
import ExportsDataHub from '@/components/registrationdashboard/ExportsDataHub';
import EdgeCaseLab from '@/components/registrationdashboard/EdgeCaseLab';
import EventWorkspaceContainer from '@/components/registrationdashboard/workspace/EventWorkspaceContainer';
import RaceCoreQuickCreate from '@/components/registrationdashboard/RaceCoreQuickCreate';
import OpsTimeline from '@/components/registrationdashboard/OpsTimeline';
import LiveControlPanel from '@/components/registrationdashboard/LiveControlPanel';
import OpsEventDashboard from '@/components/registrationdashboard/ops/OpsEventDashboard';
import WorkspaceRedirectCard from '@/components/registrationdashboard/workspace/WorkspaceRedirectCard';
import { motion } from 'framer-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
    Plus,
    Upload,
    RefreshCw,
    Send,
    Download,
    AlertCircle,
    Download as DownloadIcon,
    Users,
    ClipboardCheck,
    Flag,
    Trophy,
    FileText,
    Plug,
    History,
    LayoutDashboard,
    Wrench,
    Car,
    Shield,
    Clock,
    Mic,
    DoorOpen,
    Radio,
    BookOpen,
    Gauge,
    Film,
    Camera,
    Star,
    ArrowLeft,
    ExternalLink,
  } from 'lucide-react';
import { buildInvalidateAfterOperation } from '@/components/registrationdashboard/invalidationHelper';
import {
  getResolvedManagedEntities,
  getRaceCoreEntities,
  buildRaceCoreLaunchUrl,
} from '@/components/entities/entityResolver';
import { getValidPrimaryEntity, isPrimaryEntityStale } from '@/components/entities/entityPrimary';
import { hasEntityAccess } from '@/components/entities/entityPermissions';
import { QueryKeys } from '@/components/utils/queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import useDashboardQueries from '@/components/registrationdashboard/useDashboardQueries';
import { REG_QK } from '@/components/registrationdashboard/queryKeys';
import { canEditEventCore, canApproveAsTrack, canApproveAsSeries } from '@/components/registrationdashboard/permissions/eventPlanningRights';

// ─── Dashboard-wide React Query tunables ────────────────────────────────────
// Canonical defaults live in queryDefaults.js; DQ is a convenience alias here.
const DQ = applyDefaultQueryOptions();

// Helper: Require admin override for sensitive operations
function createRequireAdminOverride(queryClient) {
  return async (actionName, context, onConfirm) => {
    return new Promise((resolve) => {
      // Create dialog programmatically with state management
      const overrideRef = { resolved: false };
      
      window._showOverrideDialog = {
        open: true,
        actionName,
        context,
        onConfirm: async (reason) => {
          if (overrideRef.resolved) return;
          overrideRef.resolved = true;
          
          const user = await base44.auth.me();
          
          // Log override attempt
          try {
            await base44.asServiceRole.entities.OperationLog.create({
              operation_type: 'ADMIN_OVERRIDE',
              source_type: 'RaceCoreDashboard',
              entity_name: context.entityName || 'Session',
              function_name: actionName,
              status: 'success',
              metadata: {
                eventId: context.eventId,
                sessionId: context.sessionId,
                seriesClassId: context.seriesClassId,
                seriesId: context.seriesId,
                beforeStatus: context.beforeStatus,
                afterStatus: context.afterStatus,
                reason,
                userId: user?.id,
              },
              notes: `Override for ${actionName}: ${reason}`,
            });
            
            queryClient.invalidateQueries({ queryKey: ['operationLogs'] });
          } catch (e) {
            console.error('Failed to log override:', e);
          }
          
          await onConfirm(reason);
          resolve(true);
        },
        onCancel: () => {
          if (overrideRef.resolved) return;
          overrideRef.resolved = true;
          resolve(false);
        },
      };
    });
  };
}

export default function RaceCoreDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showImportEntriesModal, setShowImportEntriesModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [standingsDirty, setStandingsDirty] = useState(false);
  const [standingsLastCalculatedAt, setStandingsLastCalculatedAt] = useState(null);
  const [complianceSeverity, setComplianceSeverity] = useState('clear');
  const [showComplianceWarning, setShowComplianceWarning] = useState(false);
  const [pendingLifecycleChange, setPendingLifecycleChange] = useState(null);
  const [showArchiveWarning, setShowArchiveWarning] = useState(false);
  const [showMediaPortalDialog, setShowMediaPortalDialog] = useState(false);
  const [overrideDialog, setOverrideDialog] = useState({ open: false, actionName: '', context: {}, onConfirm: null });
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateType, setQuickCreateType] = useState('Driver');
  const [overrideText, setOverrideText] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
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
  const [pendingWorkspacePanel, setPendingWorkspacePanel] = useState(null);
  const [editingEventId, setEditingEventId] = useState('');
  const [announcerMode, setAnnouncerMode] = useState(searchParams.get('announcer') === '1');
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

  // Fetch selected track details
  const { data: selectedTrack, isLoading: selectedTrackLoading } = useQuery({
    queryKey: QueryKeys.tracks.byId(selectedEvent?.track_id),
    queryFn: () => (selectedEvent?.track_id ? base44.entities.Track.get(selectedEvent.track_id) : Promise.resolve(null)),
    enabled: !!isAuthenticated && !!selectedEvent?.track_id,
    ...DQ,
  });

  // Fetch selected series details
  const { data: selectedSeries, isLoading: selectedSeriesLoading } = useQuery({
    queryKey: QueryKeys.series.byId(selectedEvent?.series_id),
    queryFn: () => (selectedEvent?.series_id ? base44.entities.Series.get(selectedEvent.series_id) : Promise.resolve(null)),
    enabled: !!isAuthenticated && !!selectedEvent?.series_id,
    ...DQ,
  });

  const { data: trackCollaborators = [] } = useQuery({
    queryKey: ['trackCollaborators', selectedEvent?.track_id],
    queryFn: () => (selectedEvent?.track_id 
      ? base44.entities.EntityCollaborator.filter({ entity_type: 'Track', entity_id: selectedEvent.track_id })
      : Promise.resolve([])),
    enabled: !!isAuthenticated && !!selectedEvent?.track_id,
    ...DQ,
  });

  // Fetch series collaborators
  const { data: seriesCollaborators = [] } = useQuery({
    queryKey: ['seriesCollaborators', selectedEvent?.series_id],
    queryFn: () => (selectedEvent?.series_id 
      ? base44.entities.EntityCollaborator.filter({ entity_type: 'Series', entity_id: selectedEvent.series_id })
      : Promise.resolve([])),
    enabled: !!isAuthenticated && !!selectedEvent?.series_id,
    ...DQ,
  });

  // Derive planning rights access
  const userTrackAccess = trackCollaborators.some(c => 
    c.user_id === user?.id && ['owner', 'editor'].includes(c.role)
  );
  const userSeriesAccess = seriesCollaborators.some(c => 
    c.user_id === user?.id && ['owner', 'editor'].includes(c.role)
  );

  const canUserEditEventCore = canEditEventCore({
    isAdmin,
    userId: user?.id,
    selectedEvent,
    userTrackAccess,
    userSeriesAccess,
  });

  // ── Shared dashboard queries (standardized REG_QK keys) ──────────────────
  const {
    sessions,
    results,
    driverPrograms,
    entries: regEntries,
    standings,
    operationLogs,
    sessionsQuery,
    resultsQuery,
  } = useDashboardQueries({
    dashboardContext: dashContext,
    selectedEvent: selectedEvent ?? null,
    selectedTrack: selectedTrack ?? null,
    selectedSeries: selectedSeries ?? null,
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

  // Load recent credential requests for Media Portal preview
  const { data: recentCredentialRequests = [] } = useQuery({
    queryKey: ['credential_requests_recent', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const allRequests = await base44.entities.CredentialRequest.filter({});
      return allRequests
        .filter(
          (cr) =>
            cr.target_entity_id === organizationId ||
            (selectedEvent && cr.related_event_id === selectedEvent.id)
        )
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
        .slice(0, 5);
    },
    enabled: !!organizationId && !!isAuthenticated,
    ...DQ,
  });

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

  const selectedOrgName = useMemo(() => {
    if (organizationType === 'track') {
      const track = tracks.find((t) => t.id === organizationId);
      return track?.name || '';
    } else {
      const matchedSeriesForName = seriesList.find((s) => s.id === organizationId);
      return matchedSeriesForName?.name || '';
    }
  }, [organizationType, organizationId, tracks, seriesList]);

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

  // Helper bound to queryClient
  const requireAdminOverride = useMemo(() => createRequireAdminOverride(queryClient), [queryClient]);

  const handleOverrideConfirm = async () => {
    if (overrideText !== 'OVERRIDE' || !overrideReason.trim()) {
      toast.error('Type OVERRIDE and provide a reason');
      return;
    }

    setOverrideDialog({ open: false, actionName: '', context: {}, onConfirm: null });
    if (overrideDialog.onConfirm) {
      await overrideDialog.onConfirm(overrideReason);
    }
    setOverrideText('');
    setOverrideReason('');
  };

  // ── Announcer Mode toggle in URL ─────────────────────────────────────────
  const handleAnnouncerModeToggle = (enabled) => {
    setAnnouncerMode(enabled);
    const params = new URLSearchParams(searchParams);
    if (enabled) {
      params.set('announcer', '1');
    } else {
      params.delete('announcer');
    }
    setSearchParams(params, { replace: true });
  };

  // ── Debounced URL write (250 ms) ──────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (organizationType) params.set('orgType', organizationType); else params.delete('orgType');
      if (organizationId) params.set('orgId', organizationId); else params.delete('orgId');
      if (seasonYear) params.set('seasonYear', seasonYear); else params.delete('seasonYear');
      if (eventId) params.set('eventId', eventId); else params.delete('eventId');
      if (announcerMode) params.set('announcer', '1'); else params.delete('announcer');
      if (activeTab && activeTab !== 'overview') params.set('tab', activeTab); else params.delete('tab');
      setSearchParams(params, { replace: true });
    }, 250);
    return () => clearTimeout(timer);
  }, [organizationType, organizationId, seasonYear, eventId, announcerMode, activeTab, setSearchParams]);

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

  // When orgType or seasonYear changes, cancel in-flight queries and reset to Overview
  const prevOrgTypeRef = React.useRef(organizationType);
  const prevSeasonYearRef = React.useRef(seasonYear);
  useEffect(() => {
    if (
      prevOrgTypeRef.current !== organizationType ||
      prevSeasonYearRef.current !== seasonYear
    ) {
      queryClient.cancelQueries({ queryKey: QueryKeys.sessions.listByEvent(undefined).slice(0,1) });
      queryClient.cancelQueries({ queryKey: ['entries'] });
      queryClient.cancelQueries({ queryKey: QueryKeys.results.listByEvent(undefined).slice(0,1) });
      queryClient.cancelQueries({ queryKey: QueryKeys.events.byId(undefined).slice(0,1) });
      setEventId('');
      setActiveTab('overview');
      prevOrgTypeRef.current = organizationType;
      prevSeasonYearRef.current = seasonYear;
    }
  }, [organizationType, seasonYear]);

  // When eventId changes: cancel stale queries, prefetch sessions + results
  const prevEventIdRef = React.useRef(eventId);
  useEffect(() => {
    if (prevEventIdRef.current && prevEventIdRef.current !== eventId) {
      const oldId = prevEventIdRef.current;
      queryClient.cancelQueries({ queryKey: ['sessions', oldId] });
      queryClient.cancelQueries({ queryKey: ['entries', oldId] });
      queryClient.cancelQueries({ queryKey: ['results', oldId] });
      queryClient.cancelQueries({ queryKey: REG_QK.sessions(oldId) });
      queryClient.cancelQueries({ queryKey: REG_QK.entries(oldId) });
      queryClient.cancelQueries({ queryKey: REG_QK.results(oldId) });
    }
    prevEventIdRef.current = eventId;

    if (eventId) {
      // Prefetch sessions and results for the new event using REG_QK keys
      queryClient.prefetchQuery({
        queryKey: REG_QK.sessions(eventId),
        queryFn: () => base44.entities.Session.filter({ event_id: eventId }),
        ...DQ,
      });
      queryClient.prefetchQuery({
        queryKey: REG_QK.results(eventId),
        queryFn: () => base44.entities.Results.filter({ event_id: eventId }),
        ...DQ,
      });
    }
  }, [eventId]);

  // Detect when any Session status changes to Official or Locked
  useEffect(() => {
    if (!sessions || sessions.length === 0) return;
    
    const hasOfficialOrLocked = sessions.some((s) => 
      s.status === 'Official' || s.status === 'Locked'
    );
    
    if (hasOfficialOrLocked && !standingsDirty) {
      setStandingsDirty(true);
    }
  }, [sessions, standingsDirty]);

  // Live mode detection — aligns with Event entity status enum
  const isLiveMode = selectedEvent?.status === 'in_progress';

  useEffect(() => {
    if (isLiveMode && selectedEvent) {
      // Auto-default to Results if sessions exist, else CheckIn
      if (sessions.length > 0) {
        setActiveTab('results');
      } else {
        setActiveTab('checkIn');
      }
    }
  }, [isLiveMode, selectedEvent, sessions.length]);

  const handleCreateEvent = () => {
    setEditingEventId('');
    setActiveTab('eventBuilder');
  };

  const handleEventCreated = (newEventId) => {
    setEditingEventId(newEventId);
  };

  const handlePublishOfficial = () => {
    setShowPublishDialog(true);
  };

  const confirmPublish = () => {
    setShowPublishDialog(false);
  };

  const handleEventStatusChange = (newStatus) => {
    if (complianceSeverity === 'warning' && (newStatus === 'Live' || newStatus === 'Completed')) {
      setPendingLifecycleChange(newStatus);
      setShowComplianceWarning(true);
    } else {
      // Allow immediate change if no compliance issues
      // This would be handled by EventStatusCard's save logic
      setPendingLifecycleChange(null);
    }
  };

  const handleConfirmLifecycleChange = () => {
    setShowComplianceWarning(false);
    if (pendingLifecycleChange) {
      // Allow the event status to change - parent component handles save
      setPendingLifecycleChange(null);
    }
  };

  if (authLoading || userLoading || selectedEventLoading || selectedTrackLoading || selectedSeriesLoading) {
  // Added trackCollaborators and seriesCollaborators query loading to auth checks
  // They load quickly via EntityCollaborator filters
    return (
      <PageShell>
        <div className="flex items-center justify-center min-h-screen">
          <BurnoutSpinner />
        </div>
      </PageShell>
    );
  }

  // Handle unauthenticated users
  if (!isAuthenticated) {
    return (
      <PageShell>
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
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
      </PageShell>
    );
  }

  if (!user) {
    return null;
  }

  // Handle org access denied for non-admins
  if (orgAccessDenied && organizationId && !isAdmin) {
    return (
      <PageShell>
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
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
      </PageShell>
    );
  }

  // Handle authenticated users with no accessible tabs
  if (availableTabs.length === 0) {
    return (
      <PageShell>
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
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
      </PageShell>
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
    const extras = {
      ...(seasonYear ? { seasonYear } : {}),
      ...(eventId ? { eventId } : {}),
      ...(activeTab && activeTab !== 'overview' ? { tab: activeTab } : {}),
    };
    return (
      <PageShell>
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
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
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="min-h-screen bg-[#0A0A0A]">
        {/* Main Content — sidebar + workspace */}
          <div className="flex min-h-[calc(100vh-72px)]">
            <RaceCoreSidebar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              dashboardPermissions={dashboardPermissions}
              isAdmin={isAdmin}
              user={user}
              selectedEvent={selectedEvent}
              onQuickCreate={() => { setQuickCreateType('Driver'); setQuickCreateOpen(true); }}
              onCreateEvent={handleCreateEvent}
              onImportEntries={() => setShowImportEntriesModal(true)}
              onSyncTiming={() => setShowSyncModal(true)}
              onPublish={handlePublishOfficial}
              onExport={() => setShowExportModal(true)}
              onMediaPortal={() => setShowMediaPortalDialog(true)}
              announcerMode={announcerMode}
              onAnnouncerModeToggle={handleAnnouncerModeToggle}
            />
          <div className="flex-1 px-6 py-8 overflow-auto">



                    {/* Hard Event Lock Banner */}
            {!selectedEvent && (
              <div className="mb-6 bg-red-950/50 border-2 border-red-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-300 mb-1">Operations Disabled</p>
                    <p className="text-xs text-red-200">
                      Select Track or Series, Season, and Event above to enable operations. All entry, session, results, compliance, and tech actions require an active event context.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Live Mode Badge */}
            {isLiveMode && (
              <div className="mb-6 bg-red-950/40 border border-red-800/50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm font-semibold text-red-300">LIVE EVENT MODE</span>
                </div>
              </div>
            )}

            {/* Season Calendar */}
            {dashboardContext.orgId && dashboardContext.seasonYear && (
              <SeasonCalendarManager
                dashboardContext={dashboardContext}
                selectedEvent={selectedEvent}
                dashboardPermissions={dashboardPermissions}
                onSelectEvent={(newEventId) => {
                  setEventId(newEventId);
                  const params = new URLSearchParams(searchParams);
                  params.set('eventId', newEventId);
                  setSearchParams(params, { replace: true });
                }}
                onCreateEvent={handleCreateEvent}
                invalidateAfterOperation={invalidateAfterOperation}
              />
            )}

            {/* Event Workspace Header — Only shown when event is selected and workspace tab active */}
            {selectedEvent && activeTab === 'workspace' ? (
              <EventWorkspaceHeader
                dashboardContext={dashboardContext}
                selectedEvent={selectedEvent}
                selectedTrack={selectedTrack}
                selectedSeries={selectedSeries}
                dashboardPermissions={dashboardPermissions}
                canUserEditEventCore={canUserEditEventCore}
                invalidateAfterOperation={invalidateAfterOperation}
              />
            ) : null}

          {/* Workspace content — sidebar drives tab selection */}
           <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
             {/* TabsList hidden — navigation handled by RaceCoreSidebar */}
             <TabsList className="hidden" />

             {/* Lazy-mounted tabs: only render active tab content */}
            <div className="mt-6">
              {canTab(dashboardPermissions, 'overview') && activeTab === 'workspace' && selectedEvent && (
                <EventWorkspaceContainer
                  selectedEvent={selectedEvent}
                  selectedTrack={selectedTrack}
                  selectedSeries={selectedSeries}
                  eventId={eventId}
                  organizationType={organizationType}
                  organizationId={organizationId}
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
                  onResultsProvisional={() => { invalidateAfterOperation('results_published_provisional', { eventId }); invalidateAfterOperation('session_status_changed', { eventId }); }}
                  onResultsOfficial={() => { invalidateAfterOperation('results_published_official', { eventId }); invalidateAfterOperation('session_status_changed', { eventId }); }}
                  onResultsLocked={() => { invalidateAfterOperation('results_locked', { eventId }); invalidateAfterOperation('session_status_changed', { eventId }); }}
                  sessions={sessions}
                  onClearDirty={() => setStandingsDirty(false)}
                  onStandingsCalculated={() => {
                    setStandingsLastCalculatedAt(new Date().toISOString());
                    invalidateAfterOperation('standings_recalculated', { seriesId: selectedEvent?.series_id, eventId });
                  }}
                  onShowOverrideDialog={setOverrideDialog}
                  onLegacyTabChange={setActiveTab}
                  pendingWorkspacePanel={pendingWorkspacePanel}
                  onPendingPanelApplied={() => setPendingWorkspacePanel(null)}
                />
              )}

              {canTab(dashboardPermissions, 'overview') && activeTab === 'overview' && (
                <RaceCoreHome
                  dashboardContext={dashboardContext}
                  dashboardPermissions={dashboardPermissions}
                  selectedEvent={selectedEvent}
                  selectedTrack={selectedTrack}
                  selectedSeries={selectedSeries}
                  sessions={sessions}
                  results={results}
                  standings={standings}
                  operationLogs={operationLogs}
                  standingsDirty={standingsDirty}
                  isAdmin={isAdmin}
                  user={user}
                  onTabChange={setActiveTab}
                  onCreateEvent={handleCreateEvent}
                  onOpenImportEntries={() => setShowImportEntriesModal(true)}
                  onOpenQuickCreate={(type) => { setQuickCreateType(type || 'Driver'); setQuickCreateOpen(true); }}
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
                    isLiveMode={isLiveMode}
                    onArchiveAttempt={() => setShowArchiveWarning(true)}
                    onSaved={() => invalidateAfterOperation('event_updated', { eventId: editingEventId || eventId })}
                    onStatusChanged={() => invalidateAfterOperation('event_status_changed', { eventId })}
                    canEditEventCore={canUserEditEventCore}
                    canApproveAsTrack={canApproveAsTrack({ isAdmin, selectedEvent, userTrackAccess })}
                    canApproveAsSeries={canApproveAsSeries({ isAdmin, selectedEvent, userSeriesAccess })}
                  />
                </div>
              )}

              {canTab(dashboardPermissions, 'classes_sessions') && activeTab === 'classesSessions' && (
                <WorkspaceRedirectCard 
                  moduleName="Sessions"
                  description="Session and class management now lives inside the Event Workspace so all event operations stay inside the same event file."
                  panel="sessions"
                  eventId={eventId || undefined}
                  onOpenWorkspace={(panel) => {
                    setActiveTab('workspace');
                    setPendingWorkspacePanel(panel);
                  }}
                />
              )}

              {canTab(dashboardPermissions, 'entries') && activeTab === 'entries' && (
                <WorkspaceRedirectCard 
                  moduleName="Entries"
                  description="Entry management now lives inside the Event Workspace so all event operations stay inside the same event file."
                  panel="entries"
                  eventId={eventId || undefined}
                  onOpenWorkspace={(panel) => {
                    setActiveTab('workspace');
                    setPendingWorkspacePanel(panel);
                  }}
                />
              )}

              {canTab(dashboardPermissions, 'compliance') && activeTab === 'compliance' && (
                <WorkspaceRedirectCard 
                  moduleName="Compliance"
                  description="Compliance management now lives inside the Event Workspace so all event operations stay inside the same event file."
                  panel="compliance"
                  eventId={eventId || undefined}
                  onOpenWorkspace={(panel) => {
                    setActiveTab('workspace');
                    setPendingWorkspacePanel(panel);
                  }}
                />
              )}

              {canTab(dashboardPermissions, 'checkin') && activeTab === 'checkIn' && (
                <WorkspaceRedirectCard
                  moduleName="Check-In"
                  description="Check-In now lives inside the Event Workspace so all race-day operations stay in the same event file."
                  panel="checkin"
                  eventId={eventId || undefined}
                  onOpenWorkspace={(panel) => {
                    setActiveTab('workspace');
                    setPendingWorkspacePanel(panel);
                  }}
                />
              )}

              {canTab(dashboardPermissions, 'tech') && activeTab === 'tech' && (
                <WorkspaceRedirectCard 
                  moduleName="Tech"
                  description="Tech inspection management now lives inside the Event Workspace (Compliance panel) so all event operations stay inside the same event file."
                  panel="compliance"
                  eventId={eventId || undefined}
                  onOpenWorkspace={(panel) => {
                    setActiveTab('workspace');
                    setPendingWorkspacePanel(panel);
                  }}
                />
              )}

              {canTab(dashboardPermissions, 'results') && activeTab === 'results' && (
                <WorkspaceRedirectCard 
                  moduleName="Results"
                  description="Results management now lives inside the Event Workspace so all event operations stay inside the same event file."
                  panel="results"
                  eventId={eventId || undefined}
                  onOpenWorkspace={(panel) => {
                    setActiveTab('workspace');
                    setPendingWorkspacePanel(panel);
                  }}
                />
              )}

              {canTab(dashboardPermissions, 'points_standings') && activeTab === 'pointsStandings' && (
                <WorkspaceRedirectCard 
                  moduleName="Standings"
                  description="Standings management now lives inside the Event Workspace so all event operations stay inside the same event file."
                  panel="standings"
                  eventId={eventId || undefined}
                  onOpenWorkspace={(panel) => {
                    setActiveTab('workspace');
                    setPendingWorkspacePanel(panel);
                  }}
                />
              )}

              {canTab(dashboardPermissions, 'exports') && activeTab === 'exportsDataHub' && (
                <WorkspaceRedirectCard
                  moduleName="Exports"
                  description="Exports now live inside the Event Workspace so all data operations stay in the same event file."
                  panel="exports"
                  eventId={eventId || undefined}
                  onOpenWorkspace={(panel) => {
                    setActiveTab('workspace');
                    setPendingWorkspacePanel(panel);
                  }}
                />
              )}

              {canTab(dashboardPermissions, 'integrations') && activeTab === 'integrations' && (
                <IntegrationsManager 
                  dashboardContext={dashboardContext} 
                  dashboardPermissions={dashboardPermissions}
                  selectedEvent={selectedEvent}
                  selectedTrack={selectedTrack}
                  selectedSeries={selectedSeries}
                  invalidateAfterOperation={invalidateAfterOperation}
                />
              )}

              {canTab(dashboardPermissions, 'audit_log') && activeTab === 'auditLog' && (
                <WorkspaceRedirectCard 
                  moduleName="Activity"
                  description="Activity and audit logging now lives inside the Event Workspace so all event operations stay inside the same event file."
                  panel="activity"
                  eventId={eventId || undefined}
                  onOpenWorkspace={(panel) => {
                    setActiveTab('workspace');
                    setPendingWorkspacePanel(panel);
                  }}
                />
              )}

              {canTab(dashboardPermissions, 'announcer') && activeTab === 'announcer' && (
                <AnnouncerManager
                  selectedEvent={selectedEvent}
                  selectedTrack={selectedTrack}
                  selectedSeries={selectedSeries}
                  dashboardContext={dashboardContext}
                  dashboardPermissions={dashboardPermissions}
                />
              )}

              {canTab(dashboardPermissions, 'gate') && activeTab === 'gate' && (
                <GateManager
                  selectedEvent={selectedEvent}
                  dashboardContext={dashboardContext}
                  dashboardPermissions={dashboardPermissions}
                  invalidateAfterOperation={invalidateAfterOperation}
                />
              )}

              {(isAdmin || ['entity_owner', 'entity_editor'].includes(user?.role)) && activeTab === 'paddock' && (
                <PaddockManager
                  selectedEvent={selectedEvent}
                  dashboardContext={dashboardContext}
                  dashboardPermissions={dashboardPermissions}
                  invalidateAfterOperation={invalidateAfterOperation}
                />
              )}

              {canTab(dashboardPermissions, 'gate') && activeTab === 'gateConsole' && (
                <GateConsole
                  selectedEvent={selectedEvent}
                  dashboardContext={dashboardContext}
                  dashboardPermissions={dashboardPermissions}
                  invalidateAfterOperation={invalidateAfterOperation}
                />
              )}

              {canTab(dashboardPermissions, 'race_control') && activeTab === 'raceControlConsole' && (
                <RaceControlConsole
                  selectedEvent={selectedEvent}
                  dashboardContext={dashboardContext}
                  dashboardPermissions={dashboardPermissions}
                  invalidateAfterOperation={invalidateAfterOperation}
                />
              )}

              {canTab(dashboardPermissions, 'race_control') && activeTab === 'raceControl' && (
                <RaceControlManager
                  selectedEvent={selectedEvent}
                  dashboardContext={dashboardContext}
                  dashboardPermissions={dashboardPermissions}
                  invalidateAfterOperation={invalidateAfterOperation}
                  isAdmin={isAdmin}
                />
              )}

              {(isAdmin || ['entity_owner', 'entity_editor'].includes(user?.role)) && activeTab === 'timing_sync' && (
                <TimingSyncManager
                  selectedEvent={selectedEvent}
                  dashboardContext={dashboardContext}
                  dashboardPermissions={dashboardPermissions}
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

              {canTab(dashboardPermissions, 'imports') && activeTab === 'imports' && (
                <WorkspaceRedirectCard
                  moduleName="Imports"
                  description="Imports now live inside the Event Workspace so all data operations stay in the same event file."
                  panel="imports"
                  eventId={eventId || undefined}
                  onOpenWorkspace={(panel) => {
                    setActiveTab('workspace');
                    setPendingWorkspacePanel(panel);
                  }}
                />
              )}

              {canTab(dashboardPermissions, 'media') && activeTab === 'media' && (
                <WorkspaceRedirectCard 
                  moduleName="Media"
                  description="Media management now lives inside the Event Workspace so all event operations stay inside the same event file."
                  panel="media"
                  eventId={eventId || undefined}
                  onOpenWorkspace={(panel) => {
                    setActiveTab('workspace');
                    setPendingWorkspacePanel(panel);
                  }}
                />
              )}

              {canTab(dashboardPermissions, 'media_portal') && activeTab === 'media_portal' && (
                <MediaPortal
                  dashboardContext={dashboardContext}
                  selectedEvent={selectedEvent}
                  selectedTrack={selectedTrack}
                  selectedSeries={selectedSeries}
                  dashboardPermissions={dashboardPermissions}
                  currentUser={user}
                  isAdmin={isAdmin}
                  invalidateAfterOperation={invalidateAfterOperation}
                />
              )}

              {isAdmin && activeTab === 'opsCenter' && (
                <OpsEventDashboard
                  selectedEvent={selectedEvent}
                  selectedTrack={selectedTrack}
                  selectedSeries={selectedSeries}
                  dashboardContext={dashboardContext}
                  dashboardPermissions={dashboardPermissions}
                  isAdmin={isAdmin}
                  user={user}
                  invalidateAfterOperation={invalidateAfterOperation}
                  standingsLastCalculatedAt={standingsLastCalculatedAt}
                  onSetStandingsDirty={() => setStandingsDirty(true)}
                  onResultsProvisional={() => { invalidateAfterOperation('results_published_provisional', { eventId }); invalidateAfterOperation('session_status_changed', { eventId }); }}
                  onResultsOfficial={() => { invalidateAfterOperation('results_published_official', { eventId }); invalidateAfterOperation('session_status_changed', { eventId }); }}
                  onResultsLocked={() => { invalidateAfterOperation('results_locked', { eventId }); invalidateAfterOperation('session_status_changed', { eventId }); }}
                />
              )}
              </div>
              </Tabs>
          </div>
        </div>

        {/* Modals */}
        <AlertDialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
          <AlertDialogContent className="bg-[#262626] border-gray-700">
            <AlertDialogTitle className="text-white">Publish Official Results</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This will mark all results as official and lock them from further editing. This action cannot be undone.
            </AlertDialogDescription>
            <div className="flex gap-2 justify-end">
              <AlertDialogCancel className="border-gray-700 text-gray-300">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmPublish} className="bg-green-600 hover:bg-green-700">
                Confirm Publish
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showComplianceWarning} onOpenChange={setShowComplianceWarning}>
          <AlertDialogContent className="bg-[#262626] border-gray-700">
            <AlertDialogTitle className="text-white">Compliance Warning</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This event has unresolved compliance issues. Continue anyway?
            </AlertDialogDescription>
            <div className="flex gap-2 justify-end">
              <AlertDialogCancel className="border-gray-700 text-gray-300">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmLifecycleChange} className="bg-amber-600 hover:bg-amber-700">
                Proceed
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

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

        {/* Admin Override Dialog */}
        <Dialog open={overrideDialog.open} onOpenChange={(open) => {
          if (!open) {
            setOverrideDialog({ open: false, actionName: '', context: {}, onConfirm: null });
            setOverrideText('');
            setOverrideReason('');
          }
        }}>
          <DialogContent className="bg-[#262626] border-gray-700 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                Admin Override Required
              </DialogTitle>
              <DialogDescription className="text-gray-400 mt-2">
                {overrideDialog.actionName === 'reopen_locked_session' && 'Reopening a locked session will unlock it for further edits.'}
                {overrideDialog.actionName === 'edit_results_official' && 'Editing results in an official session.'}
                {overrideDialog.actionName === 'import_results_official' && 'Importing results into an official session.'}
                {overrideDialog.actionName === 'import_results_allow_duplicates' && 'Allowing duplicate results in the same session.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {overrideDialog.context && (
                <div className="text-xs text-gray-400 bg-gray-900/50 p-3 rounded border border-gray-700">
                  <div className="font-mono space-y-1">
                    {selectedEvent && <div>Event: {selectedEvent.name}</div>}
                    {overrideDialog.context.sessionId && <div>Session ID: {overrideDialog.context.sessionId}</div>}
                    {overrideDialog.context.beforeStatus && overrideDialog.context.afterStatus && (
                      <div>Change: {overrideDialog.context.beforeStatus} → {overrideDialog.context.afterStatus}</div>
                    )}
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Confirmation Code</label>
                <Input
                  placeholder="Type OVERRIDE to confirm"
                  value={overrideText}
                  onChange={(e) => setOverrideText(e.target.value)}
                  className="bg-gray-900 border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Reason (required)</label>
                <Textarea
                  placeholder="Explain why this override is necessary..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="bg-gray-900 border-gray-600 text-white h-20"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setOverrideDialog({ open: false, actionName: '', context: {}, onConfirm: null });
                  setOverrideText('');
                  setOverrideReason('');
                }}
                className="border-gray-700 text-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleOverrideConfirm}
                disabled={overrideText !== 'OVERRIDE' || !overrideReason.trim()}
                className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50"
              >
                Confirm Override
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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
          existingEntries={regEntries || []}
        />

        {/* Sync Timing Modal */}
        {showSyncModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
            <Card className="bg-[#262626] border-gray-700 w-96">
              <CardHeader>
                <CardTitle className="text-white">Sync Timing Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-400">Timing sync functionality coming soon</p>
                <div className="flex justify-end">
                  <Button onClick={() => setShowSyncModal(false)} className="bg-gray-700 hover:bg-gray-600">
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
            <Card className="bg-[#262626] border-gray-700 w-96">
              <CardHeader>
                <CardTitle className="text-white">Export Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-400">Export functionality coming soon</p>
                <div className="flex justify-end">
                  <Button onClick={() => setShowExportModal(false)} className="bg-gray-700 hover:bg-gray-600">
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Media Portal Preview Dialog */}
        <Dialog open={showMediaPortalDialog} onOpenChange={setShowMediaPortalDialog}>
          <DialogContent className="bg-[#262626] border-gray-700 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Film className="w-5 h-5 text-blue-400" /> Media Portal (Coming Soon)
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                The Media Portal will allow media professionals to apply for credentials, submit assets, and track their requests. Full implementation coming in the next phase.
              </p>
              <div>
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Recent Requests</p>
                {recentCredentialRequests.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {recentCredentialRequests.map((req) => (
                      <div key={req.id} className="bg-[#1A1A1A] border border-gray-700 rounded p-2 text-xs">
                        <div className="text-gray-300">Request ID: {req.id?.slice(0, 8)}</div>
                        <div className="text-gray-500">Status: {req.status}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No requests yet</p>
                )}
              </div>
              <Button
                onClick={() => setShowMediaPortalDialog(false)}
                className="w-full bg-blue-700 hover:bg-blue-600"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageShell>
  );
}