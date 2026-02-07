import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import PageShell from '../components/shared/PageShell';
import SectionHeader from '../components/shared/SectionHeader';
import EmptyState from '../components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Search, ArrowRight } from 'lucide-react';

export default function TeamDirectory() {
  const [search, setSearch] = useState('');

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.filter({ status: 'active' }, 'name', 100),
  });

  const filtered = teams.filter(t =>
    !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.location?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-20">
        <SectionHeader label="Motorsports" title="Team Directory" subtitle="Teams competing across all series." />

        <div className="flex items-center gap-2 border-b-2 border-gray-200 focus-within:border-[#0A0A0A] max-w-md mb-10 transition-colors">
          <Search className="w-4 h-4 text-gray-300" />
          <input type="text" placeholder="Search teams..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="flex-1 py-2 text-sm bg-transparent outline-none placeholder:text-gray-300" />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Building2} title="No teams found" message="Teams will appear here once added." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((team) => (
              <Link key={team.id} to={createPageUrl('TeamProfile') + `?id=${team.id}`}
                className="group flex items-center gap-4 p-5 border border-gray-200 hover:border-[#0A0A0A] transition-colors">
                <div className="w-14 h-14 bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                  {team.logo_url ? (
                    <img src={team.logo_url} alt={team.name} className="w-full h-full object-contain p-1" />
                  ) : (
                    <span className="text-lg font-black text-gray-300">{team.name?.[0]}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm group-hover:underline truncate">{team.name}</h3>
                  <p className="text-[10px] text-gray-400 mt-1">{team.location}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#0A0A0A] transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}