import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import PageShell from '@/components/shared/PageShell';
import SectionHeader from '@/components/shared/SectionHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, MapPin } from 'lucide-react';

export default function ScheduleHome() {
  const [seriesFilter, setSeriesFilter] = useState('all');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['schedule'],
    queryFn: () => base44.entities.Event.filter({ status: 'upcoming' }, 'event_date', 100),
  });

  const { data: series = [] } = useQuery({
    queryKey: ['seriesSchedule'],
    queryFn: () => base44.entities.Series.filter({ status: 'Active' }),
  });

  const uniqueSeries = [...new Set(events.map(e => e.series).filter(Boolean))];
  const filtered = seriesFilter === 'all' ? events : events.filter(e => e.series === seriesFilter);

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto px-6 py-12 md:py-20">
        <SectionHeader label="Motorsports" title="Schedule" subtitle="Upcoming events and races." />

        <div className="flex gap-3 mb-8">
          <Select value={seriesFilter} onValueChange={setSeriesFilter}>
            <SelectTrigger className="w-44 rounded-none text-xs"><SelectValue placeholder="All Series" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Series</SelectItem>
              {series.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Calendar} title="No upcoming events" message="Events will appear here once scheduled." />
        ) : (
          <div className="space-y-3">
            {filtered.map((event) => (
              <div key={event.id} className="border border-gray-200 p-5 flex flex-col md:flex-row md:items-center gap-4 hover:border-gray-400 transition-colors">
                <div className="w-16 text-center shrink-0">
                  {(() => {
                    const dateStr = event.date?.toString();
                    if (!dateStr || dateStr.length !== 8) return null;
                    const parsedDate = new Date(dateStr.slice(0, 4) + '-' + dateStr.slice(4, 6) + '-' + dateStr.slice(6, 8));
                    if (isNaN(parsedDate.getTime())) return null;
                    return (
                      <>
                        <span className="font-mono text-[10px] text-gray-400 uppercase">{format(parsedDate, 'MMM')}</span>
                        <p className="text-2xl font-black">{format(parsedDate, 'd')}</p>
                      </>
                    );
                  })()}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-sm">{event.name}</h3>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    {event.series_name && <span className="font-mono text-[10px] text-gray-400 tracking-wider">{event.series_name}</span>}
                    {event.track_name && (
                      <span className="flex items-center gap-1 text-[10px] text-gray-400">
                        <MapPin className="w-3 h-3" /> {event.track_name}
                      </span>
                    )}
                  </div>
                </div>
                {event.end_date && event.end_date !== event.date && (
                  <span className="text-xs text-gray-400 font-mono">
                    {(() => {
                      const startDateStr = event.date?.toString();
                      const endDateStr = event.end_date?.toString();
                      if (!startDateStr || !endDateStr || startDateStr.length !== 8 || endDateStr.length !== 8) return null;
                      const startDate = new Date(startDateStr.slice(0, 4) + '-' + startDateStr.slice(4, 6) + '-' + startDateStr.slice(6, 8));
                      const endDate = new Date(endDateStr.slice(0, 4) + '-' + endDateStr.slice(4, 6) + '-' + endDateStr.slice(6, 8));
                      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;
                      return `${format(startDate, 'MMM d')} – ${format(endDate, 'MMM d')}`;
                    })()}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}