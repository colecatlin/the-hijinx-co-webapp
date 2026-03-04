import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import { Printer, MapPin, Trophy, BookOpen } from 'lucide-react';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { toast } from 'sonner';

const DQ = applyDefaultQueryOptions();

export default function AnnouncerManager({
  selectedEvent,
  selectedTrack,
  selectedSeries,
  dashboardContext,
  dashboardPermissions,
}) {
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [noteText, setNoteText] = useState('');
  const [showPackView, setShowPackView] = useState(false);

  // Load sessions
  const { data: sessions = [] } = useQuery({
    queryKey: ['racecore', 'announcer', 'sessions', selectedEvent?.id],
    queryFn: () => (selectedEvent?.id 
      ? base44.entities.Session.filter({ event_id: selectedEvent.id })
      : Promise.resolve([])),
    enabled: !!selectedEvent?.id,
    ...DQ,
  });

  // Load results
  const { data: results = [] } = useQuery({
    queryKey: ['racecore', 'announcer', 'results', selectedEvent?.id],
    queryFn: () => (selectedEvent?.id 
      ? base44.entities.Results.filter({ event_id: selectedEvent.id })
      : Promise.resolve([])),
    enabled: !!selectedEvent?.id,
    ...DQ,
  });

  // Load driver programs
  const { data: programs = [] } = useQuery({
    queryKey: ['racecore', 'announcer', 'programs', selectedEvent?.id],
    queryFn: () => (selectedEvent?.id 
      ? base44.entities.DriverProgram.filter({ event_id: selectedEvent.id })
      : Promise.resolve([])),
    enabled: !!selectedEvent?.id,
    ...DQ,
  });

  // Load drivers
  const { data: drivers = [] } = useQuery({
    queryKey: ['racecore', 'announcer', 'drivers', programs.map(p => p.driver_id).join(',')],
    queryFn: async () => {
      if (programs.length === 0) return [];
      const driverIds = [...new Set(programs.map(p => p.driver_id).filter(Boolean))];
      const driverList = await Promise.all(
        driverIds.map(id => base44.entities.Driver.get(id).catch(() => null))
      );
      return driverList.filter(Boolean);
    },
    enabled: programs.length > 0,
    ...DQ,
  });

  // Load teams
  const { data: teams = [] } = useQuery({
    queryKey: ['racecore', 'announcer', 'teams', programs.map(p => p.team_id).filter(Boolean).join(',')],
    queryFn: async () => {
      if (programs.length === 0) return [];
      const teamIds = [...new Set(programs.map(p => p.team_id).filter(Boolean))];
      const teamList = await Promise.all(
        teamIds.map(id => base44.entities.Team.get(id).catch(() => null))
      );
      return teamList.filter(Boolean);
    },
    enabled: programs.length > 0,
    ...DQ,
  });

  // Load announcer notes
  const { data: notes = [] } = useQuery({
    queryKey: ['racecore', 'announcer', 'notes', selectedEvent?.id],
    queryFn: () => (selectedEvent?.id 
      ? base44.entities.OperationLog.filter(
          { event_id: selectedEvent.id, operation_type: 'announcer_note' },
          '-created_date',
          50
        )
      : Promise.resolve([])),
    enabled: !!selectedEvent?.id,
    ...DQ,
  });

  // Create operation log mutation
  const createOpLogMutation = useMutation({
    mutationFn: (data) => base44.entities.OperationLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['racecore', 'announcer', 'notes'] });
      setNoteText('');
      toast.success('Note saved');
    },
  });

  // Build lookup maps
  const driverMap = useMemo(() => {
    const map = new Map();
    drivers.forEach(d => map.set(d.id, d));
    return map;
  }, [drivers]);

  const teamMap = useMemo(() => {
    const map = new Map();
    teams.forEach(t => map.set(t.id, t));
    return map;
  }, [teams]);

  // Build class list
  const classList = useMemo(() => {
    const classes = new Set();
    programs.forEach(p => {
      if (p.series_class_id) classes.add(p.series_class_id);
    });
    sessions.forEach(s => {
      if (s.series_class_id) classes.add(s.series_class_id);
    });
    return Array.from(classes).sort();
  }, [programs, sessions]);

  // Auto-select first session and class
  if (!selectedSessionId && sessions.length > 0) {
    setSelectedSessionId(sessions[0].id);
  }
  if (!selectedClassId && classList.length > 0) {
    setSelectedClassId(classList[0]);
  }

  // Get programs for selected class
  const classPrograms = useMemo(() => {
    if (!selectedClassId) return [];
    return programs
      .filter(p => p.series_class_id === selectedClassId)
      .sort((a, b) => {
        const numA = parseInt(a.car_number) || 0;
        const numB = parseInt(b.car_number) || 0;
        return numA - numB;
      });
  }, [programs, selectedClassId]);

  // Get top 3 for selected class and session
  const top3 = useMemo(() => {
    if (!selectedSessionId || !selectedClassId) return [];
    const sessionResults = results
      .filter(r => r.session_id === selectedSessionId)
      .filter(r => {
        // Try to match by program
        const prog = programs.find(p => {
          const entry = classPrograms.find(cp => cp.driver_id === r.driver_id);
          return entry?.id === p.id;
        });
        return !!prog;
      })
      .sort((a, b) => a.position - b.position)
      .slice(0, 3);

    return sessionResults.map(r => {
      const program = classPrograms.find(p => p.driver_id === r.driver_id);
      const driver = program ? driverMap.get(program.driver_id) : null;
      const team = program ? teamMap.get(program.team_id) : null;
      return { ...r, program, driver, team };
    });
  }, [selectedSessionId, selectedClassId, results, programs, classPrograms, driverMap, teamMap]);

  // Get latest note for selected class
  const classNote = useMemo(() => {
    return notes.find(log => {
      try {
        const meta = JSON.parse(log.metadata || '{}');
        return meta.series_class_id === selectedClassId;
      } catch {
        return false;
      }
    });
  }, [notes, selectedClassId]);

  // Handle save note
  const handleSaveNote = async () => {
    if (!noteText.trim()) {
      toast.error('Note cannot be empty');
      return;
    }

    try {
      await createOpLogMutation.mutateAsync({
        event_id: selectedEvent.id,
        operation_type: 'announcer_note',
        source_type: 'announcer_manager',
        entity_name: 'Event',
        entity_id: selectedEvent.id,
        status: 'success',
        metadata: JSON.stringify({
          event_id: selectedEvent.id,
          series_class_id: selectedClassId,
          session_id: selectedSessionId || null,
          note: noteText,
        }),
        notes: `Announcer note for ${selectedClassId}`,
      });
    } catch (error) {
      toast.error('Failed to save note');
    }
  };

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <p className="text-gray-400">Select an event to access Announcer</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {showPackView ? (
        // ANNOUNCER PACK VIEW
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Announcer Pack</h2>
            <div className="flex gap-2">
              <Button
                onClick={() => window.print()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
              >
                <Printer className="w-4 h-4" /> Print
              </Button>
              <Button
                onClick={() => setShowPackView(false)}
                variant="outline"
                className="border-gray-700 text-white"
              >
                Back
              </Button>
            </div>
          </div>

          {/* Pack content */}
          <div className="bg-white text-black p-8 rounded-lg space-y-8 print:p-0 print:bg-white">
            {/* Header */}
            <div>
              <h1 className="text-4xl font-bold mb-2">{selectedEvent.name}</h1>
              {selectedTrack && <p className="text-lg text-gray-600">{selectedTrack.name}</p>}
              {selectedEvent.event_date && (
                <p className="text-sm text-gray-600">{new Date(selectedEvent.event_date).toLocaleDateString()}</p>
              )}
            </div>

            <Separator />

            {/* Sessions list */}
            <div>
              <h2 className="text-2xl font-bold mb-3">Schedule</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Session</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s.id} className="border-b">
                      <td className="p-2 font-semibold">{s.name}</td>
                      <td className="p-2">{s.session_type}</td>
                      <td className="p-2">{s.scheduled_time ? new Date(s.scheduled_time).toLocaleTimeString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* By class */}
            {classList.map(classId => {
              const classProgs = programs.filter(p => p.series_class_id === classId).sort((a, b) => {
                const numA = parseInt(a.car_number) || 0;
                const numB = parseInt(b.car_number) || 0;
                return numA - numB;
              });

              const classResults = results.filter(r => {
                const prog = classProgs.find(cp => cp.driver_id === r.driver_id);
                return !!prog;
              }).sort((a, b) => a.position - b.position).slice(0, 3);

              const classNote = notes.find(log => {
                try {
                  return JSON.parse(log.metadata || '{}').series_class_id === classId;
                } catch {
                  return false;
                }
              });

              return (
                <div key={classId} className="break-after-page">
                  <h2 className="text-2xl font-bold mb-3">{classId}</h2>

                  {/* Roster */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Roster</h3>
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Car</th>
                          <th className="text-left p-2">Driver</th>
                          <th className="text-left p-2">Team</th>
                          <th className="text-left p-2">Hometown</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classProgs.map(prog => {
                          const driver = driverMap.get(prog.driver_id);
                          const team = teamMap.get(prog.team_id);
                          return (
                            <tr key={prog.id} className="border-b">
                              <td className="p-2 font-semibold">#{prog.car_number}</td>
                              <td className="p-2">{driver?.first_name} {driver?.last_name}</td>
                              <td className="p-2">{team?.name || '-'}</td>
                              <td className="p-2 text-xs">{driver?.hometown_city}, {driver?.hometown_state}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Top 3 */}
                  {classResults.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-2">Top 3</h3>
                      <table className="w-full text-sm border-collapse">
                        <tbody>
                          {classResults.map((result, idx) => {
                            const prog = classProgs.find(p => p.driver_id === result.driver_id);
                            const driver = prog ? driverMap.get(prog.driver_id) : null;
                            return (
                              <tr key={idx} className="border-b">
                                <td className="p-2 font-bold">{result.position}</td>
                                <td className="p-2">{driver?.first_name} {driver?.last_name}</td>
                                <td className="p-2 text-xs">{result.race_time || '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Note */}
                  {classNote && (
                    <div className="bg-gray-100 p-3 rounded text-sm italic">
                      {(() => {
                        try {
                          return JSON.parse(classNote.metadata || '{}').note;
                        } catch {
                          return classNote.notes;
                        }
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // MAIN ANNOUNCER VIEW
        <div className="space-y-6">
          {/* Header */}
          <Card className="bg-[#171717] border-gray-800">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-white text-lg">{selectedEvent.name}</CardTitle>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    {selectedTrack && <span>{selectedTrack.name}</span>}
                    {selectedEvent.event_date && <span>{new Date(selectedEvent.event_date).toLocaleDateString()}</span>}
                  </div>
                </div>
                <Button
                  onClick={() => setShowPackView(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                >
                  <BookOpen className="w-4 h-4" /> Announcer Pack
                </Button>
              </div>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left: Session & Class selectors */}
            <Card className="bg-[#171717] border-gray-800 lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-white text-sm">Control</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-2">Session</label>
                  <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                    <SelectTrigger className="bg-gray-900 border-gray-800 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-800">
                      {sessions.sort((a, b) => (a.session_order || 0) - (b.session_order || 0)).map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-2">Class</label>
                  <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                    <SelectTrigger className="bg-gray-900 border-gray-800 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-800">
                      {classList.map(cls => (
                        <SelectItem key={cls} value={cls}>
                          {cls}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Middle: Roster */}
            <Card className="bg-[#171717] border-gray-800 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-white text-sm">Roster - {selectedClassId}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-900/30">
                      <TableRow>
                        <TableHead className="text-gray-400 text-xs">Car</TableHead>
                        <TableHead className="text-gray-400 text-xs">Driver</TableHead>
                        <TableHead className="text-gray-400 text-xs">Team</TableHead>
                        <TableHead className="text-gray-400 text-xs">Hometown</TableHead>
                        <TableHead className="text-gray-400 text-xs">Discipline</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classPrograms.map(prog => {
                        const driver = driverMap.get(prog.driver_id);
                        const team = teamMap.get(prog.team_id);
                        return (
                          <TableRow key={prog.id} className="border-gray-800">
                            <TableCell className="text-sm font-semibold text-white">#{prog.car_number}</TableCell>
                            <TableCell className="text-sm text-white">{driver?.first_name} {driver?.last_name}</TableCell>
                            <TableCell className="text-xs text-gray-400">{team?.name || '-'}</TableCell>
                            <TableCell className="text-xs text-gray-400">
                              {driver?.hometown_city}, {driver?.hometown_state}
                            </TableCell>
                            <TableCell className="text-xs text-gray-400">{driver?.primary_discipline || '-'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Right: Highlights & Notes */}
            <Card className="bg-[#171717] border-gray-800 lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Trophy className="w-4 h-4" /> Top 3
                </CardTitle>
              </CardHeader>
              <CardContent>
                {top3.length > 0 ? (
                  <div className="space-y-2">
                    {top3.map((result, idx) => (
                      <div key={idx} className="p-2 bg-gray-900/50 rounded text-xs">
                        <div className="text-yellow-400 font-bold">#{result.position}</div>
                        <div className="text-white font-semibold">
                          {result.driver?.first_name} {result.driver?.last_name}
                        </div>
                        <div className="text-gray-400">{result.team?.name}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-xs">No official results yet</p>
                )}

                <Separator className="bg-gray-800 my-4" />

                <div className="space-y-2">
                  <label className="text-xs text-gray-400 block">Notes</label>
                  <Textarea
                    placeholder="Announcer notes..."
                    value={noteText || (classNote ? (() => {
                      try {
                        return JSON.parse(classNote.metadata || '{}').note;
                      } catch {
                        return classNote.notes || '';
                      }
                    })() : '')}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="bg-gray-900 border-gray-800 text-white text-xs h-20"
                  />
                  <Button
                    onClick={handleSaveNote}
                    disabled={!noteText.trim() || createOpLogMutation.isPending}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8"
                  >
                    Save Note
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </motion.div>
  );
}