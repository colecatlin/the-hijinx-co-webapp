import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Printer, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AnnouncerPackManager({ selectedEvent, dashboardContext }) {
  const [announcerNotes, setAnnouncerNotes] = useState('');
  const [notesEdited, setNotesEdited] = useState(false);

  // Load event details
  const { data: eventDetails, isLoading: eventLoading } = useQuery({
    queryKey: ['racecore', 'announcer_pack', 'event', selectedEvent?.id],
    queryFn: () => (selectedEvent ? base44.entities.Event.get(selectedEvent.id) : Promise.resolve(null)),
    enabled: !!selectedEvent,
  });

  // Load sessions
  const { data: sessions = [] } = useQuery({
    queryKey: ['racecore', 'announcer_pack', 'sessions', selectedEvent?.id],
    queryFn: () =>
      selectedEvent
        ? base44.entities.Session.filter({ event_id: selectedEvent.id })
        : Promise.resolve([]),
    enabled: !!selectedEvent,
  });

  // Load entries
  const { data: entries = [] } = useQuery({
    queryKey: ['racecore', 'announcer_pack', 'entries', selectedEvent?.id],
    queryFn: () =>
      selectedEvent
        ? base44.entities.Entry.filter({ event_id: selectedEvent.id })
        : Promise.resolve([]),
    enabled: !!selectedEvent,
  });

  // Load results
  const { data: results = [] } = useQuery({
    queryKey: ['racecore', 'announcer_pack', 'results', selectedEvent?.id],
    queryFn: () =>
      selectedEvent
        ? base44.entities.Results.filter({ event_id: selectedEvent.id })
        : Promise.resolve([]),
    enabled: !!selectedEvent,
  });

  // Load drivers
  const { data: drivers = [] } = useQuery({
    queryKey: ['racecore', 'announcer_pack', 'drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  // Load teams
  const { data: teams = [] } = useQuery({
    queryKey: ['racecore', 'announcer_pack', 'teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  // Load classes
  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['racecore', 'announcer_pack', 'classes'],
    queryFn: () => base44.entities.SeriesClass.list(),
  });

  // Log mutation
  const logMutation = useMutation({
    mutationFn: (data) => base44.asServiceRole.entities.OperationLog.create(data),
  });

  // Build maps
  const driverMap = useMemo(() => new Map(drivers.map(d => [d.id, d])), [drivers]);
  const teamMap = useMemo(() => new Map(teams.map(t => [t.id, t])), [teams]);
  const classMap = useMemo(() => new Map(seriesClasses.map(c => [c.id, c])), [seriesClasses]);

  // Sort sessions
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      if (a.session_order !== b.session_order) return a.session_order - b.session_order;
      if (a.scheduled_time !== b.scheduled_time) {
        const aTime = a.scheduled_time ? new Date(a.scheduled_time).getTime() : 0;
        const bTime = b.scheduled_time ? new Date(b.scheduled_time).getTime() : 0;
        return aTime - bTime;
      }
      return 0;
    });
  }, [sessions]);

  // Build rosters by class
  const rostersByClass = useMemo(() => {
    const grouped = {};
    entries.forEach(entry => {
      const classKey = entry.series_class_id || 'unassigned';
      if (!grouped[classKey]) grouped[classKey] = [];
      grouped[classKey].push(entry);
    });

    // Sort each class by car number
    Object.keys(grouped).forEach(classKey => {
      grouped[classKey].sort((a, b) => {
        const aNum = parseInt(a.car_number || '0') || 0;
        const bNum = parseInt(b.car_number || '0') || 0;
        return aNum - bNum;
      });
    });

    return grouped;
  }, [entries]);

  // Build top 3 results per session
  const topResultsBySession = useMemo(() => {
    const bySession = {};
    results.forEach(result => {
      if (!bySession[result.session_id]) bySession[result.session_id] = [];
      bySession[result.session_id].push(result);
    });

    // Sort and get top 3 per session
    Object.keys(bySession).forEach(sessionId => {
      bySession[sessionId]
        .sort((a, b) => (a.position_finish || 999) - (b.position_finish || 999))
        .splice(3);
    });

    return bySession;
  }, [results]);

  // Handle notes save
  const handleSaveNotes = async () => {
    try {
      await logMutation.mutateAsync({
        operation_type: 'announcer_pack_notes_saved',
        entity_name: 'Event',
        entity_id: selectedEvent.id,
        status: 'success',
        metadata: {
          event_id: selectedEvent.id,
          note_length: announcerNotes.length,
        },
      });
      setNotesEdited(false);
      toast.success('Notes saved');
    } catch (error) {
      toast.error('Failed to save notes');
      console.error(error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
          <p className="text-gray-400">Select an event to generate announcer pack</p>
        </CardContent>
      </Card>
    );
  }

  if (eventLoading) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <p className="text-gray-400">Loading event data...</p>
        </CardContent>
      </Card>
    );
  }

  const track = dashboardContext && selectedEvent ? 'Track Name' : 'Unknown Track';
  const series = selectedEvent?.series_name || 'Unknown Series';
  const eventDate = selectedEvent?.event_date
    ? new Date(selectedEvent.event_date).toLocaleDateString()
    : 'TBA';
  const endDate = selectedEvent?.end_date
    ? new Date(selectedEvent.end_date).toLocaleDateString()
    : null;

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">{selectedEvent?.name || 'Event'}</CardTitle>
              <p className="text-sm text-gray-400 mt-1">Announcer Pack Generator</p>
            </div>
            <Button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 gap-2"
            >
              <Printer className="w-4 h-4" /> Print
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Announcer Pack Container */}
      <div id="announcer-pack" className="space-y-6">
        {/* Section 1: Event Overview */}
        <Card className="bg-[#171717] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Event Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Event</p>
                <p className="text-sm font-semibold text-white">{selectedEvent?.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Track</p>
                <p className="text-sm font-semibold text-white">{track}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Series</p>
                <p className="text-sm font-semibold text-white">{series}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Date</p>
                <p className="text-sm font-semibold text-white">
                  {eventDate}
                  {endDate && ` – ${endDate}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Session Schedule */}
        <Card className="bg-[#171717] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Session Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {sortedSessions.length === 0 ? (
              <p className="text-gray-400 text-sm">No sessions</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      <TableHead className="text-gray-400">Order</TableHead>
                      <TableHead className="text-gray-400">Class</TableHead>
                      <TableHead className="text-gray-400">Session</TableHead>
                      <TableHead className="text-gray-400">Type</TableHead>
                      <TableHead className="text-gray-400">Scheduled Time</TableHead>
                      <TableHead className="text-gray-400">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedSessions.map(session => {
                      const classObj = classMap.get(session.series_class_id);
                      const scheduledTime = session.scheduled_time
                        ? new Date(session.scheduled_time).toLocaleTimeString()
                        : 'TBA';

                      return (
                        <TableRow key={session.id} className="border-gray-800">
                          <TableCell className="text-white text-sm">
                            {session.session_order || '-'}
                          </TableCell>
                          <TableCell className="text-gray-400 text-sm">
                            {classObj?.name || session.class_name || '-'}
                          </TableCell>
                          <TableCell className="text-white text-sm font-semibold">
                            {session.name}
                          </TableCell>
                          <TableCell className="text-gray-400 text-sm">
                            {session.session_type || '-'}
                          </TableCell>
                          <TableCell className="text-gray-400 text-sm">{scheduledTime}</TableCell>
                          <TableCell className="text-white text-sm">
                            {session.status || 'Draft'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Driver Rosters by Class */}
        {Object.entries(rostersByClass).map(([classKey, classEntries]) => {
          const classObj = classMap.get(classKey);
          const classLabel = classObj?.name || (classKey === 'unassigned' ? 'Unassigned' : classKey);

          return (
            <Card key={classKey} className="bg-[#171717] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">{classLabel} Roster</CardTitle>
              </CardHeader>
              <CardContent>
                {classEntries.length === 0 ? (
                  <p className="text-gray-400 text-sm">No entries</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-700">
                          <TableHead className="text-gray-400">Car #</TableHead>
                          <TableHead className="text-gray-400">Driver</TableHead>
                          <TableHead className="text-gray-400">Team</TableHead>
                          <TableHead className="text-gray-400">Hometown</TableHead>
                          <TableHead className="text-gray-400">Manufacturer</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classEntries.map(entry => {
                          const driver = driverMap.get(entry.driver_id);
                          const team = teamMap.get(entry.team_id);

                          return (
                            <TableRow key={entry.id} className="border-gray-800">
                              <TableCell className="text-white text-sm font-semibold">
                                {entry.car_number}
                              </TableCell>
                              <TableCell className="text-white text-sm">
                                {driver ? `${driver.first_name} ${driver.last_name}` : '-'}
                              </TableCell>
                              <TableCell className="text-gray-400 text-sm">
                                {team?.name || '-'}
                              </TableCell>
                              <TableCell className="text-gray-400 text-sm">
                                {driver?.hometown_city || '-'}
                              </TableCell>
                              <TableCell className="text-gray-400 text-sm">
                                {driver?.manufacturer || '-'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* Section 4: Latest Results Highlights */}
        {sortedSessions.some(s => topResultsBySession[s.id]?.length > 0) && (
          <Card className="bg-[#171717] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Latest Results Highlights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {sortedSessions
                .filter(s => topResultsBySession[s.id]?.length > 0)
                .map(session => {
                  const classObj = classMap.get(session.series_class_id);
                  const classLabel = classObj?.name || session.class_name || 'Unknown';
                  const sessionResults = topResultsBySession[session.id] || [];

                  return (
                    <div key={session.id}>
                      <h4 className="text-sm font-semibold text-white mb-3">
                        {session.name} - {classLabel}
                      </h4>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-gray-700">
                              <TableHead className="text-gray-400">Position</TableHead>
                              <TableHead className="text-gray-400">Driver</TableHead>
                              <TableHead className="text-gray-400">Car #</TableHead>
                              <TableHead className="text-gray-400">Team</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sessionResults.map((result, idx) => {
                              const driver = driverMap.get(result.driver_id);
                              const team = teamMap.get(result.team_id);
                              const entry = entries.find(
                                e => e.driver_id === result.driver_id && e.event_id === selectedEvent.id
                              );

                              return (
                                <TableRow key={result.id} className="border-gray-800">
                                  <TableCell className="text-white text-sm font-semibold">
                                    {idx + 1}
                                  </TableCell>
                                  <TableCell className="text-white text-sm">
                                    {driver ? `${driver.first_name} ${driver.last_name}` : '-'}
                                  </TableCell>
                                  <TableCell className="text-gray-400 text-sm">
                                    {entry?.car_number || '-'}
                                  </TableCell>
                                  <TableCell className="text-gray-400 text-sm">
                                    {team?.name || '-'}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        )}

        {/* Section 5: Announcer Notes */}
        <Card className="bg-[#171717] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Announcer Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Add announcer notes, talking points, or special announcements..."
              value={announcerNotes}
              onChange={(e) => {
                setAnnouncerNotes(e.target.value);
                setNotesEdited(true);
              }}
              className="bg-gray-900 border-gray-700 text-white h-32"
            />
            {notesEdited && (
              <Button
                onClick={handleSaveNotes}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Save Notes
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white;
            color: black;
          }
          
          #announcer-pack {
            background: white;
            color: black;
          }
          
          .hidden-print {
            display: none !important;
          }
          
          .bg-\\[\\#171717\\],
          .bg-\\[\\#262626\\],
          .border-gray-800,
          .border-gray-700 {
            background: white !important;
            border-color: black !important;
          }
          
          .text-white,
          .text-gray-400 {
            color: black !important;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
          }
          
          th,
          td {
            border: 1px solid black;
            padding: 8px;
            text-align: left;
          }
          
          .print-page-break {
            page-break-after: always;
          }
        }
      `}</style>
    </div>
  );
}