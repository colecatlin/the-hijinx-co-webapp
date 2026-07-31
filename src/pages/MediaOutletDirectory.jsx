import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageShell from '@/components/shared/PageShell';
import DirectoryFilters from '@/components/shared/DirectoryFilters';
import OutletCard from '@/components/media/public/OutletCard';
import { isPublicOutlet, OUTLET_TYPE_LABELS } from '@/components/media/public/mediaPublicHelpers';

export default function MediaOutletDirectory() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ type: 'all' });
  const [sort, setSort] = useState('featured');

  const { data: allOutlets = [], isLoading } = useQuery({
    queryKey: ['publicMediaOutlets'],
    queryFn: () => base44.entities.MediaOutlet.list('-created_date', 200),
    select: data => data.filter(isPublicOutlet),
  });

  const types = useMemo(() => {
    const t = new Set(allOutlets.map(o => o.outlet_type).filter(Boolean));
    return Array.from(t);
  }, [allOutlets]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const filtered = useMemo(() => {
    let result = [...allOutlets];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(o =>
        (o.name || '').toLowerCase().includes(q) ||
        (o.description || '').toLowerCase().includes(q) ||
        (o.specialties || []).some(s => s.toLowerCase().includes(q)) ||
        (o.series_covered || []).some(s => s.toLowerCase().includes(q))
      );
    }
    if (filters.type !== 'all') result = result.filter(o => o.outlet_type === filters.type);

    if (sort === 'alpha') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else {
      // Featured first (default)
      result.sort((a, b) => {
        const score = o => o.verification_status === 'featured' ? 2 : o.verification_status === 'verified' ? 1 : 0;
        return score(b) - score(a);
      });
    }
    return result;
  }, [allOutlets, search, filters.type, sort]);

  return (
    <PageShell className="bg-[#FFF8F5]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <DirectoryFilters
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search outlets..."
          filters={filters}
          onFilterChange={handleFilterChange}
          filterConfig={[
            {
              key: 'type',
              label: 'Type',
              options: [
                { value: 'all', label: 'All Types' },
                ...types.map(t => ({ value: t, label: OUTLET_TYPE_LABELS[t] || t })),
              ],
            },
          ]}
          sortBy={sort}
          onSortChange={setSort}
          sortOptions={[
            { value: 'featured', label: 'Featured First' },
            { value: 'alpha', label: 'A–Z' },
          ]}
        />

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-gray-50 rounded-2xl h-52 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-gray-200 rounded-2xl">
            <p className="text-gray-400 font-medium">No outlets found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {filtered.map(o => <OutletCard key={o.id} outlet={o} />)}
          </div>
        )}
      </div>
    </PageShell>
  );
}