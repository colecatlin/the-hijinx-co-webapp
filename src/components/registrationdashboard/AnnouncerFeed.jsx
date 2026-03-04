import React, { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import { Printer, MapPin, Users, TrendingUp, TrendingDown } from 'lucide-react';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { toast } from 'sonner';

const DQ = applyDefaultQueryOptions();

export default function AnnouncerFeed({
  selectedEvent,
  selectedTrack,
  selectedSeries,
  dashboardContext,
  dashboardPermissions,
}) {
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [spotlightDriverId, setSpotlightDriverId] = useState(null);
  const [showPackDialog, setShowPackDialog] = useState(false);

  // Load sessions
  const { data: sessions = [] } = useQuery({
    queryKey: ['racecore', 'announcer', 'sessions', selectedEvent?.id],
    queryFn: () => (selectedEvent?.id 
      ? base44.entities.Session.filter({ event_id: selectedEvent.id })
      : Promise.resolve([])),
    enabled: !!selectedEvent?.id,
    ...DQ,
  });

  // Load entries
  const { data: entries = [] } = useQuery({
    queryKey: ['racecore', 'announcer', 'entries', selectedEvent?.id],
    queryFn: () => (selectedEvent?.id 
      ? base44.entities.Entry.filter({ event_id: selectedEvent.id })
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

  // Load drivers
  const { data: drivers = [] } = useQuery({
    queryKey: ['racecore', 'announcer', 'drivers', entries.map(e => e.driver_id).join(',')],
    queryFn: async () => {
      if (entries.length === 0) return [];
      const driverIds = [...new Set(entries.map(e => e.driver_id).filter(Boolean))];
      const driverList = await Promise.all(
        driverIds.map(id => base44.entities.Driver.get(id).catch(() => null))
      );
      return driverList.filter(Boolean);
    },
    enabled: entries.length > 0,
    ...DQ,
  });

  // Load teams
  const { data: teams = [] } = useQuery({
    queryKey: ['racecore', 'announcer', 'teams', entries.map(e => e.team_id).filter(Boolean).join(',')],
    queryFn: async () => {
      if (entries.length === 0) return [];
      const teamIds = [...new Set(entries.map(e => e.team_id).filter(Boolean))];
      const teamList = await Promise.all(
        teamIds.map(id => base44.entities.Team.get(id).catch(() => null))
      );
      return teamList.filter(Boolean);
    },
    enabled: entries.length > 0,
    ...DQ,
  });

  // Log announcer pack generation
  const createOpLogMutation = useMutation({
    mutationFn: (data) => base44.entities.OperationLog.create(data),
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

  // Group sessions by class
  const sessionsByClass = useMemo(() => {
    const groups = new Map();
    sessions.forEach(s => {
      const className = s.series_class_id || s.class_name || 'Unclassified';
      if (!groups.has(className)) {
        groups.set(className, []);
      }
      groups.get(className).push(s);
    });
    return groups;
  }, [sessions]);

  // Selected session
  const selectedSession = useMemo(() => 
    sessions.find(s => s.id === selectedSessionId),
    [sessions, selectedSessionId]
  );

  // Running order for selected session
  const runningOrder = useMemo(() => {
    if (!selectedSession) return [];
    return results
      .filter(r => r.session_id === selectedSession.id)
      .sort((a, b) => a.position - b.position)
      .map(r => {
        const entry = entries.find(e => e.id === r.entry_id);
        const driver = entry ? driverMap.get(entry.driver_id) : null;
        const team = entry ? teamMap.get(entry.team_id) : null;
        return { ...r, entry, driver, team };
      });
  }, [selectedSession, results, entries, driverMap, teamMap]);

  // Top 3
  const top3 = useMemo(() => runningOrder.slice(0, 3), [runningOrder]);

  // Movers
  const movers = useMemo(() => {
    if (sessions.length < 2) return [];
    // Find qualifying and final for the class
    const qualifying = sessions.find(s => 
      s.session_type === 'Qualifying' && 
      (s.series_class_id || s.class_name) === (selectedSession?.series_class_id || selectedSession?.class_name)
    );
    const final = selectedSession?.session_type === 'Final' ? selectedSession : null;
    
    if (!qualifying || !final) return [];

    const qualResults = results.filter(r => r.session_id === qualifying.id);
    const finalResults = results.filter(r => r.session_id === final.id);

    const deltas = [];
    finalResults.forEach(fr => {
      const qr = qualResults.find(q => q.entry_id === fr.entry_id);
      if (qr) {
        const delta = qr.position - fr.position; // Positive = moved up
        if (delta !== 0) {
          const entry = entries.find(e => e.id === fr.entry_id);
          const driver = entry ? driverMap.get(entry.driver_id) : null;
          deltas.push({
            driver,
            number: entry?.car_number,
            qualPos: qr.position,
            finalPos: fr.position,
            delta,
          });
        }
      }
    });

    return deltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 5);
  }, [sessions, selectedSession, results, entries, driverMap]);

  // Spotlight driver details
  const spotlightDriver = useMemo(() => {
    if (!spotlightDriverId) return null;
    return driverMap.get(spotlightDriverId);
  }, [spotlightDriverId, driverMap]);

  const spotlightEntry = useMemo(() => {
    if (!spotlightDriver) return null;
    return entries.find(e => e.driver_id === spotlightDriver.id);
  }, [spotlightDriver, entries]);

  const spotlightTeam = useMemo(() => {
    if (!spotlightEntry) return null;
    return teamMap.get(spotlightEntry.team_id);
  }, [spotlightEntry, teamMap]);

  const spotlightResults = useMemo(() => {
    if (!spotlightDriver) return [];
    return results.filter(r => r.entry_id === spotlightEntry?.id);
  }, [spotlightDriver, spotlightEntry, results]);

  // Handle announcer pack generation
  const handleGeneratePack = async () => {
    try {
      await createOpLogMutation.mutateAsync({
        event_id: selectedEvent.id,
        operation_type: 'announcer_pack_generated',
        source_type: 'announcer_feed',
        entity_name: 'Event',
        entity_id: selectedEvent.id,
        status: 'success',
        metadata: JSON.stringify({ event_id: selectedEvent.id }),
        notes: 'Announcer pack generated',
      });
      toast.success('Pack generated');
    } catch (error) {
      console.error('Log failed:', error);
    }
  };

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <p className="text-gray-400">Select an event to view announcer feed</p>
        </CardContent>
      </Card>
    );
  }

  // Auto-select first session if none selected
  if (!selectedSessionId && sessions.length > 0) {
    setSelectedSessionId(sessions[0].id);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <div className="space-y-3">
            <div>
              <CardTitle className="text-white text-lg">{selectedEvent.name}</CardTitle>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                {selectedTrack && <span>{selectedTrack.name}</span>}
                {selectedEvent.event_date && <span>{new Date(selectedEvent.event_date).toLocaleDateString()}</span>}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-2">Select Session</label>
              <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                <SelectTrigger className="bg-gray-900 border-gray-800 text-white w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-800">
                  {Array.from(sessionsByClass.entries()).map(([className, classSessions]) => (
                    <div key={className}>
                      {classSessions.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {className} - {s.name}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sessions list */}
        <Card className="bg-[#171717] border-gray-800 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-white text-sm">Sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from(sessionsByClass.entries()).map(([className, classSessions]) => (
              <div key={className}>
                <p className="text-xs font-semibold text-gray-400 mb-2">{className}</p>
                <div className="space-y-1">
                  {classSessions.map(s => {
                    const sessionResults = results.filter(r => r.session_id === s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSelectedSessionId(s.id)}
                        className={`w-full text-left p-2 rounded text-xs transition-colors ${
                          selectedSessionId === s.id
                            ? 'bg-indigo-900/50 border border-indigo-700 text-white'
                            : 'bg-gray-900/50 hover:bg-gray-800 text-gray-400'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span>{s.name}</span>
                          <Badge className="bg-gray-700 text-gray-300 text-xs">
                            {sessionResults.length}
                          </Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Main feed */}
        <div className="lg:col-span-2 space-y-4">
          {/* Top 3 */}
          {top3.length > 0 && (
            <Card className="bg-[#171717] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-sm">Top 3</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {top3.map((result, idx) => (
                  <div
                    key={idx}
                    onClick={() => result.driver && setSpotlightDriverId(result.driver.id)}
                    className="flex items-center justify-between p-3 bg-gray-900/50 rounded cursor-pointer hover:bg-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-xl font-bold text-yellow-400">{result.position}</div>
                      <div>
                        <p className="text-sm font-semibold text-white">{result.driver?.first_name} {result.driver?.last_name}</p>
                        <p className="text-xs text-gray-400">#{result.entry?.car_number}</p>
                      </div>
                    </div>
                    {result.team && (
                      <p className="text-xs text-gray-400">{result.team.name}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Movers */}
          {movers.length > 0 && (
            <Card className="bg-[#171717] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Notable Movers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {movers.map((mover, idx) => (
                  <div
                    key={idx}
                    onClick={() => mover.driver && setSpotlightDriverId(mover.driver.id)}
                    className="flex items-center justify-between p-2 bg-gray-900/50 rounded cursor-pointer hover:bg-gray-900 text-xs"
                  >
                    <span className="text-white font-semibold">{mover.driver?.first_name} {mover.driver?.last_name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">#{mover.number}</span>
                      <span className={mover.delta > 0 ? 'text-green-400' : 'text-red-400'}>
                        {mover.delta > 0 ? '+' : ''}{mover.delta} ({mover.qualPos}→{mover.finalPos})
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Running order table */}
          {runningOrder.length > 0 && (
            <Card className="bg-[#171717] border-gray-800">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white text-sm">Running Order</CardTitle>
                  <Button
                    onClick={() => {
                      handleGeneratePack();
                      setShowPackDialog(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 h-8 text-xs"
                  >
                    <Printer className="w-3 h-3" /> Announcer Pack
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-900/30">
                      <TableRow>
                        <TableHead className="text-gray-400 text-xs">Pos</TableHead>
                        <TableHead className="text-gray-400 text-xs">Num</TableHead>
                        <TableHead className="text-gray-400 text-xs">Driver</TableHead>
                        <TableHead className="text-gray-400 text-xs">Team</TableHead>
                        <TableHead className="text-gray-400 text-xs">Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {runningOrder.map((result) => (
                        <TableRow
                          key={result.id}
                          onClick={() => result.driver && setSpotlightDriverId(result.driver.id)}
                          className="border-gray-800 cursor-pointer hover:bg-gray-900/50"
                        >
                          <TableCell className="text-sm font-semibold text-white">{result.position}</TableCell>
                          <TableCell className="text-sm text-gray-400">{result.entry?.car_number}</TableCell>
                          <TableCell className="text-sm text-white">{result.driver?.first_name} {result.driver?.last_name}</TableCell>
                          <TableCell className="text-xs text-gray-400">{result.team?.name || '-'}</TableCell>
                          <TableCell className="text-sm text-gray-400">{result.race_time || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {runningOrder.length === 0 && (
            <Card className="bg-[#171717] border-gray-800">
              <CardContent className="py-12 text-center">
                <p className="text-gray-400">No results yet for this session</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Spotlight Drawer */}
      <Drawer open={!!spotlightDriverId} onOpenChange={(open) => !open && setSpotlightDriverId(null)}>
        <DrawerContent className="bg-gray-900 border-gray-800">
          <DrawerHeader>
            <DrawerTitle className="text-white">
              {spotlightDriver?.first_name} {spotlightDriver?.last_name}
            </DrawerTitle>
          </DrawerHeader>
          {spotlightDriver && (
            <div className="px-6 pb-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400 text-xs mb-1">Hometown</p>
                  <p className="text-white font-semibold">{spotlightDriver.hometown_city}, {spotlightDriver.hometown_state}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs mb-1">Discipline</p>
                  <p className="text-white font-semibold">{spotlightDriver.primary_discipline}</p>
                </div>
                {spotlightTeam && (
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Team</p>
                    <p className="text-white font-semibold">{spotlightTeam.name}</p>
                  </div>
                )}
                {spotlightEntry && (
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Car Number</p>
                    <p className="text-white font-semibold">#{spotlightEntry.car_number}</p>
                  </div>
                )}
              </div>

              {spotlightEntry?.notes && (
                <>
                  <Separator className="bg-gray-800" />
                  <div>
                    <p className="text-gray-400 text-xs mb-2">Notes</p>
                    <p className="text-white text-sm">{spotlightEntry.notes}</p>
                  </div>
                </>
              )}

              {spotlightResults.length > 0 && (
                <>
                  <Separator className="bg-gray-800" />
                  <div>
                    <p className="text-gray-400 text-xs mb-2">Results</p>
                    <div className="space-y-1 text-xs">
                      {spotlightResults.map((r, idx) => {
                        const session = sessions.find(s => s.id === r.session_id);
                        return (
                          <div key={idx} className="flex justify-between text-gray-400">
                            <span>{session?.name}</span>
                            <span className="text-white font-semibold">#{r.position}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </DrawerContent>
      </Drawer>

      {/* Announcer Pack Dialog */}
      <Dialog open={showPackDialog} onOpenChange={setShowPackDialog}>
        <DialogContent className="max-w-2xl bg-white text-black max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEvent.name} - Announcer Pack</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 p-4">
            {/* Header */}
            <div className="border-b pb-4">
              <h2 className="text-2xl font-bold">{selectedEvent.name}</h2>
              {selectedTrack && <p className="text-sm text-gray-600">{selectedTrack.name}</p>}
              {selectedEvent.event_date && <p className="text-sm text-gray-600">{new Date(selectedEvent.event_date).toLocaleDateString()}</p>}
            </div>

            {/* By class */}
            {Array.from(sessionsByClass.entries()).map(([className, classSessions]) => {
              const classEntries = entries.filter(e => e.event_class_id && classSessions.some(s => s.event_class_id === e.event_class_id));
              return (
                <div key={className}>
                  <h3 className="text-lg font-bold mb-3">{className}</h3>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Car</th>
                        <th className="text-left p-2">Driver</th>
                        <th className="text-left p-2">Hometown</th>
                        <th className="text-left p-2">Team</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classEntries.map((entry) => {
                        const driver = driverMap.get(entry.driver_id);
                        const team = teamMap.get(entry.team_id);
                        return (
                          <tr key={entry.id} className="border-b">
                            <td className="p-2 font-semibold">#{entry.car_number}</td>
                            <td className="p-2">{driver?.first_name} {driver?.last_name}</td>
                            <td className="p-2 text-xs text-gray-600">{driver?.hometown_city}, {driver?.hometown_state}</td>
                            <td className="p-2 text-xs">{team?.name || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={() => window.print()}
              className="bg-black text-white flex-1"
            >
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
            <Button
              onClick={() => setShowPackDialog(false)}
              variant="outline"
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}