/**
 * Event Workspace Header
 * Single operational truth console showing event status and data health
 */
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { createPageUrl } from '@/components/utils';
import { REG_QK } from './queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

const getStatusBadgeClass = (status) => {
  switch (status?.toLowerCase()) {
    case 'draft':
      return 'bg-gray-500/20 text-gray-400';
    case 'published':
      return 'bg-blue-500/20 text-blue-400';
    case 'live':
      return 'bg-green-500/20 text-green-400';
    case 'completed':
      return 'bg-purple-500/20 text-purple-400';
    case 'cancelled':
      return 'bg-red-500/20 text-red-400';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
};

export default function EventWorkspaceHeader({
  dashboardContext,
  selectedEvent,
  selectedTrack,
  selectedSeries,
  dashboardPermissions,
  invalidateAfterOperation,
}) {
  if (!selectedEvent) return null;

  const eventId = selectedEvent.id;
  const seriesId = selectedSeries?.id || selectedEvent?.series_id || '';
  const seasonYear = dashboardContext?.seasonYear || selectedEvent?.season || '';

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: sessions = [] } = useQuery({
    queryKey: REG_QK.sessions(eventId),
    queryFn: () => base44.entities.Session.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: results = [] } = useQuery({
    queryKey: REG_QK.results(eventId),
    queryFn: () => base44.entities.Results.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: entries = [] } = useQuery({
    queryKey: REG_QK.entries(eventId),
    queryFn: () => base44.entities.Entry.filter({ event_id: eventId }).catch(() => []),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: driverPrograms = [] } = useQuery({
    queryKey: ['workspace_driverPrograms', eventId],
    queryFn: () => base44.entities.DriverProgram.filter({ event_id: eventId }).catch(() => []),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: standings = [] } = useQuery({
    queryKey: ['workspace_standings', seriesId, seasonYear],
    queryFn: () =>
      seriesId && seasonYear
        ? base44.entities.Standings.filter({
            series_id: seriesId,
            season_year: seasonYear,
          }).catch(() => [])
        : Promise.resolve([]),
    enabled: !!seriesId && !!seasonYear,
    ...DQ,
  });

  const { data: complianceFlags = [] } = useQuery({
    queryKey: ['workspace_complianceFlags', eventId],
    queryFn: () => base44.entities.ComplianceFlag.filter({ event_id: eventId }).catch(() => []),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: techInspections = [] } = useQuery({
    queryKey: ['workspace_techInspections', eventId],
    queryFn: () => base44.entities.TechInspection.filter({ event_id: eventId }).catch(() => []),
    enabled: !!eventId,
    ...DQ,
  });

  // ── Derived state ──────────────────────────────────────────────────────────

  const orgLabel = useMemo(() => {
    if (dashboardContext?.orgType === 'series') return selectedSeries?.name || 'Series';
    return selectedTrack?.name || 'Track';
  }, [dashboardContext, selectedSeries, selectedTrack]);

  const hasEntries = entries.length > 0;
  const entriesCount = hasEntries ? entries.length : driverPrograms.length;
  const entriesLabel = hasEntries ? 'Entries' : 'Programs';

  const standingsCalculated = standings.length > 0;
  const standingsStatus = standingsCalculated ? 'Calculated' : 'Not Calculated';
  const standingsClass = standingsCalculated ? 'text-green-400' : 'text-amber-400';

  // ── Data health metrics ────────────────────────────────────────────────────

  const metrics = useMemo(
    () => [
      { label: 'Sessions', count: sessions.length, icon: '📋' },
      { label: 'Results', count: results.length, icon: '🏁' },
      { label: entriesLabel, count: entriesCount, icon: '👥' },
      { label: 'Tech Inspections', count: techInspections.length, icon: '✓' },
      { label: 'Compliance Flags', count: complianceFlags.length, icon: '⚠' },
      {
        label: 'Standings',
        status: standingsStatus,
        statusClass: standingsClass,
        icon: '🏆',
      },
    ],
    [sessions.length, results.length, entriesLabel, entriesCount, techInspections.length, complianceFlags.length, standingsStatus, standingsClass]
  );

  return (
    <div className="space-y-4 mb-6">
      {/* ── Header Row ──────────────────────────────────────────────────────── */}
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-4">
          {/* Top section */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400 uppercase tracking-wide font-semibold">
                  {orgLabel}
                </span>
                <span className="text-xs text-gray-600">•</span>
                <span className="text-xs text-gray-400 uppercase tracking-wide">
                  {seasonYear || 'Season TBD'}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-lg font-bold text-white">{selectedEvent.name}</h2>
                <Badge className={`text-xs ${getStatusBadgeClass(selectedEvent.status)}`}>
                  {selectedEvent.status || 'Draft'}
                </Badge>
              </div>
              {selectedEvent.event_date && (
                <p className="text-xs text-gray-500">
                  {selectedEvent.event_date}
                  {selectedEvent.end_date && ` — ${selectedEvent.end_date}`}
                </p>
              )}
            </div>

            {/* Quick Links */}
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                className="border-gray-700 text-gray-300 hover:bg-gray-800 text-xs h-8 gap-1"
                asChild
              >
                <a href={createPageUrl('EventProfile')} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3 h-3" /> Event Page
                </a>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-gray-700 text-gray-300 hover:bg-gray-800 text-xs h-8 gap-1"
                asChild
              >
                <a href={createPageUrl('EventResults')} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3 h-3" /> Results
                </a>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-gray-700 text-gray-300 hover:bg-gray-800 text-xs h-8 gap-1"
                asChild
              >
                <a href={createPageUrl('StandingsHome')} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3 h-3" /> Standings
                </a>
              </Button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-800 my-4" />

          {/* Data Health Strip */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Data Health
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="bg-[#262626] rounded-lg p-3 text-center space-y-1"
                >
                  <div className="text-xl">{metric.icon}</div>
                  <p className="text-xs text-gray-400">{metric.label}</p>
                  {metric.count !== undefined ? (
                    <p className="text-lg font-bold text-white">{metric.count}</p>
                  ) : (
                    <p className={`text-xs font-semibold ${metric.statusClass}`}>
                      {metric.status}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}