import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Download, Copy, FileJson } from 'lucide-react';
import { toast } from 'sonner';

export default function ExportsDataHub({ selectedEvent, dashboardContext, dashboardPermissions }) {
  // Load all data
  const { data: entries = [] } = useQuery({
    queryKey: ['racecore', 'exports', 'entries', selectedEvent.id],
    queryFn: () => base44.entities.Entry.filter({ event_id: selectedEvent.id }),
    enabled: !!selectedEvent.id,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['racecore', 'exports', 'sessions', selectedEvent.id],
    queryFn: () => base44.entities.Session.filter({ event_id: selectedEvent.id }),
    enabled: !!selectedEvent.id,
  });

  const { data: results = [] } = useQuery({
    queryKey: ['racecore', 'exports', 'results', selectedEvent.id],
    queryFn: () => base44.entities.Results.filter({ event_id: selectedEvent.id }),
    enabled: !!selectedEvent.id,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['racecore', 'exports', 'drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['racecore', 'exports', 'teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['racecore', 'exports', 'classes'],
    queryFn: () => base44.entities.SeriesClass.list(),
  });

  const { data: standings = [] } = useQuery({
    queryKey: ['racecore', 'exports', 'standings', selectedEvent.id],
    queryFn: () => base44.entities.Standings.filter({ season_year: selectedEvent.season }),
    enabled: !!selectedEvent.season,
  });

  // Mutation for logging
  const logExport = useMutation({
    mutationFn: (data) => base44.asServiceRole.entities.OperationLog.create(data),
  });

  // Build maps
  const driverMap = useMemo(() => new Map(drivers.map(d => [d.id, d])), [drivers]);
  const teamMap = useMemo(() => new Map(teams.map(t => [t.id, t])), [teams]);
  const classMap = useMemo(() => new Map(seriesClasses.map(c => [c.id, c])), [seriesClasses]);

  // CSV builder
  const buildCSV = (data) => {
    if (!data || data.length === 0) return '';
    const keys = Object.keys(data[0]);
    const header = keys.join(',');
    const rows = data.map(row =>
      keys.map(key => {
        const val = row[key];
        if (val === null || val === undefined) return '';
        const str = String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(',')
    );
    return [header, ...rows].join('\n');
  };

  // Helper to download file
  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export handlers
  const handleExport = async (exportType, data, format) => {
    try {
      let content, filename, mimeType;

      if (format === 'csv') {
        content = buildCSV(data);
        filename = `${selectedEvent.name}-${exportType}.csv`;
        mimeType = 'text/csv';
        downloadFile(content, filename, mimeType);
      } else if (format === 'json') {
        content = JSON.stringify(data, null, 2);
        filename = `${selectedEvent.name}-${exportType}.json`;
        mimeType = 'application/json';
        downloadFile(content, filename, mimeType);
      } else if (format === 'clipboard') {
        await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      }

      // Log export
      await logExport.mutateAsync({
        operation_type: 'racecore_export',
        entity_name: 'Event',
        entity_id: selectedEvent.id,
        status: 'success',
        metadata: {
          event_id: selectedEvent.id,
          export_type: exportType,
          format: format,
          record_count: data.length,
        },
      });

      toast.success(`${exportType} exported as ${format}`);
    } catch (error) {
      toast.error('Export failed');
      console.error(error);
    }
  };

  // Build data for each export type
  const entryListData = useMemo(() => {
    return entries.map(e => {
      const driver = driverMap.get(e.driver_id);
      const team = teamMap.get(e.team_id);
      const eventClass = classMap.get(e.series_class_id);
      return {
        car_number: e.car_number,
        driver_name: driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown',
        class_name: eventClass?.class_name || 'Unknown',
        team_name: team?.name || 'N/A',
        entry_status: e.entry_status || 'Registered',
        payment_status: e.payment_status || 'Unpaid',
      };
    });
  }, [entries, driverMap, teamMap, classMap]);

  const sessionResultsData = useMemo(() => {
    return results.map(r => {
      const session = sessions.find(s => s.id === r.session_id);
      const driver = driverMap.get(r.driver_id);
      const team = teamMap.get(r.team_id);
      const entry = entries.find(e => e.driver_id === r.driver_id);
      return {
        session_name: session?.name || 'Unknown',
        position: r.position || 'DNF',
        driver_name: driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown',
        team_name: team?.name || 'N/A',
        car_number: entry?.car_number || 'N/A',
        time: r.total_time_ms ? `${(r.total_time_ms / 1000).toFixed(2)}s` : 'N/A',
        laps: r.laps_completed || 'N/A',
        status: r.status || 'Running',
      };
    });
  }, [results, sessions, driverMap, teamMap, entries]);

  const driverRosterData = useMemo(() => {
    return drivers.map(d => ({
      driver_name: `${d.first_name} ${d.last_name}`,
      team_name: teamMap.get(d.team_id)?.name || 'N/A',
      discipline: d.primary_discipline || 'N/A',
      manufacturer: d.manufacturer || 'N/A',
      hometown: d.hometown_city ? `${d.hometown_city}, ${d.hometown_state}` : 'N/A',
    }));
  }, [drivers, teamMap]);

  const classRostersData = useMemo(() => {
    const byClass = {};
    entries.forEach(e => {
      const classId = e.series_class_id || 'unassigned';
      if (!byClass[classId]) byClass[classId] = [];
      const driver = driverMap.get(e.driver_id);
      if (driver) {
        byClass[classId].push({
          class_name: classMap.get(classId)?.class_name || 'Unknown',
          car_number: e.car_number,
          driver_name: `${driver.first_name} ${driver.last_name}`,
          team_name: teamMap.get(e.team_id)?.name || 'N/A',
        });
      }
    });
    return Object.values(byClass).flat();
  }, [entries, driverMap, teamMap, classMap]);

  const announcerData = useMemo(() => {
    return entries.map(e => {
      const driver = driverMap.get(e.driver_id);
      const team = teamMap.get(e.team_id);
      const eventClass = classMap.get(e.series_class_id);
      const latestResult = results.find(r => r.driver_id === e.driver_id);
      return {
        driver_name: driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown',
        team_name: team?.name || 'N/A',
        car_number: e.car_number,
        class_name: eventClass?.class_name || 'Unknown',
        latest_finish: latestResult?.position || 'N/A',
        hometown: driver?.hometown_city || 'N/A',
        manufacturer: driver?.manufacturer || 'N/A',
      };
    });
  }, [entries, driverMap, teamMap, classMap, results]);

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
          <p className="text-gray-400">Select an event to access exports</p>
        </CardContent>
      </Card>
    );
  }

  // Export card component
  const ExportCard = ({ title, description, data, exportTypes }) => (
    <Card className="bg-[#171717] border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white">{title}</CardTitle>
            {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
          </div>
          <Badge variant="outline" className="text-xs">{data.length} records</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.length === 0 ? (
          <p className="text-sm text-gray-400">No data to export</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {exportTypes.includes('csv') && (
              <Button
                onClick={() => handleExport(title, data, 'csv')}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-xs"
              >
                <Download className="w-3 h-3 mr-1" /> CSV
              </Button>
            )}
            {exportTypes.includes('json') && (
              <Button
                onClick={() => handleExport(title, data, 'json')}
                size="sm"
                variant="outline"
                className="border-gray-700 text-gray-300 hover:bg-gray-800 text-xs"
              >
                <FileJson className="w-3 h-3 mr-1" /> JSON
              </Button>
            )}
            {exportTypes.includes('clipboard') && (
              <Button
                onClick={() => handleExport(title, data, 'clipboard')}
                size="sm"
                variant="outline"
                className="border-gray-700 text-gray-300 hover:bg-gray-800 text-xs"
              >
                <Copy className="w-3 h-3 mr-1" /> Copy
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Index46 Data Hub</CardTitle>
          <p className="text-sm text-gray-400 mt-2">Export operational race data for media, timing, broadcasting, and public pages</p>
        </CardHeader>
      </Card>

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ExportCard
          title="Entry List"
          description="All registered entries with driver and team info"
          data={entryListData}
          exportTypes={['csv', 'json', 'clipboard']}
        />
        <ExportCard
          title="Session Results"
          description="Results from all sessions with finishing positions"
          data={sessionResultsData}
          exportTypes={['csv', 'json', 'clipboard']}
        />
        <ExportCard
          title="Driver Roster"
          description="Full driver roster with discipline and manufacturer"
          data={driverRosterData}
          exportTypes={['csv', 'json', 'clipboard']}
        />
        <ExportCard
          title="Class Rosters"
          description="Drivers organized by racing class"
          data={classRostersData}
          exportTypes={['csv', 'json', 'clipboard']}
        />
        {standings.length > 0 ? (
          <ExportCard
            title="Standings"
            description="Championship standings for the season"
            data={standings.map(s => ({
              position: s.position,
              driver_name: `${s.first_name} ${s.last_name}`,
              class_name: s.class_name,
              total_points: s.total_points,
              wins: s.wins || 0,
              podiums: s.podiums || 0,
            }))}
            exportTypes={['csv', 'json', 'clipboard']}
          />
        ) : (
          <Card className="bg-[#171717] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Standings</CardTitle>
              <p className="text-xs text-gray-400 mt-1">Championship standings</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-400">Standings not available yet</p>
            </CardContent>
          </Card>
        )}
        <ExportCard
          title="Announcer Data"
          description="Driver and team info for broadcasters"
          data={announcerData}
          exportTypes={['csv', 'json', 'clipboard']}
        />
      </div>
    </div>
  );
}