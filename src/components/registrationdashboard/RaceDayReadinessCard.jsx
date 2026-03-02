import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { QueryKeys } from '@/components/utils/queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { CheckCircle2, AlertTriangle, XCircle, Clock, Activity } from 'lucide-react';

const DQ = applyDefaultQueryOptions();

const WEIGHTS = {
  entries: 0.25,
  checkin: 0.20,
  tech: 0.20,
  compliance: 0.15,
  results: 0.20,
};

function statusLabel(pct) {
  if (pct >= 85) return { label: 'Ready', color: 'bg-green-900/40 text-green-300', bar: 'bg-green-500' };
  if (pct >= 65) return { label: 'On Track', color: 'bg-blue-900/40 text-blue-300', bar: 'bg-blue-500' };
  if (pct >= 40) return { label: 'At Risk', color: 'bg-yellow-900/40 text-yellow-300', bar: 'bg-yellow-500' };
  return { label: 'Blocked', color: 'bg-red-900/40 text-red-300', bar: 'bg-red-500' };
}

function BreakdownRow({ label, pct, sub }) {
  const pctInt = Math.round(pct * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs text-gray-300">{label}</span>
          <span className="text-xs font-mono text-gray-400">{pctInt}%</span>
        </div>
        <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${pctInt >= 85 ? 'bg-green-500' : pctInt >= 65 ? 'bg-blue-500' : pctInt >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${pctInt}%` }} />
        </div>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function RaceDayReadinessCard({ selectedEvent, sessions = [] }) {
  const eventId = selectedEvent?.id;

  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: QueryKeys.entries.listByEvent(eventId),
    queryFn: () => base44.entities.Entry.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: eventSessions = [] } = useQuery({
    queryKey: QueryKeys.sessions.listByEvent(eventId),
    queryFn: () => base44.entities.Session.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: results = [] } = useQuery({
    queryKey: QueryKeys.results.listByEvent(eventId),
    queryFn: () => base44.entities.Results.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  const readiness = useMemo(() => {
    const total = entries.length;
    const allSessions = (eventSessions.length > 0 ? eventSessions : sessions);

    // 1. Entries readiness
    const entriesScore = total > 0 ? 1 : 0;
    const entriesSub = total > 0 ? `${total} total` : 'No entries yet';

    // 2. Check In readiness
    const checkedIn = entries.filter(e =>
      e.entry_status === 'Checked In' || e.entry_status === 'Teched'
    ).length;
    const checkinScore = total > 0 ? checkedIn / total : 0;
    const checkinSub = total > 0 ? `${checkedIn} / ${total} checked in` : 'No entries yet';

    // 3. Tech readiness
    const techPassed = entries.filter(e => e.tech_status === 'Passed').length;
    const techScore = total > 0 ? techPassed / total : 0;
    const techSub = total > 0 ? `${techPassed} / ${total} passed` : 'No entries yet';

    // 4. Compliance readiness
    const openFlags = entries.filter(e => {
      const hasWaiver = e.waiver_status === 'Missing';
      const hasComplianceFlags = e.compliance_flags && e.compliance_flags.length > 0;
      return hasWaiver || hasComplianceFlags;
    }).length;
    const complianceScore = total > 0 ? Math.max(0, (total - openFlags) / total) : 0;
    const complianceSub = total > 0 ? (openFlags > 0 ? `${openFlags} open flags` : 'No open flags') : 'No entries yet';

    // 5. Results readiness
    const officialOrLocked = allSessions.filter(s =>
      s.status === 'Official' || s.status === 'Locked'
    ).length;
    const totalSessions = allSessions.length;
    const resultsScore = totalSessions > 0 ? officialOrLocked / totalSessions : 0;
    const resultsSub = totalSessions > 0 ? `${officialOrLocked} / ${totalSessions} sessions official` : 'No sessions yet';

    const overall = Math.round(100 * (
      WEIGHTS.entries * entriesScore +
      WEIGHTS.checkin * checkinScore +
      WEIGHTS.tech * techScore +
      WEIGHTS.compliance * complianceScore +
      WEIGHTS.results * resultsScore
    ));

    // Top blockers
    const blockers = [];
    if (total === 0) blockers.push('No entries yet');
    if (openFlags > 0) blockers.push(`${openFlags} open compliance flag${openFlags > 1 ? 's' : ''}`);
    const techIssues = entries.filter(e => e.tech_status === 'Failed' || e.tech_status === 'Recheck Required').length;
    if (techIssues > 0) blockers.push(`${techIssues} tech not cleared`);
    const unofficialSessions = allSessions.filter(s => s.status === 'Draft' || s.status === 'Provisional').length;
    if (unofficialSessions > 0) blockers.push(`${unofficialSessions} session${unofficialSessions > 1 ? 's' : ''} not official`);

    return {
      overall,
      breakdown: [
        { label: 'Entries', score: entriesScore, sub: entriesSub },
        { label: 'Check In', score: checkinScore, sub: checkinSub },
        { label: 'Tech', score: techScore, sub: techSub },
        { label: 'Compliance', score: complianceScore, sub: complianceSub },
        { label: 'Results', score: resultsScore, sub: resultsSub },
      ],
      blockers: blockers.slice(0, 4),
    };
  }, [entries, eventSessions, sessions, results]);

  if (!selectedEvent) return null;

  const { label, color, bar } = statusLabel(readiness.overall);
  const isLoading = entriesLoading;

  return (
    <Card className="bg-[#171717] border-gray-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2 text-sm">
            <Activity className="w-4 h-4 text-purple-400" />
            Race Day Readiness
          </CardTitle>
          <Badge className={`text-xs ${color}`}>{label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-xs text-gray-500">Loading...</p>
        ) : (
          <>
            {/* Main meter */}
            <div>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-4xl font-black text-white">{readiness.overall}%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${bar}`}
                  style={{ width: `${readiness.overall}%` }}
                />
              </div>
            </div>

            {/* Breakdown */}
            <div className="space-y-3 pt-1 border-t border-gray-800">
              {readiness.breakdown.map(row => (
                <BreakdownRow key={row.label} label={row.label} pct={row.score} sub={row.sub} />
              ))}
            </div>

            {/* Blockers */}
            {readiness.blockers.length > 0 && (
              <div className="pt-2 border-t border-gray-800">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Top Blockers</p>
                <ul className="space-y-1">
                  {readiness.blockers.map((b, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-red-400">
                      <XCircle className="w-3 h-3 flex-shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {readiness.blockers.length === 0 && readiness.overall >= 85 && (
              <div className="pt-2 border-t border-gray-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-xs text-green-400">All systems go</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}