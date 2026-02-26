import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import SeriesCard from '@/components/series/SeriesCard';

export default function SeriesHome() {
  const [searchQuery, setSearchQuery] = useState('');
  const [discipline, setDiscipline] = useState('all');
  const [region, setRegion] = useState('all');
  const [competitionLevel, setCompetitionLevel] = useState('all');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  const { data: series = [], isLoading } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
    staleTime: 10 * 60 * 1000,
  });

  let filteredSeries = series.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDiscipline = discipline === 'all' || s.discipline === discipline;
    const matchesRegion = region === 'all' || s.region === region || s.geographic_scope === region;
    const effectiveLevel = s.override_competition_level || s.derived_competition_level;
    const matchesLevel = competitionLevel === 'all' || String(effectiveLevel) === competitionLevel;
    const matchesStatus = status === 'all' || s.status === status;
    return matchesSearch && matchesDiscipline && matchesRegion && matchesLevel && matchesStatus;
  });

  // Sort
  filteredSeries.sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'founded':
        return (b.founded_year || 0) - (a.founded_year || 0);
      case 'discipline':
        return a.discipline.localeCompare(b.discipline);
      case 'contentValue':
        const valueOrder = { High: 3, Medium: 2, Low: 1, Unknown: 0 };
        return (valueOrder[b.content_value] || 0) - (valueOrder[a.content_value] || 0);
      default:
        return 0;
    }
  });

  return (
    <PageShell>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-12">
            <h1 className="text-4xl lg:text-5xl font-black mb-4">Series</h1>
            <p className="text-gray-600 text-lg">Championships and racing formats across motorsports</p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search series..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <Select value={discipline} onValueChange={setDiscipline}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Discipline" />
                </SelectTrigger>
                <SelectContent>
                   <SelectItem value="all">All Disciplines</SelectItem>
                   <SelectItem value="Stock Car">Stock Car</SelectItem>
                   <SelectItem value="Off Road">Off Road</SelectItem>
                   <SelectItem value="Dirt Oval">Dirt Oval</SelectItem>
                   <SelectItem value="Snowmobile">Snowmobile</SelectItem>
                   <SelectItem value="Dirt Bike">Dirt Bike</SelectItem>
                   <SelectItem value="Open Wheel">Open Wheel</SelectItem>
                   <SelectItem value="Sports Car">Sports Car</SelectItem>
                   <SelectItem value="Touring Car">Touring Car</SelectItem>
                   <SelectItem value="Rally">Rally</SelectItem>
                   <SelectItem value="Drag">Drag</SelectItem>
                   <SelectItem value="Motorcycle">Motorcycle</SelectItem>
                   <SelectItem value="Karting">Karting</SelectItem>
                   <SelectItem value="Water">Water</SelectItem>
                   <SelectItem value="Alternative">Alternative</SelectItem>
                 </SelectContent>
              </Select>

              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  <SelectItem value="Global">Global</SelectItem>
                  <SelectItem value="North America">North America</SelectItem>
                  <SelectItem value="Europe">Europe</SelectItem>
                  <SelectItem value="Regional">Regional</SelectItem>
                </SelectContent>
              </Select>

              <Select value={competitionLevel} onValueChange={setCompetitionLevel}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="1">L1 — Foundation</SelectItem>
                  <SelectItem value="2">L2 — Development</SelectItem>
                  <SelectItem value="3">L3 — National</SelectItem>
                  <SelectItem value="4">L4 — Premier</SelectItem>
                  <SelectItem value="5">L5 — World</SelectItem>
                </SelectContent>
              </Select>

              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Historic">Historic</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="founded">Founded</SelectItem>
                  <SelectItem value="discipline">Discipline</SelectItem>
                  <SelectItem value="contentValue">Content Value</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Series Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-lg" />
              ))}
            </div>
          ) : filteredSeries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSeries.map((s) => (
                <SeriesCard key={s.id} series={s} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">No series found</p>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}