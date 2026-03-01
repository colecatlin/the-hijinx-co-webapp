import React, { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import BurnoutSpinner from '@/components/shared/BurnoutSpinner';
import EventBuilderForm from '@/components/management/EventBuilder/EventBuilderForm';
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
  const [organizationType, setOrganizationType] = useState('track');
  const [organizationId, setOrganizationId] = useState('');
  const [seasonYear, setSeasonYear] = useState('');
  const [eventId, setEventId] = useState('');
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

  const isAdmin = user?.role === 'admin';

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
                  className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white disabled:opacity-50"
                >
                  <Upload className="w-4 h-4 mr-1" /> Import CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!isAdmin}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4 mr-1" /> Sync Timing
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!isAdmin}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white disabled:opacity-50"
                >
                  <Send className="w-4 h-4 mr-1" /> Publish
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!isAdmin}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="bg-[#171717] border-gray-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Event Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">
                      {selectedEvent?.status || 'No Event'}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedEvent ? `Scheduled for ${selectedEvent.event_date}` : 'Select an event above'}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-[#171717] border-gray-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                      <Users className="w-4 h-4" /> Entries Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">0</div>
                    <p className="text-xs text-gray-500 mt-1">Registered entries</p>
                  </CardContent>
                </Card>

                <Card className="bg-[#171717] border-gray-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> Compliance Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-500">0</div>
                    <p className="text-xs text-gray-500 mt-1">Pending issues</p>
                  </CardContent>
                </Card>

                <Card className="bg-[#171717] border-gray-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                      <Flag className="w-4 h-4" /> Results Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-500">Pending</div>
                    <p className="text-xs text-gray-500 mt-1">Awaiting official results</p>
                  </CardContent>
                </Card>

                <Card className="bg-[#171717] border-gray-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                      <Trophy className="w-4 h-4" /> Standings Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-500">Not Calculated</div>
                    <p className="text-xs text-gray-500 mt-1">Points pending</p>
                  </CardContent>
                </Card>

                <Card className="bg-[#171717] border-gray-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> System Alerts Feed
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-500">No Alerts</div>
                    <p className="text-xs text-gray-500 mt-1">All systems operational</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Event Builder Tab Content */}
            <TabsContent value="eventBuilder" className="mt-6">
              <EventBuilderForm
                selectedEventId={editingEventId}
                onEventCreated={handleEventCreated}
                isAdmin={isAdmin}
              />
            </TabsContent>

            {/* Other Tab Contents */}
            {['classesSessions', 'entries', 'checkIn', 'tech', 'results', 'pointsStandings', 'exports', 'integrations', 'auditLog'].map((tab) => (
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
      </div>
    </PageShell>
  );
}