import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';

export default function LiveStatusBar({ selectedEvent, sessions, results, standings }) {
  const eventStatus = selectedEvent?.status || 'Draft';
  
  const resultsStatus = (() => {
    if (results.length === 0) return { label: 'Empty', color: 'bg-gray-800 text-gray-300', icon: AlertCircle };
    const hasOfficial = results.some(r => r.status_state === 'Official' || r.status_state === 'Locked');
    const hasDraft = results.some(r => r.status_state === 'Draft' || r.status_state === 'Provisional');
    if (hasOfficial && !hasDraft) return { label: 'Official', color: 'bg-green-900/40 text-green-300 border-green-800', icon: CheckCircle2 };
    if (hasDraft) return { label: 'Draft', color: 'bg-yellow-900/40 text-yellow-300 border-yellow-800', icon: AlertTriangle };
    return { label: 'Mixed', color: 'bg-blue-900/40 text-blue-300 border-blue-800', icon: TrendingUp };
  })();

  const standingsStatus = (() => {
    if (!standings || standings.length === 0) return { label: 'Not Calculated', color: 'bg-gray-800 text-gray-300' };
    return { label: 'Calculated', color: 'bg-green-900/40 text-green-300 border-green-800' };
  })();

  const healthStatus = (() => {
    const hasIssues = sessions.some(s => {
      const sessionResults = results.filter(r => r.session_id === s.id);
      return sessionResults.some(r => !r.driver_id || !r.position);
    });
    if (hasIssues) return { label: 'Warnings', color: 'bg-orange-900/40 text-orange-300 border-orange-800', icon: AlertTriangle };
    return { label: 'Healthy', color: 'bg-green-900/40 text-green-300 border-green-800', icon: CheckCircle2 };
  })();

  const StatusIcon = resultsStatus.icon;

  return (
    <div className="flex items-center gap-2 flex-wrap mb-6 bg-[#171717] border border-gray-800 rounded-lg p-3">
      {/* Event Status */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded text-xs border border-gray-700 bg-[#262626]">
        <span className="text-gray-500 uppercase tracking-wide">Event</span>
        <Badge className={`ml-1 ${
          eventStatus === 'Completed' ? 'bg-green-900/40 text-green-300' :
          eventStatus === 'Live' ? 'bg-red-900/40 text-red-300' :
          eventStatus === 'Published' ? 'bg-blue-900/40 text-blue-300' :
          'bg-gray-800 text-gray-400'
        }`}>
          {eventStatus}
        </Badge>
      </div>

      {/* Results Status */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded text-xs border border-gray-700 bg-[#262626]">
        <StatusIcon className="w-3 h-3" />
        <span className="text-gray-500 uppercase tracking-wide">Results</span>
        <Badge className={resultsStatus.color}>{resultsStatus.label}</Badge>
      </div>

      {/* Standings Status */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded text-xs border border-gray-700 bg-[#262626]">
        <TrendingUp className="w-3 h-3 text-gray-500" />
        <span className="text-gray-500 uppercase tracking-wide">Standings</span>
        <Badge className={standingsStatus.color}>{standingsStatus.label}</Badge>
      </div>

      {/* Health Status */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded text-xs border border-gray-700 bg-[#262626]">
        <healthStatus.icon className="w-3 h-3 text-gray-500" />
        <span className="text-gray-500 uppercase tracking-wide">Health</span>
        <Badge className={healthStatus.color}>{healthStatus.label}</Badge>
      </div>

      {/* Sessions Count */}
      <div className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded text-xs border border-gray-700 bg-[#262626] text-gray-400">
        <span>{sessions.length} sessions</span>
      </div>
    </div>
  );
}