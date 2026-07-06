/**
 * DataQualityDashboard — R9EB.3
 *
 * Admin Data Quality & Governance Authority dashboard.
 * Route: /racecore/data/quality
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Shield, Activity, Database, Link, AlertCircle, AlertTriangle, CheckCircle2, TrendingUp, Users, MapPin, Flag, Calendar, Layers, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import DatabaseCertificationPanel from '@/components/racecore/governance/DatabaseCertificationPanel';
import EntityHealthBrowser from '@/components/racecore/governance/EntityHealthBrowser';

const TABS = [
  { id: 'overview',       label: 'Overview',          icon: Activity },
  { id: 'certification',  label: 'Certification',     icon: Shield },
  { id: 'entity_health',  label: 'Entity Health',     icon: Database },
  { id: 'relationships',  label: 'Relationships',     icon: Link },
];

function StatCard({ icon: Icon, label, value, sub, color = 'text-teal-400', alert = false }) {
  return (
    <div className="p-4 rounded-xl border space-y-1 transition-colors" style={{ background: 'rgba(255,255,255,0.02)', borderColor: alert ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-2xl font-bold font-mono ${color}`}>{value ?? '—'}</div>
      {sub && <div className="text-gray-600 text-[10px]">{sub}</div>}
    </div>
  );
}

function IssueRow({ entity_type, message, recommendation, severity }) {
  const cfg = severity === 'critical'
    ? { Icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-900/10 border-red-800/20' }
    : { Icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-900/10 border-amber-800/20' };
  const { Icon } = cfg;
  return (
    <div className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border ${cfg.bg}`}>
      <Icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${cfg.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[9px] font-mono uppercase tracking-wider ${cfg.color}`}>{entity_type}</span>
          <span className="text-white text-xs">{message}</span>
        </div>
        {recommendation && <p className="text-[10px] text-gray-500 mt-0.5">{recommendation}</p>}
      </div>
    </div>
  );
}

function RelationshipCheck({ label, count, ok }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg border" style={{ background: 'rgba(255,255,255,0.015)', borderColor: ok ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.2)' }}>
      <span className="text-gray-300 text-xs">{label}</span>
      {ok
        ? <span className="flex items-center gap-1 text-green-400 text-[10px]"><CheckCircle2 className="w-3 h-3" />OK</span>
        : <span className="flex items-center gap-1 text-red-400 text-[10px] font-semibold"><AlertCircle className="w-3 h-3" />{count} broken</span>
      }
    </div>
  );
}

export default function DataQualityDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  // Load entity counts for overview
  const { data: drivers = [] }     = useQuery({ queryKey: ['dq_drivers'],    queryFn: () => base44.entities.Driver.list('-created_date', 200),            staleTime: 120_000 });
  const { data: teams = [] }       = useQuery({ queryKey: ['dq_teams'],      queryFn: () => base44.entities.Team.list('-created_date', 200),              staleTime: 120_000 });
  const { data: tracks = [] }      = useQuery({ queryKey: ['dq_tracks'],     queryFn: () => base44.entities.Track.list('-created_date', 200),             staleTime: 120_000 });
  const { data: series = [] }      = useQuery({ queryKey: ['dq_series'],     queryFn: () => base44.entities.Series.list('-created_date', 200),            staleTime: 120_000 });
  const { data: events = [] }      = useQuery({ queryKey: ['dq_events'],     queryFn: () => base44.entities.Event.list('-created_date', 200),             staleTime: 120_000 });
  const { data: sessions = [] }    = useQuery({ queryKey: ['dq_sessions'],   queryFn: () => base44.entities.Session.list('-created_date', 200),           staleTime: 120_000 });
  const { data: results = [] }     = useQuery({ queryKey: ['dq_results'],    queryFn: () => base44.entities.Results.list('-created_date', 200),           staleTime: 120_000 });
  const { data: standings = [] }   = useQuery({ queryKey: ['dq_standings'],  queryFn: () => base44.entities.Standings.list('-created_date', 200),         staleTime: 120_000 });
  const { data: identities = [] }  = useQuery({ queryKey: ['dq_identities'], queryFn: () => base44.entities.PersonIdentity.list('-created_date', 200),    staleTime: 120_000 });
  const { data: aliases = [] }     = useQuery({ queryKey: ['dq_aliases'],    queryFn: () => base44.entities.EntityAlias.filter({ active: true }, '-created_date', 200).catch(() => []), staleTime: 120_000 });
  const { data: auditLogs = [] }   = useQuery({ queryKey: ['dq_audit'],      queryFn: () => base44.entities.AuditLog.list('-timestamp', 50),              staleTime: 60_000 });
  const { data: opLogs = [] }      = useQuery({ queryKey: ['dq_oplogs'],     queryFn: () => base44.entities.OperationLog.list('-created_date', 50).catch(() => []), staleTime: 60_000 });

  // Quick health checks from loaded data
  const driversWithoutNorm   = drivers.filter(d => !d.normalized_name).length;
  const driversWithoutKey    = drivers.filter(d => !d.canonical_key).length;
  const eventsWithoutSeries  = events.filter(e => !e.series_id).length;
  const eventsWithoutTrack   = events.filter(e => !e.track_id).length;
  const eventsWithoutDate    = events.filter(e => !e.event_date).length;
  const sessionsWithoutClass = sessions.filter(s => !s.series_class_id).length;
  const pointsSessNoRound    = sessions.filter(s => s.points_enabled && !s.round_number).length;
  const resultsNoDriver      = results.filter(r => !r.driver_id).length;
  const standingsNoSeries    = standings.filter(s => !s.series_id).length;
  const orphanIdentities     = identities.filter(i => !i.canonical_driver_id).length;

  const criticalIssues = [
    driversWithoutNorm    > 0 && { entity_type: 'Driver',    message: `${driversWithoutNorm} drivers missing normalized_name`,         recommendation: 'Run backfillDriverNormalization',          severity: 'critical' },
    driversWithoutKey     > 0 && { entity_type: 'Driver',    message: `${driversWithoutKey} drivers missing canonical_key`,            recommendation: 'Run backfillDriverNormalization',          severity: 'critical' },
    eventsWithoutDate     > 0 && { entity_type: 'Event',     message: `${eventsWithoutDate} events missing event_date`,               recommendation: 'Add event_date to complete these records', severity: 'critical' },
    pointsSessNoRound     > 0 && { entity_type: 'Session',   message: `${pointsSessNoRound} points sessions missing round_number`,    recommendation: 'Set round_number for championship scoring',severity: 'critical' },
    resultsNoDriver       > 0 && { entity_type: 'Results',   message: `${resultsNoDriver} results have no driver_id`,                 recommendation: 'Run repairDriverReferences',               severity: 'critical' },
    orphanIdentities      > 0 && { entity_type: 'Identity',  message: `${orphanIdentities} PersonIdentities not linked to Driver`,    recommendation: 'Run createPersonIdentityFromDriver',       severity: 'critical' },
  ].filter(Boolean);

  const warnings = [
    eventsWithoutSeries  > 0 && { entity_type: 'Event',     message: `${eventsWithoutSeries} events not linked to Series`,           recommendation: 'Link events to Series for standings',      severity: 'warning' },
    eventsWithoutTrack   > 0 && { entity_type: 'Event',     message: `${eventsWithoutTrack} events not linked to Track`,             recommendation: 'Link events to Track for venue context',   severity: 'warning' },
    sessionsWithoutClass > 0 && { entity_type: 'Session',   message: `${sessionsWithoutClass} sessions without SeriesClass`,         recommendation: 'Link sessions to SeriesClass',             severity: 'warning' },
    standingsNoSeries    > 0 && { entity_type: 'Standings', message: `${standingsNoSeries} standings without series_id`,            recommendation: 'Run repairSeriesReferences',               severity: 'warning' },
  ].filter(Boolean);

  const overallQuickScore = (() => {
    let s = 100;
    s -= criticalIssues.length * 8;
    s -= warnings.length * 3;
    return Math.max(0, s);
  })();

  const quickScoreColor = overallQuickScore >= 90 ? 'text-green-400' : overallQuickScore >= 70 ? 'text-teal-400' : overallQuickScore >= 50 ? 'text-amber-400' : 'text-red-400';

  const certLastRun = opLogs.find(l => l.operation_type === 'database_certification_run');

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="w-5 h-5 text-teal-400" />
        <div>
          <h1 className="text-white font-bold text-lg">Data Quality Authority</h1>
          <p className="text-gray-500 text-xs">Continuous entity governance, health scores, and relationship integrity</p>
        </div>
        <div className="ml-auto text-right">
          <div className={`text-2xl font-bold font-mono ${quickScoreColor}`}>{overallQuickScore}</div>
          <div className="text-[9px] text-gray-600 uppercase tracking-widest">Quick Health</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.07]">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold uppercase tracking-wider rounded-t transition-colors ${
              activeTab === tab.id
                ? 'text-teal-300 border-b-2 border-teal-500 bg-white/[0.03]'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <tab.icon className="w-3 h-3" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Entity counts */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={Users}    label="Drivers"        value={drivers.length}    sub={`${identities.length} identities`}       color="text-teal-400" />
            <StatCard icon={Layers}   label="Teams"          value={teams.length}       sub={`${aliases.length} total aliases`}        color="text-blue-400" />
            <StatCard icon={MapPin}   label="Tracks"         value={tracks.length}      sub={`${series.length} series`}               color="text-purple-400" />
            <StatCard icon={Calendar} label="Events"         value={events.length}      sub={`${sessions.length} sessions`}           color="text-amber-400" />
            <StatCard icon={Flag}     label="Results"        value={results.length}     sub={`${standings.length} standings`}         color="text-orange-400" />
            <StatCard icon={Zap}      label="Aliases"        value={aliases.length}     sub="Active EntityAlias records"              color="text-teal-400" />
            <StatCard icon={AlertCircle} label="Critical"    value={criticalIssues.length} sub="Issues requiring immediate action"   color={criticalIssues.length > 0 ? 'text-red-400' : 'text-green-400'} alert={criticalIssues.length > 0} />
            <StatCard icon={AlertTriangle} label="Warnings"  value={warnings.length}    sub="Issues to address soon"                 color={warnings.length > 0 ? 'text-amber-400' : 'text-green-400'} />
          </div>

          {/* Critical issues */}
          {criticalIssues.length > 0 && (
            <div>
              <h3 className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3 text-red-400" /> Critical Issues ({criticalIssues.length})
              </h3>
              <div className="space-y-1.5">
                {criticalIssues.map((issue, i) => <IssueRow key={i} {...issue} />)}
              </div>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div>
              <h3 className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 text-amber-400" /> Warnings ({warnings.length})
              </h3>
              <div className="space-y-1.5">
                {warnings.map((w, i) => <IssueRow key={i} {...w} />)}
              </div>
            </div>
          )}

          {criticalIssues.length === 0 && warnings.length === 0 && (
            <div className="flex flex-col items-center py-12 gap-2">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              <p className="text-green-400 font-semibold text-sm">No data quality issues detected</p>
              <p className="text-gray-600 text-xs">All loaded records pass quick health checks</p>
            </div>
          )}

          {/* Last certification */}
          {certLastRun && (
            <div className="px-4 py-3 rounded-xl border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-gray-400 text-xs">Last full certification: <span className="text-white">{certLastRun.metadata?.certification || '—'}</span></span>
                <span className="text-gray-600 text-[10px] ml-auto font-mono">
                  {certLastRun.created_date ? format(new Date(certLastRun.created_date), 'MMM d HH:mm') : ''}
                </span>
              </div>
            </div>
          )}

          {/* Recent audit activity */}
          <div>
            <h3 className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-teal-400" /> Recent Governance Activity
            </h3>
            <div className="space-y-0.5">
              {auditLogs.slice(0, 8).map(log => (
                <div key={log.id} className="flex items-center gap-3 px-3 py-1.5 rounded border" style={{ background: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.04)' }}>
                  <Badge variant="outline" className="text-[9px] font-mono uppercase tracking-wider shrink-0 border-white/10 text-gray-500 min-w-[80px] text-center">{log.entity_type}</Badge>
                  <span className="text-gray-300 text-xs flex-1 truncate">{log.entity_name || log.entity_id}</span>
                  <span className="text-[10px] font-semibold text-teal-400 shrink-0">{log.action}</span>
                  <span className="text-[10px] text-gray-600 shrink-0 font-mono">{log.timestamp ? format(new Date(log.timestamp), 'MMM d HH:mm') : '—'}</span>
                </div>
              ))}
              {auditLogs.length === 0 && <p className="text-gray-600 text-xs py-4 text-center">No audit activity yet</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── CERTIFICATION ── */}
      {activeTab === 'certification' && <DatabaseCertificationPanel />}

      {/* ── ENTITY HEALTH ── */}
      {activeTab === 'entity_health' && <EntityHealthBrowser />}

      {/* ── RELATIONSHIPS ── */}
      {activeTab === 'relationships' && (
        <div className="space-y-5">
          <div>
            <h3 className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-3 flex items-center gap-1.5">
              <Link className="w-3 h-3 text-purple-400" /> Relationship Chain Integrity
            </h3>
            <p className="text-gray-500 text-xs mb-4">Quick checks against loaded records. Run the full Certification for exhaustive coverage.</p>
            <div className="space-y-2">
              <div className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold px-1 mb-1">Driver Chain</div>
              <RelationshipCheck label="Driver → PersonIdentity"       count={orphanIdentities}     ok={orphanIdentities === 0} />
              <RelationshipCheck label="Driver → normalized_name"      count={driversWithoutNorm}   ok={driversWithoutNorm === 0} />
              <RelationshipCheck label="Driver → canonical_key"        count={driversWithoutKey}    ok={driversWithoutKey === 0} />
              <div className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold px-1 mt-3 mb-1">Event Chain</div>
              <RelationshipCheck label="Event → Series"                count={eventsWithoutSeries}  ok={eventsWithoutSeries === 0} />
              <RelationshipCheck label="Event → Track"                 count={eventsWithoutTrack}   ok={eventsWithoutTrack === 0} />
              <RelationshipCheck label="Event → event_date"            count={eventsWithoutDate}    ok={eventsWithoutDate === 0} />
              <div className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold px-1 mt-3 mb-1">Session Chain</div>
              <RelationshipCheck label="Session → SeriesClass"         count={sessionsWithoutClass} ok={sessionsWithoutClass === 0} />
              <RelationshipCheck label="Points Session → round_number" count={pointsSessNoRound}    ok={pointsSessNoRound === 0} />
              <div className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold px-1 mt-3 mb-1">Results / Standings</div>
              <RelationshipCheck label="Result → Driver"               count={resultsNoDriver}      ok={resultsNoDriver === 0} />
              <RelationshipCheck label="Standing → Series"             count={standingsNoSeries}    ok={standingsNoSeries === 0} />
            </div>
          </div>

          {/* Governance rules */}
          <div>
            <h3 className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-3 flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-teal-400" /> Active Governance Rules
            </h3>
            <div className="space-y-1.5">
              {[
                { rule: 'canonical_name change requires admin approval', entity: 'PersonIdentity', enforced: true },
                { rule: 'date_of_birth conflict blocks import', entity: 'PersonIdentity', enforced: true },
                { rule: 'license_number conflict blocks import', entity: 'PersonIdentity', enforced: true },
                { rule: 'BLOCK_IMPORT rows prevent all commits', entity: 'Import', enforced: true },
                { rule: 'historical results require is_historical=true + standings_hold', entity: 'Session', enforced: true },
                { rule: 'points sessions require round_number before standings calc', entity: 'Session', enforced: true },
                { rule: 'EntityAlias registered on every successful import match', entity: 'All', enforced: true },
                { rule: 'Results must resolve driver before commit', entity: 'Results', enforced: true },
                { rule: 'Merge operations recorded in IdentityMergeLedger', entity: 'PersonIdentity', enforced: true },
              ].map((r, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg border" style={{ background: 'rgba(255,255,255,0.015)', borderColor: 'rgba(255,255,255,0.06)' }}>
                  <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300 text-xs flex-1">{r.rule}</span>
                  <Badge className="text-[9px] border-white/10 text-gray-500 bg-transparent">{r.entity}</Badge>
                  <Badge className="text-[9px] bg-green-900/20 text-green-400 border-green-800/30">enforced</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}