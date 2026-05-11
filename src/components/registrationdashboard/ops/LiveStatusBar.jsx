/**
 * REVISION 5E — LiveStatusBar
 * Horizontal monitoring bar showing derived operational status across
 * event, results, standings, and health dimensions.
 */
import React from 'react';
import { CheckCircle2, AlertTriangle, TrendingUp, Clock } from 'lucide-react';
import {
  deriveEventOperationalStatus,
  EVENT_STATUS_CONFIG,
} from './sessionStateIntelligence';

export default function LiveStatusBar({ selectedEvent, sessions, results, standings }) {
  // Derived event ops status
  const derivedStatus = deriveEventOperationalStatus(sessions, results);
  const eventStatusConfig = EVENT_STATUS_CONFIG[derivedStatus];

  // Results health
  const totalResults = results.length;
  const officialResults = results.filter(r => r.status_state === 'Official' || r.status_state === 'Locked').length;
  const draftResults = results.filter(r => r.status_state === 'Draft' || r.status_state === 'Provisional').length;

  const resultsLabel =
    totalResults === 0 ? 'No Results'
    : officialResults === totalResults ? 'All Official'
    : draftResults > 0 ? `${draftResults} Draft`
    : `${officialResults}/${totalResults} Official`;

  const resultsColor =
    totalResults === 0 ? 'text-gray-500'
    : officialResults === totalResults ? 'text-green-400'
    : draftResults > 0 ? 'text-yellow-400'
    : 'text-blue-400';

  // Standings
  const standingsLabel = standings.length > 0 ? `${standings.length} entries` : 'Not calculated';
  const standingsColor = standings.length > 0 ? 'text-green-400' : 'text-gray-500';

  // Health: any session has missing results
  const sessionsWithResults = new Set(results.map(r => r.session_id).filter(Boolean));
  const missingSessions = sessions.filter(s => !sessionsWithResults.has(s.id)).length;
  const healthLabel = missingSessions === 0 ? 'Healthy' : `${missingSessions} missing`;
  const healthColor = missingSessions === 0 ? 'text-green-400' : 'text-orange-400';
  const HealthIcon = missingSessions === 0 ? CheckCircle2 : AlertTriangle;

  const Pill = ({ label, value, valueColor, icon: Icon }) => (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a] rounded border border-gray-800 text-xs">
      {Icon && <Icon className="w-3 h-3 text-gray-500" />}
      <span className="text-gray-500 font-medium">{label}</span>
      <span className={`font-semibold ${valueColor}`}>{value}</span>
    </div>
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Event derived status */}
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-semibold ${eventStatusConfig.badge}`}>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${eventStatusConfig.dot}`} />
        {eventStatusConfig.label}
      </div>

      <Pill label="Results" value={resultsLabel} valueColor={resultsColor} icon={CheckCircle2} />
      <Pill label="Standings" value={standingsLabel} valueColor={standingsColor} icon={TrendingUp} />
      <Pill label="Health" value={healthLabel} valueColor={healthColor} icon={HealthIcon} />

      {/* Session count */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a] rounded border border-gray-800 text-xs ml-auto">
        <Clock className="w-3 h-3 text-gray-500" />
        <span className="text-gray-500">{sessions.length} sessions</span>
      </div>
    </div>
  );
}