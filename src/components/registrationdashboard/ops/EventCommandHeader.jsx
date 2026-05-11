import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export default function EventCommandHeader({ selectedEvent, selectedTrack, selectedSeries, sessions, results, standings }) {
  const getEventStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-green-900/40 text-green-300 border-green-800';
      case 'Live': return 'bg-red-900/40 text-red-300 border-red-800 animate-pulse';
      case 'Published': return 'bg-blue-900/40 text-blue-300 border-blue-800';
      default: return 'bg-gray-900/40 text-gray-300 border-gray-800';
    }
  };

  const resultsSummary = results.reduce(
    (acc, r) => ({
      ...acc,
      draft: r.status_state === 'Draft' ? acc.draft + 1 : acc.draft,
      official: r.status_state === 'Official' ? acc.official + 1 : acc.official,
      locked: r.status_state === 'Locked' ? acc.locked + 1 : acc.locked,
    }),
    { draft: 0, official: 0, locked: 0 }
  );

  const sessionsReady = sessions.filter(s => s.status === 'Official' || s.status === 'Locked').length;

  return (
    <div className="bg-[#171717] border-b border-gray-800 px-6 py-4 mb-6 rounded-lg">
      <div className="space-y-4">
        {/* Title Row */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">{selectedEvent?.name}</h1>
            <p className="text-xs text-gray-500 mt-1">
              {selectedTrack?.name && <span>{selectedTrack.name}</span>}
              {selectedTrack?.name && selectedSeries?.name && <span> • </span>}
              {selectedSeries?.name && <span>{selectedSeries.name}</span>}
              {selectedEvent?.round_number && <span> • Round {selectedEvent.round_number}</span>}
            </p>
          </div>
          <Badge className={`${getEventStatusColor(selectedEvent?.status)} border`}>
            {selectedEvent?.status || 'Draft'}
          </Badge>
        </div>

        {/* Operational Status Pills */}
        <div className="flex flex-wrap gap-2">
          {/* Event Status */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-[#262626] rounded text-xs border border-gray-700">
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="text-gray-400">Event:</span>
            <span className="text-white font-semibold">{selectedEvent?.status || 'Draft'}</span>
          </div>

          {/* Results Status */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-[#262626] rounded text-xs border border-gray-700">
            <CheckCircle2 className="w-3 h-3 text-gray-400" />
            <span className="text-gray-400">Results:</span>
            {resultsSummary.official > 0 && <span className="text-green-400 font-semibold">{resultsSummary.official}✓</span>}
            {resultsSummary.draft > 0 && <span className="text-yellow-400 font-semibold">{resultsSummary.draft}△</span>}
            {resultsSummary.locked > 0 && <span className="text-purple-400 font-semibold">{resultsSummary.locked}🔒</span>}
            {resultsSummary.official === 0 && resultsSummary.draft === 0 && resultsSummary.locked === 0 && (
              <span className="text-gray-500">—</span>
            )}
          </div>

          {/* Sessions Status */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-[#262626] rounded text-xs border border-gray-700">
            <span className="text-gray-400">Sessions:</span>
            <span className="text-white font-semibold">{sessions.length}</span>
            {sessionsReady > 0 && <span className="text-green-400 text-xs">({sessionsReady} ready)</span>}
          </div>

          {/* Date */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-[#262626] rounded text-xs border border-gray-700 text-gray-300">
            {selectedEvent?.event_date && new Date(selectedEvent.event_date).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}