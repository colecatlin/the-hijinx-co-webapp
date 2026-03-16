import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import CreatorCard from '@/components/media/public/CreatorCard';
import { isPublicProfile, ROLE_LABELS } from '@/components/media/public/mediaPublicHelpers';

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured First' },
  { value: 'verified', label: 'Verified First' },
  { value: 'alpha', label: 'A–Z' },
];

export default function CreatorDirectory() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [sort, setSort] = useState('featured');

  const { data: allProfiles = [], isLoading } = useQuery({
    queryKey: ['publicMediaProfiles'],
    queryFn: () => base44.entities.MediaProfile.list('-created_date', 200),
    select: data => data.filter(isPublicProfile),
  });

  const roles = useMemo(() => {
    const r = new Set(allProfiles.map(p => p.primary_role).filter(Boolean));
    return Array.from(r);
  }, [allProfiles]);

  const filtered = useMemo(() => {
    let result = [...allProfiles];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        (p.display_name || '').toLowerCase().includes(q) ||
        (p.bio || '').toLowerCase().includes(q) ||
        (p.primary_role || '').toLowerCase().includes(q) ||
        (p.specialties || []).some(s => s.toLowerCase().includes(q)) ||
        (p.location_city || '').toLowerCase().includes(q) ||
        (p.location_state || '').toLowerCase().includes(q) ||
        (p.primary_outlet_name || '').toLowerCase().includes(q) ||
        (p.series_covered || []).some(s => s.toLowerCase().includes(q))
      );
    }

    if (roleFilter) {
      result = result.filter(p => p.primary_role === roleFilter);
    }

    if (sort === 'featured') {
      result.sort((a, b) => {
        const score = p => p.verification_status === 'featured' ? 2 : p.verification_status === 'verified' ? 1 : 0;
        return score(b) - score(a);
      });
    } else if (sort === 'verified') {
      result.sort((a, b) => {
        const isVer = p => p.verification_status === 'verified' || p.verification_status === 'featured' ? 1 : 0;
        return isVer(b) - isVer(a);
      });
    } else if (sort === 'alpha') {
      result.sort((a, b) => (a.display_name || '').localeCompare(b.display_name || ''));
    }

    return result;
  }, [allProfiles, search, roleFilter, sort]);

  const clearFilters = () => { setSearch(''); setRoleFilter(''); setSort('featured'); };
  const hasFilters = search || roleFilter;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-[#0A0A0A] text-white py-14 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Discover</p>
          <h1 className="text-4xl font-black mb-2">Creator Directory</h1>
          <p className="text-gray-400 max-w-lg">Photographers, writers, videographers, and journalists covering motorsports.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, specialty, location..."
              className="pl-9 bg-gray-50 border-gray-200"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {roles.map(role => (
              <Button
                key={role}
                size="sm"
                variant={roleFilter === role ? 'default' : 'outline'}
                onClick={() => setRoleFilter(r => r === role ? '' : role)}
                className="text-xs h-9"
              >
                {ROLE_LABELS[role] || role}
              </Button>
            ))}
          </div>

          <div className="flex gap-2 items-center">
            <SlidersHorizontal className="w-4 h-4 text-gray-400" />
            {SORT_OPTIONS.map(o => (
              <Button
                key={o.value}
                size="sm"
                variant={sort === o.value ? 'default' : 'ghost'}
                onClick={() => setSort(o.value)}
                className="text-xs h-9"
              >
                {o.label}
              </Button>
            ))}
            {hasFilters && (
              <Button size="sm" variant="ghost" onClick={clearFilters} className="text-xs h-9 text-gray-400 gap-1">
                <X className="w-3 h-3" /> Clear
              </Button>
            )}
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-gray-500 text-sm">{filtered.length} creator{filtered.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-gray-50 rounded-2xl h-52 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-gray-200 rounded-2xl">
            <p className="text-gray-400 font-medium">No creators found</p>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-2 text-gray-400">Clear filters</Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map(p => <CreatorCard key={p.id} profile={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}