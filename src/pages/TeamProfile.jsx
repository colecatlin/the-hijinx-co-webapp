import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import PageShell from '../components/shared/PageShell';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, MapPin, Globe } from 'lucide-react';

export default function TeamProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const teamId = urlParams.get('id');

  const { data: team, isLoading } = useQuery({
    queryKey: ['team', teamId],
    queryFn: async () => {
      const all = await base44.entities.Team.list();
      return all.find(t => t.id === teamId);
    },
    enabled: !!teamId,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['teamDrivers', teamId],
    queryFn: () => base44.entities.Driver.filter({ team_id: teamId, status: 'active' }),
    enabled: !!teamId,
  });

  if (isLoading) {
    return <PageShell><div className="max-w-4xl mx-auto px-6 py-20"><Skeleton className="h-10 w-1/2 mb-4" /><Skeleton className="h-48 w-full" /></div></PageShell>;
  }

  if (!team) {
    return <PageShell><div className="max-w-4xl mx-auto px-6 py-20 text-center"><p className="text-gray-400">Team not found.</p></div></PageShell>;
  }

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        <Link to={createPageUrl('TeamDirectory')} className="inline-flex items-center gap-1 text-xs font-mono text-gray-400 hover:text-[#0A0A0A] mb-8 transition-colors">
          <ArrowLeft className="w-3 h-3" /> Teams
        </Link>

        <div className="flex items-start gap-6">
          {team.logo_url && (
            <div className="w-20 h-20 bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
              <img src={team.logo_url} alt={team.name} className="w-full h-full object-contain p-2" />
            </div>
          )}
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">{team.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {team.location && <span className="flex items-center gap-1 text-xs text-gray-400"><MapPin className="w-3 h-3" /> {team.location}</span>}
              {team.website && <a href={team.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#0A0A0A]"><Globe className="w-3 h-3" /> Website</a>}
            </div>
          </div>
        </div>

        {team.description && (
          <p className="text-sm text-gray-600 leading-relaxed mt-8">{team.description}</p>
        )}

        {team.series_names?.length > 0 && (
          <div className="mt-6 flex gap-2">
            {team.series_names.map(s => (
              <span key={s} className="px-3 py-1 text-[10px] font-mono tracking-wider bg-gray-100 text-gray-500 uppercase">{s}</span>
            ))}
          </div>
        )}

        {drivers.length > 0 && (
          <div className="mt-10 pt-8 border-t border-gray-200">
            <h2 className="font-mono text-xs tracking-[0.2em] text-gray-400 uppercase mb-4">Drivers</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {drivers.map(d => (
                <Link key={d.id} to={createPageUrl('DriverProfile') + `?id=${d.id}`} className="flex items-center gap-3 p-4 border border-gray-100 hover:border-gray-300 transition-colors group">
                  <div className="w-10 h-10 bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {d.photo_url ? <img src={d.photo_url} alt={d.name} className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-gray-300">{d.number || d.name?.[0]}</span>}
                  </div>
                  <span className="font-semibold text-sm group-hover:underline">{d.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}