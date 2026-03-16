import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import OutletCard from '@/components/media/public/OutletCard';
import { isPublicOutlet, OUTLET_TYPE_LABELS } from '@/components/media/public/mediaPublicHelpers';

export default function MediaOutletDirectory() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const { data: allOutlets = [], isLoading } = useQuery({
    queryKey: ['publicMediaOutlets'],
    queryFn: () => base44.entities.MediaOutlet.list('-created_date', 200),
    select: data => data.filter(isPublicOutlet),
  });

  const types = useMemo(() => {
    const t = new Set(allOutlets.map(o => o.outlet_type).filter(Boolean));
    return Array.from(t);
  }, [allOutlets]);

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
    if (typeFilter) result = result.filter(o => o.outlet_type === typeFilter);
    // Featured first
    result.sort((a, b) => {
      const score = o => o.verification_status === 'featured' ? 2 : o.verification_status === 'verified' ? 1 : 0;
      return score(b) - score(a);
    });
    return result;
  }, [allOutlets, search, typeFilter]);

  const hasFilters = search || typeFilter;

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-[#0A0A0A] text-white py-14 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Media</p>
          <h1 className="text-4xl font-black mb-2">Media Outlets</h1>
          <p className="text-gray-400 max-w-lg">Publications, creator brands, podcasts, and media organizations covering motorsports.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search outlets..."
              className="pl-9 bg-gray-50 border-gray-200"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {types.map(type => (
              <Button
                key={type}
                size="sm"
                variant={typeFilter === type ? 'default' : 'outline'}
                onClick={() => setTypeFilter(t => t === type ? '' : type)}
                className="text-xs h-9"
              >
                {OUTLET_TYPE_LABELS[type] || type}
              </Button>
            ))}
            {hasFilters && (
              <Button size="sm" variant="ghost" onClick={() => { setSearch(''); setTypeFilter(''); }} className="text-xs h-9 text-gray-400 gap-1">
                <X className="w-3 h-3" /> Clear
              </Button>
            )}
          </div>
        </div>

        <p className="text-gray-500 text-sm mb-4">{filtered.length} outlet{filtered.length !== 1 ? 's' : ''}</p>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-gray-50 rounded-2xl h-52 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-gray-200 rounded-2xl">
            <p className="text-gray-400 font-medium">No outlets found</p>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setTypeFilter(''); }} className="mt-2 text-gray-400">Clear filters</Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {filtered.map(o => <OutletCard key={o.id} outlet={o} />)}
          </div>
        )}
      </div>
    </div>
  );
}