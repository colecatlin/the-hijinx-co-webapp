import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Handshake, Search, ExternalLink } from 'lucide-react';

export default function SponsorDirectory() {
  const [search, setSearch] = useState('');

  const { data: orgs, isLoading } = useQuery({
    queryKey: ['sponsorDirectory'],
    queryFn: async () => {
      const all = await base44.entities.Organization.list('-created_date', 500);
      return all.filter(o => o.type === 'Sponsor' && !o.is_archived);
    },
    staleTime: 5 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    if (!orgs) return [];
    const visible = orgs.filter(o => o.visibility_status !== 'draft');
    if (!search) return visible;
    const q = search.toLowerCase();
    return visible.filter(o =>
      o.name?.toLowerCase().includes(q) ||
      o.industry?.toLowerCase().includes(q) ||
      o.description?.toLowerCase().includes(q) ||
      o.tagline?.toLowerCase().includes(q)
    );
  }, [orgs, search]);

  return (
    <div className="px-5 sm:px-8 md:px-12 lg:px-20 py-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h2 className="text-2xl font-black text-foreground">Sponsors</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-quiet" />
          <input
            type="text"
            placeholder="Search sponsors..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm rounded-lg border border-divider bg-surface text-foreground outline-none focus:border-motion transition-colors w-64"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-32 bg-surface-elevated rounded-lg animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-divider rounded-lg">
          <Handshake className="w-8 h-8 mx-auto mb-2 text-foreground-quiet" />
          <p className="text-sm text-foreground-quiet">No sponsors found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(org => (
            <Link
              key={org.id}
              to={`/organization/Sponsor/${org.id}`}
              className="border border-divider rounded-lg p-4 hover:border-motion/40 transition-colors group flex items-center gap-3"
            >
              {org.logo_url ? (
                <img src={org.logo_url} alt={org.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-motion/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-black text-motion">{org.name?.charAt(0)?.toUpperCase() || '?'}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground group-hover:text-motion transition-colors truncate">{org.name}</div>
                {org.industry && <div className="text-xs text-foreground-quiet truncate">{org.industry}</div>}
                {org.website_url && (
                  <div className="text-[10px] text-foreground-quiet mt-0.5 flex items-center gap-1 truncate">
                    <ExternalLink className="w-2.5 h-2.5" />{org.website_url.replace(/^https?:\/\//, '').split('/')[0]}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}