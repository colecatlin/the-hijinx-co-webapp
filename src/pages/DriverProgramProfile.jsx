import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import PageShell from '@/components/shared/PageShell';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Flag, Calendar, MapPin, Users, Hash, Trophy, TrendingUp, Image } from 'lucide-react';
import ResultsPanel from '@/components/results/ResultsPanel';
import StatsSection from '@/components/drivers/StatsSection';

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-gray-400 text-xs font-medium uppercase tracking-wide mb-1">
        {Icon && <Icon className="w-4 h-4" />}
        {label}
      </div>
      <div className="text-3xl font-black text-[#232323]">{value ?? '—'}</div>
    </div>
  );
}

export default function DriverProgramProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const programId = urlParams.get('programId');

  const { data: program, isLoading: programLoading } = useQuery({
    queryKey: ['driverProgram', programId],
    queryFn: async () => {
      const all = await base44.entities.DriverProgram.filter({ id: programId });
      return all[0] || null;
    },
    enabled: !!programId,
  });

  const { data: driver } = useQuery({
    queryKey: ['driver', program?.driver_id],
    queryFn: async () => {
      const all = await base44.entities.Driver.filter({ id: program.driver_id });
      return all[0] || null;
    },
    enabled: !!program?.driver_id,
  });

  const { data: series } = useQuery({
    queryKey: ['series', program?.series_id],
    queryFn: async () => {
      const all = await base44.entities.Series.filter({ id: program.series_id });
      return all[0] || null;
    },
    enabled: !!program?.series_id,
  });

  const { data: team } = useQuery({
    queryKey: ['team', program?.team_id],
    queryFn: async () => {
      const all = await base44.entities.Team.filter({ id: program.team_id });
      return all[0] || null;
    },
    enabled: !!program?.team_id,
  });

  const { data: results = [] } = useQuery({
    queryKey: ['programResults', programId],
    queryFn: () => base44.entities.Results.filter({ program_id: programId }),
    enabled: !!programId,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list(),
    enabled: !!programId,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => base44.entities.Session.list(),
    enabled: !!programId,
  });

  const { data: media } = useQuery({
    queryKey: ['driverMedia', program?.driver_id],
    queryFn: async () => {
      const all = await base44.entities.DriverMedia.filter({ driver_id: program.driver_id });
      return all[0] || null;
    },
    enabled: !!program?.driver_id,
  });

  if (!programId || (!programLoading && !program)) {
    return (
      <PageShell className="bg-white">
        <div className="max-w-5xl mx-auto px-6 py-12 text-center">
          <p className="text-gray-500 mb-4">Program not found.</p>
          <Link to={createPageUrl('DriverDirectory')}>
            <Button>Back to Drivers</Button>
          </Link>
        </div>
      </PageShell>
    );
  }

  if (programLoading || !program) {
    return (
      <PageShell className="bg-white">
        <div className="max-w-5xl mx-auto px-6 py-12 space-y-4">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      </PageShell>
    );
  }

  const programName = program.program_type === 'single_event'
    ? (program.event_name || 'Unnamed Event')
    : (program.series_name || 'Unknown Series');

  const isActive = program.status === 'active';

  const dateRange = program.program_type === 'single_event'
    ? (program.event_date || '')
    : program.status === 'inactive' && program.end_year
      ? `${program.start_year} – ${program.end_year}`
      : `${program.start_year} – Present`;

  // Calculate quick stats from results
  const finalResults = results.filter(r =>
    r.session_type === 'Final' || r.session_type?.toLowerCase().includes('final')
  );
  const wins = finalResults.filter(r => r.position === 1).length;
  const podiums = finalResults.filter(r => r.position <= 3).length;
  const totalPoints = results.reduce((sum, r) => sum + (r.points || 0), 0);
  const bestFinish = finalResults.length > 0
    ? Math.min(...finalResults.map(r => r.position).filter(Boolean))
    : null;

  const driverProfileUrl = driver
    ? `${createPageUrl('DriverProfile')}?first=${encodeURIComponent(driver.first_name?.toLowerCase())}&last=${encodeURIComponent(driver.last_name?.toLowerCase())}`
    : createPageUrl('DriverDirectory');

  return (
    <PageShell className="bg-[#FAFAFA]">
      <div className="max-w-5xl mx-auto px-6 pt-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link to={createPageUrl('DriverDirectory')} className="hover:text-[#232323]">Drivers</Link>
          <span>/</span>
          {driver && (
            <>
              <Link
                to={`${createPageUrl('DriverProfile')}?first=${encodeURIComponent(driver.first_name?.toLowerCase())}&last=${encodeURIComponent(driver.last_name?.toLowerCase())}`}
                className="hover:text-[#232323]"
              >
                {driver.first_name} {driver.last_name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-[#232323] font-medium truncate">{programName}</span>
        </div>
      </div>

      {/* Hero banner */}
      {media?.hero_image_url && (
        <div className="w-full h-[260px] relative overflow-hidden mt-3">
          <img src={media.hero_image_url} alt={programName} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 flex-wrap mb-2">
            {program.program_type === 'single_event' ? (
              <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium">
                <Calendar className="w-3 h-3" /> Single Event
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                <Flag className="w-3 h-3" /> Series Program
              </span>
            )}
            {isActive ? (
              <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
                ● Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium">
                ● Past
              </span>
            )}
          </div>
          <h1 className="text-4xl font-black text-[#232323]">{programName}</h1>
          {driver && (
            <p className="text-lg text-gray-500 mt-1">
              <Link to={driverProfileUrl} className="hover:text-[#232323] transition-colors font-medium">
                {driver.first_name} {driver.last_name}
              </Link>
            </p>
          )}
        </div>

        <Separator className="mb-8" />

        {/* Program details strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {program.car_number && (
            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                <Hash className="w-3 h-3" /> Car #
              </div>
              <div className="text-3xl font-black text-[#232323]">#{program.car_number}</div>
            </div>
          )}
          {program.class_name && (
            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Class</div>
              <div className="text-xl font-bold text-[#232323]">{program.class_name}</div>
            </div>
          )}
          {(team || program.team_name) && (
            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                <Users className="w-3 h-3" /> Team
              </div>
              <div className="text-xl font-bold text-[#232323]">{team?.name || program.team_name}</div>
            </div>
          )}
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Period
            </div>
            <div className="text-xl font-bold text-[#232323]">{dateRange || '—'}</div>
          </div>
        </div>

        {/* Stats row */}
        {results.length > 0 && (
          <>
            <h2 className="text-xl font-bold text-[#232323] mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#00FFDA]" /> Accomplishments
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard label="Wins" value={wins} icon={Trophy} />
              <StatCard label="Podiums" value={podiums} icon={TrendingUp} />
              <StatCard label="Best Finish" value={bestFinish ? `P${bestFinish}` : '—'} icon={Flag} />
              <StatCard label="Total Points" value={totalPoints > 0 ? totalPoints : '—'} icon={Hash} />
            </div>
            <Separator className="mb-8" />
          </>
        )}

        {/* Full stats */}
        {driver && results.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold text-[#232323] mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#00FFDA]" /> Stats
            </h2>
            <StatsSection
              driver={driver}
              results={results}
              sessions={sessions}
              events={events}
            />
          </section>
        )}

        {/* Results */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-[#232323] mb-4 flex items-center gap-2">
            <Flag className="w-5 h-5 text-[#00FFDA]" /> Results
          </h2>
          {driver ? (
            <ResultsPanel driverId={driver.id} />
          ) : (
            <p className="text-gray-400 text-sm">No results available.</p>
          )}
        </section>

        {/* Media gallery */}
        {media?.gallery_urls?.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-[#232323] mb-4 flex items-center gap-2">
              <Image className="w-5 h-5 text-[#00FFDA]" /> Media
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {media.gallery_urls.map((url, i) => (
                <div key={i} className="aspect-video overflow-hidden rounded-xl bg-gray-100">
                  <img src={url} alt={`Media ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Notes */}
        {program.notes && (
          <div className="mt-8 bg-white border border-gray-100 rounded-xl p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-2">Notes</h3>
            <p className="text-gray-700">{program.notes}</p>
          </div>
        )}
      </div>
    </PageShell>
  );
}