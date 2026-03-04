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
  const [forceDefault, setForceDefault] = useState(false);

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

  // Load PointsConfig
  const { data: allConfigs = [] } = useQuery({
    queryKey: ['pointsConfigs'],
    queryFn: () => base44.entities.PointsConfig.list()
  });

  const resolvedConfig = useMemo(() => {
    if (!targetSeriesId || !targetSeasonYear) return null;

    // Try specific class config
    const classConfig = allConfigs.find(c =>
      c.series_id === targetSeriesId &&
      c.season_year === targetSeasonYear &&
      c.series_class_id === targetSeriesClassId &&
      c.status === 'Active'
    );
    if (classConfig) return classConfig;

    // Fall back to series-wide config
    if (targetSeriesClassId) {
      const seriesConfig = allConfigs.find(c =>
        c.series_id === targetSeriesId &&
        c.season_year === targetSeasonYear &&
        (!c.series_class_id || c.series_class_id === null) &&
        c.status === 'Active'
      );
      if (seriesConfig) return seriesConfig;
    }

    return null;
  }, [allConfigs, targetSeriesId, targetSeasonYear, targetSeriesClassId]);

  // Load Standings
  const { data: standings = [] } = useQuery({
    queryKey: ['standings', targetSeriesId, targetSeasonYear, targetSeriesClassId],
    queryFn: async () => {
      if (!targetSeriesId || !targetSeasonYear) return [];

      const query = {
        series_id: targetSeriesId,
        season_year: targetSeasonYear
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
          season_year: targetSeasonYear,
          series_class_id: targetSeriesClassId || null,
          event_id: selectedEvent?.id || null,
          force_default: forceDefault
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
      {/* Config Info Card */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Points Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resolvedConfig ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{resolvedConfig.name || 'Points Configuration'}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Scope: <span className="font-mono">{resolvedConfig.calculation_scope}</span> | 
                    Drop Rounds: <span className="font-mono">{resolvedConfig.drop_rounds}</span>
                  </p>
                </div>
                <Badge className="bg-green-500/20 text-green-400">Active</Badge>
              </div>
            </div>
          ) : (
            <Alert className="bg-orange-500/10 border-orange-600">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-600">
                No active points rules configured for {selectedSeries?.name} {selectedClass?.class_name ? `/ ${selectedClass.class_name}` : ''} {targetSeasonYear}.
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
                  Last calculated: {standings[0]?.last_calculated ? new Date(standings[0].last_calculated).toLocaleString() : 'Never'}
                </p>
              </div>
              <div className="flex gap-2">
                {!resolvedConfig && (
                  <label className="flex items-center gap-2 text-sm text-gray-400">
                    <input type="checkbox" checked={forceDefault} onChange={(e) => setForceDefault(e.target.checked)} />
                    Use Default Points
                  </label>
                )}
                <Button
                  onClick={() => calculateMutation.mutate()}
                  disabled={isCalculating || (!resolvedConfig && !forceDefault)}
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
                    <TableHead className="text-gray-400 text-right">Podiums</TableHead>
                    <TableHead className="text-gray-400 text-right">Top 5</TableHead>
                    <TableHead className="text-gray-400 text-right">Rounds</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standingsWithInfo.map((s, idx) => (
                    <TableRow key={s.id} className="border-gray-700 hover:bg-gray-800">
                      <TableCell className="text-white font-bold">{s.position}</TableCell>
                      <TableCell className="text-white">{s.driver?.first_name} {s.driver?.last_name}</TableCell>
                      <TableCell className="text-right text-white font-semibold">{s.points_total}</TableCell>
                      <TableCell className="text-right text-gray-400">{s.wins}</TableCell>
                      <TableCell className="text-right text-gray-400">{s.podiums}</TableCell>
                      <TableCell className="text-right text-gray-400">{s.top5}</TableCell>
                      <TableCell className="text-right text-gray-400">{s.rounds_counted}</TableCell>
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