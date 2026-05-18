import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, RefreshCw, CheckCircle2, X, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useEventWorkspace } from './workspace/EventWorkspaceContext';
import { REG_QK } from './queryKeys';
import StandingsRecordGrid from './standings/StandingsRecordGrid';

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

  // R8G Part 6B: prefer eventPermissions from EventWorkspaceContext when available (EventFile mode).
  // Falls back to isAdmin only for RegistrationDashboard embedded mode.
  const workspace = useEventWorkspace?.();
  const eventPermissions = workspace?.eventPermissions;
  const canManageStandings = isAdmin || eventPermissions?.canManageStandings === true;

  const targetSeriesId = useMemo(() => {
    if (dashboardContext?.orgType === 'series' && selectedSeries?.id) return selectedSeries.id;
    if (dashboardContext?.orgType === 'track' && selectedEvent?.series_id) return selectedEvent.series_id;
    return null;
  }, [dashboardContext, selectedEvent, selectedSeries]);

  const targetSeasonYear = useMemo(() => dashboardContext?.seasonYear, [dashboardContext]);
  const targetSeriesClassId = useMemo(() => selectedClass?.id || null, [selectedClass]);
  const targetEventId = useMemo(() => selectedEvent?.id || null, [selectedEvent]);

  const { data: rulesets = [] } = useQuery({
    queryKey: ['pointsRuleSets'],
    queryFn: () => base44.entities.PointsRuleSet.list().catch(() => [])
  });

  const applicableRulesets = useMemo(() =>
    rulesets.filter(r =>
      r.status === 'active' &&
      (r.series_id === selectedEvent?.series_id || r.track_id === selectedEvent?.track_id)
    ),
    [rulesets, selectedEvent]
  );

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

  // R8AI: Migrated to REG_QK.standings(seriesId, seasonYear) — class filtering done client-side
  const { data: standingsRaw = [] } = useQuery({
    queryKey: REG_QK.standings(targetSeriesId, targetSeasonYear),
    queryFn: async () => {
      if (!targetSeriesId) return [];
      const query = { series_id: targetSeriesId };
      if (targetSeasonYear) query.season_year = targetSeasonYear;
      return await base44.entities.Standings.filter(query).catch(() => []);
    },
    enabled: !!targetSeriesId
  });

  // Client-side class filter (no separate cache namespace needed)
  const standings = useMemo(() =>
    targetSeriesClassId
      ? standingsRaw.filter(s => s.series_class_id === targetSeriesClassId)
      : standingsRaw,
    [standingsRaw, targetSeriesClassId]
  );

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list()
  });

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
          // R8AI: exact targeted invalidation + broad fallback
          if (targetSeriesId && targetSeasonYear) {
            queryClient.invalidateQueries({ queryKey: REG_QK.standings(targetSeriesId, targetSeasonYear), exact: true });
          }
          queryClient.invalidateQueries({ queryKey: ['standings'] });
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
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white">Points &amp; Standings</h2>
          <p className="text-xs text-gray-500 mt-0.5">Championship standings, points ruleset, and recalculation.</p>
        </div>
        {canManageStandings && (
          <Button
            onClick={() => {
              if (!canManageStandings) {
                toast.error('You do not have permission to recalculate standings.');
                return;
              }
              calculateMutation.mutate();
            }}
            disabled={isCalculating || !resolvedRuleset}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isCalculating ? 'animate-spin' : ''}`} />
            {isCalculating ? 'Calculating…' : 'Recalculate'}
          </Button>
        )}
      </div>

      {/* No ruleset warning */}
      {canManageStandings && !resolvedRuleset && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-950/30 border border-amber-700/40 rounded-lg text-xs text-amber-300">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          No PointsRuleSet found. Create one in Management → Points Configuration.
        </div>
      )}

      {/* Resolved Ruleset */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            Resolved Points Ruleset
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {resolvedRuleset ? (
            <>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-white">{resolvedRuleset.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Priority: {resolvedRuleset.priority || 0}</p>
                </div>
                <div className="flex gap-1">
                  {resolutionSource === 'event_override' && <Badge className="bg-purple-500/20 text-purple-300 text-xs">Event Override</Badge>}
                  {resolutionSource === 'series' && <Badge className="bg-blue-500/20 text-blue-300 text-xs">Series Ruleset</Badge>}
                  {resolutionSource === 'track' && <Badge className="bg-indigo-500/20 text-indigo-300 text-xs">Track Ruleset</Badge>}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {(resolvedRuleset.applies_to_session_types || ['Final']).map(type => (
                  <Badge key={type} className="bg-blue-500/20 text-blue-300 text-xs">{type}</Badge>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-gray-500">No active ruleset found for {selectedEvent?.name || 'this event'}.</p>
          )}
        </CardContent>
      </Card>

      {/* Event Override — admin only */}
      {canManageStandings && selectedEvent && (
        <Card className="bg-[#171717] border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-white">Event Override</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Select value={overrideRulesetId || ''} onValueChange={setOverrideRulesetId}>
                <SelectTrigger className="bg-[#1A1A1A] border-gray-700 text-white flex-1 text-xs">
                  <SelectValue placeholder="Select override ruleset…" />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  <SelectItem value={null}>None (use default)</SelectItem>
                  {applicableRulesets.map(rs => (
                    <SelectItem key={rs.id} value={rs.id}>{rs.name}</SelectItem>
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
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                Apply
              </Button>
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
                className="border-red-700 text-red-400 hover:text-red-300 w-full text-xs"
              >
                <X className="w-3 h-3 mr-1" /> Clear Override
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Standings — tactical grid */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold text-white">
              Standings
              {standings.length > 0 && <span className="ml-2 text-xs font-normal text-gray-500">{standings.length} entries</span>}
            </CardTitle>
            {targetSeriesId && targetSeasonYear && (
              <Link
                to={`/racecore/standings/${targetSeriesId}/${targetSeasonYear}`}
                className="flex items-center gap-1 text-[10px] font-mono text-gray-600 hover:text-teal-400 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Full Standings
              </Link>
            )}
          </div>
          {standings.length === 0 && canManageStandings && resolvedRuleset && (
            <p className="text-xs text-gray-600 mt-1">Run a recalculation to generate standings from official results.</p>
          )}
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <StandingsRecordGrid
            standings={standings}
            drivers={drivers}
            isLoading={false}
          />
        </CardContent>
      </Card>

    </div>
  );
}