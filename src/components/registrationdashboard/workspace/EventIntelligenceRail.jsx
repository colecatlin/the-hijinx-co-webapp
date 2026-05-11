/**
 * REVISION 7B — EventIntelligenceRail
 * Right-side intelligence rail showing operational status and recent activity.
 * Read-only widgets with operational state.
 */
import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

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
    <div className="w-72 flex-shrink-0 space-y-3">
      {/* Event Status */}
      <IntelligenceWidget
        title="Event Status"
        items={[
          { label: `${selectedEvent?.status || 'Draft'} event`, icon: Clock },
          { label: `${entries.length} entries`, icon: null },
          { label: selectedEvent?.published_flag ? 'Published' : 'Draft visibility', icon: null },
        ]}
        isEmpty={!selectedEvent}
      />

      {/* Sessions */}
      <IntelligenceWidget
        title="Sessions"
        items={[
          stats.nextSession && { label: `Next: ${stats.nextSession.name}`, icon: Clock },
          stats.drafts > 0 && { label: `${stats.drafts} draft`, icon: AlertTriangle },
          stats.locked > 0 && { label: `${stats.locked} locked`, icon: CheckCircle2 },
        ].filter(Boolean)}
        isEmpty={sessions.length === 0}
      />

      {/* Results */}
      <IntelligenceWidget
        title="Results"
        items={[
          stats.resultsDraft > 0 && { label: `${stats.resultsDraft} draft`, icon: AlertTriangle },
          stats.resultsOfficial > 0 && { label: `${stats.resultsOfficial} official`, icon: CheckCircle2 },
          stats.resultsLocked > 0 && { label: `${stats.resultsLocked} locked`, icon: CheckCircle2 },
        ].filter(Boolean)}
        isEmpty={results.length === 0}
      />

      {/* Compliance */}
      {stats.complianceIssues > 0 && (
        <IntelligenceWidget
          title="Compliance Alerts"
          items={[
            { label: `${stats.complianceIssues} flags`, icon: AlertTriangle },
          ]}
          isEmpty={false}
        />
      )}

      {/* Standings */}
      <IntelligenceWidget
        title="Standings"
        items={[
          stats.standingsCalculated
            ? { label: 'Calculated', icon: CheckCircle2 }
            : { label: 'Not calculated', icon: Clock },
        ]}
        isEmpty={false}
      />

      {/* Recent Activity */}
      <IntelligenceWidget
        title="Recent Activity"
        items={recentActivity}
        isEmpty={operationLogs.length === 0}
      />
    </div>
  );
}