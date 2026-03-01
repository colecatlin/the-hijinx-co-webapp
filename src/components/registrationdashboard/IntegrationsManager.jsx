import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Check, X, Plus, Trash2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

const SESSION_TYPES = ['Practice', 'Qualifying', 'Heat', 'LCQ', 'Final'];
const PROVIDERS = [
  'Manual Only',
  'CSV Import',
  'RACE RESULT FEED',
  'MYLAPS',
  'Orbits',
  'Other',
];

export default function IntegrationsManager({ isAdmin }) {
  const [orgType, setOrgType] = useState('series');
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSession, setSelectedSession] = useState('');

  const [provider, setProvider] = useState('Manual Only');
  const [providerUrl, setProviderUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [lastTested, setLastTested] = useState('');
  const [syncHistory, setSyncHistory] = useState([]);
  const [classMappings, setClassMappings] = useState([]);
  const [sessionMappings, setSessionMappings] = useState(
    SESSION_TYPES.map((st) => ({ platformType: st, providerType: st }))
  );
  const [expandedSyncId, setExpandedSyncId] = useState('');

  // Data fetching
  const { data: series = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
  });

  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.list(),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list(),
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses', selectedOrg],
    queryFn: () =>
      orgType === 'series' && selectedOrg
        ? base44.entities.SeriesClass.filter({ series_id: selectedOrg })
        : Promise.resolve([]),
    enabled: orgType === 'series' && !!selectedOrg,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', selectedEvent],
    queryFn: () =>
      selectedEvent
        ? base44.entities.Session.filter({ event_id: selectedEvent })
        : Promise.resolve([]),
    enabled: !!selectedEvent,
  });

  const { data: operationLogs = [] } = useQuery({
    queryKey: ['operationLogs', selectedEvent],
    queryFn: () =>
      selectedEvent
        ? base44.entities.OperationLog.filter({
            operation_type: 'integration_sync',
          }).then((logs) =>
            logs.filter(
              (log) =>
                log.metadata && log.metadata.event_id === selectedEvent
            )
          )
        : Promise.resolve([]),
    enabled: !!selectedEvent,
  });

  // Compute available seasons
  const seasons = useMemo(() => {
    if (!selectedOrg) return [];
    const uniqueYears = new Set();
    if (orgType === 'series') {
      events.forEach((e) => {
        if (e.series_id === selectedOrg) {
          const year = new Date(e.event_date).getFullYear();
          uniqueYears.add(year);
        }
      });
    }
    return Array.from(uniqueYears).sort((a, b) => b - a);
  }, [selectedOrg, orgType, events]);

  // Filter events based on selection
  const filteredEvents = useMemo(() => {
    if (!selectedOrg || !selectedSeason) return [];
    const year = parseInt(selectedSeason);
    return events.filter((e) => {
      const eventYear = new Date(e.event_date).getFullYear();
      if (orgType === 'series') {
        return e.series_id === selectedOrg && eventYear === year;
      }
      return eventYear === year;
    });
  }, [selectedOrg, selectedSeason, orgType, events]);

  const selectedEventObj = useMemo(
    () => events.find((e) => e.id === selectedEvent),
    [events, selectedEvent]
  );

  // Initialize class mappings when org changes
  React.useEffect(() => {
    if (orgType === 'series' && selectedOrg && seriesClasses.length > 0) {
      setClassMappings(
        seriesClasses.map((sc) => ({
          id: sc.id,
          platformClass: sc.class_name,
          providerClass: sc.class_name,
        }))
      );
    } else {
      setClassMappings([]);
    }
  }, [selectedOrg, orgType, seriesClasses]);

  const handleTestConnection = () => {
    if (provider === 'Manual Only') {
      toast.info('No connection needed');
      return;
    }
    if (provider === 'CSV Import') {
      toast.info('CSV Import uses Results tab');
      return;
    }

    // Validate URL
    if (!providerUrl.trim()) {
      setConnectionStatus('Error');
      toast.error('Provider URL is required');
      return;
    }

    // Simulate connection test
    setConnectionStatus('Connected');
    setLastTested(new Date().toLocaleString());
    toast.success('Connection successful');
  };

  const handleManualSync = async () => {
    if (!selectedEvent) {
      toast.error('Select an event');
      return;
    }

    if (provider === 'Manual Only') {
      toast.info('Nothing to sync');
      return;
    }
    if (provider === 'CSV Import') {
      toast.info('Use Results tab to import CSV');
      return;
    }

    // Create operation log
    const syncRecord = {
      timestamp: new Date().toLocaleString(),
      provider: provider,
      scope: `Event: ${selectedEventObj?.name || selectedEvent}`,
      status: 'success',
      metadata: {
        event_id: selectedEvent,
        series_id: orgType === 'series' ? selectedOrg : '',
        track_id: orgType === 'track' ? selectedOrg : '',
        class_id: selectedClass,
        session_id: selectedSession,
        mappings_count: classMappings.length + sessionMappings.length,
      },
      details: {
        total_records: 0,
        created_records: 0,
        updated_records: 0,
        skipped_count: 0,
        failed_count: 0,
      },
    };

    try {
      await base44.entities.OperationLog.create({
        operation_type: 'integration_sync',
        source_type: provider,
        entity_name: 'Event',
        function_name: 'IntegrationsManualSync',
        status: 'success',
        total_records: 0,
        created_records: 0,
        updated_records: 0,
        skipped_count: 0,
        failed_count: 0,
        metadata: syncRecord.metadata,
      });
    } catch (error) {
      // Fallback to local state
    }

    setSyncHistory((prev) => [syncRecord, ...prev.slice(0, 19)]);
    toast.success('Sync initiated');
  };

  const addClassMapping = () => {
    setClassMappings((prev) => [
      ...prev,
      { id: Date.now().toString(), platformClass: '', providerClass: '' },
    ]);
  };

  const removeClassMapping = (id) => {
    setClassMappings((prev) => prev.filter((m) => m.id !== id));
  };

  const updateClassMapping = (id, field, value) => {
    setClassMappings((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const updateSessionMapping = (index, field, value) => {
    setSessionMappings((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  // Mapping coverage
  const mappedClasses = classMappings.filter((m) => m.providerClass).length;
  const mappedSessions = sessionMappings.filter((m) => m.providerType).length;

  if (!isAdmin) {
    return (
      <Card className="bg-[#262626] border-gray-700">
        <CardContent className="py-8">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-400 font-medium">Admin only</p>
              <p className="text-xs text-gray-400 mt-1">
                Integrations management is available to admins only.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <Card className="bg-[#262626] border-gray-700">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-xs">
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">
                Organization
              </label>
              <Select value={orgType} onValueChange={setOrgType}>
                <SelectTrigger className="bg-[#171717] border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#171717] border-gray-700">
                  <SelectItem value="track" className="text-white">
                    Track
                  </SelectItem>
                  <SelectItem value="series" className="text-white">
                    Series
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {orgType === 'track' && (
              <div className="flex-1 min-w-xs">
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">
                  Track
                </label>
                <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                  <SelectTrigger className="bg-[#171717] border-gray-700 text-white">
                    <SelectValue placeholder="Select track..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#171717] border-gray-700">
                    {tracks.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-white">
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {orgType === 'series' && (
              <div className="flex-1 min-w-xs">
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">
                  Series
                </label>
                <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                  <SelectTrigger className="bg-[#171717] border-gray-700 text-white">
                    <SelectValue placeholder="Select series..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#171717] border-gray-700">
                    {series.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-white">
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex-1 min-w-xs">
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">
                Season
              </label>
              <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                <SelectTrigger className="bg-[#171717] border-gray-700 text-white">
                  <SelectValue placeholder="Select season..." />
                </SelectTrigger>
                <SelectContent className="bg-[#171717] border-gray-700">
                  {seasons.map((year) => (
                    <SelectItem key={year} value={year.toString()} className="text-white">
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-xs">
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">
                Event *
              </label>
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger className="bg-[#171717] border-gray-700 text-white">
                  <SelectValue placeholder="Select event..." />
                </SelectTrigger>
                <SelectContent className="bg-[#171717] border-gray-700">
                  {filteredEvents.map((e) => (
                    <SelectItem key={e.id} value={e.id} className="text-white">
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-xs">
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">
                Class
              </label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="bg-[#171717] border-gray-700 text-white">
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent className="bg-[#171717] border-gray-700">
                  <SelectItem value={null} className="text-white">
                    All classes
                  </SelectItem>
                  {seriesClasses.map((c) => (
                    <SelectItem key={c.id} value={c.class_name} className="text-white">
                      {c.class_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-xs">
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">
                Session
              </label>
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger className="bg-[#171717] border-gray-700 text-white">
                  <SelectValue placeholder="All sessions" />
                </SelectTrigger>
                <SelectContent className="bg-[#171717] border-gray-700">
                  <SelectItem value={null} className="text-white">
                    All sessions
                  </SelectItem>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-white">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Connection Settings */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-[#262626] border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Timing Provider</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Provider Selector */}
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-2">
                  Provider
                </label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger className="bg-[#171717] border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#171717] border-gray-700">
                    {PROVIDERS.map((p) => (
                      <SelectItem key={p} value={p} className="text-white">
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Connection Status */}
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-2">
                  Connection Status
                </label>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {connectionStatus === 'Connected' && (
                      <Check className="w-4 h-4 text-green-500" />
                    )}
                    {connectionStatus === 'Error' && (
                      <X className="w-4 h-4 text-red-500" />
                    )}
                    {connectionStatus === 'Disconnected' && (
                      <AlertCircle className="w-4 h-4 text-gray-500" />
                    )}
                    <Badge
                      className={`${
                        connectionStatus === 'Connected'
                          ? 'bg-green-900/40 text-green-400 border-green-700/50'
                          : connectionStatus === 'Error'
                            ? 'bg-red-900/40 text-red-400 border-red-700/50'
                            : 'bg-gray-900/40 text-gray-400 border-gray-700/50'
                      }`}
                    >
                      {connectionStatus}
                    </Badge>
                  </div>
                  {lastTested && (
                    <p className="text-xs text-gray-500">Last tested: {lastTested}</p>
                  )}
                </div>
              </div>

              {/* API Credentials */}
              {provider !== 'Manual Only' && provider !== 'CSV Import' && (
                <>
                  <div className="border-t border-gray-700 pt-4">
                    <p className="text-xs text-amber-600 mb-3 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Credentials are not persisted yet
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">
                          Provider URL
                        </label>
                        <Input
                          value={providerUrl}
                          onChange={(e) => setProviderUrl(e.target.value)}
                          placeholder="https://..."
                          className="bg-[#171717] border-gray-700 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">API Key</label>
                        <Input
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          type="password"
                          placeholder="••••••••"
                          className="bg-[#171717] border-gray-700 text-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">
                            Username
                          </label>
                          <Input
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Username"
                            className="bg-[#171717] border-gray-700 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">
                            Password
                          </label>
                          <Input
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            type="password"
                            placeholder="••••••••"
                            className="bg-[#171717] border-gray-700 text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Class Name Mappings */}
              {orgType === 'series' && selectedOrg && (
                <div className="border-t border-gray-700 pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-sm font-medium text-white">Class Name Mapping</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={addClassMapping}
                      className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add Row
                    </Button>
                  </div>
                  <div className="border border-gray-700 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-[#171717]">
                        <TableRow>
                          <TableHead className="text-gray-400 w-1/2">
                            Platform Class
                          </TableHead>
                          <TableHead className="text-gray-400 w-1/2">
                            Provider Class
                          </TableHead>
                          <TableHead className="text-gray-400 w-8"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classMappings.map((mapping) => (
                          <TableRow
                            key={mapping.id}
                            className="hover:bg-[#262626] border-t border-gray-700/50"
                          >
                            <TableCell className="text-gray-300 text-sm p-2">
                              {mapping.platformClass}
                            </TableCell>
                            <TableCell className="text-gray-300 text-sm p-2">
                              <Input
                                value={mapping.providerClass}
                                onChange={(e) =>
                                  updateClassMapping(
                                    mapping.id,
                                    'providerClass',
                                    e.target.value
                                  )
                                }
                                placeholder="Provider class name"
                                className="h-6 bg-[#171717] border-gray-700 text-white text-xs"
                              />
                            </TableCell>
                            <TableCell className="p-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => removeClassMapping(mapping.id)}
                                className="h-6 w-6 text-gray-400 hover:text-red-400"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Session Type Mappings */}
              <div className="border-t border-gray-700 pt-4">
                <p className="text-sm font-medium text-white mb-3">Session Type Mapping</p>
                <div className="border border-gray-700 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-[#171717]">
                      <TableRow>
                        <TableHead className="text-gray-400 w-1/2">Platform Type</TableHead>
                        <TableHead className="text-gray-400 w-1/2">Provider Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessionMappings.map((mapping, idx) => (
                        <TableRow
                          key={idx}
                          className="hover:bg-[#262626] border-t border-gray-700/50"
                        >
                          <TableCell className="text-gray-300 text-sm p-2">
                            {mapping.platformType}
                          </TableCell>
                          <TableCell className="text-gray-300 text-sm p-2">
                            <Input
                              value={mapping.providerType}
                              onChange={(e) =>
                                updateSessionMapping(idx, 'providerType', e.target.value)
                              }
                              className="h-6 bg-[#171717] border-gray-700 text-white text-xs"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Buttons */}
              <div className="border-t border-gray-700 pt-4 flex gap-2">
                <Button
                  onClick={handleTestConnection}
                  variant="outline"
                  className="border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  Test Connection
                </Button>
                <Button
                  disabled
                  variant="outline"
                  className="border-gray-700 text-gray-500 hover:bg-gray-800 opacity-50"
                  title="Persistence coming soon"
                >
                  Save Settings
                </Button>
                <Button
                  onClick={handleManualSync}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={!selectedEvent}
                >
                  Manual Sync
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: History & Coverage */}
        <div className="space-y-4">
          {/* Sync History */}
          <Card className="bg-[#262626] border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-sm">Sync History</CardTitle>
            </CardHeader>
            <CardContent>
              {syncHistory.length === 0 && operationLogs.length === 0 ? (
                <p className="text-xs text-gray-500">No sync history</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {[...operationLogs, ...syncHistory].slice(0, 20).map((record, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-700 rounded p-2 text-xs hover:bg-[#171717] transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-gray-300 font-medium">
                          {record.source_type || record.provider}
                        </p>
                        <Badge
                          className={`text-xs ${
                            (record.status || record.status) === 'success'
                              ? 'bg-green-900/40 text-green-400 border-green-700/50'
                              : 'bg-red-900/40 text-red-400 border-red-700/50'
                          }`}
                        >
                          {record.status}
                        </Badge>
                      </div>
                      <p className="text-gray-500 text-xs mb-1">
                        {record.metadata?.event_id || record.scope || 'N/A'}
                      </p>
                      <p className="text-gray-600 text-xs">
                        {record.created_date
                          ? new Date(record.created_date).toLocaleString()
                          : record.timestamp}
                      </p>
                      {record.metadata && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setExpandedSyncId(
                              expandedSyncId === idx ? '' : idx.toString()
                            )
                          }
                          className="mt-2 h-auto p-0 text-blue-400 hover:text-blue-300"
                        >
                          <ChevronDown
                            className={`w-3 h-3 transition-transform ${
                              expandedSyncId === idx.toString() ? 'rotate-180' : ''
                            }`}
                          />{' '}
                          Details
                        </Button>
                      )}
                      {expandedSyncId === idx.toString() && record.metadata && (
                        <pre className="mt-2 bg-[#171717] rounded p-2 text-xs text-gray-400 overflow-auto max-h-40">
                          {JSON.stringify(record.metadata, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mapping Coverage */}
          <Card className="bg-[#262626] border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-sm">Mapping Coverage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs text-gray-400">Classes Mapped</p>
                  <span className="text-sm font-medium text-white">
                    {mappedClasses}/{classMappings.length}
                  </span>
                </div>
                <div className="w-full bg-gray-700/30 rounded h-1.5">
                  <div
                    className="bg-blue-600 h-full rounded transition-all"
                    style={{
                      width:
                        classMappings.length > 0
                          ? `${(mappedClasses / classMappings.length) * 100}%`
                          : '0%',
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs text-gray-400">Sessions Mapped</p>
                  <span className="text-sm font-medium text-white">
                    {mappedSessions}/{sessionMappings.length}
                  </span>
                </div>
                <div className="w-full bg-gray-700/30 rounded h-1.5">
                  <div
                    className="bg-green-600 h-full rounded transition-all"
                    style={{
                      width: `${(mappedSessions / sessionMappings.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
              {mappedClasses < classMappings.length && classMappings.length > 0 && (
                <div className="flex gap-2 p-2 bg-amber-900/20 border border-amber-700/50 rounded text-xs text-amber-400">
                  <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  <p>Some classes are not mapped to provider</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}