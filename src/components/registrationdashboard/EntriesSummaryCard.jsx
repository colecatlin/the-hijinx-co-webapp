import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { QueryKeys } from '@/components/utils/queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

export default function EntriesSummaryCard({ selectedEvent }) {
  const eventId = selectedEvent?.id;

  const { data: entries = [], isLoading, isError: entriesError } = useQuery({
    queryKey: QueryKeys.entries.listByEvent(eventId),
    queryFn: async () => {
      try {
        return await base44.entities.Entry.filter({ event_id: eventId });
      } catch (err) {
        // Fallback to DriverProgram if Entry is not available
        if (err.message?.includes('entity') || err.message?.includes('not found')) {
          const programs = await base44.entities.DriverProgram.filter({ event_id: eventId });
          return programs.filter(p => p.event_id).map(p => ({
            id: p.id,
            event_id: p.event_id,
            driver_id: p.driver_id,
            series_class_id: p.series_class_id,
            car_number: '',
            transponder_id: '',
            entry_status: 'Unknown',
            payment_status: 'Unknown',
            tech_status: 'Unknown',
          }));
        }
        throw err;
      }
    },
    enabled: !!eventId,
    ...DQ,
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses'],
    queryFn: () => base44.entities.SeriesClass.list(),
    ...DQ,
  });

  const summary = useMemo(() => {
    const total = entries.length;
    const paid = entries.filter(e => e.payment_status === 'Paid').length;
    const unpaid = entries.filter(e => e.payment_status === 'Unpaid').length;
    const checkedIn = entries.filter(e => e.entry_status === 'Checked In' || e.entry_status === 'Teched').length;
    const teched = entries.filter(e => e.tech_status === 'Passed').length;

    const byClass = {};
    entries.forEach((e) => {
      const sc = seriesClasses.find(c => c.id === e.series_class_id);
      const className = sc?.class_name || e.class_name || 'Unclassified';
      byClass[className] = (byClass[className] || 0) + 1;
    });

    return { total, paid, unpaid, checkedIn, teched, byClass };
  }, [entries, seriesClasses]);

  return (
    <Card className="bg-[#171717] border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Users className="w-4 h-4" /> Entries Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-xs text-gray-400">Loading...</p>
        ) : (
          <>
            <div>
              <p className="text-xs text-gray-400 mb-1">Total Entries</p>
              <p className="text-2xl font-bold text-white">{summary.total}</p>
            </div>

            {Object.keys(summary.byClass).length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-2">By Class</p>
                <div className="space-y-1">
                  {Object.entries(summary.byClass).map(([cls, count]) => (
                    <div key={cls} className="flex justify-between text-xs">
                      <span className="text-gray-300">{cls}</span>
                      <Badge variant="outline" className="border-gray-700 text-gray-300">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-gray-800 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Paid</span>
                <Badge variant="outline" className="border-green-800 text-green-400">{summary.paid}</Badge>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Unpaid</span>
                <Badge variant="outline" className={`border-gray-700 ${summary.unpaid > 0 ? 'text-red-400 border-red-800' : 'text-gray-400'}`}>{summary.unpaid}</Badge>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Checked In</span>
                <Badge variant="outline" className="border-gray-700 text-blue-400">{summary.checkedIn}</Badge>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Tech Passed</span>
                <Badge variant="outline" className="border-gray-700 text-purple-400">{summary.teched}</Badge>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}