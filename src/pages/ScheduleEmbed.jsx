import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import { Calendar, Loader2 } from 'lucide-react';

export default function ScheduleEmbed() {
  const urlParams = new URLSearchParams(window.location.search);
  const entityType = urlParams.get('entity');
  const entityId = urlParams.get('id');

  // Fetch the entity to get its calendar_id
  const { data: entity, isLoading: loadingEntity } = useQuery({
    queryKey: ['scheduleEmbedEntity', entityType, entityId],
    queryFn: async () => {
      if (!entityId || !entityType) return null;
      const entityMap = {
        Driver: base44.entities.Driver,
        Team: base44.entities.Team,
        Track: base44.entities.Track,
      };
      const repo = entityMap[entityType];
      if (!repo) return null;
      const items = await repo.filter({ id: entityId });
      return items[0] || null;
    },
    enabled: !!entityId && !!entityType,
  });

  const calendarId = entity?.calendar_id;

  const { data: eventsData, isLoading: loadingEvents } = useQuery({
    queryKey: ['embedCalendarEvents', calendarId],
    queryFn: () => base44.functions.invoke('calendarEvents', {
      action: 'list',
      calendarId,
      timeMin: new Date().toISOString(),
      timeMax: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    }).then(r => r.data),
    enabled: !!calendarId,
    refetchInterval: 5 * 60 * 1000, // refresh every 5 mins
  });

  const isLoading = loadingEntity || loadingEvents;
  const events = (eventsData?.items || []).sort((a, b) => {
    const aTime = new Date(a.start?.dateTime || a.start?.date);
    const bTime = new Date(b.start?.dateTime || b.start?.date);
    return aTime - bTime;
  });

  const entityName = entity?.name || (entity ? `${entity.first_name} ${entity.last_name}` : '');

  return (
    <div className="bg-white font-sans min-h-screen p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4 border-b border-gray-200 pb-3">
          <Calendar className="w-4 h-4 text-[#232323]" />
          <div>
            <div className="text-xs font-mono text-gray-500 uppercase tracking-wider">Race Schedule</div>
            {entityName && <div className="font-bold text-[#232323]">{entityName}</div>}
          </div>
          <div className="ml-auto">
            <a href="https://hijinx.co" target="_blank" rel="noopener noreferrer" className="text-[10px] text-gray-400 hover:text-[#232323]">
              Powered by HIJINX
            </a>
          </div>
        </div>

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}

        {!isLoading && (!calendarId || events.length === 0) && (
          <div className="text-center py-12 text-gray-400">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No upcoming events.</p>
          </div>
        )}

        {!isLoading && events.length > 0 && (
          <div className="space-y-2">
            {events.map(event => {
              const start = event.start?.dateTime || event.start?.date;
              const end = event.end?.dateTime || event.end?.date;
              const isAllDay = !event.start?.dateTime;
              return (
                <div key={event.id} className="flex items-start gap-3 border border-gray-100 p-3 hover:bg-gray-50">
                  <div className="text-center min-w-[44px] bg-[#232323] text-white p-1.5 shrink-0">
                    <div className="text-[9px] font-mono uppercase">{format(parseISO(start), 'MMM')}</div>
                    <div className="text-xl font-black leading-none">{format(parseISO(start), 'd')}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-[#232323] truncate">{event.summary}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {isAllDay ? 'All day' : `${format(parseISO(start), 'h:mm a')} — ${format(parseISO(end), 'h:mm a')}`}
                    </div>
                    {event.location && <div className="text-xs text-gray-400 mt-0.5 truncate">{event.location}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-gray-100 text-center">
          <a
            href={`https://hijinx.co`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-gray-400 hover:text-[#232323] font-mono"
          >
            View full profile on HIJINX →
          </a>
        </div>
      </div>
    </div>
  );
}