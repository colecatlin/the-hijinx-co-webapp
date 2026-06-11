/**
 * R9CS — DataHealthDashboard
 * Displays data health issues with severity levels.
 */
import React, { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useDataHealth } from '@/hooks/useDataHealth';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const SEV_CONFIG = {
  critical: { label: 'Critical',  Icon: AlertCircle,   color: 'text-red-400',    bg: 'bg-red-900/20 border-red-800/40' },
  warning:  { label: 'Warning',   Icon: AlertTriangle, color: 'text-amber-400',  bg: 'bg-amber-900/20 border-amber-800/40' },
  info:     { label: 'Info',      Icon: Info,           color: 'text-blue-400',  bg: 'bg-blue-900/20 border-blue-800/40' },
};

function IssueRow({ issue }) {
  const cfg = SEV_CONFIG[issue.severity] || SEV_CONFIG.info;
  const { Icon } = cfg;
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${cfg.bg}`}>
      <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${cfg.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-mono uppercase tracking-widest ${cfg.color}`}>{issue.entity_type}</span>
          <span className="text-white text-xs font-medium">{issue.issue}</span>
        </div>
        <p className="text-[11px] text-gray-500 mt-0.5">{issue.recommendation}</p>
        {issue.record_id && (
          <p className="text-[10px] text-gray-700 font-mono mt-0.5">ID: {issue.record_id}</p>
        )}
      </div>
    </div>
  );
}

export default function DataHealthDashboard() {
  const [filter, setFilter] = useState('all');

  // Load all data for health checks
  const { data: entries = [] } = useQuery({ queryKey: ['entries_health'], queryFn: () => base44.entities.Entry.list('-created_date', 200), staleTime: 60_000 });
  const { data: drivers = [] } = useQuery({ queryKey: ['drivers_health'], queryFn: () => base44.entities.Driver.list('-created_date', 200), staleTime: 60_000 });
  const { data: sessions = [] } = useQuery({ queryKey: ['sessions_health'], queryFn: () => base44.entities.Session.list('-created_date', 200), staleTime: 60_000 });
  const { data: results = [] } = useQuery({ queryKey: ['results_health'], queryFn: () => base44.entities.Results.list('-created_date', 200), staleTime: 60_000 });
  const { data: standings = [] } = useQuery({ queryKey: ['standings_health'], queryFn: () => base44.entities.Standings.list('-created_date', 200), staleTime: 60_000 });
  const { data: officials = [] } = useQuery({ queryKey: ['officials_health'], queryFn: () => base44.entities.EventOfficial.list('-created_date', 200).catch(() => []), staleTime: 60_000 });
  const { data: techInspections = [] } = useQuery({ queryKey: ['tech_health'], queryFn: () => base44.entities.TechInspectionRecord.list('-created_date', 200).catch(() => []), staleTime: 60_000 });
  const { data: incidents = [] } = useQuery({ queryKey: ['incidents_health'], queryFn: () => base44.entities.Incident.list('-created_date', 200).catch(() => []), staleTime: 60_000 });

  const { issues, critical, warnings, info, score } = useDataHealth({
    entries, drivers, sessions, results, standings, officials, techInspections, incidents,
  });

  const displayed = filter === 'all' ? issues : issues.filter(i => i.severity === filter);

  const scoreColor = score >= 90 ? 'text-green-400' : score >= 70 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-white font-bold text-base">Data Health</h2>
          <p className="text-gray-500 text-xs">Platform-wide integrity validation</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-right">
            <div className={`text-2xl font-bold font-mono ${scoreColor}`}>{score}</div>
            <div className="text-[9px] text-gray-600 uppercase tracking-widest">Health Score</div>
          </div>
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all',      label: 'All',      count: issues.length,   color: 'border-white/10 text-gray-400' },
          { key: 'critical', label: 'Critical',  count: critical.length, color: 'border-red-800/50 text-red-400' },
          { key: 'warning',  label: 'Warnings',  count: warnings.length, color: 'border-amber-800/50 text-amber-400' },
          { key: 'info',     label: 'Info',      count: info.length,     color: 'border-blue-800/50 text-blue-400' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-colors ${f.color} ${filter === f.key ? 'bg-white/[0.06]' : 'bg-transparent hover:bg-white/[0.03]'}`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Issues */}
      {issues.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
          <p className="text-green-400 font-semibold">No data health issues found</p>
          <p className="text-gray-600 text-xs">All records pass validation checks</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {displayed.map((issue, idx) => (
            <IssueRow key={`${issue.record_id}-${idx}`} issue={issue} />
          ))}
        </div>
      )}
    </div>
  );
}