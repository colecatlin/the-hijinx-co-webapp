import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, Download, RefreshCw, Send, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { buildInvalidateAfterOperation } from './invalidationHelper';
import { calculateStandings, DEFAULT_POINTS_TABLE } from './standingsCalc';
import PointsRulesetEditor from './PointsRulesetEditor';
import StandingsTable from './StandingsTable';
import StandingsChangeHistory from './StandingsChangeHistory';

const DQ = applyDefaultQueryOptions();

function buildDefaultPointsRows() {
  return Object.entries(DEFAULT_POINTS_TABLE).map(([pos, pts]) => ({
    position: parseInt(pos),
    points: pts,
  }));
}

function downloadCSV(rows, filename) {
  const headers = ['rank', 'driver_name', 'car_number', 'total_points', 'events_counted', 'wins', 'podiums'];
  const csv = [headers, ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`))].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); a.remove();
}

export default function PointsAndStandingsManager({
  selectedEvent,
  isAdmin,
  canAction: canActionProp,
  dashboardContext,
  invalidateAfterOperation: invalidateAfterOperationProp,
  standingsDirty,
  onClearDirty,
  onStandingsCalculated,
  sessions: sessionsProp,
}) {
  const queryClient = useQueryClient();
  const invalidateAfterOperation = invalidateAfterOperationProp ?? buildInvalidateAfterOperation(queryClient);

  const orgType = dashboardContext?.orgType;
  const orgId = dashboardContext?.orgId;
  const selectedSeasonYear = dashboardContext?.season || '';
  const eventId = selectedEvent?.id;

  // ── Local UI state ──
  const [selectedClassId, setSelectedClassId] = useState('');
  const [includeNonFinals, setIncludeNonFinals] = useState(false);
  const [includeProvisional, setIncludeProvisional] = useState(false);
  const [pointsTableRows, setPointsTableRows] = useState(buildDefaultPointsRows());
  const [calculatedRows, setCalculatedRows] = useState(null);
  const [previousRows, setPreviousRows] = useState(null);
  const [calculating, setCalculating] = useState(false);

  const can = (action) => {
    if (isAdmin) return true;
    if (Array.isArray(canActionProp)) return canActionProp.includes(action);
    return false;
  };

  // ── Queries ──
  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses'],
    queryFn: () => base44.entities.SeriesClass.list(),
    ...DQ,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list('first_name', 500),
    ...DQ,
  });

  // Events for the season + org
  const { data: seasonEvents = [] } = useQuery({
    queryKey: ['events', 'season', orgType, orgId, selectedSeasonYear],
    queryFn: async () => {
      if (!orgId || !selectedSeasonYear) return [];
      const filter = orgType === 'series'
        ? { series_id: orgId, season: selectedSeasonYear }
        : { track_id: orgId, season: selectedSeasonYear };
      return base44.entities.Event.filter(filter);
    },
    enabled: !!orgId && !!selectedSeasonYear,
    ...DQ,
  });

  // All event IDs in scope (include selectedEvent even if season mismatch)
  const scopedEventIds = useMemo(() => {
    const ids = new Set(seasonEvents.map((e) => e.id));
    if (eventId) ids.add(eventId);
    return Array.from(ids);
  }, [seasonEvents, eventId]);

  // Sessions for all scoped events
  const { data: allSessions = [] } = useQuery({
    queryKey: ['sessions', 'season', ...scopedEventIds],
    queryFn: async () => {
      if (!scopedEventIds.length) return sessionsProp || [];
      // Use the sessions already passed for the selected event, plus fetch others
      if (scopedEventIds.length === 1 && scopedEventIds[0] === eventId) {
        return base44.entities.Session.filter({ event_id: scopedEventIds[0] });
      }
      const all = await Promise.all(scopedEventIds.map((id) => base44.entities.Session.filter({ event_id: id })));
      return all.flat();
    },
    enabled: scopedEventIds.length > 0,
    ...DQ,
  });

  // Results for all scoped events
  const { data: allResults = [] } = useQuery({
    queryKey: ['results', 'season', ...scopedEventIds, selectedClassId],
    queryFn: async () => {
      if (!scopedEventIds.length) return [];
      const all = await Promise.all(scopedEventIds.map((id) => base44.entities.Results.filter({ event_id: id })));
      return all.flat();
    },
    enabled: scopedEventIds.length > 0 && !!selectedClassId,
    ...DQ,
  });

  // Published standings for comparison
  const { data: publishedStandings = [] } = useQuery({
    queryKey: ['standings', orgId, selectedSeasonYear, selectedClassId],
    queryFn: async () => {
      if (!selectedClassId) return [];
      const selectedClass = seriesClasses.find((c) => c.id === selectedClassId);
      return base44.entities.Standings.filter({
        series_id: orgType === 'series' ? orgId : selectedEvent?.series_id || '',
        season_year: selectedSeasonYear,
        class_name: selectedClass?.class_name || '',
      });
    },
    enabled: !!selectedClassId && !!selectedSeasonYear,
    ...DQ,
  });

  // Class options based on sessions in scope
  const classOptions = useMemo(() => {
    const seen = new Map(); // id → name
    allSessions.forEach((s) => {
      if (s.series_class_id) {
        const sc = seriesClasses.find((c) => c.id === s.series_class_id);
        if (sc) seen.set(sc.id, sc.class_name);
      }
    });
    // Also include all SeriesClass for the series
    if (orgType === 'series' && orgId) {
      seriesClasses.filter((c) => c.series_id === orgId).forEach((c) => seen.set(c.id, c.class_name));
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allSessions, seriesClasses, orgType, orgId]);

  // Auto-select first class
  useEffect(() => {
    if (!selectedClassId && classOptions.length > 0) {
      setSelectedClassId(classOptions[0].id);
    }
  }, [classOptions, selectedClassId]);

  // Build previousRows from published standings for change arrows
  useEffect(() => {
    if (publishedStandings.length) {
      const prev = publishedStandings
        .sort((a, b) => (a.position || 999) - (b.position || 999))
        .map((s, idx) => ({
          rank: s.position || idx + 1,
          driver_id: s.driver_id,
          driver_name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
        }));
      setPreviousRows(prev);
    }
  }, [publishedStandings]);

  // Sessions summary for the current class
  const classSessionsInScope = useMemo(() => {
    return allSessions.filter((s) => !selectedClassId || s.series_class_id === selectedClassId);
  }, [allSessions, selectedClassId]);

  const officialSessionCount = classSessionsInScope.filter((s) =>
    s.status === 'Official' || s.status === 'Locked'
  ).length;

  // ── Recalculate (client-side) ──
  const handleRecalculate = async () => {
    if (!selectedClassId) { toast.error('Select a class first'); return; }
    if (!officialSessionCount && !includeProvisional) {
      toast.error('No Official/Locked sessions found. Enable "Include Provisional" or publish sessions first.');
      return;
    }
    setCalculating(true);
    try {
      const rows = calculateStandings(allResults, allSessions, drivers, selectedClassId, {
        includeNonFinals,
        includeProvisional,
        pointsTableRows,
      });
      setCalculatedRows(rows);
      toast.success(`Calculated standings for ${rows.length} drivers`);
      if (onClearDirty) onClearDirty();
      if (onStandingsCalculated) onStandingsCalculated();

      // Log to OperationLog
      const selectedClass = seriesClasses.find((c) => c.id === selectedClassId);
      base44.entities.OperationLog.create({
        operation_type: 'standings_calculated',
        status: 'success',
        entity_name: 'Standings',
        event_id: eventId,
        message: `Calculated standings for ${selectedClass?.class_name || selectedClassId}, ${rows.length} drivers`,
        metadata: {
          series_id: orgType === 'series' ? orgId : selectedEvent?.series_id,
          season: selectedSeasonYear,
          class_name: selectedClass?.class_name,
          driver_count: rows.length,
          include_non_finals: includeNonFinals,
          include_provisional: includeProvisional,
        },
      }).catch(() => {});
    } finally {
      setCalculating(false);
    }
  };

  // ── Publish standings ──
  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!calculatedRows?.length) throw new Error('Recalculate first');
      const selectedClass = seriesClasses.find((c) => c.id === selectedClassId);
      const className = selectedClass?.class_name || '';
      const seriesId = orgType === 'series' ? orgId : selectedEvent?.series_id || '';

      // Upsert one Standings record per driver
      const ops = calculatedRows.map((row) => {
        const driver = drivers.find((d) => d.id === row.driver_id);
        const existing = publishedStandings.find((s) => s.driver_id === row.driver_id);
        const payload = {
          series_id: seriesId,
          series_name: '',
          season_year: selectedSeasonYear,
          class_name: className,
          position: row.rank,
          driver_id: row.driver_id,
          first_name: driver?.first_name || '',
          last_name: driver?.last_name || '',
          bib_number: driver?.primary_number || '',
          total_points: row.total_points,
          events_counted: row.events_counted,
          wins: row.wins,
          podiums: row.podiums,
          bonus_points: 0,
          last_calculated: new Date().toISOString(),
        };
        if (existing) return base44.entities.Standings.update(existing.id, payload);
        return base44.entities.Standings.create(payload);
      });

      await Promise.all(ops);

      // Log
      await base44.entities.OperationLog.create({
        operation_type: 'standings_published',
        status: 'success',
        entity_name: 'Standings',
        event_id: eventId,
        message: `Published standings for ${className}, ${calculatedRows.length} drivers`,
        metadata: {
          series_id: seriesId,
          season: selectedSeasonYear,
          class_name: className,
          driver_count: calculatedRows.length,
          published: true,
        },
      }).catch(() => {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standings', orgId, selectedSeasonYear, selectedClassId] });
      invalidateAfterOperation('standings_published', { eventId, seriesId: orgType === 'series' ? orgId : selectedEvent?.series_id });
      toast.success('Standings published');
    },
    onError: (err) => toast.error(`Publish failed: ${err.message}`),
  });

  const handleExportCSV = () => {
    const rows = calculatedRows || (publishedStandings.length ? publishedStandings.map((s, idx) => ({
      rank: s.position || idx + 1,
      driver_name: `${s.first_name} ${s.last_name}`,
      car_number: s.bib_number,
      total_points: s.total_points,
      events_counted: s.events_counted,
      wins: s.wins,
      podiums: s.podiums,
    })) : null);
    if (!rows?.length) { toast.error('No standings to export'); return; }
    const cls = seriesClasses.find((c) => c.id === selectedClassId)?.class_name || 'standings';
    downloadCSV(rows, `standings-${cls}-${selectedSeasonYear}.csv`);
    toast.success('Exported');
  };

  const displayRows = calculatedRows || (publishedStandings.length ? publishedStandings.map((s, idx) => ({
    rank: s.position || idx + 1,
    driver_id: s.driver_id,
    driver_name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
    car_number: s.bib_number,
    total_points: s.total_points,
    events_counted: s.events_counted,
    wins: s.wins,
    podiums: s.podiums,
    tie_breaker_note: '',
    round_points: {},
  })) : null);

  if (!isAdmin && !can('standings_recalculate')) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-8">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-400">Points & Standings management requires admin access.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Dirty banner */}
      {standingsDirty && (
        <div className="bg-amber-950/30 border border-amber-800/50 rounded-lg p-3 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-300">Standings Recalculation Required</p>
            <p className="text-xs text-amber-400/80">Official session results have changed. Recalculate to update standings.</p>
          </div>
        </div>
      )}

      {/* Top control bar */}
      <div className="bg-[#171717] border border-gray-800 rounded-lg p-4 space-y-3">
        <div className="flex items-end gap-3 flex-wrap">
          {/* Class selector */}
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs text-gray-400 block mb-1">Class</label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs">
                <SelectValue placeholder="Select class…" />
              </SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700">
                {classOptions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Season (read-only display) */}
          <div className="min-w-[100px]">
            <label className="text-xs text-gray-400 block mb-1">Season</label>
            <div className="h-8 px-3 flex items-center bg-[#1A1A1A] border border-gray-700 rounded text-xs text-gray-300">
              {selectedSeasonYear || '—'}
            </div>
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={includeNonFinals} onCheckedChange={setIncludeNonFinals} />
              <span className="text-xs text-gray-300">Include Heats & Qualifying</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={includeProvisional} onCheckedChange={setIncludeProvisional} />
              <span className="text-xs text-gray-300">Include Provisional</span>
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 ml-auto">
            {can('standings_recalculate') && (
              <Button size="sm" onClick={handleRecalculate} disabled={calculating || !selectedClassId} className="bg-blue-700 hover:bg-blue-600 h-8">
                <RefreshCw className={`w-4 h-4 mr-1 ${calculating ? 'animate-spin' : ''}`} />
                {calculating ? 'Calculating…' : 'Recalculate'}
              </Button>
            )}
            {can('standings_publish') && (
              <Button size="sm" onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending || !calculatedRows?.length} className="bg-green-700 hover:bg-green-600 h-8">
                <Send className="w-4 h-4 mr-1" />
                {publishMutation.isPending ? 'Publishing…' : 'Publish'}
              </Button>
            )}
            {can('standings_export') && (
              <Button size="sm" variant="outline" onClick={handleExportCSV} className="border-gray-700 text-gray-300 h-8">
                <Download className="w-4 h-4 mr-1" /> Export CSV
              </Button>
            )}
          </div>
        </div>

        {/* Status summary */}
        <div className="flex items-center gap-3 text-xs text-gray-500 border-t border-gray-800 pt-2">
          <span>Sessions in scope: <span className="text-gray-300">{classSessionsInScope.length}</span></span>
          <span>Official/Locked: <span className="text-green-400">{officialSessionCount}</span></span>
          <span>Results loaded: <span className="text-gray-300">{allResults.filter((r) => !selectedClassId || r.series_class_id === selectedClassId).length}</span></span>
          {calculatedRows && <Badge className="bg-blue-500/20 text-blue-400">Draft calculated — not published</Badge>}
          {!calculatedRows && publishedStandings.length > 0 && <Badge className="bg-green-500/20 text-green-400">Showing published standings</Badge>}
        </div>
      </div>

      {/* No class selected */}
      {!selectedClassId && (
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="py-12 text-center">
            <Trophy className="w-8 h-8 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Select a class above to view or calculate standings</p>
          </CardContent>
        </Card>
      )}

      {selectedClassId && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Left: Points Ruleset */}
          <div className="lg:col-span-1">
            <PointsRulesetEditor
              pointsTableRows={pointsTableRows}
              onPointsTableChange={setPointsTableRows}
              canEdit={can('points_ruleset_edit')}
            />
          </div>

          {/* Main: Standings table + history */}
          <div className="lg:col-span-3 space-y-5">
            <Card className="bg-[#171717] border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  {seriesClasses.find((c) => c.id === selectedClassId)?.class_name || 'Standings'}
                  {selectedSeasonYear && <span className="text-gray-400 font-normal">— {selectedSeasonYear}</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StandingsTable
                  rows={displayRows}
                  sessions={classSessionsInScope.filter((s) => s.status === 'Official' || s.status === 'Locked')}
                  previousRows={calculatedRows ? previousRows : null}
                />
              </CardContent>
            </Card>

            <Card className="bg-[#171717] border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-gray-400 uppercase tracking-wide">Change History</CardTitle>
              </CardHeader>
              <CardContent>
                <StandingsChangeHistory
                  eventId={eventId}
                  seriesId={orgType === 'series' ? orgId : selectedEvent?.series_id}
                  seasonYear={selectedSeasonYear}
                  classId={selectedClassId}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}