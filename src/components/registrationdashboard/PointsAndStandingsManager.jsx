import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, RefreshCw, CheckCircle2, X } from 'lucide-react';

export default function PointsAndStandingsManager({
  selectedEvent,
  selectedSeries,
  selectedClass,
  dashboardContext,
  isAdmin
}) {
  const queryClient = useQueryClient();
  const [isCalculating, setIsCalculating] = useState(false);
  const [overrideRulesetId, setOverrideRulesetId] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);

  // Check permission for configure_points
  React.useEffect(() => {
    (async () => {
      const user = await base44.auth.me();
      setHasPermission(user?.role === 'admin' || (isAdmin === true));
    })();
  }, [isAdmin]);

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
  const targetEventId = useMemo(() => selectedEvent?.id || null, [selectedEvent]);

  // Load PointsRuleSet options
  const { data: rulesets = [] } = useQuery({
    queryKey: ['pointsRuleSets'],
    queryFn: () => base44.entities.PointsRuleSet.list().catch(() => [])
  });

  // Filter rulesets for event
  const applicableRulesets = useMemo(() => {
    return rulesets.filter(r =>
      r.status === 'active' &&
      (r.series_id === selectedEvent?.series_id || r.track_id === selectedEvent?.track_id)
    );
  }, [rulesets, selectedEvent]);

  // Resolve PointsRuleSet using the backend function
  const { data: rulesetResolution } = useQuery({
    queryKey: ['resolvedPointsRuleSet', targetEventId, targetSeriesClassId],
    queryFn: async () => {
      if (!targetEventId) return null;
      const result = await base44.functions.invoke('resolvePointsRuleSet', {
        eventId: targetEventId,
        seriesClassId: targetSeriesClassId || null
      });
      return result.data;
    },
    enabled: !!targetEventId
  });

  const resolvedRuleset = rulesetResolution?.ruleset;
  const resolutionSource = rulesetResolution?.source;

  // Load Standings
  const { data: standings = [] } = useQuery({
    queryKey: ['standings', targetSeriesId, targetSeasonYear, targetSeriesClassId],
    queryFn: async () => {
      if (!targetSeriesId) return [];

      const query = {
        series_id: targetSeriesId
      };
      if (targetSeasonYear) {
        query.season_year = targetSeasonYear;
      }
      if (targetSeriesClassId) {
        query.series_class_id = targetSeriesClassId;
      }

      return await base44.entities.Standings.filter(query).catch(() => []);
    },
    enabled: !!targetSeriesId
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
    })).sort((a, b) => (a.rank || a.position || 0) - (b.rank || b.position || 0));
  }, [standings, drivers]);

  // Calculate Standings mutation
  const calculateMutation = useMutation({
    mutationFn: async () => {
      setIsCalculating(true);
      try {
        const response = await base44.functions.invoke('recalculateStandings', {
          series_id: targetSeriesId,
          season: targetSeasonYear || null,
          series_class_id: targetSeriesClassId || null,
          event_id: targetEventId || null
        });

        if (response.data?.ok) {
          await queryClient.invalidateQueries({ queryKey: ['standings'] });
        }
        return response.data;
      } finally {
        setIsCalculating(false);
      }
    }
  });

  if (!targetSeriesId) {
    return (
      <Alert className="bg-yellow-500/10 border-yellow-600">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-600">
          Select a series to view standings.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resolved RuleSet Panel */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Resolved Points Ruleset
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {resolvedRuleset ? (
            <>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-white">{resolvedRuleset.name}</p>
                  <p className="text-xs text-gray-400 mt-1">Priority: {resolvedRuleset.priority || 0}</p>
                </div>
                <div className="flex gap-1">
                  {resolutionSource === 'event_override' && (
                    <Badge className="bg-purple-500/20 text-purple-300 text-xs">Event Override</Badge>
                  )}
                  {resolutionSource === 'series' && (
                    <Badge className="bg-blue-500/20 text-blue-300 text-xs">Series Ruleset</Badge>
                  )}
                  {resolutionSource === 'track' && (
                    <Badge className="bg-indigo-500/20 text-indigo-300 text-xs">Track Ruleset</Badge>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 mb-2">Applies to Session Types:</p>
                <div className="flex flex-wrap gap-1">
                  {(resolvedRuleset.applies_to_session_types || ['Final']).map(type => (
                    <Badge key={type} className="bg-blue-500/20 text-blue-300 text-xs">{type}</Badge>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <Alert className="bg-orange-500/10 border-orange-600">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-600 text-xs">
                No active ruleset found for {selectedEvent?.name || 'this event'}.
                {isAdmin && ' Create one in Management → Points Configuration then try again.'}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Event Override Section */}
      {hasPermission && selectedEvent && (
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">Event Override</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-2">Optional: Override ruleset for this event</label>
              <div className="flex gap-2">
                <Select value={overrideRulesetId || ''} onValueChange={setOverrideRulesetId}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white flex-1">
                    <SelectValue placeholder="Select override ruleset..." />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value={null}>None (use default)</SelectItem>
                    {applicableRulesets.map(rs => (
                      <SelectItem key={rs.id} value={rs.id}>
                        {rs.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={async () => {
                    if (overrideRulesetId) {
                      await base44.entities.Event.update(selectedEvent.id, { points_ruleset_id: overrideRulesetId });
                      queryClient.invalidateQueries({ queryKey: ['events'] });
                      queryClient.invalidateQueries({ queryKey: ['resolvedPointsRuleSet'] });
                    }
                  }}
                  disabled={!overrideRulesetId}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Apply
                </Button>
              </div>
            </div>
            {selectedEvent.points_ruleset_id && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await base44.entities.Event.update(selectedEvent.id, { points_ruleset_id: null });
                  queryClient.invalidateQueries({ queryKey: ['events'] });
                  queryClient.invalidateQueries({ queryKey: ['resolvedPointsRuleSet'] });
                  setOverrideRulesetId(null);
                }}
                className="border-red-600 text-red-400 hover:text-red-300 w-full"
              >
                <X className="w-3 h-3 mr-1" /> Clear Override
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Calculation Controls */}
      {isAdmin && (
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {!resolvedRuleset && (
                <Alert className="bg-orange-500/10 border-orange-600">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-600 text-xs">
                    No PointsRuleSet found. Create one in Management → Points Configuration.
                  </AlertDescription>
                </Alert>
              )}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-white font-medium">Recalculate Standings</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Uses ruleset: {resolvedRuleset?.name || 'None'}
                  </p>
                </div>
                <Button
                  onClick={() => calculateMutation.mutate()}
                  disabled={isCalculating || !resolvedRuleset}
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
                      <TableHead className="text-gray-400">Rank</TableHead>
                      <TableHead className="text-gray-400">Driver</TableHead>
                      <TableHead className="text-gray-400 text-right">Points</TableHead>
                      <TableHead className="text-gray-400 text-right">Wins</TableHead>
                      <TableHead className="text-gray-400 text-right">2nd</TableHead>
                      <TableHead className="text-gray-400 text-right">3rd</TableHead>
                      <TableHead className="text-gray-400 text-right">Starts</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {standingsWithInfo.map((s) => (
                    <TableRow key={s.id} className="border-gray-700 hover:bg-gray-800">
                        <TableCell className="text-white font-bold">{s.rank || s.position || '-'}</TableCell>
                        <TableCell className="text-white">{s.driver?.first_name} {s.driver?.last_name}</TableCell>
                        <TableCell className="text-right text-white font-semibold">{s.points_total || s.total_points || 0}</TableCell>
                        <TableCell className="text-right text-gray-400">{s.wins || 0}</TableCell>
                        <TableCell className="text-right text-gray-400">{s.seconds || 0}</TableCell>
                        <TableCell className="text-right text-gray-400">{s.thirds || 0}</TableCell>
                        <TableCell className="text-right text-gray-400">{s.starts || s.results_count || 0}</TableCell>
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