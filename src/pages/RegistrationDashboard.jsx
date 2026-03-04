import React, { useEffect, useState, useMemo } from 'react';
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
import RaceControlManager from '@/components/registrationdashboard/RaceControlManager';
import RaceControlConsole from '@/components/registrationdashboard/RaceControlConsole';
import CSVImportManager from '@/components/registrationdashboard/CSVImportManager';
import PointsAndStandingsManager from '@/components/registrationdashboard/PointsAndStandingsManager';
import ExportsManager from '@/components/registrationdashboard/ExportsManager';
import IntegrationsManager from '@/components/registrationdashboard/IntegrationsManager';
import AuditLogManager from '@/components/registrationdashboard/AuditLogManager';
import EventWorkspaceHeader from '@/components/registrationdashboard/EventWorkspaceHeader';
import EventSwitcher from '@/components/registrationdashboard/EventSwitcher';
import SeasonCalendarManager from '@/components/registrationdashboard/SeasonCalendarManager';
import PaddockManager from '@/components/registrationdashboard/PaddockManager';
import RaceControlPanel from '@/components/registrationdashboard/RaceControlPanel';
import RaceControlManager from '@/components/registrationdashboard/RaceControlManager';
import TimingSyncManager from '@/components/registrationdashboard/TimingSyncManager';
import GateManager from '@/components/registrationdashboard/GateManager';
import EdgeCaseLab from '@/components/registrationdashboard/EdgeCaseLab';
import OpsTimeline from '@/components/registrationdashboard/OpsTimeline';
import LiveControlPanel from '@/components/registrationdashboard/LiveControlPanel';
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
} from 'lucide-react';
import { buildInvalidateAfterOperation } from '@/components/registrationdashboard/invalidationHelper';
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
              source_type: 'RegistrationDashboard',
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

export default function RegistrationDashboard() {
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
  const [overrideDialog, setOverrideDialog] = useState({ open: false, actionName: '', context: {}, onConfirm: null });
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

  // Legacy compatibility – declared early, used in canUserEditEventCore below
  const isAdmin = user?.role === 'admin';

  // Fetch track collaborators
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
    const tabKeys = ['overview', 'event_builder', 'classes_sessions', 'entries', 'compliance', 'checkin', 'tech', 'results', 'points_standings', 'exports', 'integrations', 'audit_log', 'announcer', 'gate', 'race_control', 'announcer_pack', 'imports', 'ops_center'];
    return tabKeys.filter(key => canTab(dashboardPermissions, key));
  }, [dashboardPermissions]);

  // Check entity access for non-admins
  useEffect(() => {
    async function checkOrgAccess() {
      if (!organizationId || isAdmin) {
        setOrgAccessDenied(false);
        return;
      }

      const entityType = organizationType === 'track' ? 'Track' : 'Series';
      const hasAccess = await canManageEntity(entityType, organizationId);
      setOrgAccessDenied(!hasAccess);
    }

    checkOrgAccess();
  }, [organizationId, organizationType, isAdmin]);

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
      base44.auth.redirectToLogin();
    }
  }, [isAuthenticated, authLoading]);

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
                You must be logged in to access the Registration Dashboard.
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
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
          <Card className="bg-[#171717] border-gray-800 w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400" /> Access Denied
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300">
                You do not have access to manage this {organizationType}. Request access using an access code or contact the owner.
              </p>
              <Button
                onClick={() => navigate(createPageUrl('Profile'))}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Request Access
              </Button>
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

  return (
    <PageShell>
      <div className="min-h-screen bg-[#0A0A0A]">
        {/* Sticky Top Summary Bar */}
         <div className="sticky top-0 z-50 bg-[#171717] border-b border-gray-800 px-6 py-4">
           <div className="max-w-7xl mx-auto">
             {(authLoading || userLoading) && (
               <div className="text-xs text-gray-500 mb-3">Loading permissions…</div>
             )}
             <div className="flex flex-wrap items-center gap-4">
              {/* Organization Type Selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 uppercase tracking-wide">Type</label>
                <Select value={organizationType} onValueChange={(v) => { setOrganizationType(v); setOrganizationId(''); setEventId(''); }}>
                  <SelectTrigger className="w-32 bg-[#262626] border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#262626] border-gray-700">
                    <SelectItem value="track" className="text-white">Track</SelectItem>
                    <SelectItem value="series" className="text-white">Series</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Organization Selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 uppercase tracking-wide">
                  {organizationType === 'track' ? 'Track' : 'Series'}
                </label>
                <Select
                  value={organizationId}
                  onValueChange={(v) => { setOrganizationId(v); setEventId(''); }}
                >
                  <SelectTrigger className="w-48 bg-[#262626] border-gray-700 text-white">
                    <SelectValue placeholder={`Select ${organizationType}...`} />
                  </SelectTrigger>
                  <SelectContent className="bg-[#262626] border-gray-700">
                    {organizationType === 'track'
                      ? tracks.map((track) => (
                          <SelectItem key={track.id} value={track.id} className="text-white">
                            {track.name}
                          </SelectItem>
                        ))
                      : seriesList.map((series) => (
                          <SelectItem key={series.id} value={series.id} className="text-white">
                            {series.name}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Season Selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 uppercase tracking-wide">Season</label>
                <Select value={seasonYear} onValueChange={setSeasonYear}>
                  <SelectTrigger className="w-28 bg-[#262626] border-gray-700 text-white">
                    <SelectValue placeholder="Season" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#262626] border-gray-700">
                    {seasons.map((season) => (
                      <SelectItem key={season} value={season} className="text-white">
                        {season}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Event Switcher */}
              <EventSwitcher
                dashboardContext={dashboardContext}
                selectedEvent={selectedEvent}
                dashboardPermissions={dashboardPermissions}
                onSelectEvent={(newEventId) => {
                  setEventId(newEventId);
                  const params = new URLSearchParams(searchParams);
                  params.set('eventId', newEventId);
                  setSearchParams(params, { replace: true });
                }}
                onClearEvent={() => {
                  setEventId('');
                  setActiveTab('overview');
                  const params = new URLSearchParams(searchParams);
                  params.delete('eventId');
                  setSearchParams(params, { replace: true });
                }}
                onCreateEvent={handleCreateEvent}
              />

              {/* Planning Rights Indicator */}
              {selectedEvent && (
                <div className="flex items-center gap-2">
                  {!canUserEditEventCore && (
                    <span className="text-xs px-2 py-1 bg-gray-800 text-gray-300 rounded border border-gray-700">
                      Read only
                    </span>
                  )}
                  <span className="text-xs px-2 py-1 bg-blue-900/30 text-blue-300 rounded border border-blue-800">
                    Planning rights: {selectedEvent.planning_rights === 'track_only' ? 'Track only' : selectedEvent.planning_rights === 'series_only' ? 'Series only' : 'Both'}
                  </span>
                </div>
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                {canAction(dashboardPermissions, 'create_event') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCreateEvent}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Create Event
                  </Button>
                )}
                {canAction(dashboardPermissions, 'import_csv') && selectedEvent && (
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={() => setShowImportEntriesModal(true)}
                     className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                   >
                     <Upload className="w-4 h-4 mr-1" /> Import Entries CSV
                   </Button>
                 )}
                {canAction(dashboardPermissions, 'sync_timing') && selectedEvent && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSyncModal(true)}
                      className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" /> Sync Timing
                    </Button>
                  )}
                  {canAction(dashboardPermissions, 'publish_official') && selectedEvent && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePublishOfficial}
                      className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                    >
                      <Send className="w-4 h-4 mr-1" /> Publish
                    </Button>
                  )}
                  {canAction(dashboardPermissions, 'export') && selectedEvent && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowExportModal(true)}
                        className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                      >
                        <Download className="w-4 h-4 mr-1" /> Export
                      </Button>
                    )}
                </div>

                {/* Announcer Mode Toggle */}
                <Button
                 onClick={() => handleAnnouncerModeToggle(!announcerMode)}
                 size="sm"
                 variant="outline"
                 className={`border-gray-700 ${announcerMode ? 'bg-purple-900/40 text-purple-300 border-purple-700' : 'text-gray-300 hover:bg-gray-800'}`}
                >
                 <Mic className="w-4 h-4 mr-1" /> {announcerMode ? 'Announcer Mode On' : 'Announcer Mode'}
                </Button>
                </div>
                </div>
                </div>

        {/* Main Content */}
          <div className="max-w-7xl mx-auto px-6 py-8">
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

            {/* Event Workspace Header */}
            {selectedEvent && (
              <EventWorkspaceHeader
                dashboardContext={dashboardContext}
                selectedEvent={selectedEvent}
                selectedTrack={selectedTrack}
                selectedSeries={selectedSeries}
                dashboardPermissions={dashboardPermissions}
                invalidateAfterOperation={invalidateAfterOperation}
              />
            )}

            {/* Authority Center Declaration */}
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="mb-8 bg-gradient-to-r from-amber-950/30 to-amber-900/20 border border-amber-800/40 rounded-lg p-6"
           >
             <div className="space-y-3">
               <div>
                 <h1 className="text-2xl font-black text-amber-300">Hijinx RaceDay Engine</h1>
                 <p className="text-lg font-semibold text-amber-200 mt-1">Operational Control Center</p>
               </div>
               <p className="text-xs text-amber-200/70 leading-relaxed">
                 Event lifecycle, session management, results publishing, standings recalculation, and race-day compliance are controlled exclusively through this dashboard.
               </p>
             </div>
           </motion.div>

           {/* Header */}
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="mb-6"
           >
             <h1 className="text-3xl font-black text-white mb-2">Index46 Operations</h1>
            <p className="text-gray-400">
              {selectedOrgName && <span className="text-white">{selectedOrgName}</span>}
                  {selectedEvent && (
                    <span> • {selectedEvent.name} {selectedEvent.round_number ? `(Round ${selectedEvent.round_number})` : ''}</span>
                  )}
                  {!selectedOrgName && !selectedEvent && 'Configure your organization above to begin'}
                  {eventId && !selectedEvent && <span className="text-yellow-500"> • Loading event details...</span>}
            </p>
          </motion.div>

          {/* Selected Event Info Strip */}
          {selectedEvent && (
            <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-800/50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Event Name</p>
                  <p className="text-sm font-semibold text-white">{selectedEvent.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Date</p>
                  <p className="text-sm font-semibold text-white">
                    {selectedEvent.event_date}
                    {selectedEvent.end_date && ` – ${selectedEvent.end_date}`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Status</p>
                  <div className="flex items-center gap-2">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      selectedEvent.status === 'completed' ? 'bg-green-900/40 text-green-300' :
                      selectedEvent.status === 'in_progress' ? 'bg-blue-900/40 text-blue-300' :
                      selectedEvent.status === 'cancelled' ? 'bg-red-900/40 text-red-300' :
                      'bg-gray-900/40 text-gray-300'
                    }`}>
                      {selectedEvent.status || 'upcoming'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-[#171717] border border-gray-800 p-1 h-auto flex flex-wrap gap-1">
              {canTab(dashboardPermissions, 'overview') && (
                <TabsTrigger
                  value="overview"
                  className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 px-4 py-2"
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" /> Overview
                </TabsTrigger>
              )}
              {canTab(dashboardPermissions, 'event_builder') && (
                <TabsTrigger
                  value="eventBuilder"
                  className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 px-4 py-2"
                >
                  <Plus className="w-4 h-4 mr-2" /> Event Builder
                </TabsTrigger>
              )}
              {canTab(dashboardPermissions, 'classes_sessions') && (
                <TabsTrigger
                  value="classesSessions"
                  disabled={!selectedEvent}
                  className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ClipboardCheck className="w-4 h-4 mr-2" /> Classes & Sessions
                </TabsTrigger>
              )}
              {canTab(dashboardPermissions, 'entries') && (
                <TabsTrigger
                  value="entries"
                  disabled={!selectedEvent}
                  className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Users className="w-4 h-4 mr-2" /> Entries
                </TabsTrigger>
              )}
              {canTab(dashboardPermissions, 'compliance') && (
                <TabsTrigger
                  value="compliance"
                  disabled={!selectedEvent}
                  className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <AlertCircle className="w-4 h-4 mr-2" /> Compliance
                </TabsTrigger>
              )}
              {canTab(dashboardPermissions, 'checkin') && (
                <TabsTrigger
                  value="checkIn"
                  disabled={!selectedEvent}
                  className={`px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isLiveMode 
                      ? 'bg-blue-900/30 text-blue-300 data-[state=active]:bg-blue-800 data-[state=active]:text-blue-100 border border-blue-800/50' 
                      : 'data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400'
                  }`}
                >
                  <Car className="w-4 h-4 mr-2" /> Check In
                </TabsTrigger>
              )}
              {canTab(dashboardPermissions, 'tech') && (
                <TabsTrigger
                  value="tech"
                  disabled={!selectedEvent}
                  className={`px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isLiveMode 
                      ? 'bg-blue-900/30 text-blue-300 data-[state=active]:bg-blue-800 data-[state=active]:text-blue-100 border border-blue-800/50' 
                      : 'data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400'
                  }`}
                >
                  <Wrench className="w-4 h-4 mr-2" /> Tech
                </TabsTrigger>
              )}
              {canTab(dashboardPermissions, 'results') && (
                <TabsTrigger
                  value="results"
                  className={`px-4 py-2 ${
                    isLiveMode 
                      ? 'bg-blue-900/30 text-blue-300 data-[state=active]:bg-blue-800 data-[state=active]:text-blue-100 border border-blue-800/50' 
                      : 'data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400'
                  }`}
                >
                  <Flag className="w-4 h-4 mr-2" /> Results
                </TabsTrigger>
              )}
              {canTab(dashboardPermissions, 'points_standings') && (
                <TabsTrigger
                  value="pointsStandings"
                  className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 px-4 py-2"
                >
                  <Trophy className="w-4 h-4 mr-2" /> Points & Standings
                </TabsTrigger>
              )}
              {canTab(dashboardPermissions, 'exports') && (
                <TabsTrigger
                  value="exports"
                  className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 px-4 py-2"
                >
                  <FileText className="w-4 h-4 mr-2" /> Exports
                </TabsTrigger>
              )}
              {canTab(dashboardPermissions, 'integrations') && (
                <TabsTrigger
                  value="integrations"
                  className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 px-4 py-2"
                >
                  <Plug className="w-4 h-4 mr-2" /> Integrations
                </TabsTrigger>
              )}
              {canTab(dashboardPermissions, 'audit_log') && (
                <TabsTrigger
                  value="auditLog"
                  className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 px-4 py-2"
                >
                  <History className="w-4 h-4 mr-2" /> Audit Log
                </TabsTrigger>
              )}
              {canTab(dashboardPermissions, 'announcer') && (
                <TabsTrigger
                  value="announcer"
                  disabled={!selectedEvent}
                  className="data-[state=active]:bg-blue-800 data-[state=active]:text-blue-100 text-gray-400 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Mic className="w-4 h-4 mr-2" /> Announcer
                </TabsTrigger>
              )}
              {canTab(dashboardPermissions, 'gate') && (
                <TabsTrigger
                  value="gate"
                  disabled={!selectedEvent}
                  className="data-[state=active]:bg-green-800 data-[state=active]:text-green-100 text-gray-400 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <DoorOpen className="w-4 h-4 mr-2" /> Gate
                </TabsTrigger>
              )}
              {(isAdmin || ['entity_owner', 'entity_editor'].includes(user?.role)) && (
                <TabsTrigger
                  value="gateManager"
                  disabled={!selectedEvent}
                  className="data-[state=active]:bg-green-900 data-[state=active]:text-green-100 text-gray-400 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <DoorOpen className="w-4 h-4 mr-2" /> Gate Manager
                </TabsTrigger>
              )}
              {canTab(dashboardPermissions, 'race_control') && (
                <TabsTrigger
                  value="race_control"
                  disabled={!selectedEvent}
                  className="data-[state=active]:bg-red-900 data-[state=active]:text-red-100 text-gray-400 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Radio className="w-4 h-4 mr-2" /> Race Control
                </TabsTrigger>
              )}
              {(isAdmin || ['entity_owner', 'entity_editor'].includes(user?.role)) && (
                <TabsTrigger
                  value="paddock"
                  disabled={!selectedEvent}
                  className="data-[state=active]:bg-amber-800 data-[state=active]:text-amber-100 text-gray-400 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Users className="w-4 h-4 mr-2" /> Paddock
                </TabsTrigger>
              )}

              {(isAdmin || ['entity_owner', 'entity_editor'].includes(user?.role)) && (
                <TabsTrigger
                  value="timing_sync"
                  disabled={!selectedEvent}
                  className="data-[state=active]:bg-purple-800 data-[state=active]:text-purple-100 text-gray-400 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Clock className="w-4 h-4 mr-2" /> Timing Sync
                </TabsTrigger>
              )}
              {canTab(dashboardPermissions, 'announcer_pack') && (
                <TabsTrigger
                  value="announcer_pack"
                  className="data-[state=active]:bg-indigo-800 data-[state=active]:text-indigo-100 text-gray-400 px-4 py-2"
                >
                  <BookOpen className="w-4 h-4 mr-2" /> Announcer Pack
                </TabsTrigger>
              )}
              {canTab(dashboardPermissions, 'imports') && (
                <TabsTrigger
                  value="imports"
                  className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 px-4 py-2"
                >
                  <Upload className="w-4 h-4 mr-2" /> Imports
                </TabsTrigger>
              )}
              {isAdmin && (
                <TabsTrigger
                  value="opsCenter"
                  disabled={!selectedEvent}
                  className="data-[state=active]:bg-red-900 data-[state=active]:text-red-100 text-gray-400 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Gauge className="w-4 h-4 mr-2" /> Ops Center
                </TabsTrigger>
              )}
              </TabsList>

            {/* Lazy-mounted tabs: only render active tab content */}
            <div className="mt-6">
              {canTab(dashboardPermissions, 'overview') && activeTab === 'overview' && (
                <OverviewGrid
                  dashboardContext={dashboardContext}
                  dashboardPermissions={dashboardPermissions}
                  selectedEvent={selectedEvent}
                  selectedTrack={selectedTrack}
                  selectedSeries={selectedSeries}
                  sessions={sessions}
                  standings={standings}
                  results={results}
                  operationLogs={operationLogs}
                  importLogs={importLogs}
                  complianceSeverity={complianceSeverity}
                  announcerMode={announcerMode}
                  onSelectSession={(sessionId) => {
                    setActiveTab('results');
                    sessionStorage.setItem('selectedSessionId', sessionId);
                  }}
                  onEntriesNavigate={(params) => {
                    // Switch to entries tab and push filter params to URL
                    setActiveTab('entries');
                    const next = new URLSearchParams(searchParams);
                    next.set('tab', 'entries');
                    if (params.classId) next.set('classId', params.classId); else next.delete('classId');
                    if (params.payment) next.set('payment', params.payment); else next.delete('payment');
                    if (params.checkin) next.set('checkin', params.checkin); else next.delete('checkin');
                    if (params.tech) next.set('tech', params.tech); else next.delete('tech');
                    setSearchParams(next, { replace: true });
                  }}
                />
              )}

              {canTab(dashboardPermissions, 'event_builder') && activeTab === 'eventBuilder' && (
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
              )}

              {canTab(dashboardPermissions, 'classes_sessions') && activeTab === 'classesSessions' && (
                selectedEvent ? (
                  <ClassSessionBuilder
                    dashboardContext={dashboardContext}
                    dashboardPermissions={dashboardPermissions}
                    selectedEvent={selectedEvent}
                    eventId={selectedEvent.id}
                    seriesId={organizationType === 'series' ? organizationId : selectedEvent.series_id}
                    isAdmin={isAdmin}
                    requireAdminOverride={requireAdminOverride}
                    onShowOverrideDialog={setOverrideDialog}
                    onSessionSaved={() => invalidateAfterOperation('session_updated', { eventId: selectedEvent.id })}
                    onSessionStatusChanged={() => invalidateAfterOperation('session_status_changed', { eventId: selectedEvent.id })}
                  />
                ) : (
                  <Card className="bg-[#171717] border-gray-800">
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-400">Select an event to manage classes and sessions</p>
                    </CardContent>
                  </Card>
                )
              )}

              {canTab(dashboardPermissions, 'entries') && activeTab === 'entries' && (
                isAdmin || announcerMode ? (
                  selectedEvent ? (
                    <EntriesManager
                      dashboardContext={dashboardContext}
                      dashboardPermissions={dashboardPermissions}
                      selectedEvent={selectedEvent}
                      eventId={selectedEvent.id}
                      seriesId={organizationType === 'series' ? organizationId : selectedEvent.series_id}
                      onEntrySaved={() => invalidateAfterOperation('entries_updated', { eventId: selectedEvent.id })}
                      announcerMode={announcerMode}
                    />
                  ) : (
                    <Card className="bg-[#171717] border-gray-800">
                      <CardContent className="py-12 text-center">
                        <p className="text-gray-400">Select an event to manage entries</p>
                      </CardContent>
                    </Card>
                  )
                ) : (
                  <DriverRegistrationPanel
                    selectedEvent={selectedEvent}
                    user={user}
                  />
                )
              )}

              {canTab(dashboardPermissions, 'compliance') && activeTab === 'compliance' && (
                selectedEvent ? (
                  <ComplianceManager 
                    dashboardContext={dashboardContext} 
                    dashboardPermissions={dashboardPermissions}
                    selectedEvent={selectedEvent}
                    onComplianceSeverityChange={setComplianceSeverity}
                    onComplianceUpdated={() => invalidateAfterOperation('compliance_updated', { eventId: selectedEvent.id })}
                  />
                ) : (
                  <Card className="bg-[#171717] border-gray-800">
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-400">Select an event to view compliance</p>
                    </CardContent>
                  </Card>
                )
              )}

              {canTab(dashboardPermissions, 'checkin') && activeTab === 'checkIn' && (
                selectedEvent ? (
                  <CheckInManager 
                    dashboardContext={dashboardContext} 
                    dashboardPermissions={dashboardPermissions}
                    selectedEvent={selectedEvent}
                    selectedTrack={selectedTrack}
                    selectedSeries={selectedSeries}
                    invalidateAfterOperation={invalidateAfterOperation}
                  />
                ) : (
                  <Card className="bg-[#171717] border-gray-800">
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-400">Select an event to check in entries</p>
                    </CardContent>
                  </Card>
                )
              )}

              {canTab(dashboardPermissions, 'tech') && activeTab === 'tech' && (
                selectedEvent ? (
                  <TechManager 
                    dashboardContext={dashboardContext} 
                    dashboardPermissions={dashboardPermissions}
                    selectedEvent={selectedEvent} 
                    user={user}
                    onTechUpdated={() => invalidateAfterOperation('tech_updated', { eventId: selectedEvent.id })}
                  />
                ) : (
                  <Card className="bg-[#171717] border-gray-800">
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-400">Select an event to manage tech inspection</p>
                    </CardContent>
                  </Card>
                )
              )}

              {canTab(dashboardPermissions, 'results') && activeTab === 'results' && (
                <div className="space-y-4">
                  {/* Results Manager */}

                  <ResultsManager
                    dashboardContext={dashboardContext}
                    dashboardPermissions={dashboardPermissions}
                    selectedEvent={selectedEvent}
                    isAdmin={isAdmin}
                    standingsLastCalculatedAt={standingsLastCalculatedAt}
                    onSetStandingsDirty={() => setStandingsDirty(true)}
                    requireAdminOverride={requireAdminOverride}
                    onShowOverrideDialog={setOverrideDialog}
                    onResultsSaved={() => invalidateAfterOperation('results_saved', { eventId })}
                    onResultsProvisional={() => { invalidateAfterOperation('results_published_provisional', { eventId }); invalidateAfterOperation('session_status_changed', { eventId }); }}
                    onResultsOfficial={() => { invalidateAfterOperation('results_published_official', { eventId }); invalidateAfterOperation('session_status_changed', { eventId }); }}
                    onResultsLocked={() => { invalidateAfterOperation('results_locked', { eventId }); invalidateAfterOperation('session_status_changed', { eventId }); }}
                    announcerMode={announcerMode}
                  />
                </div>
              )}

              {canTab(dashboardPermissions, 'points_standings') && activeTab === 'pointsStandings' && (
                <PointsAndStandingsManager
                  dashboardContext={dashboardContext}
                  dashboardPermissions={dashboardPermissions}
                  isAdmin={isAdmin}
                  selectedEvent={selectedEvent}
                  standingsDirty={standingsDirty}
                  onClearDirty={() => setStandingsDirty(false)}
                  onStandingsCalculated={() => {
                    setStandingsLastCalculatedAt(new Date().toISOString());
                    invalidateAfterOperation('standings_recalculated', {
                      seriesId: selectedEvent?.series_id,
                      eventId,
                    });
                  }}
                  sessions={sessions}
                />
              )}

              {canTab(dashboardPermissions, 'exports') && activeTab === 'exports' && (
                <ExportsManager 
                  dashboardContext={dashboardContext} 
                  dashboardPermissions={dashboardPermissions}
                  selectedEvent={selectedEvent}
                  selectedTrack={selectedTrack}
                  selectedSeries={selectedSeries}
                  invalidateAfterOperation={invalidateAfterOperation}
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
                <div className="space-y-6">
                  {isAdmin && selectedEvent && (
                    <EdgeCaseLab selectedEvent={selectedEvent} isAdmin={isAdmin} />
                  )}
                  <AuditLogManager 
                    dashboardContext={dashboardContext} 
                    dashboardPermissions={dashboardPermissions}
                    isAdmin={isAdmin}
                    operationLogs={operationLogs}
                  />
                </div>
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
                  selectedTrack={selectedTrack}
                  selectedSeries={selectedSeries}
                  dashboardContext={dashboardContext}
                  dashboardPermissions={dashboardPermissions}
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

              {canTab(dashboardPermissions, 'race_control') && activeTab === 'race_control' && (
                <RaceControlManager
                  selectedEvent={selectedEvent}
                  selectedTrack={selectedTrack}
                  selectedSeries={selectedSeries}
                  dashboardContext={dashboardContext}
                  dashboardPermissions={dashboardPermissions}
                  invalidateAfterOperation={invalidateAfterOperation}
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
                  selectedTrack={selectedTrack}
                  selectedSeries={selectedSeries}
                  dashboardContext={dashboardContext}
                  dashboardPermissions={dashboardPermissions}
                />
              )}

              {canTab(dashboardPermissions, 'imports') && activeTab === 'imports' && (
                <CSVImportManager
                  selectedEvent={selectedEvent}
                  selectedSeries={selectedSeries}
                  dashboardContext={dashboardContext}
                  dashboardPermissions={dashboardPermissions}
                  invalidateAfterOperation={invalidateAfterOperation}
                />
              )}

              {isAdmin && activeTab === 'opsCenter' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <OpsTimeline selectedEvent={selectedEvent} />
                  </div>
                  <div>
                    <LiveControlPanel
                      selectedEvent={selectedEvent}
                      selectedSeries={selectedSeries}
                      invalidateAfterOperation={invalidateAfterOperation}
                    />
                  </div>
                </div>
              )}
              </div>
              </Tabs>
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
      </div>
    </PageShell>
  );
}