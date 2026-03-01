import React, { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { getPermissionsForRole, canTab, canAction } from '@/components/access/accessControl';
import PageShell from '@/components/shared/PageShell';
import BurnoutSpinner from '@/components/shared/BurnoutSpinner';
import EventBuilderForm from '@/components/management/EventBuilder/EventBuilderForm';
import OverviewGrid from '@/components/registrationdashboard/OverviewGrid';
import ClassSessionBuilder from '@/components/registrationdashboard/ClassSessionBuilder';
import EntriesManager from '@/components/registrationdashboard/EntriesManager';
import ComplianceManager from '@/components/registrationdashboard/ComplianceManager';
import CheckInManager from '@/components/registrationdashboard/CheckInManager';
import TechManager from '@/components/registrationdashboard/TechManager';
import ResultsManager from '@/components/registrationdashboard/ResultsManager';
import PointsAndStandingsManager from '@/components/registrationdashboard/PointsAndStandingsManager';
import ExportsManager from '@/components/registrationdashboard/ExportsManager';
import IntegrationsManager from '@/components/registrationdashboard/IntegrationsManager';
import AuditLogManager from '@/components/registrationdashboard/AuditLogManager';
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
} from 'lucide-react';

export default function RegistrationDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [standingsDirty, setStandingsDirty] = useState(false);
  const [standingsLastCalculatedAt, setStandingsLastCalculatedAt] = useState(null);
  const [complianceSeverity, setComplianceSeverity] = useState('clear');
  const [showComplianceWarning, setShowComplianceWarning] = useState(false);
  const [pendingLifecycleChange, setPendingLifecycleChange] = useState(null);
  const [showArchiveWarning, setShowArchiveWarning] = useState(false);

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
  const [activeTab, setActiveTab] = useState('overview');
  const [editingEventId, setEditingEventId] = useState('');

  // Dashboard context object
  const dashboardContext = useMemo(() => ({
    orgType: organizationType,
    orgId: organizationId,
    season: seasonYear,
    eventId: eventId,
  }), [organizationType, organizationId, seasonYear, eventId]);

  const { data: isAuthenticated, isLoading: authLoading } = useQuery({
    queryKey: ['isAuthenticated'],
    queryFn: () => base44.auth.isAuthenticated(),
  });

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    enabled: isAuthenticated,
  });

  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.list(),
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: seriesList = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list(),
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', eventId],
    queryFn: () => (eventId ? base44.entities.Session.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: isAuthenticated && !!eventId,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: standings = [] } = useQuery({
    queryKey: ['standings', organizationId, seasonYear],
    queryFn: () => {
      if (organizationType !== 'series' || !organizationId) return Promise.resolve([]);
      return base44.entities.Standings.filter({ series_id: organizationId, season: seasonYear });
    },
    enabled: isAuthenticated && organizationType === 'series' && !!organizationId,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: results = [] } = useQuery({
    queryKey: ['results', eventId],
    queryFn: () => (eventId ? base44.entities.Results.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: isAuthenticated && !!eventId,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: operationLogs = [] } = useQuery({
    queryKey: ['operationLogs'],
    queryFn: () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return base44.entities.OperationLog.filter({
        created_date: { $gte: thirtyDaysAgo.toISOString() },
      });
    },
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch selected event details
  const { data: selectedEvent, isLoading: selectedEventLoading } = useQuery({
    queryKey: ['selectedEvent', eventId],
    queryFn: () => (eventId ? base44.entities.Event.get(eventId) : Promise.resolve(null)),
    enabled: isAuthenticated && !!eventId,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch selected track details
  const { data: selectedTrack, isLoading: selectedTrackLoading } = useQuery({
    queryKey: ['selectedTrack', selectedEvent?.track_id],
    queryFn: () => (selectedEvent?.track_id ? base44.entities.Track.get(selectedEvent.track_id) : Promise.resolve(null)),
    enabled: isAuthenticated && !!selectedEvent?.track_id,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch selected series details
  const { data: selectedSeries, isLoading: selectedSeriesLoading } = useQuery({
    queryKey: ['selectedSeries', selectedEvent?.series_id],
    queryFn: () => (selectedEvent?.series_id ? base44.entities.Series.get(selectedEvent.series_id) : Promise.resolve(null)),
    enabled: isAuthenticated && !!selectedEvent?.series_id,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const filteredEvents = useMemo(() => {
    let filtered = [...events];

    if (organizationType === 'track' && organizationId) {
      filtered = filtered.filter((e) => e.track_id === organizationId);
    } else if (organizationType === 'series' && organizationId) {
      const selectedSeries = seriesList.find((s) => s.id === organizationId);
      if (selectedSeries) {
        filtered = filtered.filter(
          (e) => e.series_id === organizationId || e.series_name === selectedSeries.name
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
  }, [events, organizationType, organizationId, seasonYear, seriesList]);

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
      const series = seriesList.find((s) => s.id === organizationId);
      return series?.name || '';
    }
  }, [organizationType, organizationId, tracks, seriesList]);

  // Get permissions from shared access control module
  const dashboardPermissions = useMemo(() => 
    getPermissionsForRole(user?.role || 'public'), 
    [user?.role]
  );

  // Check if user has any accessible tabs
  const availableTabs = useMemo(() => {
    const tabKeys = ['overview', 'event_builder', 'classes_sessions', 'entries', 'compliance', 'checkin', 'tech', 'results', 'points_standings', 'exports', 'integrations', 'audit_log'];
    return tabKeys.filter(key => canTab(dashboardPermissions, key));
  }, [dashboardPermissions]);

  // Legacy compatibility
  const isAdmin = user?.role === 'admin';

  // Update URL params when state changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (organizationType) params.set('orgType', organizationType);
    if (organizationId) params.set('orgId', organizationId);
    if (seasonYear) params.set('seasonYear', seasonYear);
    if (eventId) params.set('eventId', eventId);
    setSearchParams(params, { replace: true });
  }, [organizationType, organizationId, seasonYear, eventId, setSearchParams]);

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

  // Live mode detection and auto-tab selection
  const isLiveMode = selectedEvent?.status === 'Live';

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

              {/* Event Selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 uppercase tracking-wide">Event</label>
                <Select value={eventId} onValueChange={setEventId}>
                  <SelectTrigger className="w-64 bg-[#262626] border-gray-700 text-white">
                    <SelectValue placeholder="Select event..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#262626] border-gray-700 max-h-80">
                    {filteredEvents.map((event) => (
                      <SelectItem key={event.id} value={event.id} className="text-white">
                        <div className="flex flex-col">
                          <span>{event.name}</span>
                          <span className="text-xs text-gray-400">
                            {event.event_date}
                            {event.round_number ? ` • Round ${event.round_number}` : ''}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
                {canAction(dashboardPermissions, 'import_csv') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowImportModal(true)}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                  >
                    <Upload className="w-4 h-4 mr-1" /> Import CSV
                  </Button>
                )}
                {canAction(dashboardPermissions, 'sync_timing') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSyncModal(true)}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" /> Sync Timing
                  </Button>
                )}
                {canAction(dashboardPermissions, 'publish_official') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePublishOfficial}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                  >
                    <Send className="w-4 h-4 mr-1" /> Publish
                  </Button>
                )}
                {canAction(dashboardPermissions, 'export') && (
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
            </div>
          </div>
        </div>

        {/* Main Content */}
         <div className="max-w-7xl mx-auto px-6 py-8">
           {/* Live Mode Badge */}
           {isLiveMode && (
             <div className="mb-6 bg-red-950/40 border border-red-800/50 rounded-lg p-4">
               <div className="flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                 <span className="text-sm font-semibold text-red-300">LIVE EVENT MODE</span>
               </div>
             </div>
           )}

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
                />
              )}

              {canTab(dashboardPermissions, 'event_builder') && activeTab === 'eventBuilder' && (
                <EventBuilderForm
                  dashboardContext={dashboardContext}
                  dashboardPermissions={dashboardPermissions}
                  selectedEventId={editingEventId}
                  onEventCreated={handleEventCreated}
                  isAdmin={isAdmin}
                  isLiveMode={isLiveMode}
                  onArchiveAttempt={() => setShowArchiveWarning(true)}
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
                selectedEvent ? (
                  <EntriesManager
                    dashboardContext={dashboardContext}
                    dashboardPermissions={dashboardPermissions}
                    selectedEvent={selectedEvent}
                    eventId={selectedEvent.id}
                    seriesId={organizationType === 'series' ? organizationId : selectedEvent.series_id}
                  />
                ) : (
                  <Card className="bg-[#171717] border-gray-800">
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-400">Select an event to manage entries</p>
                    </CardContent>
                  </Card>
                )
              )}

              {canTab(dashboardPermissions, 'compliance') && activeTab === 'compliance' && (
                selectedEvent ? (
                  <ComplianceManager 
                    dashboardContext={dashboardContext} 
                    dashboardPermissions={dashboardPermissions}
                    selectedEvent={selectedEvent}
                    onComplianceSeverityChange={setComplianceSeverity}
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
                <ResultsManager
                  dashboardContext={dashboardContext}
                  dashboardPermissions={dashboardPermissions}
                  selectedEvent={selectedEvent}
                  isAdmin={isAdmin}
                  standingsLastCalculatedAt={standingsLastCalculatedAt}
                  onSetStandingsDirty={() => setStandingsDirty(true)}
                />
              )}

              {canTab(dashboardPermissions, 'points_standings') && activeTab === 'pointsStandings' && (
                <PointsAndStandingsManager
                  dashboardContext={dashboardContext}
                  dashboardPermissions={dashboardPermissions}
                  isAdmin={isAdmin}
                  selectedEvent={selectedEvent}
                  standingsDirty={standingsDirty}
                  onClearDirty={() => setStandingsDirty(false)}
                  onStandingsCalculated={() => setStandingsLastCalculatedAt(new Date().toISOString())}
                />
              )}

              {canTab(dashboardPermissions, 'exports') && activeTab === 'exports' && (
                <ExportsManager 
                  dashboardContext={dashboardContext} 
                  dashboardPermissions={dashboardPermissions}
                  isAdmin={isAdmin} 
                />
              )}

              {canTab(dashboardPermissions, 'integrations') && activeTab === 'integrations' && (
                <IntegrationsManager 
                  dashboardContext={dashboardContext} 
                  dashboardPermissions={dashboardPermissions}
                  isAdmin={isAdmin} 
                />
              )}

              {canTab(dashboardPermissions, 'audit_log') && activeTab === 'auditLog' && (
                <AuditLogManager 
                  dashboardContext={dashboardContext} 
                  dashboardPermissions={dashboardPermissions}
                  isAdmin={isAdmin} 
                />
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

        {/* Import CSV Modal */}
        {showImportModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
            <Card className="bg-[#262626] border-gray-700 w-96">
              <CardHeader>
                <CardTitle className="text-white">Import CSV</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-400">CSV import functionality coming soon</p>
                <div className="flex justify-end">
                  <Button onClick={() => setShowImportModal(false)} className="bg-gray-700 hover:bg-gray-600">
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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