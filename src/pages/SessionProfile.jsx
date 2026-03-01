import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, ArrowLeft, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { format, parseISO } from 'date-fns';

export default function SessionProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('id');

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => base44.entities.Session.list().then(sessions => sessions.find(s => s.id === sessionId)),
    enabled: !!sessionId,
  });

  const { data: event } = useQuery({
    queryKey: ['event', session?.event_id],
    queryFn: () => session?.event_id ? base44.entities.Event.list().then(events => events.find(e => e.id === session.event_id)) : null,
    enabled: !!session?.event_id,
  });

  const { data: track } = useQuery({
    queryKey: ['track', event?.track_id],
    queryFn: () => event?.track_id ? base44.entities.Track.list().then(tracks => tracks.find(t => t.id === event.track_id)) : null,
    enabled: !!event?.track_id,
  });

  const { data: series } = useQuery({
    queryKey: ['series', event?.series_id],
    queryFn: () => event?.series_id ? base44.entities.Series.list().then(series => series.find(s => s.id === event.series_id)) : null,
    enabled: !!event?.series_id,
  });

  const { data: results = [] } = useQuery({
    queryKey: ['sessionResults', sessionId],
    queryFn: () => base44.entities.Results.filter({ session_id: sessionId }),
    enabled: !!sessionId,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers-session'],
    queryFn: () => base44.entities.Driver.list(),
    enabled: results.length > 0,
  });

  const { data: programs = [] } = useQuery({
    queryKey: ['programs-session'],
    queryFn: () => base44.entities.DriverProgram.list(),
    enabled: results.length > 0,
  });

  const { data: isAuthenticated } = useQuery({
    queryKey: ['isAuthenticated'],
    queryFn: () => base44.auth.isAuthenticated(),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    enabled: isAuthenticated,
  });

  // Build lookup maps
  const driversById = useMemo(() => new Map(drivers.map(d => [d.id, d])), [drivers]);
  const programsById = useMemo(() => new Map(programs.map(p => [p.id, p])), [programs]);

  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => (a.position || 999) - (b.position || 999));
  }, [results]);

  const getCarNumber = (result) => {
    if (result.program_id && programsById.has(result.program_id)) {
      return programsById.get(result.program_id).car_number;
    }
    const driver = driversById.get(result.driver_id);
    return driver?.primary_number || '';
  };

  if (isLoading) {
    return (
      <PageShell className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <Skeleton className="h-12 w-64 mb-4" />
          <Skeleton className="h-96" />
        </div>
      </PageShell>
    );
  }

  if (!session) {
    return (
      <PageShell className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-12 text-center">
          <p className="text-gray-600 mb-4">Session not found</p>
          <Link to={createPageUrl('EventDirectory')}>
            <Button>Back to Events</Button>
          </Link>
        </div>
      </PageShell>
    );
  }

  const sections = [
    { id: 'overview', label: 'Overview', icon: Clock },
    { id: 'results', label: 'Results', icon: Trophy },
    { id: 'stats', label: 'Stats', icon: BarChart3 },
  ];

  return (
    <PageShell className="bg-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <Link to={createPageUrl('EventDirectory')} className="text-sm text-gray-600 hover:text-[#00FFDA] mb-4 inline-block">
          ← Back to Events
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 items-start">
          <div className="lg:col-span-2">
            <Separator className="mb-3" />
            <h1 className="text-4xl font-black text-[#232323] leading-none mb-2">{session.name}</h1>

            <div className="flex gap-1 overflow-x-auto border-b border-gray-200 mb-3">
              {sections.map(section => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => {
                      setActiveSection(section.id);
                      if (section.id === 'overview') {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      } else {
                        const element = document.getElementById(`section-${section.id}`);
                        if (element) {
                          const offset = element.getBoundingClientRect().top + window.pageYOffset - 120;
                          window.scrollTo({ top: offset, behavior: 'smooth' });
                        }
                      }
                    }}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors ${
                      activeSection === section.id
                        ? 'text-[#232323] border-b-2 border-[#00FFDA]'
                        : 'text-gray-600 hover:text-[#232323]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {section.label}
                  </button>
                );
              })}
            </div>

            <Separator className="mb-3" />
            <div className="bg-white p-8 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Type</div>
                  <div className="text-lg font-semibold text-[#232323] mb-4">{session.session_type}</div>
                  
                  {session.laps && (
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Laps</div>
                      <div className="text-lg font-semibold text-[#232323]">{session.laps}</div>
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Status</div>
                  <Badge className={`${
                    session.status === 'completed' ? 'bg-green-100 text-green-800' :
                    session.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {session.status}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 relative -mt-1">
            <div className="absolute -top-12 right-0 z-10">
              <SocialShareButtons 
                url={window.location.href}
                title={`${session.name} - Session`}
                description=""
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <section id="section-results" className="bg-white p-8">
            <Separator className="mb-3" />
            <h2 className="text-2xl font-bold text-[#232323] mb-6 mt-3">Results</h2>
            {results.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left py-2 px-4 font-bold">Pos</th>
                      <th className="text-left py-2 px-4 font-bold">Driver</th>
                      <th className="text-left py-2 px-4 font-bold">Team</th>
                      <th className="text-left py-2 px-4 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map(result => (
                      <tr key={result.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-bold">{result.position}</td>
                        <td className="py-3 px-4">{getDriverName(result.driver_id)}</td>
                        <td className="py-3 px-4 text-gray-600">{result.team_name || 'N/A'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 text-xs rounded ${
                            result.status_text === 'Running' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {result.status_text}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No results available yet.</p>
            )}
          </section>

          <section id="section-stats" className="bg-white p-8">
            <Separator className="mb-3" />
            <h2 className="text-2xl font-bold text-[#232323] mb-6 mt-3">Stats</h2>
            <p className="text-gray-500">Session statistics will be available after completion.</p>
          </section>
        </div>
      </div>
    </PageShell>
  );
}