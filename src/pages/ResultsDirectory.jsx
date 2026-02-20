import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { format } from 'date-fns';
import PageShell from '@/components/shared/PageShell';
import SectionHeader from '@/components/shared/SectionHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Flag, ChevronRight, Trophy, Medal } from 'lucide-react';

export default function ResultsDirectory() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['results-events'],
    queryFn: () => base44.entities.Event.filter({ status: 'completed' }, '-date', 50),
  });

  const { data: allResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: ['results-all'],
    queryFn: () => base44.entities.Results.list('-position', 500),
    enabled: events.length > 0,
  });

  const { data: drivers = [], isLoading: driversLoading } = useQuery({
    queryKey: ['drivers-list'],
    queryFn: () => base44.entities.Driver.list(),
    enabled: allResults.length > 0,
  });

  const isLoading = eventsLoading || resultsLoading || driversLoading;

  const podiumByEvent = useMemo(() => {
    const map = {};
    for (const event of events) {
      const finalResults = allResults
        .filter(r => r.event_id === event.id && r.position && r.session_type === 'Final')
        .sort((a, b) => a.position - b.position);

      const fallback = allResults
        .filter(r => r.event_id === event.id && r.position)
        .sort((a, b) => a.position - b.position);

      const top3 = (finalResults.length > 0 ? finalResults : fallback).slice(0, 3);

      map[event.id] = top3.map(r => {
        const driver = drivers.find(d => d.id === r.driver_id);
        return {
          position: r.position,
          number: driver?.primary_number || null,
          name: driver ? `${driver.first_name} ${driver.last_name}` : (r.team_name || '—'),
        };
      });
    }
    return map;
  }, [events, allResults, drivers]);

  // Only show events that have at least one result record
  const eventsWithResults = events.filter(e => allResults.some(r => r.event_id === e.id));

  const filtered = eventsWithResults.filter(e => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    if (e.name?.toLowerCase().includes(term)) return true;
    if (e.track_name?.toLowerCase().includes(term)) return true;
    const podium = podiumByEvent[e.id] || [];
    return podium.some(p => p.name?.toLowerCase().includes(term));
  });

  const positionIcon = (pos) => {
    if (pos === 1) return <Trophy className="w-3.5 h-3.5 text-yellow-500" />;
    if (pos === 2) return <Medal className="w-3.5 h-3.5 text-gray-400" />;
    if (pos === 3) return <Medal className="w-3.5 h-3.5 text-amber-600" />;
    return null;
  };

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto px-6 py-12 md:py-20">
        <SectionHeader label="Motorsports" title="Results" subtitle="Race results and event data." />

        <div className="mb-8">
          <input
            type="text"
            placeholder="Search by event, track, or driver..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border-b-2 border-gray-200 focus:border-[#0A0A0A] bg-transparent py-2 text-sm outline-none placeholder:text-gray-300"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Flag} title="No results yet" message="Completed event results will appear here." />
        ) : (
          <div className="space-y-3">
            {filtered.map((event) => {
              const podium = podiumByEvent[event.id] || [];
              const dateStr = event.event_date ? format(new Date(event.event_date), 'MM/dd/yy') : null;

              return (
                <div key={event.id} className="flex items-stretch border border-gray-100 hover:border-gray-300 transition-colors group">
                  {/* Date block */}
                  {dateStr && (
                    <div className="flex-shrink-0 flex items-center justify-center bg-[#0A0A0A] text-white font-mono text-sm font-bold px-4 min-w-[80px]">
                      {dateStr}
                    </div>
                  )}

                  {/* Main content */}
                  <div className="flex-1 px-5 py-4">
                    <h3 className="font-bold text-sm text-[#0A0A0A] mb-2">{event.name}</h3>
                    {podium.length > 0 ? (
                      <div className="flex flex-wrap gap-4">
                        {podium.map((p) => (
                          <div key={p.position} className="flex items-center gap-1.5">
                            {positionIcon(p.position)}
                            <span className="text-xs text-gray-700 font-medium">
                              {p.number ? `#${p.number} ` : ''}{p.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">No finisher data available</span>
                    )}
                  </div>

                  {/* Arrow link */}
                  <Link
                    to={createPageUrl('EventResults') + `?id=${event.id}`}
                    className="flex-shrink-0 flex items-center justify-center px-4 border-l border-gray-100 group-hover:border-gray-300 hover:bg-[#0A0A0A] hover:text-white transition-colors"
                    title="View full results"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-inherit transition-colors" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}