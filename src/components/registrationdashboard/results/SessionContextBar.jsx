import React from 'react';
import { Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function SessionContextBar({ session, event, seriesClass }) {
  const isHistoricalEligible = session?.session_type === 'Final' || session?.session_type === 'Feature';
  const eligibilityText = isHistoricalEligible ? 'Will count toward standings' : 'Reference only';
  const eligibilityColor = isHistoricalEligible ? 'bg-green-900/30 text-green-300' : 'bg-gray-900/30 text-gray-300';

  return (
    <div className="bg-[#1A1A1A] border border-gray-800 rounded-lg p-3 flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3 flex-wrap text-xs">
        {event && (
          <span className="text-gray-400">
            <span className="text-gray-500">Event:</span> <span className="text-white font-medium">{event.name}</span>
          </span>
        )}
        {seriesClass && (
          <span className="text-gray-400">
            <span className="text-gray-500">Class:</span> <span className="text-white font-medium">{seriesClass.class_name}</span>
          </span>
        )}
        {session && (
          <>
            <span className="text-gray-400">
              <span className="text-gray-500">Session:</span> <span className="text-white font-medium">{session.name}</span>
            </span>
            <Badge className="text-xs bg-gray-700 text-gray-200">{session.session_type}</Badge>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Info className="w-3.5 h-3.5 text-gray-500" />
        <span className={`text-xs px-2 py-1 rounded ${eligibilityColor}`}>
          {eligibilityText}
        </span>
      </div>
    </div>
  );
}