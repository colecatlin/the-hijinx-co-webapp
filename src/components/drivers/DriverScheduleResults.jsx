import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, Calendar, Trophy } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Separator } from '@/components/ui/separator';

export default function DriverScheduleResults({ driverId }) {
  const [activeSection, setActiveSection] = useState('schedule');

  // Get all driver programs for this driver
  const { data: driverPrograms = [] } = useQuery({
    queryKey: ['driverPrograms', driverId],
    queryFn: () => base44.entities.DriverProgram.filter({ driver_id: driverId }),
    enabled: !!driverId,
  });

  // Get unique series names from driver programs
  const seriesNames = [...new Set(driverPrograms.map(dp => dp.series_name).filter(Boolean))];

  // Fetch events from past results AND upcoming events from series
  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['driverEvents', driverId, seriesNames],
    queryFn: async () => {
      const allEvents = [];
      
      // Get past events from results
      const driverResults = await base44.entities.Results.filter({ driver_id: driverId });
      const eventIds = [...new Set(driverResults.map(r => r.event_id).filter(Boolean))];
      
      for (const eventId of eventIds) {
        const eventData = await base44.entities.Event.filter({ id: eventId });
        allEvents.push(...eventData);
      }
      
      // Get all upcoming events and filter by series
      if (seriesNames.length > 0) {
        const allUpcomingEvents = await base44.entities.Event.list('-event_date', 1000);
        const futureDate = new Date();
        const seriesEvents = allUpcomingEvents.filter(e => 
          seriesNames.includes(e.series) && new Date(e.event_date) >= futureDate
        );
        allEvents.push(...seriesEvents);
      }
      
      return [...new Map(allEvents.map(e => [e.id, e])).values()]
        .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
    },
    enabled: driverId && driverPrograms.length > 0,
  });

  // Fetch results for this driver
  const { data: results = [], isLoading: loadingResults } = useQuery({
    queryKey: ['driverResults', driverId],
    queryFn: async () => {
      const driverResults = await base44.entities.Results.filter({ driver_id: driverId });
      return driverResults.sort((a, b) => new Date(b.event_id) - new Date(a.event_id));
    },
    enabled: !!driverId,
  });

  // Split events and results
  const upcomingEvents = events.filter(e => new Date(e.event_date) >= new Date()).slice(0, 5);
  const pastResults = results.filter(r => {
    const event = events.find(e => e.id === r.event_id);
    return event && new Date(event.event_date) < new Date();
  }).slice(0, 10);

  // Get the most recent race
  const mostRecentRace = pastResults.length > 0 ? pastResults[0] : null;
  const mostRecentEvent = mostRecentRace ? events.find(e => e.id === mostRecentRace.event_id) : null;

  const isLoading = loadingEvents || loadingResults;

  if (!driverId) return null;

  return (
    <section className="bg-white border border-gray-200 p-8 mb-8">
      <Separator className="mb-3" />
      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-2xl font-black text-[#232323]">Schedule & Results</h2>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 mb-3">
        {['schedule', 'results'].map(section => {
          const Icon = section === 'schedule' ? Calendar : Trophy;
          const label = section === 'schedule' ? 'Upcoming' : 'Recent Results';
          return (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors ${
                activeSection === section
                  ? 'text-[#232323] border-b-2 border-[#00FFDA]'
                  : 'text-gray-600 hover:text-[#232323]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          );
        })}
      </div>

      <Separator className="mb-6" />

      {isLoading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}

      {activeSection === 'schedule' && !isLoading && (
        <div className="space-y-4">
          {upcomingEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No upcoming events scheduled.</p>
            </div>
          ) : (
            upcomingEvents.map(event => (
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
            ))
          )}
        </div>
      )}

      {activeSection === 'results' && !isLoading && (
        <div className="space-y-4">
          {pastResults.length === 0 ? (
            <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded">
              <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No race results yet.</p>
            </div>
          ) : (
            <div>
              {mostRecentEvent && (
                <div className="mb-6 p-6 bg-gray-50 border border-gray-200">
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Most Recent Race</div>
                  <div className="font-bold text-xl text-[#232323] mb-1">{mostRecentEvent.name}</div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(parseISO(mostRecentEvent.event_date), 'MMMM d, yyyy')}
                  </div>
                  {mostRecentEvent.series && (
                    <div className="text-sm text-gray-500">{mostRecentEvent.series}</div>
                  )}
                </div>
              )}
              <div className="space-y-3">
                {pastResults.map(result => {
                  const event = events.find(e => e.id === result.event_id);
                  
                  return (
                    <div key={result.id} className="border border-gray-200 p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <div className="font-bold text-[#232323]">{event?.name || 'Event'}</div>
                          <div className="text-xs text-gray-600 mt-0.5">{format(parseISO(event?.event_date || new Date()), 'MMM d, yyyy')}</div>
                          {(result.series || event?.series) && (
                            <div className="text-xs text-gray-500 mt-1">{result.series || event?.series}</div>
                          )}
                        </div>
                        {result.position && (
                          <div className="text-center flex-shrink-0">
                            <div className="text-3xl font-black text-[#232323]">P.{result.position}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}