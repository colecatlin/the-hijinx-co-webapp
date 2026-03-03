import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import useComplianceFlags from './hooks/useComplianceFlags';

const DQ = applyDefaultQueryOptions();

export default function ComplianceAlertsCard({ selectedEvent }) {
  const eventId = selectedEvent?.id;

  // Load open compliance flags for the selected event
  const { flags, isLoading, countsBySeverity, counts } = useComplianceFlags({
    eventId,
    status: 'open',
  });

  const alerts = useMemo(() => {
    return [
      {
        label: 'Missing Waivers',
        count: counts.byType['Missing Waiver'] || 0,
      },
      {
        label: 'Expired Licenses',
        count: counts.byType['Expired License'] || 0,
      },
      {
        label: 'Duplicate Car #',
        count: counts.byType['Duplicate Car Number'] || 0,
      },
      {
        label: 'Missing Transponders',
        count: counts.byType['Missing Transponder'] || 0,
      },
    ];
  }, [counts]);

  const totalAlerts = alerts.reduce((sum, a) => sum + a.count, 0);
  const hasCritical = countsBySeverity.critical > 0;

  return (
    <Card className="bg-[#171717] border-gray-800">
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${hasCritical ? 'text-red-400' : totalAlerts > 0 ? 'text-amber-400' : 'text-white'}`}>
          <AlertCircle className="w-4 h-4" /> Compliance Alerts
          {totalAlerts > 0 && (
            <Badge className={`${hasCritical ? 'bg-red-900/50 text-red-300 border-red-700' : 'bg-amber-900/50 text-amber-300 border-amber-700'} ml-auto`}>{totalAlerts}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-xs text-gray-400">Loading...</p>
        ) : totalAlerts === 0 ? (
          <p className="text-xs text-green-400">All clear — no compliance issues detected</p>
        ) : (
          <div className="space-y-2">
            {alerts.map(alert => (
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
      </CardContent>
    </Card>
  );
}