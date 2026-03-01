import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

export default function StandingsStatusCard({ selectedEvent, dashboardContext, selectedSeries }) {
  const { data: standings = [], isLoading: standingsLoading } = useQuery({
    queryKey: ['standings', selectedSeries?.id, dashboardContext?.selectedSeason],
    queryFn: async () => {
      if (!selectedSeries?.id) return [];
      const filters = { series_id: selectedSeries.id };
      if (dashboardContext?.selectedSeason) {
        filters.season_year = dashboardContext.selectedSeason;
      }
      return base44.entities.Standings.filter(filters);
    },
    enabled: !!selectedSeries?.id,
  });

  const lastCalculated = useMemo(() => {
    if (standings.length === 0) return null;
    const mostRecent = standings.reduce((latest, current) => {
      const latestDate = new Date(latest.last_calculated || 0);
      const currentDate = new Date(current.last_calculated || 0);
      return currentDate > latestDate ? current : latest;
    });
    return mostRecent.last_calculated ? format(new Date(mostRecent.last_calculated), 'MMM d, HH:mm') : null;
  }, [standings]);

  return (
    <Card className="bg-[#171717] border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Trophy className="w-4 h-4" /> Standings Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {standingsLoading ? (
          <p className="text-xs text-gray-400">Loading...</p>
        ) : (
          <>
            <div>
              <p className="text-xs text-gray-400 mb-1">Status</p>
              <p className="text-sm font-semibold text-white">
                {standings.length > 0 ? 'Calculated' : 'Not calculated'}
              </p>
            </div>

            {lastCalculated && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Last Updated</p>
                <p className="text-sm font-mono text-gray-200">{lastCalculated}</p>
              </div>
            )}

            {standings.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-2">Classes with Standings</p>
                <p className="text-sm text-gray-300">{standings.length} class(es)</p>
              </div>
            )}

            <div className="text-xs text-gray-500 pt-2 border-t border-gray-800">
              Recalculation available from Points & Standings tab
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}