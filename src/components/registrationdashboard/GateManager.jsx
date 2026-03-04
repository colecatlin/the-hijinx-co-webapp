import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { motion } from 'framer-motion';
import { Check, X, AlertCircle, Search } from 'lucide-react';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { toast } from 'sonner';

const DQ = applyDefaultQueryOptions();

export default function GateManager({
  selectedEvent,
  selectedTrack,
  selectedSeries,
  dashboardContext,
  dashboardPermissions,
}) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');

  // Load driver programs
  const { data: programs = [] } = useQuery({
    queryKey: ['racecore', 'gate', 'programs', selectedEvent?.id],
    queryFn: () => (selectedEvent?.id 
      ? base44.entities.DriverProgram.filter({ event_id: selectedEvent.id })
      : Promise.resolve([])),
    enabled: !!selectedEvent?.id,
    ...DQ,
  });

  // Load drivers
  const { data: drivers = [] } = useQuery({
    queryKey: ['racecore', 'gate', 'drivers', selectedEvent?.id],
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
    queryKey: ['racecore', 'gate', 'teams', selectedEvent?.id],
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

  // Try to load entries (graceful fallback if not available)
  const { data: entries = [], isError: entriesError } = useQuery({
    queryKey: ['racecore', 'gate', 'entries', selectedEvent?.id],
    queryFn: () => (selectedEvent?.id 
      ? base44.entities.Entry.filter({ event_id: selectedEvent.id }).catch(() => Promise.resolve([]))
      : Promise.resolve([])),
    enabled: !!selectedEvent?.id,
    ...DQ,
  });

  const entriesAvailable = !entriesError && entries.length > 0;

  // Load operation logs for gate checks
  const { data: operationLogs = [] } = useQuery({
    queryKey: ['racecore', 'gate', 'log', selectedEvent?.id],
    queryFn: () => (selectedEvent?.id 
      ? base44.entities.OperationLog.filter(
          { event_id: selectedEvent.id, operation_type: 'gate_check' },
          '-created_date',
          500
        )
      : Promise.resolve([])),
    enabled: !!selectedEvent?.id,
    ...DQ,
  });

  // Load series classes for mapping
  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['racecore', 'gate', 'classes', selectedEvent?.series_id],
    queryFn: () => (selectedEvent?.series_id 
      ? base44.entities.SeriesClass.filter({ series_id: selectedEvent.series_id })
      : Promise.resolve([])),
    enabled: !!selectedEvent?.series_id,
    ...DQ,
  });

  // Create mutation for gate check
  const createGateCheckMutation = useMutation({
    mutationFn: (data) => base44.entities.OperationLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['racecore', 'gate', 'log'] });
      toast.success('Gate check recorded');
    },
    onError: () => {
      toast.error('Failed to record gate check');
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

  const classMap = useMemo(() => {
    const map = new Map();
    seriesClasses.forEach(c => map.set(c.id, c));
    return map;
  }, [seriesClasses]);

  const entryMap = useMemo(() => {
    const map = new Map();
    entries.forEach(e => map.set(e.driver_id, e));
    return map;
  }, [entries]);

  // Build gate rows from programs
  const gateRows = useMemo(() => {
    return programs.map(prog => {
      const driver = driverMap.get(prog.driver_id);
      const team = teamMap.get(prog.team_id);
      const seriesClass = prog.series_class_id ? classMap.get(prog.series_class_id) : null;
      const entry = entryMap.get(prog.driver_id);

      // Get latest gate check for this driver
      const latestCheck = operationLogs.find(
        log => {
          try {
            const meta = JSON.parse(log.metadata || '{}');
            return meta.driver_id === prog.driver_id;
          } catch {
            return false;
          }
        }
      );

      // Determine issues
      const issues = [];
      if (entriesAvailable && entry) {
        if (entry.payment_status === 'Unpaid') issues.push('unpaid');
        if (!entry.waiver_verified) issues.push('waiver');
        if (entry.tech_status && entry.tech_status !== 'Passed') issues.push('tech');
      } else if (!entriesAvailable) {
        issues.push('limited_data');
      }

      return {
        id: prog.id,
        program: prog,
        driver,
        team,
        class: seriesClass,
        entry,
        issues,
        gateStatus: latestCheck ? (() => {
          try {
            const meta = JSON.parse(latestCheck.metadata || '{}');
            return meta.gate_status || 'not_checked';
          } catch {
            return 'not_checked';
          }
        })() : 'not_checked',
        lastCheckTime: latestCheck?.created_date,
      };
    });
  }, [programs, driverMap, teamMap, classMap, entryMap, operationLogs, entriesAvailable]);

  // Get unique classes for filter
  const classList = useMemo(() => {
    const classes = new Set();
    gateRows.forEach(row => {
      if (row.class?.name) classes.add(row.class.name);
      else if (row.program.series_class_id) classes.add(row.program.series_class_id);
    });
    return Array.from(classes).sort();
  }, [gateRows]);

  // Filter rows by search and class
  const filteredRows = useMemo(() => {
    return gateRows.filter(row => {
      const matchSearch = !searchTerm || 
        (row.driver?.first_name + ' ' + row.driver?.last_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (row.program.car_number || '').toString().toLowerCase().includes(searchTerm.toLowerCase());

      const matchClass = selectedClass === 'all' || 
        (row.class?.name === selectedClass) ||
        (row.program.series_class_id === selectedClass);

      return matchSearch && matchClass;
    });
  }, [gateRows, searchTerm, selectedClass]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = filteredRows.length;
    const checked = filteredRows.filter(r => r.gateStatus === 'checked_in').length;
    const unchecked = total - checked;
    return { total, checked, unchecked };
  }, [filteredRows]);

  // Handle mark in
  const handleMarkIn = async (row) => {
    try {
      await createGateCheckMutation.mutateAsync({
        event_id: selectedEvent.id,
        operation_type: 'gate_check',
        entity_name: 'Event',
        entity_id: selectedEvent.id,
        source_type: 'gate_manager',
        status: 'success',
        metadata: JSON.stringify({
          event_id: selectedEvent.id,
          driver_id: row.program.driver_id,
          program_id: row.program.id,
          car_number: row.program.car_number,
          gate_status: 'checked_in',
          timestamp: new Date().toISOString(),
        }),
        notes: `Gate check: ${row.driver?.first_name} ${row.driver?.last_name} (#${row.program.car_number})`,
      });
    } catch (error) {
      console.error('Failed to mark in:', error);
    }
  };

  // Handle undo
  const handleUndo = async (row) => {
    try {
      await createGateCheckMutation.mutateAsync({
        event_id: selectedEvent.id,
        operation_type: 'gate_check',
        entity_name: 'Event',
        entity_id: selectedEvent.id,
        source_type: 'gate_manager',
        status: 'success',
        metadata: JSON.stringify({
          event_id: selectedEvent.id,
          driver_id: row.program.driver_id,
          program_id: row.program.id,
          car_number: row.program.car_number,
          gate_status: 'unchecked',
          timestamp: new Date().toISOString(),
        }),
        notes: `Gate undo: ${row.driver?.first_name} ${row.driver?.last_name} (#${row.program.car_number})`,
      });
    } catch (error) {
      console.error('Failed to undo:', error);
    }
  };

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <p className="text-gray-400">Select an event to access Gate</p>
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
      {/* Header */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Gate Check-In</CardTitle>
          <p className="text-xs text-gray-400 mt-1">Verify entry presence and basic compliance</p>
        </CardHeader>
      </Card>

      {/* Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-2">
          <label className="text-xs text-gray-400 uppercase tracking-wide block">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Driver name or car #"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-900 border-gray-800 text-white pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-gray-400 uppercase tracking-wide block">Class</label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="bg-gray-900 border-gray-800 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-800">
              <SelectItem value="all">All Classes</SelectItem>
              {classList.map(cls => (
                <SelectItem key={cls} value={cls}>
                  {cls}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gray-900/30 border-gray-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-xs text-gray-400 mt-1">Total</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-900/20 border-green-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-300">{stats.checked}</div>
              <div className="text-xs text-gray-400 mt-1">Checked In</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-orange-900/20 border-orange-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-300">{stats.unchecked}</div>
              <div className="text-xs text-gray-400 mt-1">Pending</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="bg-[#171717] border-gray-800 overflow-hidden">
        <CardContent className="p-0">
          {filteredRows.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              No entries found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-900/50 border-gray-800">
                  <TableRow>
                    <TableHead className="text-gray-400 text-xs">Car #</TableHead>
                    <TableHead className="text-gray-400 text-xs">Driver</TableHead>
                    <TableHead className="text-gray-400 text-xs">Class</TableHead>
                    <TableHead className="text-gray-400 text-xs">Team</TableHead>
                    <TableHead className="text-gray-400 text-xs">Status</TableHead>
                    <TableHead className="text-gray-400 text-xs">Issues</TableHead>
                    <TableHead className="text-gray-400 text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map(row => (
                    <TableRow key={row.id} className="border-gray-800 hover:bg-gray-900/30">
                      <TableCell className="text-white font-semibold">
                        #{row.program.car_number}
                      </TableCell>
                      <TableCell className="text-white text-sm">
                        {row.driver?.first_name} {row.driver?.last_name}
                      </TableCell>
                      <TableCell className="text-gray-300 text-xs">
                        {row.class?.name || row.program.series_class_id || 'Unassigned'}
                      </TableCell>
                      <TableCell className="text-gray-400 text-xs">
                        {row.team?.name || '-'}
                      </TableCell>
                      <TableCell>
                        {row.gateStatus === 'checked_in' ? (
                          <Badge className="bg-green-900/40 text-green-300 border border-green-800">
                            <Check className="w-3 h-3 mr-1" /> In
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-800 text-gray-300">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="space-x-1 flex flex-wrap gap-1">
                        {row.issues.length === 0 ? (
                          <span className="text-xs text-gray-500">—</span>
                        ) : (
                          row.issues.map(issue => {
                            const issueConfig = {
                              unpaid: { label: 'Unpaid', color: 'bg-red-900/40 text-red-300' },
                              waiver: { label: 'Waiver', color: 'bg-orange-900/40 text-orange-300' },
                              tech: { label: 'Tech', color: 'bg-yellow-900/40 text-yellow-300' },
                              limited_data: { label: 'Limited data', color: 'bg-gray-800 text-gray-300' },
                            };
                            const config = issueConfig[issue];
                            return (
                              <Badge key={issue} className={`${config.color} border-0 text-xs`}>
                                {config.label}
                              </Badge>
                            );
                          })
                        )}
                      </TableCell>
                      <TableCell className="space-x-2">
                        {row.gateStatus === 'checked_in' ? (
                          <Button
                            onClick={() => handleUndo(row)}
                            disabled={createGateCheckMutation.isPending}
                            size="sm"
                            variant="outline"
                            className="border-gray-700 text-gray-300 hover:bg-gray-800 h-7 text-xs"
                          >
                            <X className="w-3 h-3 mr-1" /> Undo
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleMarkIn(row)}
                            disabled={createGateCheckMutation.isPending}
                            size="sm"
                            className="bg-green-700 hover:bg-green-600 text-white h-7 text-xs"
                          >
                            <Check className="w-3 h-3 mr-1" /> Mark In
                          </Button>
                        )}
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
  );
}