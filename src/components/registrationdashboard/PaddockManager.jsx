import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { motion } from 'framer-motion';
import { ChevronDown, CheckCircle2, AlertCircle, HelpCircle, ExternalLink } from 'lucide-react';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { canAction } from '@/components/access/accessControl';
import { toast } from 'sonner';

const DQ = applyDefaultQueryOptions();

export default function PaddockManager({
  selectedEvent,
  dashboardContext,
  dashboardPermissions,
  invalidateAfterOperation,
}) {
  const queryClient = useQueryClient();
  const [expandedTeams, setExpandedTeams] = useState(new Set());

  // Load entries
  const { data: entries = [] } = useQuery({
    queryKey: ['paddock_entries', selectedEvent?.id],
    queryFn: () => (selectedEvent?.id 
      ? base44.entities.Entry.filter({ event_id: selectedEvent.id })
      : Promise.resolve([])),
    enabled: !!selectedEvent?.id,
    ...DQ,
  });

  // Load drivers
  const { data: drivers = [] } = useQuery({
    queryKey: ['paddock_drivers', entries.map(e => e.driver_id).join(',')],
    queryFn: async () => {
      if (entries.length === 0) return [];
      const driverIds = [...new Set(entries.map(e => e.driver_id).filter(Boolean))];
      const driverList = await Promise.all(
        driverIds.map(id => base44.entities.Driver.get(id))
      );
      return driverList;
    },
    enabled: entries.length > 0,
    ...DQ,
  });

  // Load teams
  const { data: teams = [] } = useQuery({
    queryKey: ['paddock_teams', entries.map(e => e.team_id).join(',')],
    queryFn: async () => {
      if (entries.length === 0) return [];
      const teamIds = [...new Set(entries.map(e => e.team_id).filter(Boolean))];
      const teamList = await Promise.all(
        teamIds.map(id => base44.entities.Team.get(id))
      );
      return teamList;
    },
    enabled: entries.length > 0,
    ...DQ,
  });

  // Load sessions
  const { data: sessions = [] } = useQuery({
    queryKey: ['paddock_sessions', selectedEvent?.id],
    queryFn: () => (selectedEvent?.id 
      ? base44.entities.Session.filter({ event_id: selectedEvent.id })
      : Promise.resolve([])),
    enabled: !!selectedEvent?.id,
    ...DQ,
  });

  // Load results
  const { data: results = [] } = useQuery({
    queryKey: ['paddock_results', selectedEvent?.id],
    queryFn: () => (selectedEvent?.id 
      ? base44.entities.Results.filter({ event_id: selectedEvent.id })
      : Promise.resolve([])),
    enabled: !!selectedEvent?.id,
    ...DQ,
  });

  // Load check-in logs
  const { data: checkInLogs = [] } = useQuery({
    queryKey: ['paddock_checkin', selectedEvent?.id],
    queryFn: () => (selectedEvent?.id 
      ? base44.entities.OperationLog.filter({ 
          event_id: selectedEvent.id,
          operation_type: 'gate_checkin'
        })
      : Promise.resolve([])),
    enabled: !!selectedEvent?.id,
    ...DQ,
  });

  // Load tech inspections
  const { data: techInspections = [] } = useQuery({
    queryKey: ['paddock_tech', selectedEvent?.id],
    queryFn: () => (selectedEvent?.id 
      ? base44.entities.TechInspection.filter({ event_id: selectedEvent.id })
      : Promise.resolve([])),
    enabled: !!selectedEvent?.id,
    ...DQ,
  });

  // Mutations for inline actions
  const updateEntryMutation = useMutation({
    mutationFn: (data) => base44.entities.Entry.update(data.entryId, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paddock_entries'] });
      invalidateAfterOperation?.('entry_updated', { eventId: selectedEvent?.id });
      toast.success('Entry updated');
    },
  });

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

  const techMap = useMemo(() => {
    const map = new Map();
    techInspections.forEach(t => map.set(t.entry_id, t));
    return map;
  }, [techInspections]);

  const resultsMap = useMemo(() => {
    const map = new Map();
    results.forEach(r => {
      const key = `${r.session_id}_${r.entry_id}`;
      map.set(key, r);
    });
    return map;
  }, [results]);

  // Group entries by team
  const paddockData = useMemo(() => {
    const teams = new Map();
    
    entries.forEach(entry => {
      const teamId = entry.team_id || 'no-team';
      const team = teamMap.get(teamId);
      const teamName = team?.name || 'No Team';
      
      if (!teams.has(teamId)) {
        teams.set(teamId, {
          teamId,
          teamName,
          teamData: team,
          drivers: [],
        });
      }
      
      const driver = driverMap.get(entry.driver_id);
      const tech = techMap.get(entry.id);
      const sessionCount = sessions.filter(s => 
        results.some(r => r.entry_id === entry.id && r.session_id === s.id)
      ).length;
      const resultCount = results.filter(r => r.entry_id === entry.id).length;
      const isCheckedIn = checkInLogs.some(log => 
        log.metadata && log.metadata.includes(entry.id)
      );
      
      teams.get(teamId).drivers.push({
        entryId: entry.id,
        driverId: entry.driver_id,
        driverName: driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown',
        driver,
        carNumber: entry.car_number,
        eventClass: entry.event_class_id,
        entryStatus: entry.entry_status,
        isCheckedIn,
        techStatus: tech?.status || 'Not Inspected',
        techData: tech,
        complianceStatus: entry.waiver_verified && entry.license_verified ? 'Complete' : 'Missing',
        sessionCount,
        resultCount,
      });
    });
    
    return Array.from(teams.values()).sort((a, b) => a.teamName.localeCompare(b.teamName));
  }, [entries, driverMap, teamMap, techMap, sessions, results, checkInLogs]);

  const handleCheckIn = async (entryId) => {
    try {
      await updateEntryMutation.mutateAsync({
        entryId,
        updates: { entry_status: 'Checked In' },
      });
      
      await createOpLogMutation.mutateAsync({
        event_id: selectedEvent.id,
        operation_type: 'gate_checkin',
        source_type: 'paddock_manager',
        status: 'success',
        metadata: JSON.stringify({ entryId }),
        notes: 'Driver checked in via Paddock Manager',
      });
    } catch (error) {
      toast.error('Check-in failed');
    }
  };

  const handleTechStatus = async (entryId, status) => {
    try {
      const tech = techInspections.find(t => t.entry_id === entryId);
      if (tech) {
        await base44.entities.TechInspection.update(tech.id, { status });
      } else {
        await base44.entities.TechInspection.create({
          event_id: selectedEvent.id,
          entry_id: entryId,
          series_class_id: entries.find(e => e.id === entryId)?.series_class_id,
          status,
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['paddock_tech'] });
      invalidateAfterOperation?.('tech_updated', { eventId: selectedEvent.id });
      toast.success(`Tech status updated to ${status}`);
    } catch (error) {
      toast.error('Tech update failed');
    }
  };

  const toggleTeam = (teamId) => {
    const newExpanded = new Set(expandedTeams);
    if (newExpanded.has(teamId)) {
      newExpanded.delete(teamId);
    } else {
      newExpanded.add(teamId);
    }
    setExpandedTeams(newExpanded);
  };

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <p className="text-gray-400">Select an event to view paddock</p>
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
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Paddock Manager</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {paddockData.map((teamGroup) => (
              <Collapsible
                key={teamGroup.teamId}
                open={expandedTeams.has(teamGroup.teamId)}
                onOpenChange={() => toggleTeam(teamGroup.teamId)}
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center gap-3 p-4 bg-gray-900/50 border border-gray-800 rounded-lg cursor-pointer hover:border-gray-700 transition-colors">
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform ${
                        expandedTeams.has(teamGroup.teamId) ? 'rotate-180' : ''
                      }`}
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-white">{teamGroup.teamName}</p>
                      <p className="text-xs text-gray-400">{teamGroup.drivers.length} drivers</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {teamGroup.drivers.filter(d => d.isCheckedIn).length}/{teamGroup.drivers.length} checked in
                      </Badge>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 border border-gray-800 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-900/30">
                      <TableRow>
                        <TableHead className="text-gray-400 text-xs">Driver</TableHead>
                        <TableHead className="text-gray-400 text-xs">Number</TableHead>
                        <TableHead className="text-gray-400 text-xs">Check In</TableHead>
                        <TableHead className="text-gray-400 text-xs">Tech</TableHead>
                        <TableHead className="text-gray-400 text-xs">Compliance</TableHead>
                        <TableHead className="text-gray-400 text-xs">Sessions</TableHead>
                        <TableHead className="text-gray-400 text-xs">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamGroup.drivers.map((driver) => (
                        <TableRow key={driver.entryId} className="border-gray-800">
                          <TableCell className="text-sm text-white">{driver.driverName}</TableCell>
                          <TableCell className="text-sm text-gray-400">{driver.carNumber}</TableCell>
                          <TableCell>
                            {driver.isCheckedIn ? (
                              <Badge className="bg-green-900/40 text-green-300 text-xs">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Checked In
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-900/40 text-gray-300 text-xs">
                                <HelpCircle className="w-3 h-3 mr-1" /> Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${
                              driver.techStatus === 'Passed' ? 'bg-green-900/40 text-green-300' :
                              driver.techStatus === 'Failed' ? 'bg-red-900/40 text-red-300' :
                              'bg-gray-900/40 text-gray-300'
                            }`}>
                              {driver.techStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${
                              driver.complianceStatus === 'Complete' ? 'bg-green-900/40 text-green-300' :
                              'bg-yellow-900/40 text-yellow-300'
                            }`}>
                              {driver.complianceStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-400">
                            {driver.sessionCount}/{sessions.length}
                          </TableCell>
                          <TableCell className="text-xs space-x-1">
                            {!driver.isCheckedIn && canAction(dashboardPermissions, 'checkin') && (
                              <Button
                                size="xs"
                                onClick={() => handleCheckIn(driver.entryId)}
                                className="bg-blue-600 hover:bg-blue-700 text-white h-6 px-2"
                              >
                                Check In
                              </Button>
                            )}
                            {canAction(dashboardPermissions, 'tech') && (
                              <Button
                                size="xs"
                                onClick={() => handleTechStatus(driver.entryId, 'Passed')}
                                className="bg-green-600 hover:bg-green-700 text-white h-6 px-2"
                              >
                                Tech Pass
                              </Button>
                            )}
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => window.open(createPageUrl('DriverProfile') + `?id=${driver.driverId}`, '_blank')}
                              className="border-gray-600 text-gray-300 h-6 px-2"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}