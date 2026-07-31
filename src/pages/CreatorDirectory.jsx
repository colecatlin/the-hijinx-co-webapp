import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageShell from '@/components/shared/PageShell';
import DirectoryFilters from '@/components/shared/DirectoryFilters';
import CreatorCard from '@/components/media/public/CreatorCard';
import { Skeleton } from '@/components/ui/skeleton';
import { isPublicProfile, ROLE_LABELS } from '@/components/media/public/mediaPublicHelpers';

export default function CreatorDirectory() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ role: 'all' });
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

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

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

    if (filters.role !== 'all') {
      result = result.filter(p => p.primary_role === filters.role);
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
  }, [allProfiles, search, filters.role, sort]);

  return (
    <PageShell className="bg-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <DirectoryFilters
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by name, specialty, location..."
          filters={filters}
          onFilterChange={handleFilterChange}
          filterConfig={[
            {
              key: 'role',
              label: 'Role',
              options: [
                { value: 'all', label: 'All Roles' },
                ...roles.map(r => ({ value: r, label: ROLE_LABELS[r] || r })),
              ],
            },
          ]}
          sortBy={sort}
          onSortChange={setSort}
          sortOptions={[
            { value: 'featured', label: 'Featured First' },
            { value: 'verified', label: 'Verified First' },
            { value: 'alpha', label: 'A–Z' },
          ]}
        />

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-72" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No creators found matching your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map(p => <CreatorCard key={p.id} profile={p} />)}
          </div>
        )}
      </div>
    </PageShell>
  );
}