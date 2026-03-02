import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { QueryKeys } from '@/components/utils/queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

export default function ComplianceAlertsCard({ selectedEvent }) {
  const eventId = selectedEvent?.id;
  const today = new Date().toISOString().split('T')[0];

  const { data: entries = [], isLoading } = useQuery({
    queryKey: QueryKeys.entries.listByEvent(eventId),
    queryFn: () => base44.entities.Entry.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  const alerts = useMemo(() => {
    const carNumberCounts = {};
    entries.forEach(e => {
      if (e.car_number) carNumberCounts[e.car_number] = (carNumberCounts[e.car_number] || 0) + 1;
    });

    const all = [
      {
        label: 'Missing Waivers',
        count: entries.filter(e => !(e.waiver_verified === true || e.waiver_status === 'Verified')).length,
      },
      {
        label: 'Missing / Expired License',
        count: entries.filter(e => !e.license_number || (e.license_expiration_date && e.license_expiration_date < today)).length,
      },
      {
        label: 'Unpaid Entries',
        count: entries.filter(e => e.payment_status === 'Unpaid').length,
      },
      {
        label: 'Missing Transponders',
        count: entries.filter(e => !e.transponder_id).length,
      },
      {
        label: 'Duplicate Car #',
        count: entries.filter(e => e.car_number && carNumberCounts[e.car_number] > 1).length,
      },
    ];

    // Return top 3 by count (descending), filtered to non-zero
    return all.sort((a, b) => b.count - a.count);
  }, [entries, today]);

  const totalAlerts = alerts.reduce((sum, a) => sum + a.count, 0);

  return (
    <Card className="bg-[#171717] border-gray-800">
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${totalAlerts > 0 ? 'text-amber-400' : 'text-white'}`}>
          <AlertCircle className="w-4 h-4" /> Compliance Alerts
          {totalAlerts > 0 && (
            <Badge className="bg-amber-900/50 text-amber-300 border-amber-700 ml-auto">{totalAlerts}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-xs text-gray-400">Loading...</p>
        ) : (
          <div className="space-y-2">
            {alerts.slice(0, 3).map(alert => (
              <div key={alert.label} className="flex justify-between items-center text-xs">
                <span className="text-gray-300">{alert.label}</span>
                <Badge
                  variant="outline"
                  className={`${alert.count > 0 ? 'border-red-800 text-red-400' : 'border-gray-700 text-gray-400'}`}
                >
                  {alert.count}
                </Badge>
              </div>
            ))}
          </div>
        )}
        {!isLoading && totalAlerts === 0 && entries.length > 0 && (
          <p className="text-xs text-green-400">All clear — no compliance issues detected</p>
        )}
        {!isLoading && entries.length === 0 && (
          <p className="text-xs text-gray-500">No entries yet for this event</p>
        )}
      </CardContent>
    </Card>
  );
}