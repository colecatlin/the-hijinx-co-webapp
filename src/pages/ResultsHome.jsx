import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { format } from 'date-fns';
import PageShell from '@/components/shared/PageShell';
import SectionHeader from '@/components/shared/SectionHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Flag, ChevronRight } from 'lucide-react';

export default function ResultsHome() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['results'],
    queryFn: () => base44.entities.Event.filter({ status: 'completed' }, '-date', 50),
  });

  const [searchTerm, setSearchTerm] = useState('');
  const filtered = events.filter(e =>
    !searchTerm || e.name?.toLowerCase().includes(searchTerm.toLowerCase()) || e.track_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto px-6 py-12 md:py-20">
        <SectionHeader label="Motorsports" title="Results" subtitle="Race results and event data." />

        <div className="mb-8">
          <input
            type="text"
            placeholder="Search by event or track..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border-b-2 border-gray-200 focus:border-[#0A0A0A] bg-transparent py-2 text-sm outline-none placeholder:text-gray-300"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Flag} title="No results yet" message="Completed event results will appear here." />
        ) : (
          <div className="space-y-2">
            {filtered.map((event) => (
              <Link
                key={event.id}
                to={createPageUrl('EventResults') + `?id=${event.id}`}
                className="flex items-center justify-between p-4 border border-gray-100 hover:border-gray-300 transition-colors group"
              >
                <div>
                  <h3 className="font-bold text-sm group-hover:underline">{event.name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="font-mono text-[10px] text-gray-400">{event.series_name}</span>
                    <span className="text-[10px] text-gray-400">{event.track_name}</span>
                    <span className="text-[10px] text-gray-400">{format(new Date(event.date), 'MMM d, yyyy')}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#0A0A0A] transition-colors" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}