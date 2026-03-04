import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function PointsAndStandingsManager({
  selectedEvent,
  selectedSeries,
  selectedClass,
  dashboardContext,
  isAdmin
}) {
  const queryClient = useQueryClient();
  const [isCalculating, setIsCalculating] = useState(false);


  // Determine target IDs for resolution
  const targetSeriesId = useMemo(() => {
    if (dashboardContext?.orgType === 'series' && selectedSeries?.id) {
      return selectedSeries.id;
    }
    if (dashboardContext?.orgType === 'track' && selectedEvent?.series_id) {
      return selectedEvent.series_id;
    }
    return null;
  }, [dashboardContext, selectedEvent, selectedSeries]);

  const targetSeasonYear = useMemo(() => dashboardContext?.seasonYear, [dashboardContext]);
  const targetSeriesClassId = useMemo(() => selectedClass?.id || null, [selectedClass]);

  // Resolve PointsConfig using the backend function
  const { data: configResolution } = useQuery({
    queryKey: ['resolvedPointsConfig', targetSeriesId, targetSeasonYear, targetSeriesClassId],
    queryFn: async () => {
      if (!targetSeriesId || !targetSeasonYear) return null;
      const result = await base44.functions.invoke('resolvePointsConfig', {
        series_id: targetSeriesId,
        series_class_id: targetSeriesClassId || null,
        season: targetSeasonYear
      });
      return result.data?.ok ? result.data.pointsConfig : null;
    },
    enabled: !!targetSeriesId && !!targetSeasonYear
  });

  const resolvedConfig = configResolution;

  // Load Standings
  const { data: standings = [] } = useQuery({
    queryKey: ['standings', targetSeriesId, targetSeasonYear, targetSeriesClassId],
    queryFn: async () => {
      if (!targetSeriesId || !targetSeasonYear) return [];

      const query = {
        series_id: targetSeriesId,
        season: targetSeasonYear
      };
      if (targetSeriesClassId) {
        query.series_class_id = targetSeriesClassId;
      }

      return await base44.entities.Standings.filter(query);
    },
    enabled: !!targetSeriesId && !!targetSeasonYear
  });

  // Load Driver info for standings display
  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list()
  });

  const standingsWithInfo = useMemo(() => {
    return standings.map(s => ({
      ...s,
      driver: drivers.find(d => d.id === s.driver_id)
    })).sort((a, b) => a.position - b.position);
  }, [standings, drivers]);

  // Calculate Standings mutation
  const calculateMutation = useMutation({
    mutationFn: async () => {
      setIsCalculating(true);
      try {
        const response = await base44.functions.invoke('recalculateStandings', {
          series_id: targetSeriesId,
          season: targetSeasonYear,
          series_class_id: targetSeriesClassId || null
        });

        await queryClient.invalidateQueries({ queryKey: ['standings'] });
        return response.data;
      } finally {
        setIsCalculating(false);
      }
    }
  });

  if (!targetSeriesId || !targetSeasonYear) {
    return (
      <Alert className="bg-yellow-500/10 border-yellow-600">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-600">
          Select a series and season to view standings.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Ruleset Card */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Active Ruleset
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {resolvedConfig ? (
            <>
              <div>
                <p className="text-sm font-medium text-white">{resolvedConfig.name}</p>
                <p className="text-xs text-gray-400 mt-1">Priority: {resolvedConfig.priority}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 mb-2">Applies to Session Types:</p>
                <div className="flex flex-wrap gap-1">
                  {(resolvedConfig.applies_to_session_types || ['Final']).map(type => (
                    <Badge key={type} className="bg-blue-500/20 text-blue-300 text-xs">{type}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 mb-2">Points Table (first 10):</p>
                <p className="text-xs text-gray-300 font-mono">
                  {(resolvedConfig.points_by_position || []).slice(0, 10).join(', ')}...
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 mb-2">Tie Breaker Order:</p>
                <p className="text-xs text-gray-300">{(resolvedConfig.tie_breaker_order || []).join(' → ') || 'N/A'}</p>
              </div>
            </>
          ) : (
            <Alert className="bg-orange-500/10 border-orange-600">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-600 text-xs">
                No active points ruleset configured for {selectedSeries?.name} {selectedClass?.class_name ? `/ ${selectedClass.class_name}` : ''} {targetSeasonYear}.
                {isAdmin && ' Go to Management → Points Configuration to set up.'}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Calculation Controls */}
      {isAdmin && (
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-white font-medium">Recalculate Standings</p>
                <p className="text-xs text-gray-400 mt-1">
                  Uses active ruleset: {resolvedConfig?.name || 'None'}
                </p>
              </div>
              <Button
                    onClick={() => calculateMutation.mutate()}
                    disabled={isCalculating || !resolvedConfig}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isCalculating ? 'animate-spin' : ''}`} />
                    {isCalculating ? 'Calculating...' : 'Recalculate'}
                  </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Standings Table */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Standings</CardTitle>
        </CardHeader>
        <CardContent>
          {standingsWithInfo.length === 0 ? (
            <p className="text-gray-400 text-sm">No standings calculated yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-400">Position</TableHead>
                    <TableHead className="text-gray-400">Driver</TableHead>
                    <TableHead className="text-gray-400 text-right">Points</TableHead>
                    <TableHead className="text-gray-400 text-right">Wins</TableHead>
                    <TableHead className="text-gray-400 text-right">2nd Place</TableHead>
                    <TableHead className="text-gray-400 text-right">3rd Place</TableHead>
                    <TableHead className="text-gray-400 text-right">Results</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standingsWithInfo.map((s, idx) => (
                    <TableRow key={s.id} className="border-gray-700 hover:bg-gray-800">
                        <TableCell className="text-white font-bold">{idx + 1}</TableCell>
                        <TableCell className="text-white">{s.driver?.first_name} {s.driver?.last_name}</TableCell>
                        <TableCell className="text-right text-white font-semibold">{s.total_points}</TableCell>
                        <TableCell className="text-right text-gray-400">{s.wins}</TableCell>
                        <TableCell className="text-right text-gray-400">{s.seconds}</TableCell>
                        <TableCell className="text-right text-gray-400">{s.thirds}</TableCell>
                        <TableCell className="text-right text-gray-400">{s.results_count}</TableCell>
                      </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}