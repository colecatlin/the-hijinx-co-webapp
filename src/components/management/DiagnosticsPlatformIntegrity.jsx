/**
 * DiagnosticsPlatformIntegrity.jsx
 * 
 * Master Platform Integrity section for the Diagnostics page.
 * Provides one-click access to all platform stability checks.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CheckCircle2, AlertTriangle, XCircle, Loader2, Play,
  Shield, Database, GitBranch, Download, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

function StatusBadge({ status }) {
  if (status === 'healthy' || status === true) {
    return <span className="flex items-center gap-1 text-green-400 text-xs font-semibold"><CheckCircle2 className="w-3 h-3" />Healthy</span>;
  }
  if (status === 'warning') {
    return <span className="flex items-center gap-1 text-yellow-400 text-xs font-semibold"><AlertTriangle className="w-3 h-3" />Warning</span>;
  }
  if (status === 'failure' || status === false) {
    return <span className="flex items-center gap-1 text-red-400 text-xs font-semibold"><XCircle className="w-3 h-3" />Failed</span>;
  }
  return <span className="text-gray-500 text-xs">—</span>;
}

function MetricTile({ label, value, variant = 'neutral' }) {
  const colors = {
    good: 'text-green-400',
    warn: 'text-yellow-400',
    bad: 'text-red-400',
    neutral: 'text-white',
  };
  return (
    <div className="bg-[#171717] rounded p-3 border border-gray-700">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className={`font-bold text-lg ${colors[variant]}`}>{value ?? '—'}</p>
    </div>
  );
}

function IssueList({ title, items = [], color = 'red' }) {
  if (!items.length) return null;
  const cls = {
    red: 'bg-red-900/20 border-red-700 text-red-300',
    yellow: 'bg-yellow-900/20 border-yellow-700 text-yellow-300',
  };
  return (
    <div className={`rounded border p-3 ${cls[color]}`}>
      <p className="font-semibold text-xs mb-2">{title} ({items.length})</p>
      <ul className="space-y-1">
        {items.slice(0, 8).map((item, i) => (
          <li key={i} className="text-xs">• {item}</li>
        ))}
        {items.length > 8 && <li className="text-xs opacity-60">…and {items.length - 8} more</li>}
      </ul>
    </div>
  );
}

export default function DiagnosticsPlatformIntegrity() {
  const [fullResult, setFullResult] = useState(null);
  const [orphanResult, setOrphanResult] = useState(null);
  const [normResult, setNormResult] = useState(null);
  const [dupResult, setDupResult] = useState(null);
  const [idempotenceResult, setIdempotenceResult] = useState(null);
  const [accessResult, setAccessResult] = useState(null);

  const [fullRunning, setFullRunning] = useState(false);
  const [orphanRunning, setOrphanRunning] = useState(false);
  const [normRunning, setNormRunning] = useState(false);
  const [dupRunning, setDupRunning] = useState(false);
  const [idempotenceRunning, setIdempotenceRunning] = useState(false);
  const [accessRunning, setAccessRunning] = useState(false);

  async function invoke(fnName, payload = {}) {
    const res = await base44.asServiceRole.functions.invoke(fnName, payload);
    if (res?.data?.error) throw new Error(res.data.error);
    return res?.data;
  }

  async function runFull() {
    setFullRunning(true);
    try {
      const data = await invoke('runFullPlatformIntegrityCheck');
      setFullResult(data);
      toast.success(`Platform check: ${data.system_status}`);
    } catch (e) { toast.error(e.message); }
    setFullRunning(false);
  }

  async function runDuplicate() {
    setDupRunning(true);
    try {
      const data = await invoke('runDuplicateAudit');
      setDupResult(data);
      toast.success(`Duplicate audit: ${data.duplicate_groups_remaining} group(s) remaining`);
    } catch (e) { toast.error(e.message); }
    setDupRunning(false);
  }

  async function runOrphan() {
    setOrphanRunning(true);
    try {
      const data = await invoke('findOrphanedRecords');
      setOrphanResult(data);
      toast.success(`Orphan scan: ${data.total_orphaned} orphan(s) found`);
    } catch (e) { toast.error(e.message); }
    setOrphanRunning(false);
  }

  async function runNorm() {
    setNormRunning(true);
    try {
      const data = await invoke('findMissingNormalizationFields');
      setNormResult(data);
      toast.success(`Normalization: ${data.total_missing} missing field(s)`);
    } catch (e) { toast.error(e.message); }
    setNormRunning(false);
  }

  async function runIdempotence() {
    setIdempotenceRunning(true);
    try {
      const data = await invoke('verifyImportIdempotence');
      setIdempotenceResult(data);
      toast.success('Import idempotence check complete');
    } catch (e) { toast.error(e.message); }
    setIdempotenceRunning(false);
  }

  async function runAccess() {
    setAccessRunning(true);
    try {
      const data = await invoke('verifyAccessSystemIntegrity');
      setAccessResult(data);
      toast.success(`Access integrity: ${data.overall_valid ? 'valid' : 'issues found'}`);
    } catch (e) { toast.error(e.message); }
    setAccessRunning(false);
  }

  const systemStatus = fullResult?.system_status;
  const statusColorMap = {
    healthy: 'bg-green-900/30 border-green-600 text-green-300',
    warning: 'bg-yellow-900/30 border-yellow-600 text-yellow-300',
    failure: 'bg-red-900/30 border-red-600 text-red-300',
  };

  return (
    <div className="space-y-4">
      {/* ── System Status Banner ── */}
      {fullResult && (
        <div className={`rounded-lg border-2 px-4 py-3 flex items-center gap-3 font-semibold text-sm ${statusColorMap[systemStatus] || 'bg-gray-800 border-gray-600 text-gray-300'}`}>
          {systemStatus === 'healthy' && <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
          {systemStatus === 'warning' && <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
          {systemStatus === 'failure' && <XCircle className="w-5 h-5 flex-shrink-0" />}
          <span>
            System Status: {systemStatus?.toUpperCase()}
            {fullResult.runtime_ms && <span className="font-normal text-xs ml-3 opacity-70">ran in {fullResult.runtime_ms}ms</span>}
          </span>
        </div>
      )}

      {/* ── Overview tiles from full check ── */}
      {fullResult && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricTile label="Duplicate Groups" value={fullResult.duplicate_groups_remaining} variant={fullResult.duplicate_groups_remaining === 0 ? 'good' : fullResult.duplicate_groups_remaining < 10 ? 'warn' : 'bad'} />
          <MetricTile label="Orphaned Records" value={fullResult.orphaned_records} variant={fullResult.orphaned_records === 0 ? 'good' : fullResult.orphaned_records < 10 ? 'warn' : 'bad'} />
          <MetricTile label="Missing Norm Fields" value={fullResult.missing_normalization_fields} variant={fullResult.missing_normalization_fields === 0 ? 'good' : fullResult.missing_normalization_fields < 50 ? 'warn' : 'bad'} />
          <MetricTile label="Dup Severity" value={`Level ${fullResult.duplicate_severity ?? '?'}`} variant={fullResult.duplicate_severity === 0 ? 'good' : fullResult.duplicate_severity === 1 ? 'warn' : 'bad'} />
        </div>
      )}

      {/* ── Sub-system status from full check ── */}
      {fullResult && (
        <div className="bg-[#1a1a1a] rounded border border-gray-700 overflow-hidden text-xs">
          {[
            { label: 'Source Entity Integrity', status: fullResult.source_entity_integrity?.failures?.length === 0 ? 'healthy' : 'failure' },
            { label: 'Event & Session Integrity', status: fullResult.event_session_integrity?.failures?.length === 0 ? 'healthy' : 'failure' },
            { label: 'Results & Standings', status: fullResult.results_integrity?.failures?.length === 0 ? 'healthy' : 'failure' },
            { label: 'Entry & Class Integrity', status: fullResult.entry_class_integrity?.failures?.length === 0 ? 'healthy' : 'failure' },
            { label: 'Import Integrity', status: fullResult.import_integrity?.pipeline_compliance_ok ? 'healthy' : 'warning' },
            { label: 'Access System', status: fullResult.access_system_integrity?.overall_valid ? 'healthy' : 'warning' },
          ].map((row, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-gray-700 last:border-b-0">
              <span className="text-gray-300">{row.label}</span>
              <StatusBadge status={row.status} />
            </div>
          ))}
        </div>
      )}

      {/* ── Full check failures/warnings ── */}
      {fullResult && (
        <div className="space-y-2">
          <IssueList title="Failures" items={fullResult.failures || []} color="red" />
          <IssueList title="Warnings" items={fullResult.warnings || []} color="yellow" />
        </div>
      )}

      {/* ── Duplicate Audit Result ── */}
      {dupResult && (
        <Card className="bg-[#1e1e1e] border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-xs font-semibold">Duplicate Audit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2 text-xs">
              {Object.entries(dupResult.duplicate_entities_by_type || {}).map(([type, count]) => (
                <div key={type} className={`rounded p-2 text-center border ${count === 0 ? 'border-green-800 bg-green-900/20' : 'border-yellow-800 bg-yellow-900/20'}`}>
                  <p className={count === 0 ? 'text-green-400 font-bold' : 'text-yellow-400 font-bold'}>{count}</p>
                  <p className="text-gray-400 capitalize">{type}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">Severity Level: {dupResult.severity_level} ({['Clean', 'Minor', 'Moderate', 'Severe'][dupResult.severity_level] || '—'})</p>
          </CardContent>
        </Card>
      )}

      {/* ── Orphan Scan Result ── */}
      {orphanResult && (
        <Card className="bg-[#1e1e1e] border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-xs font-semibold">Orphaned Records ({orphanResult.total_orphaned} total)</CardTitle>
          </CardHeader>
          <CardContent>
            {orphanResult.orphan_groups?.length === 0 ? (
              <p className="text-green-400 text-xs">✓ No orphaned records found</p>
            ) : (
              <div className="space-y-1">
                {orphanResult.orphan_groups?.map((g, i) => (
                  <div key={i} className="flex items-center justify-between text-xs text-gray-300 border border-gray-700 rounded px-3 py-2">
                    <span className="font-semibold">{g.entity}</span>
                    <span className="text-yellow-400">{g.record_ids.length} records</span>
                    <span className="text-gray-500">{g.missing_reference_type}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Normalization Result ── */}
      {normResult && (
        <Card className="bg-[#1e1e1e] border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-xs font-semibold">Missing Normalization Fields ({normResult.total_missing} total)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {Object.entries(normResult.missing_by_entity || {}).map(([entity, count]) => (
                <div key={entity} className={`rounded p-2 text-center border ${count === 0 ? 'border-green-800 bg-green-900/20' : 'border-yellow-800 bg-yellow-900/20'}`}>
                  <p className={count === 0 ? 'text-green-400 font-bold' : 'text-yellow-400 font-bold'}>{count}</p>
                  <p className="text-gray-400">{entity}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Import Idempotence Result ── */}
      {idempotenceResult && (
        <Card className="bg-[#1e1e1e] border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-xs font-semibold">Import Idempotence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 text-xs">
              {[
                { label: 'CSV Import', val: idempotenceResult.csv_import_idempotent },
                { label: 'NASCAR Driver Import', val: idempotenceResult.nascar_driver_import_idempotent },
                { label: 'NASCAR Schedule Import', val: idempotenceResult.nascar_schedule_import_idempotent },
                { label: 'ICS Calendar Import', val: idempotenceResult.ics_calendar_import_idempotent },
              ].map(({ label, val }, i) => (
                <div key={i} className="flex items-center justify-between text-gray-300">
                  <span>{label}</span>
                  <StatusBadge status={val} />
                </div>
              ))}
            </div>
            {idempotenceResult.warnings?.length > 0 && (
              <IssueList title="Warnings" items={idempotenceResult.warnings} color="yellow" />
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Access System Result ── */}
      {accessResult && (
        <Card className="bg-[#1e1e1e] border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-xs font-semibold">Access System Integrity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 text-xs">
              {[
                { label: 'Users valid', val: accessResult.users_valid },
                { label: 'Collaborators valid', val: accessResult.collaborators_valid },
                { label: 'Invitations valid', val: accessResult.invitations_valid },
              ].map(({ label, val }, i) => (
                <div key={i} className="flex items-center justify-between text-gray-300">
                  <span>{label}</span>
                  <StatusBadge status={val} />
                </div>
              ))}
              {accessResult.orphan_collaborators_count > 0 && (
                <p className="text-yellow-400 mt-2">⚠ {accessResult.orphan_collaborators_count} orphan collaborator(s)</p>
              )}
              {accessResult.broken_invitations_count > 0 && (
                <p className="text-yellow-400">⚠ {accessResult.broken_invitations_count} broken invitation(s)</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Action Buttons ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <Button onClick={runFull} disabled={fullRunning} size="sm" className="bg-indigo-700 hover:bg-indigo-600 text-xs h-8 col-span-2 md:col-span-3">
          {fullRunning ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Running Full Check…</> : <><Shield className="w-3 h-3 mr-1" />Run Full Platform Integrity Check</>}
        </Button>
        <Button onClick={runDuplicate} disabled={dupRunning} size="sm" className="bg-gray-700 hover:bg-gray-600 text-xs h-8">
          {dupRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <GitBranch className="w-3 h-3 mr-1" />}
          {dupRunning ? 'Scanning…' : 'Duplicate Audit'}
        </Button>
        <Button onClick={runOrphan} disabled={orphanRunning} size="sm" className="bg-gray-700 hover:bg-gray-600 text-xs h-8">
          {orphanRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3 mr-1" />}
          {orphanRunning ? 'Scanning…' : 'Orphan Scan'}
        </Button>
        <Button onClick={runNorm} disabled={normRunning} size="sm" className="bg-gray-700 hover:bg-gray-600 text-xs h-8">
          {normRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
          {normRunning ? 'Scanning…' : 'Norm Fields'}
        </Button>
        <Button onClick={runIdempotence} disabled={idempotenceRunning} size="sm" className="bg-gray-700 hover:bg-gray-600 text-xs h-8">
          {idempotenceRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3 mr-1" />}
          {idempotenceRunning ? 'Checking…' : 'Import Idempotence'}
        </Button>
        <Button onClick={runAccess} disabled={accessRunning} size="sm" className="bg-gray-700 hover:bg-gray-600 text-xs h-8 col-span-2">
          {accessRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3 mr-1" />}
          {accessRunning ? 'Checking…' : 'Access System Verification'}
        </Button>
      </div>
    </div>
  );
}