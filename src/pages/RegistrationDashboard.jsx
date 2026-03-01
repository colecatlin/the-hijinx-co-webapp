import React, { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import PageShell from '@/components/shared/PageShell';
import BurnoutSpinner from '@/components/shared/BurnoutSpinner';
import EventBuilderForm from '@/components/management/EventBuilder/EventBuilderForm';
import OverviewGrid from '@/components/registrationdashboard/OverviewGrid';
import ClassSessionBuilder from '@/components/registrationdashboard/ClassSessionBuilder';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

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
  });

  const { data: seriesList = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
    enabled: isAuthenticated,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list(),
    enabled: isAuthenticated,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', eventId],
    queryFn: () => (eventId ? base44.entities.Session.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: isAuthenticated && !!eventId,
  });

  const { data: standings = [] } = useQuery({
    queryKey: ['standings', organizationId, seasonYear],
    queryFn: () => {
      if (organizationType !== 'series' || !organizationId) return Promise.resolve([]);
      return base44.entities.Standings.filter({ series_id: organizationId, season: seasonYear });
    },
    enabled: isAuthenticated && organizationType === 'series' && !!organizationId,
  });

  const { data: results = [] } = useQuery({
    queryKey: ['results', eventId],
    queryFn: () => (eventId ? base44.entities.Results.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: isAuthenticated && !!eventId,
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

  const selectedEvent = useMemo(() => {
    return events.find((e) => e.id === eventId);
  }, [events, eventId]);

  const selectedTrack = useMemo(() => {
    if (organizationType === 'track' && organizationId) {
      return tracks.find((t) => t.id === organizationId);
    }
    if (selectedEvent?.track_id) {
      return tracks.find((t) => t.id === selectedEvent.track_id);
    }
    return null;
  }, [organizationType, organizationId, selectedEvent, tracks]);

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

  if (authLoading || userLoading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center min-h-screen">
          <BurnoutSpinner />
        </div>
      </PageShell>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <PageShell>
      <div className="min-h-screen bg-[#0A0A0A]">
        {/* Sticky Top Summary Bar */}
        <div className="sticky top-0 z-50 bg-[#171717] border-b border-gray-800 px-6 py-4">
          <div className="max-w-7xl mx-auto">
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
                {!isAdmin && (
                  <span className="text-xs text-amber-500 flex items-center gap-1 mr-2">
                    <Shield className="w-3 h-3" /> Admin access required for actions
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!isAdmin}
                  onClick={handleCreateEvent}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 mr-1" /> Create Event
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!isAdmin}
                  onClick={() => setShowImportModal(true)}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white disabled:opacity-50"
                >
                  <Upload className="w-4 h-4 mr-1" /> Import CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!isAdmin}
                  onClick={() => setShowSyncModal(true)}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4 mr-1" /> Sync Timing
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!isAdmin}
                  onClick={handlePublishOfficial}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white disabled:opacity-50"
                >
                  <Send className="w-4 h-4 mr-1" /> Publish
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!isAdmin}
                  onClick={() => setShowExportModal(true)}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white disabled:opacity-50"
                >
                  <Download className="w-4 h-4 mr-1" /> Export
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-black text-white mb-2">Index46 Operations</h1>
            <p className="text-gray-400">
              {selectedOrgName && <span className="text-white">{selectedOrgName}</span>}
              {selectedEvent && (
                <span> • {selectedEvent.name} {selectedEvent.round_number ? `(Round ${selectedEvent.round_number})` : ''}</span>
              )}
              {!selectedOrgName && !selectedEvent && 'Configure your organization above to begin'}
            </p>
          </motion.div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-[#171717] border border-gray-800 p-1 h-auto flex flex-wrap gap-1">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 px-4 py-2"
              >
                <LayoutDashboard className="w-4 h-4 mr-2" /> Overview
              </TabsTrigger>
              <TabsTrigger
                value="eventBuilder"
                className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 px-4 py-2"
              >
                <Plus className="w-4 h-4 mr-2" /> Event Builder
              </TabsTrigger>
              <TabsTrigger
                value="classesSessions"
                className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 px-4 py-2"
              >
                <ClipboardCheck className="w-4 h-4 mr-2" /> Classes & Sessions
              </TabsTrigger>
              <TabsTrigger
                value="entries"
                className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 px-4 py-2"
              >
                <Users className="w-4 h-4 mr-2" /> Entries
              </TabsTrigger>
              <TabsTrigger
                value="checkIn"
                className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 px-4 py-2"
              >
                <Car className="w-4 h-4 mr-2" /> Check In
              </TabsTrigger>
              <TabsTrigger
                value="tech"
                className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 px-4 py-2"
              >
                <Wrench className="w-4 h-4 mr-2" /> Tech
              </TabsTrigger>
              <TabsTrigger
                value="results"
                className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 px-4 py-2"
              >
                <Flag className="w-4 h-4 mr-2" /> Results
              </TabsTrigger>
              <TabsTrigger
                value="pointsStandings"
                className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 px-4 py-2"
              >
                <Trophy className="w-4 h-4 mr-2" /> Points & Standings
              </TabsTrigger>
              <TabsTrigger
                value="exports"
                className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 px-4 py-2"
              >
                <FileText className="w-4 h-4 mr-2" /> Exports
              </TabsTrigger>
              <TabsTrigger
                value="integrations"
                className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 px-4 py-2"
              >
                <Plug className="w-4 h-4 mr-2" /> Integrations
              </TabsTrigger>
              <TabsTrigger
                value="auditLog"
                className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 px-4 py-2"
              >
                <History className="w-4 h-4 mr-2" /> Audit Log
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab Content */}
            <TabsContent value="overview" className="mt-6">
              <OverviewGrid
                selectedEvent={selectedEvent}
                selectedTrack={selectedTrack}
                sessions={sessions}
                standings={standings}
                results={results}
                operationLogs={operationLogs}
                importLogs={importLogs}
              />
            </TabsContent>

            {/* Event Builder Tab Content */}
            <TabsContent value="eventBuilder" className="mt-6">
              <EventBuilderForm
                selectedEventId={editingEventId}
                onEventCreated={handleEventCreated}
                isAdmin={isAdmin}
              />
            </TabsContent>

            {/* Classes & Sessions Tab Content */}
            <TabsContent value="classesSessions" className="mt-6">
              <ClassSessionBuilder eventId={eventId} seriesId={selectedEvent?.series_id} />
            </TabsContent>

            {/* Other Tab Contents */}
            {['entries', 'checkIn', 'tech', 'results', 'pointsStandings', 'exports', 'integrations', 'auditLog'].map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-6">
                <Card className="bg-[#171717] border-gray-800">
                  <CardContent className="py-12 text-center">
                    <p className="text-gray-400 text-lg">
                      This module will be built in the next step.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
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