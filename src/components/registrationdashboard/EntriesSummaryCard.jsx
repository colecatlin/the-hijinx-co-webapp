import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

// onNavigate(params) — called with URLSearchParams-style object to deep-link into Entries tab
export default function EntriesSummaryCard({ selectedEvent, entries = [], entryCounts = {}, onNavigate }) {
  const eventId = selectedEvent?.id;

  const { data: eventClasses = [] } = useQuery({
    queryKey: ['eventClasses', eventId],
    queryFn: () => base44.entities.EventClass.filter({ event_id: eventId }, 'class_order'),
    enabled: !!eventId,
    ...DQ,
  });

  const eventClassMap = useMemo(() => Object.fromEntries(eventClasses.map((c) => [c.id, c])), [eventClasses]);

  const summary = useMemo(() => {
    const total = entryCounts.total ?? entries.length;

    const byClassRaw = entryCounts.byClass ?? (() => {
      const m = {};
      entries.forEach((e) => {
        const k = e.event_class_id || 'unassigned';
        if (!m[k]) m[k] = [];
        m[k].push(e);
      });
      return m;
    })();

    const paid = entryCounts.byPayment?.Paid ?? entries.filter((e) => e.payment_status === 'Paid').length;
    const unpaid = (entryCounts.byPayment ? Object.entries(entryCounts.byPayment).reduce((s, [k, v]) => k !== 'Paid' ? s + v : s, 0) : total - paid);
    const checkedIn = entryCounts.byStatus?.['Checked In'] ?? entries.filter((e) => e.entry_status === 'Checked In').length;
    const notCheckedIn = total - checkedIn;
    const teched = entryCounts.teched ?? entries.filter((e) => e.tech_status === 'Passed').length;
    const notTeched = total - teched;

    const classRows = Object.entries(byClassRaw)
      .map(([classId, items]) => {
        const count = Array.isArray(items) ? items.length : items;
        if (classId === 'unassigned') return { label: 'Unassigned', classId: 'unassigned', count };
        const ec = eventClassMap[classId];
        return { label: ec?.name || classId, classId, count };
      })
      .sort((a, b) => b.count - a.count);

    return { total, paid, unpaid, checkedIn, notCheckedIn, teched, notTeched, classRows };
  }, [entries, entryCounts, eventClassMap]);

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