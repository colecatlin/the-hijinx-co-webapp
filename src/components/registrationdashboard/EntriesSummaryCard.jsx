import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

// onNavigate(params) — called with URLSearchParams-style object to deep-link into Entries tab
export default function EntriesSummaryCard({ selectedEvent, entries = [], onNavigate }) {
  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses'],
    queryFn: () => base44.entities.SeriesClass.list(),
    ...DQ,
  });

  const summary = useMemo(() => {
    const total = entries.length;
    const paid = entries.filter((e) => e.payment_status === 'Paid').length;
    const unpaid = total - paid;

    const checkedIn = entries.filter(
      (e) => e.entry_status === 'Checked In' || e.entry_status === 'Teched'
    ).length;
    const notCheckedIn = total - checkedIn;

    const teched = entries.filter(
      (e) => e.tech_status === 'Passed' || e.tech_status === 'Teched'
    ).length;
    const notTeched = total - teched;

    // Group by class
    const byClass = {};
    entries.forEach((e) => {
      const key = e.series_class_id || '__unassigned__';
      byClass[key] = (byClass[key] || 0) + 1;
    });

    // Build display list: resolve names, sort by count desc
    const classRows = Object.entries(byClass)
      .map(([classId, count]) => {
        if (classId === '__unassigned__') return { label: 'Unassigned', classId: 'unassigned', count };
        const sc = seriesClasses.find((c) => c.id === classId);
        return { label: sc?.class_name || classId, classId, count };
      })
      .sort((a, b) => b.count - a.count);

    return { total, paid, unpaid, checkedIn, notCheckedIn, teched, notTeched, classRows };
  }, [entries, seriesClasses]);

  const nav = (params) => onNavigate?.(params);

  const rowClass = 'flex justify-between items-center text-xs cursor-pointer rounded px-1 py-0.5 -mx-1 hover:bg-gray-800/60 transition-colors';

  return (
    <Card className="bg-[#171717] border-gray-800">
      <CardHeader>
        <CardTitle
          className="text-white flex items-center gap-2 cursor-pointer hover:text-blue-300 transition-colors"
          onClick={() => nav({ tab: 'entries' })}
        >
          <Users className="w-4 h-4" /> Entries Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.length === 0 ? (
          <p className="text-xs text-gray-400">No entries yet for this event.</p>
        ) : (
          <>
            {/* Total */}
            <div
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => nav({ tab: 'entries' })}
            >
              <p className="text-xs text-gray-400 mb-1">Total Entries</p>
              <p className="text-2xl font-bold text-white">{summary.total}</p>
            </div>

            {/* By Class */}
            {summary.classRows.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-2">By Class</p>
                <div className="space-y-0.5">
                  {summary.classRows.slice(0, 6).map(({ label, classId, count }) => (
                    <div
                      key={classId}
                      className={rowClass}
                      onClick={() => nav({ tab: 'entries', classId })}
                    >
                      <span className="text-gray-300 truncate max-w-[140px]">{label}</span>
                      <Badge variant="outline" className="border-gray-700 text-gray-300 ml-2 flex-shrink-0">{count}</Badge>
                    </div>
                  ))}
                  {summary.classRows.length > 6 && (
                    <div
                      className={rowClass}
                      onClick={() => nav({ tab: 'entries' })}
                    >
                      <span className="text-gray-500 italic">+{summary.classRows.length - 6} more</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Status breakdown */}
            <div className="pt-2 border-t border-gray-800 space-y-0.5">
              <div className={rowClass} onClick={() => nav({ tab: 'entries', payment: 'paid' })}>
                <span className="text-gray-400">Paid</span>
                <Badge variant="outline" className="border-green-800 text-green-400">{summary.paid}</Badge>
              </div>
              <div className={rowClass} onClick={() => nav({ tab: 'entries', payment: 'unpaid' })}>
                <span className="text-gray-400">Unpaid</span>
                <Badge variant="outline" className={`border-gray-700 ${summary.unpaid > 0 ? 'text-red-400 border-red-800' : 'text-gray-400'}`}>{summary.unpaid}</Badge>
              </div>
              <div className={rowClass} onClick={() => nav({ tab: 'entries', checkin: 'checkedin' })}>
                <span className="text-gray-400">Checked In</span>
                <Badge variant="outline" className="border-gray-700 text-blue-400">{summary.checkedIn}</Badge>
              </div>
              <div className={rowClass} onClick={() => nav({ tab: 'entries', checkin: 'notcheckedin' })}>
                <span className="text-gray-400">Not Checked In</span>
                <Badge variant="outline" className="border-gray-700 text-gray-400">{summary.notCheckedIn}</Badge>
              </div>
              <div className={rowClass} onClick={() => nav({ tab: 'entries', tech: 'teched' })}>
                <span className="text-gray-400">Tech Passed</span>
                <Badge variant="outline" className="border-gray-700 text-purple-400">{summary.teched}</Badge>
              </div>
              <div className={rowClass} onClick={() => nav({ tab: 'entries', tech: 'notteched' })}>
                <span className="text-gray-400">Not Teched</span>
                <Badge variant="outline" className="border-gray-700 text-gray-400">{summary.notTeched}</Badge>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}