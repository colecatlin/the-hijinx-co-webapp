import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';

export default function ComplianceAlertsCard({ selectedEvent }) {
  const alerts = [
    { label: 'Missing Waivers', count: 0 },
    { label: 'Expired Licenses', count: 0 },
    { label: 'Duplicate Car Numbers', count: 0 },
    { label: 'Missing Transponders', count: 0 },
  ];

  return (
    <Card className="bg-[#171717] border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> Compliance Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div key={alert.label} className="flex justify-between items-center text-xs">
              <span className="text-gray-300">{alert.label}</span>
              <Badge
                variant="outline"
                className={`border-gray-700 ${alert.count > 0 ? 'text-red-400' : 'text-gray-400'}`}
              >
                {alert.count}
              </Badge>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-gray-800">
          <p className="text-xs text-gray-500">
            Compliance rules will be computed from registrations and driver data once connected
          </p>
        </div>
      </CardContent>
    </Card>
  );
}