import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, Calendar, Trophy } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default function TeamScheduleResults({ teamId }) {
  // Get all driver programs for this team
  const { data: driverPrograms = [] } = useQuery({
    queryKey: ['teamDriverPrograms', teamId],
    queryFn: () => base44.entities.DriverProgram.filter({ team_id: teamId }),
    enabled: !!teamId,
  });

  // Get unique driver IDs from programs
  const driverIds = [...new Set(driverPrograms.map(dp => dp.driver_id).filter(Boolean))];

  // Fetch events (schedules)
  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['teamEvents', teamId, driverIds],
    queryFn: async () => {
      if (driverIds.length === 0) return [];
      
      const allEvents = [];
      for (const driverId of driverIds) {
        const driverResults = await base44.entities.Results.filter({ driver_id: driverId });
        const eventIds = [...new Set(driverResults.map(r => r.event_id).filter(Boolean))];
        
        for (const eventId of eventIds) {
          const eventData = await base44.entities.Event.filter({ id: eventId });
          allEvents.push(...eventData);
        }
      }
      
      return [...new Map(allEvents.map(e => [e.id, e])).values()]
        .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
    },
    enabled: driverIds.length > 0,
  });

  // Fetch driver data
  const { data: drivers = [] } = useQuery({
    queryKey: ['teamDrivers', driverIds],
    queryFn: async () => {
      if (driverIds.length === 0) return [];
      const allDrivers = [];
      for (const driverId of driverIds) {
        const driverData = await base44.entities.Driver.filter({ id: driverId });
        allDrivers.push(...driverData);
      }
      return allDrivers;
    },
    enabled: driverIds.length > 0,
  });

  // Fetch results for this team's drivers
  const { data: results = [], isLoading: loadingResults } = useQuery({
    queryKey: ['teamResults', driverIds],
    queryFn: async () => {
      if (driverIds.length === 0) return [];
      
      const allResults = [];
      for (const driverId of driverIds) {
        const driverResults = await base44.entities.Results.filter({ driver_id: driverId });
        allResults.push(...driverResults);
      }
      
      return allResults.sort((a, b) => new Date(b.event_id) - new Date(a.event_id));
    },
    enabled: driverIds.length > 0,
  });

  const upcomingEvents = events
    .filter(e => new Date(e.event_date) >= new Date())
    .slice(0, 5);

  const pastResults = results
    .filter(r => {
      const event = events.find(e => e.id === r.event_id);
      return event && new Date(event.event_date) < new Date();
    })
    .slice(0, 10);

  const isLoading = loadingEvents || loadingResults;

  return (
    <div className="space-y-8">
      {/* Upcoming Schedule */}
      <section className="bg-white border border-gray-200 p-8">
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="w-5 h-5 text-[#232323]" />
          <h2 className="text-2xl font-bold text-[#232323]">Upcoming Schedule</h2>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}

        {!isLoading && upcomingEvents.length === 0 && (
          <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No upcoming events scheduled.</p>
          </div>
        )}

        {!isLoading && upcomingEvents.length > 0 && (
          <div className="space-y-3">
            {upcomingEvents.map(event => (
              <div key={event.id} className="flex items-start justify-between border border-gray-200 p-4 hover:bg-gray-50 transition-colors">
                <div className="flex gap-4">
                  <div className="text-center min-w-[52px] bg-[#232323] text-white p-2">
                    <div className="text-xs font-mono uppercase">{format(parseISO(event.event_date), 'MMM')}</div>
                    <div className="text-2xl font-black leading-none">{format(parseISO(event.event_date), 'd')}</div>
                  </div>
                  <div>
                    <div className="font-bold text-[#232323]">{event.name}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{format(parseISO(event.event_date), 'EEEE, MMMM d, yyyy')}</div>
                    {event.series && (
                      <div className="text-xs text-gray-500 mt-1">{event.series}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Results */}
      <section className="bg-white border border-gray-200 p-8">
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="w-5 h-5 text-[#232323]" />
          <h2 className="text-2xl font-bold text-[#232323]">Recent Results</h2>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}

        {!isLoading && pastResults.length === 0 && (
          <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded">
            <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No race results yet.</p>
          </div>
        )}

        {!isLoading && pastResults.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pastResults.map(result => {
              const event = events.find(e => e.id === result.event_id);
              const driver = driverPrograms.find(dp => dp.driver_id === result.driver_id);
              
              return (
                <div key={result.id} className="border border-gray-200 p-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-[#232323] truncate">{event?.name || 'Event'}</div>
                      {event && (
                        <div className="text-xs text-gray-600 mt-0.5">{format(parseISO(event.event_date), 'MMM d')}</div>
                      )}
                    </div>
                    {result.position && (
                      <div className="text-center flex-shrink-0">
                        <div className="text-2xl font-black text-[#232323]">P.{result.position}</div>
                      </div>
                    )}
                  </div>
                  
                  {driver && (
                    <div className="text-xs font-semibold text-[#232323] mb-2 truncate">
                      {driver.car_number && <span className="text-[#00FFDA]">#{driver.car_number}</span>}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1 flex-wrap text-xs text-gray-600">
                    {result.class && <span className="truncate">{result.class}</span>}
                    {result.status_text && result.status_text !== 'Running' && (
                      <>
                        {result.class && <span>•</span>}
                        <Badge variant="outline" className="text-xs py-0 px-1.5 h-5">
                          {result.status_text}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}