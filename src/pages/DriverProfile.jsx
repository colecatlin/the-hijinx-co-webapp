import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import PageShell from '@/components/shared/PageShell';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, MapPin, Trophy, Flag, Play } from 'lucide-react';

export default function DriverProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const driverId = urlParams.get('id');

  const { data: driver, isLoading } = useQuery({
    queryKey: ['driver', driverId],
    queryFn: async () => {
      const all = await base44.entities.Driver.list();
      return all.find(d => d.id === driverId);
    },
    enabled: !!driverId,
  });

  const { data: standings = [] } = useQuery({
    queryKey: ['driverStandings', driverId],
    queryFn: async () => {
      if (!driverId) return [];
      return base44.entities.StandingsEntry.filter({ driver_id: driverId }, '-season', 20);
    },
    enabled: !!driverId,
  });

  if (isLoading) {
    return (
      <PageShell>
        <div className="max-w-4xl mx-auto px-6 py-20">
          <Skeleton className="h-6 w-20 mb-6" />
          <Skeleton className="h-10 w-1/2 mb-4" />
          <Skeleton className="h-4 w-1/3 mb-8" />
          <Skeleton className="h-48 w-full" />
        </div>
      </PageShell>
    );
  }

  if (!driver) {
    return (
      <PageShell>
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <p className="text-gray-400">Driver not found.</p>
        </div>
      </PageShell>
    );
  }

  const stats = [
    { label: 'Wins', value: driver.career_wins || 0, icon: Trophy },
    { label: 'Podiums', value: driver.career_podiums || 0, icon: Flag },
    { label: 'Starts', value: driver.career_starts || 0, icon: Play },
  ];

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        <Link to={createPageUrl('DriverDirectory')} className="inline-flex items-center gap-1 text-xs font-mono text-gray-400 hover:text-[#0A0A0A] mb-8 transition-colors">
          <ArrowLeft className="w-3 h-3" /> Drivers
        </Link>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Photo */}
          <div className="w-full md:w-48 h-48 md:h-56 bg-gray-100 shrink-0 overflow-hidden">
            {driver.photo_url ? (
              <img src={driver.photo_url} alt={driver.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-5xl font-black text-gray-200">{driver.number || '?'}</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            {driver.number && <span className="font-mono text-xs text-gray-400">#{driver.number}</span>}
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mt-1">{driver.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              {driver.team_name && <span className="text-sm text-gray-600">{driver.team_name}</span>}
              {driver.hometown && (
                <span className="flex items-center gap-1 text-xs text-gray-400"><MapPin className="w-3 h-3" /> {driver.hometown}</span>
              )}
              {driver.vehicle && <span className="text-xs text-gray-400">{driver.vehicle}</span>}
            </div>

            {/* Stats */}
            <div className="flex gap-6 mt-6">
              {stats.map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-2xl font-black">{s.value}</p>
                  <p className="font-mono text-[10px] text-gray-400 tracking-wider uppercase mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bio */}
        {driver.bio && (
          <div className="mt-10 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-600 leading-relaxed">{driver.bio}</p>
          </div>
        )}

        {/* Standings history */}
        {standings.length > 0 && (
          <div className="mt-10 pt-8 border-t border-gray-200">
            <h2 className="font-mono text-xs tracking-[0.2em] text-gray-400 uppercase mb-4">Standings History</h2>
            <div className="overflow-x-auto border border-gray-200">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-[10px] font-mono text-gray-400 uppercase">Season</th>
                    <th className="px-4 py-2 text-left text-[10px] font-mono text-gray-400 uppercase">Series</th>
                    <th className="px-4 py-2 text-left text-[10px] font-mono text-gray-400 uppercase">Class</th>
                    <th className="px-4 py-2 text-left text-[10px] font-mono text-gray-400 uppercase">Pos</th>
                    <th className="px-4 py-2 text-left text-[10px] font-mono text-gray-400 uppercase">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((s) => (
                    <tr key={s.id} className="border-b border-gray-100">
                      <td className="px-4 py-2 text-sm font-medium">{s.season}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">{s.series_name}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">{s.class_name}</td>
                      <td className="px-4 py-2 text-sm font-bold">{s.position}</td>
                      <td className="px-4 py-2 text-sm">{s.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Social */}
        {driver.social_links && Object.values(driver.social_links).some(Boolean) && (
          <div className="mt-8 flex gap-4">
            {driver.social_links.instagram && (
              <a href={driver.social_links.instagram} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-[#0A0A0A] font-mono">Instagram</a>
            )}
            {driver.social_links.twitter && (
              <a href={driver.social_links.twitter} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-[#0A0A0A] font-mono">Twitter</a>
            )}
            {driver.social_links.website && (
              <a href={driver.social_links.website} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-[#0A0A0A] font-mono">Website</a>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}