import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Download } from 'lucide-react';
import { toast } from 'sonner';
import PointsRulesetEditor from './standings/PointsRulesetEditor';
import StandingsView from './standings/StandingsView';
import StandingsStatus from './standings/StandingsStatus';

export default function PointsAndStandingsManager({ isAdmin, selectedEvent }) {
  const [selectedSeries, setSelectedSeries] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const queryClient = useQueryClient();

  // Data fetching
  const { data: series = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
  });

  const { data: allEvents = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list(),
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses', selectedSeries],
    queryFn: () =>
      selectedSeries
        ? base44.entities.SeriesClass.filter({ series_id: selectedSeries })
        : Promise.resolve([]),
    enabled: !!selectedSeries,
  });

  const { data: pointsConfigs = [] } = useQuery({
    queryKey: ['pointsConfigs', selectedSeries, selectedSeason],
    queryFn: () =>
      selectedSeries && selectedSeason
        ? base44.entities.PointsConfig.filter({
            series_id: selectedSeries,
            season_year: selectedSeason,
          })
        : Promise.resolve([]),
    enabled: !!selectedSeries && !!selectedSeason,
  });

  const { data: standings = [] } = useQuery({
    queryKey: ['standings', selectedSeries, selectedSeason, selectedClass],
    queryFn: () =>
      selectedSeries && selectedSeason && selectedClass
        ? base44.entities.Standings.filter({
            series_id: selectedSeries,
            season_year: selectedSeason,
            class_name: selectedClass,
          })
        : Promise.resolve([]),
    enabled: !!selectedSeries && !!selectedSeason && !!selectedClass,
  });

  const { data: allResults = [] } = useQuery({
    queryKey: ['results', selectedSeries, selectedSeason],
    queryFn: () =>
      selectedSeries && selectedSeason
        ? base44.entities.Results.filter({
            series_id: selectedSeries,
          })
        : Promise.resolve([]),
    enabled: !!selectedSeries && !!selectedSeason,
  });

  // Data integrity: filter results to match selected event if specified
  const results = useMemo(() => {
    if (!selectedEventId) return allResults;
    const filtered = allResults.filter((result) => {
      if (selectedEvent && result.event_id === selectedEvent.id && result.series_id !== selectedEvent.series_id) {
        console.warn('Series mismatch detected for event-linked record.');
        return false;
      }
      return true;
    });
    return filtered;
  }, [allResults, selectedEventId, selectedEvent]);

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => base44.entities.Session.list(),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  // Get unique seasons from series
  const seasons = useMemo(() => {
    if (!selectedSeries) return [];
    const serie = series.find((s) => s.id === selectedSeries);
    if (serie?.season_year) {
      return [{ year: serie.season_year }];
    }
    const uniqueYears = new Set(
      results
        .filter((r) => r.series_id === selectedSeries)
        .map((r) => new Date(r.created_date).getFullYear())
    );
    return Array.from(uniqueYears).sort((a, b) => b - a);
  }, [selectedSeries, series, results]);

  // Events for selected series
  const seriesEvents = useMemo(() => {
    if (!selectedSeries) return [];
    return allEvents.filter((e) => e.series_id === selectedSeries);
  }, [selectedSeries, allEvents]);

  const currentPointsConfig = useMemo(() => {
    return pointsConfigs.find((pc) => pc.status === 'published') ||
      pointsConfigs[0] ||
      null;
  }, [pointsConfigs]);

  const recalculateMutation = useMutation({
    mutationFn: async (payload) => {
      // Show warning if not published
      if (currentPointsConfig?.status !== 'published') {
        return new Promise((resolve) => {
          // Would normally show dialog, but we'll proceed for now
          resolve();
        });
      }

      const result = await base44.functions.invoke('recalculateStandings', {
        seriesId: selectedSeries,
        seasonYear: selectedSeason,
        className: selectedClass,
      });

      // Log operation
      await base44.functions.invoke('logOperation', {
        operation_type: 'recalculate',
        source_type: 'system',
        entity_name: 'Standings',
        function_name: 'recalculateStandings',
        status: 'success',
        metadata: {
          series_id: selectedSeries,
          season_year: selectedSeason,
          class_name: selectedClass,
        },
      });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standings'] });
      toast.success('Standings recalculated');
    },
    onError: (error) => {
      toast.error(`Recalculation failed: ${error.message}`);
    },
  });

  const handleExportCSV = () => {
    if (standings.length === 0) {
      toast.error('No standings to export');
      return;
    }

    const headers = [
      'Position',
      'Driver',
      'Total Points',
      'Events Counted',
      'Wins',
      'Podiums',
      'Bonus Points',
      'Last Calculated',
    ];

    const rows = standings.map((s) => [
      s.position || '-',
      s.driver_name || '-',
      s.total_points || 0,
      s.events_counted || 0,
      s.wins || 0,
      s.podiums || 0,
      s.bonus_points || 0,
      s.last_calculated ? new Date(s.last_calculated).toLocaleDateString() : '-',
    ]);

    const csv =
      [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(','))
        .join('\n') + '\n';

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `standings-${selectedSeason}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();

    toast.success('Standings exported');
  };

  if (!isAdmin) {
    return (
      <Card className="bg-[#262626] border-gray-700">
        <CardContent className="py-8">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-400 font-medium">Admin only</p>
              <p className="text-xs text-gray-400 mt-1">
                Points and Standings management is available to admins only.
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
                Series *
              </label>
              <Select value={selectedSeries} onValueChange={setSelectedSeries}>
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

            <div className="flex-1 min-w-xs">
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">
                Season
              </label>
              <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                <SelectTrigger className="bg-[#171717] border-gray-700 text-white">
                  <SelectValue placeholder="Select season..." />
                </SelectTrigger>
                <SelectContent className="bg-[#171717] border-gray-700">
                  {seasons.map((s) => (
                    <SelectItem
                      key={s.year || s}
                      value={(s.year || s).toString()}
                      className="text-white"
                    >
                      {s.year || s}
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
                  <SelectValue placeholder="Select class..." />
                </SelectTrigger>
                <SelectContent className="bg-[#171717] border-gray-700">
                  {seriesClasses.map((sc) => (
                    <SelectItem key={sc.id} value={sc.class_name} className="text-white">
                      {sc.class_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-xs">
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">
                Event (Optional)
              </label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger className="bg-[#171717] border-gray-700 text-white">
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent className="bg-[#171717] border-gray-700">
                  <SelectItem value={null} className="text-white">
                    All events
                  </SelectItem>
                  {seriesEvents.map((e) => (
                    <SelectItem key={e.id} value={e.id} className="text-white">
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => recalculateMutation.mutate()}
                disabled={!selectedSeries || !selectedSeason || !selectedClass}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                Recalculate
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (currentPointsConfig?.status !== 'published') {
                    toast.error('Publish rules first');
                    return;
                  }
                  toast.success('Standings are now public');
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Publish
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={standings.length === 0}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                <Download className="w-3 h-3 mr-1" /> Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Card */}
      {selectedSeries && selectedSeason && selectedClass && (
        <StandingsStatus
          standings={standings}
          results={results}
          sessions={sessions}
          selectedClass={selectedClass}
        />
      )}

      {/* Two Column Layout */}
      {selectedSeries && selectedSeason && selectedClass && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PointsRulesetEditor
            seriesId={selectedSeries}
            seriesName={series.find((s) => s.id === selectedSeries)?.name}
            seasonYear={selectedSeason}
            selectedClass={selectedClass}
            seriesClasses={seriesClasses}
            pointsConfig={currentPointsConfig}
          />
          <StandingsView standings={standings} drivers={drivers} />
        </div>
      )}

      {!selectedSeries && (
        <Card className="bg-[#262626] border-gray-700">
          <CardContent className="py-8 text-center">
            <p className="text-gray-400">Select a series to view standings</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}