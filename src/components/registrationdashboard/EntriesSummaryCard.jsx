import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

export default function EntriesSummaryCard({ eventId }) {
  const { data: entries = [] } = useQuery({
    queryKey: ['entries', eventId],
    queryFn: () => base44.entities.Entry.filter({ event_id: eventId, status: 'active' }),
    enabled: !!eventId,
  });

  const totalEntries = entries.filter((e) => e.entry_status !== 'Withdrawn').length;
  const paidCount = entries.filter((e) => e.payment_status === 'Paid').length;
  const unpaidCount = entries.filter((e) => e.payment_status === 'Unpaid').length;
  const checkedInCount = entries.filter((e) => e.entry_status === 'CheckedIn').length;
  const techedCount = entries.filter((e) => e.tech_status === 'Passed').length;

  const rows = [
    { label: 'Total entries', value: totalEntries },
    { label: 'Paid / Unpaid', value: `${paidCount} / ${unpaidCount}` },
    { label: 'Checked in', value: checkedInCount },
    { label: 'Tech passed', value: techedCount },
  ];

  return (
    <Card className="bg-[#171717] border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
          <Users className="w-4 h-4" /> Entries Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between text-xs text-gray-400">
              <span>{row.label}</span>
              <span className="text-gray-300 font-medium">{row.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}