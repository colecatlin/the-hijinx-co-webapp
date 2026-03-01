import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function EntriesSummaryCard({ selectedEvent }) {
  const { data: driverPrograms = [], isLoading: dpLoading } = useQuery({
    queryKey: ['driverPrograms', selectedEvent?.id],
    queryFn: () => selectedEvent?.id ? base44.entities.DriverProgram.filter({ event_id: selectedEvent.id }) : [],
    enabled: !!selectedEvent?.id,
  });

  const { data: results = [] } = useQuery({
    queryKey: ['results', selectedEvent?.id],
    queryFn: () => selectedEvent?.id ? base44.entities.Results.filter({ event_id: selectedEvent.id }) : [],
    enabled: !!selectedEvent?.id && driverPrograms.length === 0,
  });

  const summary = useMemo(() => {
    let total = 0;
    let byClass = {};
    let usingProxy = false;

    if (driverPrograms.length > 0) {
      total = driverPrograms.length;
      driverPrograms.forEach((dp) => {
        const classId = dp.series_class_id || 'Unknown';
        byClass[classId] = (byClass[classId] || 0) + 1;
      });
    } else if (results.length > 0) {
      usingProxy = true;
      const uniqueDrivers = new Set(results.map((r) => r.driver_id));
      total = uniqueDrivers.size;
      results.forEach((r) => {
        const classId = r.series_class_id || 'Unknown';
        byClass[classId] = (byClass[classId] || 0) + 1;
      });
    }

    return { total, byClass, usingProxy };
  }, [driverPrograms, results]);

  return (
    <Card className="bg-[#171717] border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Users className="w-4 h-4" /> Entries Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {dpLoading ? (
          <p className="text-xs text-gray-400">Loading...</p>
        ) : (
          <>
            {summary.usingProxy && (
              <div className="bg-amber-900/30 border border-amber-700/50 rounded px-2 py-1">
                <p className="text-xs text-amber-300">
                  Proxy used: Results detected, registration records not connected yet
                </p>
              </div>
            )}

            <div>
              <p className="text-xs text-gray-400 mb-2">Total Entries</p>
              <p className="text-2xl font-bold text-white">{summary.total}</p>
            </div>

            {Object.keys(summary.byClass).length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-2">By Class</p>
                <div className="space-y-1">
                  {Object.entries(summary.byClass).map(([classId, count]) => (
                    <div key={classId} className="flex justify-between text-xs">
                      <span className="text-gray-300">{classId}</span>
                      <Badge variant="outline" className="border-gray-700 text-gray-300">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-gray-800 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Paid vs Unpaid</span>
                <Badge variant="outline" className="border-gray-700 text-gray-400">Coming soon</Badge>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Checked In</span>
                <Badge variant="outline" className="border-gray-700 text-gray-400">Coming soon</Badge>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Teched</span>
                <Badge variant="outline" className="border-gray-700 text-gray-400">Coming soon</Badge>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}