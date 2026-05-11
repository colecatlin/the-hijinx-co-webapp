/**
 * REVISION 7D — EventIntelligenceRail
 * Right-side intelligence rail showing operational status and recent activity.
 * Includes readiness score, timeline, alerts, and activity feed.
 * Read-only widgets with operational state.
 */
import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import EventReadinessScore from './EventReadinessScore';
import SessionTimelinePolished from './SessionTimelinePolished';
import OperationalAlertStack from './OperationalAlertStack';

function IntelligenceWidget({ title, items, isEmpty }) {
  return (
    <div className="bg-gray-900/40 border border-gray-800/50 rounded-lg p-3">
      <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-2">{title}</p>
      <div className="space-y-1.5">
        {isEmpty ? (
          <p className="text-xs text-gray-500">No updates</p>
        ) : (
          items.map((item, i) => (
            <div key={i} className="text-xs text-gray-400 flex items-start gap-2">
              {item.icon && <item.icon className="w-3 h-3 flex-shrink-0 mt-0.5 text-gray-600" />}
              <span className="line-clamp-1">{item.label}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function EventIntelligenceRail({
  selectedEvent,
  sessions = [],
  results = [],
  entries = [],
  standings = [],
  operationLogs = [],
}) {
  // Compute operational stats
  const stats = useMemo(() => {
    const drafts = sessions.filter(s => s.status === 'Draft').length;
    const locked = sessions.filter(s => s.locked).length;
    const nextSession = sessions.find(s => s.status !== 'Locked' && s.status !== 'Completed');

    const resultsDraft = results.filter(r => r.status_state === 'Draft').length;
    const resultsOfficial = results.filter(r => r.status_state === 'Official').length;
    const resultsLocked = results.filter(r => r.status_state === 'Locked').length;

    const complianceIssues = entries.filter(e =>
      !e.waiver_verified || !e.transponder_verified || e.tech_status === 'Failed'
    ).length;

    const standingsCalculated = standings.length > 0;

    return {
      drafts,
      locked,
      nextSession,
      resultsDraft,
      resultsOfficial,
      resultsLocked,
      complianceIssues,
      standingsCalculated,
    };
  }, [sessions, results, entries, standings]);

  const recentActivity = useMemo(() => {
    return operationLogs.slice(0, 5).map(log => ({
      label: log.operation_type?.replace(/_/g, ' ') || 'Operation',
      icon: log.operation_status === 'success' ? CheckCircle2 : AlertCircle,
    }));
  }, [operationLogs]);

  return (
    <div className="w-72 flex-shrink-0 space-y-3 overflow-y-auto p-3">
      {/* Event Readiness Score */}
      <EventReadinessScore
        selectedEvent={selectedEvent}
        sessions={sessions}
        entries={entries}
        results={results}
        standings={standings}
      />

      {/* Operational Alert Stack */}
      <OperationalAlertStack
        selectedEvent={selectedEvent}
        sessions={sessions}
        results={results}
        entries={entries}
      />

      {/* Session Timeline */}
      <SessionTimelinePolished sessions={sessions} results={results} entries={entries} />


    </div>
  );
}