import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function ComplianceAlertsCard({ eventId }) {
  const { data: entries = [] } = useQuery({
    queryKey: ['entries', eventId],
    queryFn: () => base44.entities.Entry.filter({ event_id: eventId, status: 'active' }),
    enabled: !!eventId,
  });

  const counts = useMemo(() => {
    const missingWaivers = entries.filter((e) => e.waiver_status === 'Missing').length;
    const missingTransponders = entries.filter((e) => !e.transponder_id && e.entry_status !== 'Withdrawn').length;

    // Count duplicate car numbers
    const carNumberMap = {};
    entries.forEach((e) => {
      if (e.entry_status !== 'Withdrawn') {
        carNumberMap[e.car_number] = (carNumberMap[e.car_number] || 0) + 1;
      }
    });
    const duplicates = Object.values(carNumberMap).filter((count) => count > 1).length;

    return {
      missingWaivers,
      missingTransponders,
      duplicates,
    };
  }, [entries]);

  const rows = [
    { label: 'Missing waivers', value: counts.missingWaivers },
    { label: 'Duplicate car numbers', value: counts.duplicates },
    { label: 'Missing transponders', value: counts.missingTransponders },
  ];

  const hasAlerts = counts.missingWaivers > 0 || counts.missingTransponders > 0 || counts.duplicates > 0;

  return (
    <Card className={`bg-[#171717] border-gray-800 ${hasAlerts ? 'border-red-500/30' : ''}`}>
      <CardHeader className="pb-2">
        <CardTitle className={`text-sm font-medium flex items-center gap-2 ${hasAlerts ? 'text-red-400' : 'text-gray-400'}`}>
          <AlertCircle className="w-4 h-4" /> Compliance Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between text-xs text-gray-400">
              <span>{row.label}</span>
              <span className={row.value > 0 ? 'text-red-400 font-medium' : 'text-gray-300 font-medium'}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}