/**
 * EntityHealthBrowser — R9EB.3
 * Browse and evaluate health scores for any entity type.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Search, AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import EntityHealthProfile from './EntityHealthProfile';

const ENTITY_TYPES = ['Driver', 'PersonIdentity', 'Team', 'Track', 'Series', 'SeriesClass', 'Event', 'Session', 'Vehicle'];

const CERT_ORDER = { CRITICAL: 0, POOR: 1, FAIR: 2, GOOD: 3, EXCELLENT: 4 };

export default function EntityHealthBrowser() {
  const [entityType, setEntityType] = useState('Driver');
  const [sampleSize, setSampleSize] = useState('50');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('health_asc');
  const [filterSev, setFilterSev] = useState('all');

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('calculateEntityHealth', {
        entity_type: entityType,
        sample_size: parseInt(sampleSize),
      });
      setResult(res?.data || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const profiles = result?.health_profiles || [];

  const filtered = profiles.filter(p => {
    if (filterSev === 'critical') return p.critical_count > 0;
    if (filterSev === 'warning')  return p.warning_count > 0 && p.critical_count === 0;
    if (filterSev === 'clean')    return p.issue_count === 0;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'health_asc')  return a.health_score - b.health_score;
    if (sortBy === 'health_desc') return b.health_score - a.health_score;
    if (sortBy === 'cert')        return CERT_ORDER[a.certification] - CERT_ORDER[b.certification];
    if (sortBy === 'issues')      return b.issue_count - a.issue_count;
    return 0;
  });

  const summary = result?.summary;

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={entityType} onValueChange={setEntityType}>
          <SelectTrigger className="w-44 h-8 bg-white/[0.04] border-white/[0.08] text-white text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-gray-700">
            {ENTITY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sampleSize} onValueChange={setSampleSize}>
          <SelectTrigger className="w-28 h-8 bg-white/[0.04] border-white/[0.08] text-white text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-gray-700">
            {['25', '50', '100', '200'].map(n => <SelectItem key={n} value={n}>Top {n}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={run} disabled={loading} size="sm" className="bg-teal-700 hover:bg-teal-600 text-white h-8 text-xs">
          <RefreshCw className={`w-3 h-3 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Evaluating…' : 'Evaluate'}
        </Button>
        {profiles.length > 0 && <>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-36 h-8 bg-white/[0.04] border-white/[0.08] text-white text-xs ml-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              <SelectItem value="health_asc">Lowest Health</SelectItem>
              <SelectItem value="health_desc">Highest Health</SelectItem>
              <SelectItem value="cert">By Certification</SelectItem>
              <SelectItem value="issues">Most Issues</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterSev} onValueChange={setFilterSev}>
            <SelectTrigger className="w-32 h-8 bg-white/[0.04] border-white/[0.08] text-white text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              <SelectItem value="all">All Records</SelectItem>
              <SelectItem value="critical">Critical Issues</SelectItem>
              <SelectItem value="warning">Warnings Only</SelectItem>
              <SelectItem value="clean">Clean Records</SelectItem>
            </SelectContent>
          </Select>
        </>}
      </div>

      {error && <div className="px-4 py-3 rounded-lg border bg-red-900/20 border-red-800/30 text-red-400 text-xs">{error}</div>}

      {/* Summary bar */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            { label: 'Avg Health', value: summary.avg_health_score, color: summary.avg_health_score >= 85 ? 'text-green-400' : summary.avg_health_score >= 65 ? 'text-teal-400' : 'text-amber-400' },
            { label: 'Records',    value: summary.records_evaluated, color: 'text-gray-300' },
            { label: 'Critical',   value: summary.total_critical_issues, color: summary.total_critical_issues > 0 ? 'text-red-400' : 'text-green-400' },
            { label: 'Warnings',   value: summary.total_warnings, color: summary.total_warnings > 0 ? 'text-amber-400' : 'text-green-400' },
            { label: 'No Alias',   value: summary.records_without_alias, color: summary.records_without_alias > 0 ? 'text-orange-400' : 'text-green-400' },
          ].map(s => (
            <div key={s.label} className="p-2 rounded-lg border text-center" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Cert breakdown */}
      {summary && (
        <div className="flex gap-2 flex-wrap">
          {Object.entries(summary.cert_breakdown || {}).filter(([, v]) => v > 0).map(([cert, count]) => {
            const colors = { EXCELLENT: 'border-green-800/40 text-green-400', GOOD: 'border-teal-800/40 text-teal-400', FAIR: 'border-amber-800/40 text-amber-400', POOR: 'border-orange-800/40 text-orange-400', CRITICAL: 'border-red-800/40 text-red-400' };
            return <span key={cert} className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${colors[cert] || ''}`}>{cert}: {count}</span>;
          })}
        </div>
      )}

      {/* Profile list */}
      {sorted.length === 0 && !loading && summary && (
        <div className="flex flex-col items-center py-12 gap-2">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
          <p className="text-gray-500 text-sm">No records match the current filter</p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center py-16 gap-3">
          <RefreshCw className="w-7 h-7 text-teal-400 animate-spin" />
          <p className="text-gray-400 text-sm">Evaluating {sampleSize} {entityType} records…</p>
        </div>
      )}

      <div className="space-y-2">
        {sorted.map(profile => (
          <EntityHealthProfile key={profile.entity_id} profile={profile} compact />
        ))}
      </div>
    </div>
  );
}