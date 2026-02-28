import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Copy, Archive, Eye, Search } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ManageRaceControlEvents() {
  const queryClient = useQueryClient();
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedTrack, setSelectedTrack] = useState('');
  const [selectedSeries, setSelectedSeries] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch tracks and series for selectors
  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.list(),
  });

  const { data: series = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
  });

  // Fetch RaceControl events
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['raceControlEvents', selectedOrg, selectedTrack, selectedSeries, selectedSeason, searchQuery],
    queryFn: async () => {
      let allEvents = await base44.entities.RaceControlEvent.list();

      // Filter by organization type
      if (selectedOrg === 'track' && selectedTrack) {
        allEvents = allEvents.filter(e => e.track_id === selectedTrack);
      } else if (selectedOrg === 'series' && selectedSeries) {
        allEvents = allEvents.filter(e => e.series_id === selectedSeries);
      }

      // Filter by season
      if (selectedSeason) {
        allEvents = allEvents.filter(e => e.season_year === selectedSeason);
      }

      // Filter by search query
      if (searchQuery) {
        allEvents = allEvents.filter(e =>
          e.event_name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      return allEvents;
    },
  });

  // Fetch entry counts for each event
  const { data: entryCounts = {} } = useQuery({
    queryKey: ['entryCountsForEvents', events.map(e => e.id).join(',')],
    queryFn: async () => {
      const counts = {};
      for (const event of events) {
        const entries = await base44.entities.RaceControlEntry.filter(
          { racecontrolevent_id: event.id }
        );
        counts[event.id] = entries.length;
      }
      return counts;
    },
    enabled: events.length > 0,
  });

  // Fetch session counts for each event
  const { data: sessionCounts = {} } = useQuery({
    queryKey: ['sessionCountsForEvents', events.map(e => e.id).join(',')],
    queryFn: async () => {
      const counts = {};
      for (const event of events) {
        const sessions = await base44.entities.RaceControlSession.filter(
          { racecontrolevent_id: event.id }
        );
        counts[event.id] = sessions.length;
      }
      return counts;
    },
    enabled: events.length > 0,
  });

  // Archive event mutation
  const archiveEventMutation = useMutation({
    mutationFn: (eventId) =>
      base44.entities.RaceControlEvent.update(eventId, { status: 'archived' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raceControlEvents'] });
    },
  });

  // Duplicate event mutation
  const duplicateEventMutation = useMutation({
    mutationFn: async (eventId) => {
      const originalEvent = await base44.entities.RaceControlEvent.get(eventId);
      const newEvent = await base44.entities.RaceControlEvent.create({
        event_name: `${originalEvent.event_name} (Copy)`,
        track_id: originalEvent.track_id,
        series_id: originalEvent.series_id,
        season_year: originalEvent.season_year,
        start_date: originalEvent.start_date,
        end_date: originalEvent.end_date,
        status: 'draft',
        description: originalEvent.description,
      });

      // Copy sessions
      const sessions = await base44.entities.RaceControlSession.filter(
        { racecontrolevent_id: eventId }
      );
      for (const session of sessions) {
        await base44.entities.RaceControlSession.create({
          racecontrolevent_id: newEvent.id,
          session_name: session.session_name,
          session_type: session.session_type,
          scheduled_time: session.scheduled_time,
          laps: session.laps,
          status: 'scheduled',
        });
      }

      return newEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raceControlEvents'] });
    },
  });

  const getTrackName = (trackId) => {
    const track = tracks.find(t => t.id === trackId);
    return track?.name || '—';
  };

  const getSeriesName = (seriesId) => {
    const serie = series.find(s => s.id === seriesId);
    return serie?.name || '—';
  };

  return (
    <PageShell>
      <div className="bg-white min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-black mb-2">RaceControl Events</h1>
            <p className="text-gray-600">Manage race events, entries, and sessions</p>
          </div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-50 rounded-lg p-6 mb-8 border border-gray-200"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">Organization</label>
                <Select value={selectedOrg} onValueChange={(value) => {
                  setSelectedOrg(value);
                  setSelectedTrack('');
                  setSelectedSeries('');
                }}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>All</SelectItem>
                    <SelectItem value="track">Track</SelectItem>
                    <SelectItem value="series">Series</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedOrg === 'track' && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-2 block">Track</label>
                  <Select value={selectedTrack} onValueChange={setSelectedTrack}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select track" />
                    </SelectTrigger>
                    <SelectContent>
                      {tracks.map(track => (
                        <SelectItem key={track.id} value={track.id}>{track.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedOrg === 'series' && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-2 block">Series</label>
                  <Select value={selectedSeries} onValueChange={setSelectedSeries}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select series" />
                    </SelectTrigger>
                    <SelectContent>
                      {series.map(serie => (
                        <SelectItem key={serie.id} value={serie.id}>{serie.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">Season</label>
                <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>All</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <div className="w-full relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search event name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Event
            </Button>
          </motion.div>

          {/* Events Table */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Events</CardTitle>
                <CardDescription>{events.length} event{events.length !== 1 ? 's' : ''}</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading events...</div>
                ) : events.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No events found</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Event Name</TableHead>
                          <TableHead>Track</TableHead>
                          <TableHead>Series</TableHead>
                          <TableHead>Season</TableHead>
                          <TableHead>Start Date</TableHead>
                          <TableHead>End Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-center">Entries</TableHead>
                          <TableHead className="text-center">Sessions</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {events.map(event => (
                          <TableRow key={event.id}>
                            <TableCell className="font-medium">{event.event_name}</TableCell>
                            <TableCell>{getTrackName(event.track_id)}</TableCell>
                            <TableCell>{getSeriesName(event.series_id)}</TableCell>
                            <TableCell>{event.season_year || '—'}</TableCell>
                            <TableCell>{event.start_date || '—'}</TableCell>
                            <TableCell>{event.end_date || '—'}</TableCell>
                            <TableCell>
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                event.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                                event.status === 'published' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">{entryCounts[event.id] || 0}</TableCell>
                            <TableCell className="text-center">{sessionCounts[event.id] || 0}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1"
                                >
                                  <Edit className="w-4 h-4" />
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => duplicateEventMutation.mutate(event.id)}
                                >
                                  <Copy className="w-4 h-4" />
                                  Duplicate
                                </Button>
                                {event.status !== 'archived' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-1"
                                    onClick={() => archiveEventMutation.mutate(event.id)}
                                  >
                                    <Archive className="w-4 h-4" />
                                    Archive
                                  </Button>
                                )}
                                {event.status === 'published' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-1"
                                  >
                                    <Eye className="w-4 h-4" />
                                    View
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </PageShell>
  );
}