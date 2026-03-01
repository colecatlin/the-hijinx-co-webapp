import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ComplianceAlertsCard() {
  const rows = [
    { label: 'Missing waivers', value: '—' },
    { label: 'Expired licenses', value: '—' },
    { label: 'Duplicate car numbers', value: '—' },
    { label: 'Missing transponders', value: '—' },
  ];

  return (
    <Card className="bg-[#171717] border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> Compliance Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between text-xs text-gray-400">
              <span>{row.label}</span>
              <span className="text-gray-500">{row.value}</span>
            </div>
          ))}
          <div className="mt-4 pt-3 border-t border-gray-700">
            <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-400">
              Enable after Entry entity is added
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}