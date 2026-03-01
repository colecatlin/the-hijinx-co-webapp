import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ResultsStatusCard({ sessions = [] }) {
  // Handle both old status values and new enum values
  const normalizeStatus = (status) => {
    const statusMap = {
      'Draft': 'draft',
      'Provisional': 'provisional',
      'Official': 'official',
      'Locked': 'locked',
    };
    return statusMap[status] || status?.toLowerCase() || 'draft';
  };

  const sessionsByStatus = {
    draft: sessions.filter(s => normalizeStatus(s.status) === 'draft').length || 0,
    provisional: sessions.filter(s => normalizeStatus(s.status) === 'provisional').length || 0,
    official: sessions.filter(s => normalizeStatus(s.status) === 'official').length || 0,
    locked: sessions.filter(s => normalizeStatus(s.status) === 'locked').length || 0,
  };

  const rows = [
    { label: 'Draft', value: sessionsByStatus.draft },
    { label: 'Provisional', value: sessionsByStatus.provisional },
    { label: 'Official', value: sessionsByStatus.official },
    { label: 'Locked', value: sessionsByStatus.locked },
  ];

  const totalSessions = sessions?.length || 0;
  const lockedSessions = sessionsByStatus.locked;
  const allLocked = totalSessions > 0 && lockedSessions === totalSessions;

  const statusBadge = allLocked ? (
    <Badge className="bg-green-500/20 text-green-400">All Locked</Badge>
  ) : lockedSessions > 0 ? (
    <Badge className="bg-blue-500/20 text-blue-400">Partial</Badge>
  ) : totalSessions === 0 ? (
    <Badge className="bg-gray-500/20 text-gray-400">No Sessions</Badge>
  ) : (
    <Badge className="bg-yellow-500/20 text-yellow-400">In Progress</Badge>
  );

  return (
    <Card className="bg-[#171717] border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
          <Flag className="w-4 h-4" /> Results Status
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
          <div className="mt-4 pt-3 border-t border-gray-700">
            {statusBadge}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}