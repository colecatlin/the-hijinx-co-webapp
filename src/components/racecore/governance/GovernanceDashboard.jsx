/**
 * R9CS — GovernanceDashboard
 * Platform governance overview: audit activity, archives, data health, lifecycle integrity.
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Shield, Archive, Activity, AlertTriangle, CheckCircle2, Users, ShieldCheck } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useDataHealth } from '@/hooks/useDataHealth';
import { Link } from 'react-router-dom';
import AuditCoverageReport from './AuditCoverageReport';
import EnforcementStatusPanel from './EnforcementStatusPanel';

function StatCard({ icon: Icon, label, value, sub, color = 'text-teal-400', href }) {
  const inner = (
    <div
      className="p-4 rounded-xl border space-y-1 transition-colors hover:bg-white/[0.04]"
      style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
      {sub && <div className="text-gray-600 text-[10px]">{sub}</div>}
    </div>
  );
  if (href) return <Link to={href}>{inner}</Link>;
  return inner;
}

export default function GovernanceDashboard() {
  const today = startOfDay(new Date()).toISOString();

  const { data: allLogs = [] } = useQuery({
    queryKey: ['auditLogs_governance'],
    queryFn: () => base44.entities.AuditLog.list('-timestamp', 500),
    staleTime: 60_000,
  });

  const { data: entries = [] } = useQuery({ queryKey: ['entries_gov'], queryFn: () => base44.entities.Entry.list('-created_date', 100), staleTime: 60_000 });
  const { data: sessions = [] } = useQuery({ queryKey: ['sessions_gov'], queryFn: () => base44.entities.Session.list('-created_date', 100), staleTime: 60_000 });
  const { data: results = [] } = useQuery({ queryKey: ['results_gov'], queryFn: () => base44.entities.Results.list('-created_date', 100), staleTime: 60_000 });
  const { data: officials = [] } = useQuery({ queryKey: ['officials_gov'], queryFn: () => base44.entities.EventOfficial.list('-created_date', 100).catch(() => []), staleTime: 60_000 });
  const { data: drivers = [] } = useQuery({ queryKey: ['drivers_gov'], queryFn: () => base44.entities.Driver.list('-created_date', 100), staleTime: 60_000 });

  const todayLogs = allLogs.filter(l => l.timestamp && l.timestamp >= today);
  const archivedLogs = allLogs.filter(l => l.action === 'archived');
  const restoredLogs = allLogs.filter(l => l.action === 'restored');

  const { critical, warnings, score } = useDataHealth({ entries, sessions, results, officials, drivers });

  // Lifecycle violations: live events with draft sessions
  const liveEventIds = new Set(); // simplified — count Draft sessions in non-Draft events
  const draftSessions = sessions.filter(s => s.status === 'Draft');

  const recentLogs = allLogs.slice(0, 12);
  const [activeTab, setActiveTab] = useState('overview');

  const TABS = [
    { id: 'overview',    label: 'Overview' },
    { id: 'enforcement', label: 'Enforcement' },
    { id: 'audit',       label: 'Audit Coverage' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="w-5 h-5 text-teal-400" />
        <div>
          <h1 className="text-white font-bold text-lg">Governance Dashboard</h1>
          <p className="text-gray-500 text-xs">Enforcement status, audit coverage, and platform integrity</p>
        </div>
        <div className="ml-auto">
          <div className={`text-right`}>
            <div className={`text-xl font-bold font-mono ${score >= 90 ? 'text-green-400' : score >= 70 ? 'text-amber-400' : 'text-red-400'}`}>{score}/100</div>
            <div className="text-[9px] text-gray-600 uppercase tracking-widest">Data Health</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.07] pb-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider rounded-t transition-colors ${
              activeTab === tab.id
                ? 'text-teal-300 border-b-2 border-teal-500 bg-white/[0.03]'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'enforcement' && <EnforcementStatusPanel />}
      {activeTab === 'audit' && <AuditCoverageReport />}

      {activeTab === 'overview' && <>
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard icon={Activity} label="Audit Entries Today" value={todayLogs.length} sub="All write operations" color="text-teal-400" href="/racecore/governance/audit" />
        <StatCard icon={Archive} label="Archived Records" value={archivedLogs.length} sub="Across all entity types" color="text-amber-400" href="/racecore/archive" />
        <StatCard icon={CheckCircle2} label="Records Restored" value={restoredLogs.length} sub="Total restorations" color="text-green-400" />
        <StatCard icon={AlertTriangle} label="Critical Issues" value={critical.length} sub="Data health violations" color={critical.length > 0 ? 'text-red-400' : 'text-green-400'} href="/racecore/health" />
        <StatCard icon={AlertTriangle} label="Warnings" value={warnings.length} sub="Data quality issues" color={warnings.length > 0 ? 'text-amber-400' : 'text-green-400'} href="/racecore/health" />
        <StatCard icon={Users} label="Officials Logged" value={officials.length} sub="Across all events" color="text-purple-400" />
      </div>

      {/* Recent audit activity */}
      <div>
        <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-teal-400" />
          Recent Audit Activity
        </h3>
        {recentLogs.length === 0 ? (
          <p className="text-gray-600 text-xs py-6 text-center">No audit entries yet. Operations will be logged here.</p>
        ) : (
          <div className="space-y-0.5">
            {recentLogs.map(log => (
              <div
                key={log.id}
                className="flex items-center gap-3 px-3 py-2 rounded border"
                style={{ background: 'rgba(255,255,255,0.015)', borderColor: 'rgba(255,255,255,0.05)' }}
              >
                <Badge variant="outline" className="text-[9px] font-mono uppercase tracking-widest shrink-0 border-white/10 text-gray-500">
                  {log.entity_type}
                </Badge>
                <span className="text-gray-300 text-xs flex-1 truncate">{log.entity_name || log.entity_id}</span>
                <span className="text-[10px] font-semibold text-teal-400 shrink-0">{log.action}</span>
                <span className="text-[10px] text-gray-600 shrink-0 font-mono">
                  {log.timestamp ? format(new Date(log.timestamp), 'MMM d HH:mm') : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
        {allLogs.length > 12 && (
          <p className="text-center text-[10px] text-teal-500 mt-2">
            {allLogs.length} total audit entries
          </p>
        )}
      </div>
      </>}
    </div>
  );
}