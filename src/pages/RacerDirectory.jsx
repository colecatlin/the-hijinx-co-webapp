/**
 * RacerDirectory.jsx
 *
 * Phase 7 — Public racer directory listing RacerProfiles.
 * Replaces DriverDirectory as the canonical racer directory.
 * Loads RacerProfiles (visibility=live, not archived) and renders
 * RacerCard components. Resolves legacy Driver data for compatibility
 * (primary number, team, programs, media).
 */

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageShell from '@/components/shared/PageShell';
import RacerCard from '@/components/racerprofile/RacerCard';
import DirectoryFilters from '@/components/shared/DirectoryFilters';
import { Skeleton } from '@/components/ui/skeleton';
import { isRacerProfilePublic } from '@/components/racerprofile/publicRacerProfileApi';
import PullToRefresh from '@/components/shared/PullToRefresh';
import SeoMeta from '@/components/system/seoMeta';

export default function RacerDirectory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    discipline: 'all',
    series: 'all',
    career_status: 'all',
    state: 'all',
    country: 'all',
  });
  const [sortBy, setSortBy] = useState('name');

  const handleFilterChange = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  // Load RacerProfiles
  const { data: allRacerProfiles = [], isLoading: racersLoading, refetch } = useQuery({
    queryKey: ['racerProfiles-public'],
    queryFn: () => base44.entities.RacerProfile.list('-created_date', 500),
    staleTime: 5 * 60 * 1000,
  });

  // Admin check for draft preview
  const { data: isAuthenticated } = useQuery({
    queryKey: ['auth-status'],
    queryFn: () => base44.auth.isAuthenticated(),
    staleTime: 5 * 60 * 1000,
  });
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    enabled: !!isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
  const isAdmin = currentUser?.role === 'admin';

  // Filter to public only (unless admin)
  const publicRacers = useMemo(() =>
    (allRacerProfiles || []).filter(rp => isAdmin || isRacerProfilePublic(rp)),
    [allRacerProfiles, isAdmin]
  );

  // Load legacy Drivers for compatibility fields (primary_number, team, programs)
  const racerProfileDriverIds = publicRacers.map(rp => rp.legacy_driver_id).filter(Boolean);
  const { data: allDrivers = [] } = useQuery({
    queryKey: ['drivers-for-racers'],
    queryFn: () => base44.entities.Driver.list('-created_date', 500),
    staleTime: 5 * 60 * 1000,
  });
  const driverMap = useMemo(() => {
    const m = {};
    (allDrivers || []).forEach(d => { if (d.id) m[d.id] = d; });
    return m;
  }, [allDrivers]);

  const { data: allPrograms = [] } = useQuery({
    queryKey: ['driverPrograms-for-racers'],
    queryFn: () => base44.entities.DriverProgram.list(),
    staleTime: 5 * 60 * 1000,
  });
  const { data: allTeams = [] } = useQuery({
    queryKey: ['teams-for-racers'],
    queryFn: () => base44.entities.Team.list(),
    staleTime: 10 * 60 * 1000,
  });
  const { data: allSeries = [] } = useQuery({
    queryKey: ['series-for-racers'],
    queryFn: () => base44.entities.Series.list(),
    staleTime: 10 * 60 * 1000,
  });
  const { data: allClasses = [] } = useQuery({
    queryKey: ['seriesClasses-for-racers'],
    queryFn: () => base44.entities.SeriesClass.list(),
    staleTime: 10 * 60 * 1000,
  });
  const { data: allMedia = [] } = useQuery({
    queryKey: ['driverMedia-for-racers'],
    queryFn: () => base44.entities.DriverMedia.list(),
    staleTime: 5 * 60 * 1000,
  });

  // Build program map by driver_id
  const programsByDriver = useMemo(() => {
    const m = {};
    (allPrograms || []).forEach(p => { if (p.driver_id) { if (!m[p.driver_id]) m[p.driver_id] = []; m[p.driver_id].push(p); } });
    return m;
  }, [allPrograms]);

  const uniqueSeries = useMemo(() => {
    const names = [...new Set((allPrograms || []).map(p => p.series_id ? allSeries.find(s => s.id === p.series_id)?.name : p.series_name).filter(Boolean))];
    return names.sort();
  }, [allPrograms, allSeries]);
  const uniqueStates = useMemo(() => [...new Set(publicRacers.map(rp => rp.hometown_state).filter(Boolean))].sort(), [publicRacers]);
  const uniqueCountries = useMemo(() => [...new Set(publicRacers.map(rp => rp.hometown_country).filter(Boolean))].sort(), [publicRacers]);

  const filteredRacers = useMemo(() => {
    return publicRacers.filter(rp => {
      const displayName = rp.display_name || '';
      const legacyDriver = rp.legacy_driver_id ? driverMap[rp.legacy_driver_id] : null;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = displayName.toLowerCase().includes(q);
        const matchesNumber = legacyDriver?.primary_number?.toString().includes(q);
        const matchesHometown = rp.hometown_city?.toLowerCase().includes(q) || rp.hometown_state?.toLowerCase().includes(q);
        const matchesSeries = (programsByDriver[legacyDriver?.id] || []).some(p => {
          const sName = p.series_id ? allSeries.find(s => s.id === p.series_id)?.name : p.series_name;
          return sName?.toLowerCase().includes(q);
        });
        if (!matchesName && !matchesNumber && !matchesHometown && !matchesSeries) return false;
      }

      if (filters.discipline !== 'all' && (rp.primary_discipline || legacyDriver?.primary_discipline) !== filters.discipline) return false;
      if (filters.career_status !== 'all' && (rp.career_status || legacyDriver?.career_status) !== filters.career_status) return false;
      if (filters.state !== 'all' && rp.hometown_state !== filters.state) return false;
      if (filters.country !== 'all' && rp.hometown_country !== filters.country) return false;

      if (filters.series !== 'all') {
        const driverPrograms = programsByDriver[legacyDriver?.id] || [];
        if (!driverPrograms.some(p => {
          const sName = p.series_id ? allSeries.find(s => s.id === p.series_id)?.name : p.series_name;
          return sName === filters.series;
        })) return false;
      }
      return true;
    });
  }, [publicRacers, searchQuery, filters, driverMap, programsByDriver, allSeries]);

  const sortedRacers = useMemo(() => {
    return [...filteredRacers].sort((a, b) => {
      switch (sortBy) {
        case 'name_asc': return (a.display_name || '').localeCompare(b.display_name || '');
        case 'name_desc': return (b.display_name || '').localeCompare(a.display_name || '');
        case 'name':
        default: return (a.display_name || '').localeCompare(b.display_name || '');
        case 'newest': return new Date(b.created_date) - new Date(a.created_date);
        case 'oldest': return new Date(a.created_date) - new Date(b.created_date);
      }
    });
  }, [filteredRacers, sortBy]);

  return (
    <PageShell className="bg-white">
      <SeoMeta
        title="Racers Directory · INDEX46"
        description="Browse the INDEX46 racer directory — public racing profiles across all series and disciplines."
      />
      <PullToRefresh onRefresh={refetch}>
        <div className="max-w-7xl mx-auto px-6 py-12">
          <DirectoryFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search racers by name, number, series, hometown..."
            filters={filters}
            onFilterChange={handleFilterChange}
            filterConfig={[
              { key: 'series', label: 'Series', options: [{ value: 'all', label: 'All Series' }, ...uniqueSeries.map(s => ({ value: s, label: s }))] },
              { key: 'discipline', label: 'Discipline', options: [
                { value: 'all', label: 'All Disciplines' },
                { value: 'Stock Car', label: 'Stock Car' }, { value: 'Off Road', label: 'Off Road' },
                { value: 'Dirt Oval', label: 'Dirt Oval' }, { value: 'Open Wheel', label: 'Open Wheel' },
                { value: 'Sports Car', label: 'Sports Car' }, { value: 'Touring Car', label: 'Touring Car' },
                { value: 'Rally', label: 'Rally' }, { value: 'Rallycross', label: 'Rallycross' },
                { value: 'Drift', label: 'Drift' }, { value: 'Drag Racing', label: 'Drag' },
                { value: 'Motorcycle', label: 'Motorcycle' }, { value: 'Karting', label: 'Karting' },
                { value: 'Alternative', label: 'Alternative' },
              ]},
              { key: 'career_status', label: 'Career Level', options: [
                { value: 'all', label: 'All Career Levels' },
                { value: 'Novice', label: 'Novice' }, { value: 'Amateur', label: 'Amateur' },
                { value: 'Semi-Professional', label: 'Semi-Professional' }, { value: 'Professional', label: 'Professional' },
              ]},
              { key: 'state', label: 'State', options: [{ value: 'all', label: 'All States' }, ...uniqueStates.map(s => ({ value: s, label: s }))] },
              { key: 'country', label: 'Country', options: [{ value: 'all', label: 'All Countries' }, ...uniqueCountries.map(c => ({ value: c, label: c }))] },
            ]}
            sortBy={sortBy}
            onSortChange={setSortBy}
            sortOptions={[
              { value: 'name_asc', label: 'Name A–Z' }, { value: 'name_desc', label: 'Name Z–A' },
              { value: 'newest', label: 'Newest' }, { value: 'oldest', label: 'Oldest' },
            ]}
          />

          {racersLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-72" />)}
            </div>
          )}

          {!racersLoading && sortedRacers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sortedRacers.map(rp => {
                const legacyDriver = rp.legacy_driver_id ? driverMap[rp.legacy_driver_id] : null;
                const driverPrograms = legacyDriver ? (programsByDriver[legacyDriver.id] || []) : [];
                const activePrograms = driverPrograms.filter(p => p.status === 'active');
                const primaryProgram = activePrograms.find(p => p.primary) || activePrograms[0] || driverPrograms[0];
                const team = primaryProgram?.team_id ? allTeams.find(t => t.id === primaryProgram.team_id) : null;
                const media = legacyDriver ? allMedia.find(m => m.driver_id === legacyDriver.id) : null;
                const classProgram = activePrograms[0] || driverPrograms[0];
                const programClassName = (classProgram?.series_class_id ? allClasses.find(c => c.id === classProgram.series_class_id)?.class_name : null) || classProgram?.class_name || null;
                const isRookie = activePrograms.some(p => p.is_rookie) || (!activePrograms.length && driverPrograms.some(p => p.is_rookie));

                return (
                  <RacerCard
                    key={rp.id}
                    racerProfile={rp}
                    legacyDriver={legacyDriver}
                    program={primaryProgram}
                    programs={driverPrograms}
                    allSeries={allSeries}
                    team={team}
                    media={media}
                    programClassName={programClassName}
                    isRookie={isRookie}
                    nonClickable={!isAdmin}
                  />
                );
              })}
            </div>
          )}

          {!racersLoading && sortedRacers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600">No racers found matching your filters.</p>
            </div>
          )}
        </div>
      </PullToRefresh>
    </PageShell>
  );
}