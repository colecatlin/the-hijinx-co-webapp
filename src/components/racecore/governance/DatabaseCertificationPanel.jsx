/**
 * DatabaseCertificationPanel — R9EB.3
 * Displays the full database certification report.
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, RefreshCw, AlertCircle, AlertTriangle, CheckCircle2, Link, Copy, Database, Zap, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

const CERT_COLORS = {
  EXCELLENT: { text: 'text-green-400',  bg: 'bg-green-900/20 border-green-800/30' },
  GOOD:      { text: 'text-teal-400',   bg: 'bg-teal-900/20 border-teal-800/30' },
  FAIR:      { text: 'text-amber-400',  bg: 'bg-amber-900/20 border-amber-800/30' },
  POOR:      { text: 'text-orange-400', bg: 'bg-orange-900/20 border-orange-800/30' },
  CRITICAL:  { text: 'text-red-400',    bg: 'bg-red-900/20 border-red-800/30' },
};

function DomainScore({ label, score, icon: Icon }) {
  const color = score >= 90 ? 'text-green-400' : score >= 75 ? 'text-teal-400' : score >= 55 ? 'text-amber-400' : 'text-red-400';
  const barColor = score >= 90 ? '#22c55e' : score >= 75 ? '#14b8a6' : score >= 55 ? '#f59e0b' : '#ef4444';
  return (
    <div className="p-3 rounded-xl border space-y-2" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3.5 h-3.5 ${color}`} />
          <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{label}</span>
        </div>
        <span className={`text-sm font-bold font-mono ${color}`}>{score ?? '—'}%</span>
      </div>
      <div className="h-1 rounded-full bg-white/[0.05]">
        <div className="h-full rounded-full transition-all" style={{ width: `${score || 0}%`, background: barColor }} />
      </div>
    </div>
  );
}

function EntityRow({ type, data }) {
  const colors = CERT_COLORS[data?.cert || 'FAIR'];
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg border" style={{ background: 'rgba(255,255,255,0.015)', borderColor: 'rgba(255,255,255,0.06)' }}>
      <span className="text-gray-400 text-xs font-mono w-32 flex-shrink-0">{type}</span>
      <div className="flex-1 h-1 rounded-full bg-white/[0.05]">
        <div className="h-full rounded-full transition-all" style={{ width: `${data?.avg_health || 0}%`, background: data?.avg_health >= 85 ? '#22c55e' : data?.avg_health >= 65 ? '#14b8a6' : data?.avg_health >= 45 ? '#f59e0b' : '#ef4444' }} />
      </div>
      <span className={`text-xs font-bold font-mono w-8 text-right ${colors.text}`}>{data?.avg_health ?? '—'}</span>
      <Badge className={`text-[9px] shrink-0 ${colors.bg} ${colors.text} border`}>{data?.cert || '—'}</Badge>
      {data?.critical > 0 && <Badge className="bg-red-900/30 text-red-400 border-red-800/40 text-[9px] shrink-0">{data.critical}C</Badge>}
    </div>
  );
}

function PriorityBadge({ p }) {
  const colors = { P0: 'bg-red-900/30 text-red-400 border-red-800/40', P1: 'bg-amber-900/30 text-amber-400 border-amber-800/40', P2: 'bg-blue-900/30 text-blue-400 border-blue-800/40' };
  return <Badge className={`text-[9px] ${colors[p] || ''}`}>{p}</Badge>;
}

export default function DatabaseCertificationPanel() {
  const [running, setRunning] = useState(false);
  const [cert, setCert] = useState(null);
  const [error, setError] = useState(null);

  const runCertification = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('runDatabaseCertification', {});
      setCert(res?.data || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const certColors = cert ? (CERT_COLORS[cert.overall_certification] || CERT_COLORS.FAIR) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-teal-400" />
          <div>
            <h3 className="text-white font-bold text-sm">Database Certification</h3>
            <p className="text-gray-500 text-[10px]">Platform-wide health score across all entity types</p>
          </div>
        </div>
        <Button onClick={runCertification} disabled={running} size="sm" className="bg-teal-700 hover:bg-teal-600 text-white text-xs h-8">
          <RefreshCw className={`w-3 h-3 mr-1.5 ${running ? 'animate-spin' : ''}`} />
          {running ? 'Running…' : 'Run Certification'}
        </Button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg border bg-red-900/20 border-red-800/30 text-red-400 text-xs">{error}</div>
      )}

      {!cert && !running && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Shield className="w-10 h-10 text-gray-700" />
          <p className="text-gray-500 text-sm">Run the certification to see database health</p>
          <Button onClick={runCertification} className="bg-teal-700 hover:bg-teal-600 text-white text-xs">Run Now</Button>
        </div>
      )}

      {running && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw className="w-8 h-8 text-teal-400 animate-spin" />
          <p className="text-gray-400 text-sm">Evaluating all entity types…</p>
          <p className="text-gray-600 text-xs">This takes 20–40 seconds</p>
        </div>
      )}

      {cert && !running && (
        <>
          {/* Overall Score */}
          <div className={`p-6 rounded-2xl border text-center ${certColors.bg}`}>
            <div className={`text-5xl font-black font-mono ${certColors.text}`}>{cert.overall_health}</div>
            <div className={`text-sm font-bold uppercase tracking-widest mt-1 ${certColors.text}`}>{cert.overall_certification}</div>
            <div className="text-gray-500 text-[10px] mt-2">
              {cert.run_at ? `Evaluated ${format(new Date(cert.run_at), 'MMM d yyyy, HH:mm')}` : ''}
              {cert.certifier ? ` by ${cert.certifier}` : ''}
            </div>
          </div>

          {/* Domain scores */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <DomainScore label="Identity"      score={cert.identity_health}      icon={Shield} />
            <DomainScore label="Relationships" score={cert.relationship_health}   icon={Link} />
            <DomainScore label="Historical"    score={cert.historical_health}     icon={Database} />
            <DomainScore label="Import"        score={cert.import_health}         icon={Zap} />
          </div>

          {/* Entity breakdown */}
          <div>
            <h4 className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2">Entity Health Breakdown</h4>
            <div className="space-y-1.5">
              {Object.entries(cert.entity_scores || {}).map(([type, data]) => (
                <EntityRow key={type} type={type} data={data} />
              ))}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border text-center" style={{ background: 'rgba(255,255,255,0.02)', borderColor: cert.broken_relationships?.length > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.07)' }}>
              <div className={`text-xl font-bold font-mono ${cert.broken_relationships?.length > 0 ? 'text-red-400' : 'text-green-400'}`}>{cert.broken_relationships?.length || 0}</div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wider">Broken Links</div>
            </div>
            <div className="p-3 rounded-xl border text-center" style={{ background: 'rgba(255,255,255,0.02)', borderColor: cert.duplicate_candidates?.length > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.07)' }}>
              <div className={`text-xl font-bold font-mono ${cert.duplicate_candidates?.length > 0 ? 'text-amber-400' : 'text-green-400'}`}>{cert.duplicate_candidates?.length || 0}</div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wider">Dup Candidates</div>
            </div>
            <div className="p-3 rounded-xl border text-center" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className={`text-xl font-bold font-mono ${cert.total_critical_issues > 0 ? 'text-red-400' : 'text-green-400'}`}>{cert.total_critical_issues || 0}</div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wider">Critical Issues</div>
            </div>
          </div>

          {/* Broken relationships */}
          {cert.broken_relationships?.length > 0 && (
            <div>
              <h4 className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5"><AlertCircle className="w-3 h-3 text-red-400" />Broken Relationships</h4>
              <div className="space-y-1.5">
                {cert.broken_relationships.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-red-900/10 border-red-800/20">
                    <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                    <span className="text-gray-400 text-xs font-mono flex-shrink-0">{r.type}</span>
                    <span className="text-white text-xs">{r.message}</span>
                    <Badge className="ml-auto bg-red-900/30 text-red-400 border-red-800/40 text-[9px]">{r.count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {cert.recommendations?.length > 0 && (
            <div>
              <h4 className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5"><TrendingUp className="w-3 h-3 text-teal-400" />Prioritized Recommendations</h4>
              <div className="space-y-1.5">
                {cert.recommendations.slice(0, 10).map((r, i) => (
                  <div key={i} className="flex items-start gap-3 px-3 py-2 rounded-lg border" style={{ background: 'rgba(255,255,255,0.015)', borderColor: 'rgba(255,255,255,0.06)' }}>
                    <PriorityBadge p={r.priority} />
                    <span className="text-xs text-gray-300 flex-1">{r.action}</span>
                    <span className="text-[10px] text-gray-600 font-mono shrink-0">{r.category}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}