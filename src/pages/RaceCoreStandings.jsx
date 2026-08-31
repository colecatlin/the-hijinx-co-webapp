/**
 * RaceCoreStandings — Canonical tactical standings authority surface.
 *
 * R8AK: Series-scoped, read-only, snapshot-based standings inspection.
 * Routes:
 *   /racecore/standings
 *   /racecore/standings/:seriesId
 *   /racecore/standings/:seriesId/:seasonYear
 *   ?class=<seriesClassId>  — optional client-side class filter
 *
 * Operational recalculation: EventFile only (via recalculateStandings).
 * This surface: PRESENTATION + INSPECTION only.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { REG_QK } from '@/components/registrationdashboard/queryKeys';
import StandingsRecordGrid from '@/components/registrationdashboard/standings/StandingsRecordGrid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ExternalLink, Trophy } from 'lucide-react';
import RaceCoreBreadcrumb from '@/components/racecore/RaceCoreBreadcrumb';
import RaceCorePageHeader from '@/components/racecore/RaceCorePageHeader';

// ─── Minimal dark shell (no ManagementLayout — this is a focused canonical surface)
function StandingsShell({ children }) {
  return (
    <div className="text-foreground flex flex-col min-h-screen bg-surface">
      {children}
    </div>
  );
}

// ─── Series selector dropdown
function SeriesSelector({ seriesList, selectedId, onSelect }) {
  if (!seriesList.length) return null;
  return (
    <Select value={selectedId || ''} onValueChange={onSelect}>
      <SelectTrigger className="w-64 bg-surface border-divider text-foreground text-xs h-8">
        <SelectValue placeholder="Select series" />
      </SelectTrigger>
      <SelectContent className="bg-popover border-divider max-h-80">
        {seriesList.map(s => (
          <SelectItem key={s.id} value={s.id} className="text-foreground text-xs">{s.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Season selector
function SeasonSelector({ seasons, selectedYear, onSelect }) {
  if (!seasons.length) return null;
  return (
    <Select value={selectedYear || ''} onValueChange={onSelect}>
      <SelectTrigger className="w-28 bg-surface border-divider text-foreground text-xs h-8">
        <SelectValue placeholder="Season" />
      </SelectTrigger>
      <SelectContent className="bg-popover border-divider">
        {seasons.map(y => (
          <SelectItem key={y} value={y} className="text-foreground text-xs">{y}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Class selector
function ClassSelector({ classes, selectedId, onSelect }) {
  if (!classes.length) return null;
  return (
    <Select value={selectedId || 'all'} onValueChange={v => onSelect(v === 'all' ? null : v)}>
      <SelectTrigger className="w-36 bg-surface border-divider text-foreground text-xs h-8">
        <SelectValue placeholder="All Classes" />
      </SelectTrigger>
      <SelectContent className="bg-popover border-divider">
        <SelectItem value="all" className="text-foreground text-xs">All Classes</SelectItem>
        {classes.map(c => (
          <SelectItem key={c.id} value={c.id} className="text-foreground text-xs">{c.class_name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function RaceCoreStandings() {
  const { seriesId: paramSeriesId, seasonYear: paramSeasonYear } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // ── Series list
  const { data: seriesList = [], isLoading: seriesLoading } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list('name', 100),
    staleTime: 5 * 60 * 1000,
  });

  // Active series: URL param > first in list
  const [selectedSeriesId, setSelectedSeriesId] = useState(paramSeriesId || null);
  const resolvedSeriesId = selectedSeriesId || seriesList[0]?.id || null;
  const selectedSeries = seriesList.find(s => s.id === resolvedSeriesId);

  // Sync URL params to state when they change (browser back/forward, etc.)
  useEffect(() => {
    if (paramSeriesId && paramSeriesId !== selectedSeriesId) {
      setSelectedSeriesId(paramSeriesId);
      setSelectedClassId(null); // Reset class filter when series changes
    }
  }, [paramSeriesId]);

  useEffect(() => {
    if (paramSeasonYear && paramSeasonYear !== selectedSeason) {
      setSelectedSeason(paramSeasonYear);
    }
  }, [paramSeasonYear]);

  // ── Season derivation from standings records
  const { data: allStandingsForSeries = [], isLoading: standingsLoading } = useQuery({
    queryKey: ['standings', 'series', resolvedSeriesId],
    queryFn: () => base44.entities.Standings.filter({ series_id: resolvedSeriesId }),
    enabled: !!resolvedSeriesId,
    staleTime: 3 * 60 * 1000,
  });

  const availableSeasons = useMemo(() => {
    const yrs = new Set(allStandingsForSeries.map(s => s.season_year).filter(Boolean));
    return Array.from(yrs).sort((a, b) => b.localeCompare(a));
  }, [allStandingsForSeries]);

  const currentYear = String(new Date().getFullYear());
  const [selectedSeason, setSelectedSeason] = useState(paramSeasonYear || null);
  const resolvedSeason = selectedSeason || availableSeasons[0] || currentYear;

  // ── SeriesClasses for class filter
  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses', resolvedSeriesId],
    queryFn: () => base44.entities.SeriesClass.filter({ series_id: resolvedSeriesId }),
    enabled: !!resolvedSeriesId,
    staleTime: 5 * 60 * 1000,
  });

  // Class filter from query param
  const classParam = searchParams.get('class') || null;
  const [selectedClassId, setSelectedClassId] = useState(classParam);

  const handleClassChange = (id) => {
    setSelectedClassId(id);
    const params = new URLSearchParams(searchParams);
    if (id) params.set('class', id); else params.delete('class');
    setSearchParams(params, { replace: true });
  };

  // ── Main standings query — REG_QK canonical key
  const { data: standingsRaw = [], isLoading: mainLoading } = useQuery({
    queryKey: REG_QK.standings(resolvedSeriesId, resolvedSeason),
    queryFn: async () => {
      if (!resolvedSeriesId) return [];
      const q = { series_id: resolvedSeriesId };
      if (resolvedSeason) q.season_year = resolvedSeason;
      return base44.entities.Standings.filter(q).catch(() => []);
    },
    enabled: !!resolvedSeriesId,
    staleTime: 3 * 60 * 1000,
  });

  // Client-side class filter
  const standings = useMemo(() =>
    selectedClassId
      ? standingsRaw.filter(s => s.series_class_id === selectedClassId)
      : standingsRaw,
    [standingsRaw, selectedClassId]
  );

  // ── Drivers
  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list('first_name', 500),
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = seriesLoading || mainLoading;

  // ── Series change handler — update URL
  const handleSeriesChange = (id) => {
    setSelectedSeriesId(id);
    setSelectedSeason(null);
    setSelectedClassId(null);
    const slug = seriesList.find(s => s.id === id)?.id || id;
    navigate(`/racecore/standings/${slug}`, { replace: true });
  };

  const handleSeasonChange = (year) => {
    setSelectedSeason(year);
    if (resolvedSeriesId) {
      navigate(`/racecore/standings/${resolvedSeriesId}/${year}`, { replace: true });
    }
  };

  // ── EventFile deep link for the selected series/season
  const eventFileLink = resolvedSeriesId
    ? `/racecore?orgType=series&orgId=${resolvedSeriesId}&seasonYear=${resolvedSeason}&tab=pointsStandings`
    : null;

  const breadcrumbCrumbs = [
    { label: 'RaceCore', href: '/racecore' },
    { label: 'Standings', href: '/racecore/standings' },
    ...(selectedSeries ? [{ label: selectedSeries.name }] : []),
  ];

  return (
    <StandingsShell>
      {/* Breadcrumb */}
      <RaceCoreBreadcrumb crumbs={breadcrumbCrumbs} icon={Trophy} />

      {/* Page header */}
      <RaceCorePageHeader
        icon={Trophy}
        title="Championship Standings"
        subtitle="Read-only · Snapshot-based · Rebuilt from Results via EventFile"
        actions={
          eventFileLink ? (
            <Link to={eventFileLink}>
              <Button
                variant="outline"
                size="sm"
                className="border-divider text-foreground-quiet hover:text-motion hover:border-motion gap-1.5 text-xs shrink-0"
              >
                <ExternalLink className="w-3 h-3" />
                Recalculate in EventFile
              </Button>
            </Link>
          ) : null
        }
      />

      {/* Main content area */}
      <div className="max-w-5xl mx-auto px-3 sm:px-5 py-5">

      {/* Controls row: Series + Season + Class */}
      <div className="flex items-end gap-3 mb-5 flex-wrap">
        <div>
          <p className="text-[9px] font-mono text-foreground-quiet uppercase tracking-widest mb-1.5">Series</p>
          <SeriesSelector
            seriesList={seriesList}
            selectedId={resolvedSeriesId}
            onSelect={handleSeriesChange}
          />
        </div>
        <div>
          <p className="text-[9px] font-mono text-foreground-quiet uppercase tracking-widest mb-1.5">Season</p>
          <SeasonSelector
            seasons={availableSeasons.length ? availableSeasons : [currentYear]}
            selectedYear={resolvedSeason}
            onSelect={handleSeasonChange}
          />
        </div>
        {seriesClasses.length > 0 && (
          <div>
            <p className="text-[9px] font-mono text-foreground-quiet uppercase tracking-widest mb-1.5">Class</p>
            <ClassSelector
              classes={seriesClasses}
              selectedId={selectedClassId}
              onSelect={handleClassChange}
            />
          </div>
        )}
      </div>

      {/* Standings grid */}
      {resolvedSeriesId ? (
        <div className="bg-surface-elevated border border-divider rounded-lg overflow-hidden">
          <StandingsRecordGrid
            standings={standings}
            drivers={drivers}
            isLoading={isLoading}
            emptyMessage={
              standingsRaw.length === 0 && !isLoading
                ? `No standings for ${resolvedSeason} — run Recalculate in EventFile to generate`
                : 'No standings match current filters'
            }
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 gap-3 border border-divider rounded-lg bg-surface-elevated">
          <Trophy className="w-8 h-8 text-foreground-quiet" />
          <p className="text-xs font-mono text-foreground-quiet uppercase tracking-widest">Select a series to view standings</p>
        </div>
      )}

      {/* Authority notice */}
      <div className="mt-5 flex items-start gap-2 px-4 py-3 rounded-lg border border-divider bg-surface-interactive/30">
        <span className="text-[9px] font-mono text-foreground-quiet uppercase tracking-widest leading-5">Authority:</span>
        <p className="text-[10px] text-foreground-secondary">
          Standings are computed snapshots derived from Results.
          To rebuild: <span className="font-mono text-foreground-quiet">EventFile → Standings tab → Recalculate</span>.
          This page is a read-only inspection surface only.
        </p>
      </div>

      </div>{/* /max-w-5xl */}
    </StandingsShell>
  );
}