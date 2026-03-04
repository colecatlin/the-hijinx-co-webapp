import React, { useMemo, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Zap, MapPin, Users, DollarSign, Clock } from 'lucide-react';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { toast } from 'sonner';

const DQ = applyDefaultQueryOptions();

export default function GateManager({
  selectedEvent,
  dashboardContext,
  dashboardPermissions,
}) {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [scanInput, setScanInput] = useState('');
  const [recentDecisions, setRecentDecisions] = useState({});
  const scanInputRef = useRef(null);

  // Load entries
  const { data: entries = [] } = useQuery({
    queryKey: ['racecore', 'gate', 'entries', selectedEvent?.id],
    queryFn: () => (selectedEvent?.id 
      ? base44.entities.Entry.filter({ event_id: selectedEvent.id })
      : Promise.resolve([])),
    enabled: !!selectedEvent?.id,
    ...DQ,
  });

  // Load drivers
  const { data: drivers = [] } = useQuery({
    queryKey: ['racecore', 'gate', 'drivers', entries.map(e => e.driver_id).join(',')],
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
    queryKey: ['racecore', 'gate', 'teams', entries.map(e => e.team_id).filter(Boolean).join(',')],
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

  // Load operation logs for gate decisions
  const { data: operationLogs = [] } = useQuery({
    queryKey: ['racecore', 'gate', 'logs', selectedEvent?.id],
    queryFn: () => (selectedEvent?.id 
      ? base44.entities.OperationLog.filter({ event_id: selectedEvent.id }, '-created_date', 500)
      : Promise.resolve([])),
    enabled: !!selectedEvent?.id,
    ...DQ,
  });

  // Create operation log mutation
  const createOpLogMutation = useMutation({
    mutationFn: (data) => base44.entities.OperationLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['racecore', 'gate', 'logs'] });
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

  // Filter entries by search or scan
  const filteredEntries = useMemo(() => {
    let query = searchInput.trim().toLowerCase() || scanInput.trim();
    if (!query) return [];

    return entries.filter(entry => {
      const driver = driverMap.get(entry.driver_id);
      const driverName = driver ? `${driver.first_name} ${driver.last_name}`.toLowerCase() : '';
      const carNum = entry.car_number ? entry.car_number.toString().toLowerCase() : '';
      const transponder = entry.transponder_id ? entry.transponder_id.toLowerCase() : '';
      const numericId = entry.numeric_id ? entry.numeric_id.toLowerCase() : '';
      const driverNumericId = driver?.numeric_id ? driver.numeric_id.toLowerCase() : '';

      // Try exact matches first (for QR codes)
      if (entry.id === query || numericId === query || driverNumericId === query) {
        return true;
      }

      // Then substring matches
      return (
        carNum.includes(query) ||
        driverName.includes(query) ||
        transponder.includes(query)
      );
    });
  }, [searchInput, scanInput, entries, driverMap]);

  // Get gate logs for today
  const todayLogs = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return operationLogs.filter(log => {
      if (log.operation_type !== 'gate_decision') return false;
      const logDate = new Date(log.created_date);
      logDate.setHours(0, 0, 0, 0);
      return logDate.getTime() === today.getTime();
    });
  }, [operationLogs]);

  // Counters
  const counters = useMemo(() => {
    return {
      total: entries.length,
      admitted: todayLogs.filter(l => {
        try {
          return JSON.parse(l.metadata || '{}').decision === 'admit';
        } catch {
          return false;
        }
      }).length,
      denied: todayLogs.filter(l => {
        try {
          return JSON.parse(l.metadata || '{}').decision === 'deny';
        } catch {
          return false;
        }
      }).length,
    };
  }, [entries, todayLogs]);

  // Last gate decision for entry
  const getLastGateDecision = (entryId) => {
    const logs = operationLogs.filter(l => {
      if (l.operation_type !== 'gate_decision') return false;
      try {
        return JSON.parse(l.metadata || '{}').entry_id === entryId;
      } catch {
        return false;
      }
    });
    return logs[0];
  };

  // Handle admit
  const handleAdmit = async (entry) => {
    try {
      await createOpLogMutation.mutateAsync({
        event_id: selectedEvent.id,
        operation_type: 'gate_decision',
        source_type: 'gate_manager',
        entity_name: 'Entry',
        entity_id: entry.id,
        status: 'success',
        metadata: JSON.stringify({
          event_id: selectedEvent.id,
          entry_id: entry.id,
          decision: 'admit',
          scan_value: scanInput.trim() || null,
          driver_id: entry.driver_id,
          car_number: entry.car_number,
        }),
        notes: `Gate: Admitted ${entry.car_number ? '#' + entry.car_number : 'entry'}`,
      });

      setRecentDecisions(prev => ({
        ...prev,
        [entry.id]: 'admit',
      }));

      toast.success(`Admitted #${entry.car_number}`);
      setScanInput('');
      scanInputRef.current?.focus();

      setTimeout(() => {
        setRecentDecisions(prev => ({
          ...prev,
          [entry.id]: null,
        }));
      }, 2000);
    } catch (error) {
      toast.error('Failed to record decision');
    }
  };

  // Handle deny
  const handleDeny = async (entry) => {
    try {
      await createOpLogMutation.mutateAsync({
        event_id: selectedEvent.id,
        operation_type: 'gate_decision',
        source_type: 'gate_manager',
        entity_name: 'Entry',
        entity_id: entry.id,
        status: 'success',
        metadata: JSON.stringify({
          event_id: selectedEvent.id,
          entry_id: entry.id,
          decision: 'deny',
          scan_value: scanInput.trim() || null,
          driver_id: entry.driver_id,
          car_number: entry.car_number,
        }),
        notes: `Gate: Denied ${entry.car_number ? '#' + entry.car_number : 'entry'}`,
      });

      setRecentDecisions(prev => ({
        ...prev,
        [entry.id]: 'deny',
      }));

      toast.error(`Denied #${entry.car_number}`);
      setScanInput('');
      scanInputRef.current?.focus();

      setTimeout(() => {
        setRecentDecisions(prev => ({
          ...prev,
          [entry.id]: null,
        }));
      }, 2000);
    } catch (error) {
      toast.error('Failed to record decision');
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
      {/* Counters */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-400 text-xs mb-2">Total Entries</p>
              <p className="text-3xl font-bold text-white">{counters.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-900/30 border-green-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-green-400 text-xs mb-2">Admitted Today</p>
              <p className="text-3xl font-bold text-green-300">{counters.admitted}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-900/30 border-red-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-400 text-xs mb-2">Denied Today</p>
              <p className="text-3xl font-bold text-red-300">{counters.denied}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm">Entry Lookup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 block mb-2">Search (Car #, Driver Name, QR)</label>
            <Input
              type="text"
              placeholder="Search car number or driver name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="bg-gray-900 border-gray-800 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-2">Scan Code</label>
            <Input
              ref={scanInputRef}
              type="text"
              placeholder="Scan QR code or entry ID here..."
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              className="bg-gray-900 border-gray-800 text-white font-mono"
              autoFocus
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-3">
        <AnimatePresence>
          {filteredEntries.length === 0 && (searchInput.trim() || scanInput.trim()) && (
            <Alert className="bg-yellow-900/20 border-yellow-800">
              <AlertDescription className="text-yellow-400 text-xs">
                No entries found
              </AlertDescription>
            </Alert>
          )}

          {filteredEntries.map((entry, idx) => {
            const driver = driverMap.get(entry.driver_id);
            const team = teamMap.get(entry.team_id);
            const lastLog = getLastGateDecision(entry.id);
            const recentDecision = recentDecisions[entry.id];

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card
                  className={`border-2 transition-all ${
                    recentDecision === 'admit'
                      ? 'bg-green-900/40 border-green-600'
                      : recentDecision === 'deny'
                      ? 'bg-red-900/40 border-red-600'
                      : 'bg-gray-900/50 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-2xl font-bold text-white">#{entry.car_number}</p>
                            {entry.numeric_id && (
                              <Badge className="bg-gray-800 text-gray-300 text-xs font-mono">
                                {entry.numeric_id}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-white mt-1">
                            {driver?.first_name} {driver?.last_name}
                          </p>
                          {driver?.hometown_city && (
                            <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                              <MapPin className="w-3 h-3" />
                              {driver.hometown_city}, {driver.hometown_state}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Details grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {entry.series_class_id && (
                          <div className="bg-gray-800/50 p-2 rounded">
                            <p className="text-gray-400">Class</p>
                            <p className="text-white font-semibold truncate">{entry.series_class_id}</p>
                          </div>
                        )}
                        {entry.payment_status && (
                          <div className="bg-gray-800/50 p-2 rounded flex items-center gap-2">
                            <DollarSign className="w-3 h-3 text-gray-400" />
                            <div>
                              <p className="text-gray-400">Payment</p>
                              <p className={`font-semibold ${
                                entry.payment_status === 'Paid' ? 'text-green-400' : 'text-yellow-400'
                              }`}>
                                {entry.payment_status}
                              </p>
                            </div>
                          </div>
                        )}
                        {entry.entry_status && (
                          <div className="bg-gray-800/50 p-2 rounded">
                            <p className="text-gray-400">Entry Status</p>
                            <p className="text-white font-semibold truncate">{entry.entry_status}</p>
                          </div>
                        )}
                        {entry.tech_status && (
                          <div className="bg-gray-800/50 p-2 rounded">
                            <p className="text-gray-400">Tech</p>
                            <p className={`font-semibold ${
                              entry.tech_status === 'Passed' ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {entry.tech_status}
                            </p>
                          </div>
                        )}
                        {team && (
                          <div className="bg-gray-800/50 p-2 rounded col-span-2 flex items-center gap-2">
                            <Users className="w-3 h-3 text-gray-400" />
                            <p className="text-white font-semibold truncate">{team.name}</p>
                          </div>
                        )}
                      </div>

                      {/* Wristband */}
                      {entry.wristband_count !== undefined && (
                        <div className="text-xs text-gray-400">
                          Wristbands: <span className="text-white font-semibold">{entry.wristband_count}</span>
                        </div>
                      )}

                      {/* Last decision */}
                      {lastLog && (
                        <div className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Last gate: {new Date(lastLog.created_date).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      )}

                      {/* Buttons */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={() => handleAdmit(entry)}
                          disabled={createOpLogMutation.isPending || recentDecision === 'admit'}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2 h-10"
                        >
                          <Check className="w-4 h-4" /> Admit
                        </Button>
                        <Button
                          onClick={() => handleDeny(entry)}
                          disabled={createOpLogMutation.isPending || recentDecision === 'deny'}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-2 h-10"
                        >
                          <X className="w-4 h-4" /> Deny
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {!searchInput.trim() && !scanInput.trim() && (
        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="py-12 text-center">
            <Zap className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Search or scan to find entries</p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}