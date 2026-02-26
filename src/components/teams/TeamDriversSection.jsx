import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, BookOpen } from 'lucide-react';

export default function TeamDriversSection({ teamId, driverPrograms, allDrivers }) {
  // Fetch results for all team drivers
  const { data: allResults = [] } = useQuery({
    queryKey: ['teamDriverResults', teamId],
    queryFn: async () => {
      if (allDrivers.length === 0) return [];
      const allRes = [];
      for (const driver of allDrivers) {
        const driverResults = await base44.entities.Results.filter({ driver_id: driver.id });
        allRes.push(...driverResults);
      }
      return allRes;
    },
    enabled: allDrivers.length > 0,
  });

  // Fetch events for results
  const { data: events = [] } = useQuery({
    queryKey: ['teamDriversEvents', teamId],
    queryFn: async () => {
      if (allResults.length === 0) return [];
      const eventIds = [...new Set(allResults.map(r => r.event_id).filter(Boolean))];
      if (eventIds.length === 0) return [];
      
      const allEvents = [];
      for (const eventId of eventIds) {
        const eventData = await base44.entities.Event.filter({ id: eventId });
        allEvents.push(...eventData);
      }
      return allEvents;
    },
    enabled: allResults.length > 0,
  });

  if (allDrivers.length === 0) {
    return (
      <div className="bg-white border border-gray-200 p-8 text-center">
        <p className="text-gray-500">No drivers found for this team</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {allDrivers.map(driver => {
        const driverProgs = driverPrograms.filter(dp => dp.driver_id === driver.id);
        const driverResults = allResults.filter(r => r.driver_id === driver.id);
        const uniqueSeries = [...new Set(driverProgs.map(dp => dp.series_name).filter(Boolean))];
        
        // Get most recent result
        const mostRecentResult = driverResults.length > 0 
          ? driverResults.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]
          : null;
        
        const mostRecentEvent = mostRecentResult
          ? events.find(e => e.id === mostRecentResult.event_id)
          : null;

        return (
          <Link
            key={driver.id}
            to={`/DriverProfile?id=${encodeURIComponent(driver.slug || driver.id)}`}
            className="bg-white border border-gray-200 p-5 hover:border-[#00FFDA] hover:bg-gray-50 transition-all group"
          >
            {/* Driver Header */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-12 h-12 bg-[#232323] text-white flex items-center justify-center font-bold text-sm flex-shrink-0 rounded border border-gray-300">
                  {driver.primary_number || '#'}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-lg text-[#232323] group-hover:text-[#00FFDA] transition-colors">
                    {driver.first_name} {driver.last_name}
                  </div>
                  {driver.primary_discipline && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      {driver.primary_discipline}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Stats Badge */}
              {driverResults.length > 0 && (
                <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-200 flex-shrink-0">
                  <Trophy className="w-3.5 h-3.5 text-gray-600" />
                  <span className="text-xs font-semibold text-gray-700">{driverResults.length}</span>
                </div>
              )}
            </div>

            {/* Series Tags */}
            {uniqueSeries.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {uniqueSeries.map(series => (
                  <Badge key={series} className="bg-[#00FFDA] text-[#232323] text-xs font-medium">
                    {series}
                  </Badge>
                ))}
              </div>
            )}

            {/* Programs - Car Numbers */}
            {driverProgs.length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  Programs
                </div>
                <div className="space-y-1">
                  {driverProgs.map(prog => (
                    <div key={prog.id} className="text-xs text-gray-600 flex items-center gap-2">
                      <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                        #{prog.car_number}
                      </span>
                      <span>{prog.class_name || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Most Recent Result */}
            {mostRecentEvent && mostRecentResult && (
              <div className="pt-2 border-t border-gray-100 text-xs text-gray-600">
                <div className="font-semibold mb-1">Most Recent</div>
                <div className="flex items-center justify-between">
                  <span>{mostRecentEvent.name}</span>
                  {mostRecentResult.position && (
                    <span className="font-bold text-[#232323]">P{mostRecentResult.position}</span>
                  )}
                </div>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}