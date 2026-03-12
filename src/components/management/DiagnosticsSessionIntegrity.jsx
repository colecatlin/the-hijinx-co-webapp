import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, Play, Wrench, AlertTriangle, CheckCircle, ShieldCheck, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

const ExpandableList = ({ title, items, severity, renderItem }) => {
  const [expanded, setExpanded] = useState(false);
  const severityColors = {
    ok: 'bg-green-50 border-green-200',
    low: 'bg-blue-50 border-blue-200',
    medium: 'bg-yellow-50 border-yellow-200',
    high: 'bg-red-50 border-red-200',
  };
  return (
    <div className={`border rounded-lg p-3 ${severityColors[severity] || severityColors.low}`}>
      <button onClick={() => setExpanded(!expanded)} className="text-xs font-semibold text-left w-full flex items-center gap-2">
        {expanded ? '▼' : '▶'} {title}
      </button>
      {expanded && (
        <ul className="mt-2 space-y-1 ml-4 text-xs">
          {items.slice(0, 20).map((item, i) => (
            <li key={i} className="text-gray-700">{renderItem(item)}</li>
          ))}
          {items.length > 20 && <li className="text-gray-500 italic">… and {items.length - 20} more</li>}
        </ul>
      )}
    </div>
  );
};

const SummaryCard = ({ label, count, severity, icon: Icon }) => {
  const severityBgColor = {
    ok: 'bg-green-50 border-green-200',
    medium: 'bg-yellow-50 border-yellow-200',
    high: 'bg-red-50 border-red-200',
  }[severity] || 'bg-gray-50 border-gray-200';
  const severityTextColor = {
    ok: 'text-green-700',
    medium: 'text-yellow-700',
    high: 'text-red-700',
  }[severity] || 'text-gray-700';
  return (
    <div className={`border rounded-lg p-3 text-center ${severityBgColor}`}>
      <Icon className={`w-5 h-5 mx-auto mb-1 ${severityTextColor}`} />
      <p className={`text-lg font-bold ${severityTextColor}`}>{count}</p>
      <p className="text-xs text-gray-600">{label}</p>
    </div>
  );
};

export default function DiagnosticsSessionIntegrity() {
  const [sessionBackfillResult, setSessionBackfillResult] = useState(null);
  const [sessionBackfillRunning, setSessionBackfillRunning] = useState(false);
  const [sessionCleanupResult, setSessionCleanupResult] = useState(null);
  const [sessionCleanupRunning, setSessionCleanupRunning] = useState(false);
  const [sessionVerifyResult, setSessionVerifyResult] = useState(null);
  const [sessionVerifyRunning, setSessionVerifyRunning] = useState(false);

  const runSessionBackfill = async (dry_run = false) => {
    if (!dry_run && !window.confirm('This will populate missing normalization fields on all Session records. Proceed?')) return;
    setSessionBackfillRunning(true);
    setSessionBackfillResult(null);
    try {
      const res = await base44.functions.invoke('backfillSessionNormalization', { dry_run });
      if (res.data?.error) throw new Error(res.data.error);
      setSessionBackfillResult({ ...res.data, mode: dry_run ? 'dry_run' : 'live' });
      const total = (res.data.backfilled_normalized_name || 0) + (res.data.backfilled_canonical_slug || 0) + (res.data.backfilled_canonical_key || 0) + (res.data.backfilled_normalized_session_key || 0);
      toast.success(dry_run ? 'Session backfill preview complete' : `Session backfill complete — ${total} fields filled`);
    } catch (err) { toast.error(`Session backfill failed: ${err.message}`); }
    setSessionBackfillRunning(false);
  };

  const runSessionCleanup = async (dry_run = false) => {
    if (!dry_run && !window.confirm('This will mark duplicate Session records inactive and repair references. Proceed?')) return;
    setSessionCleanupRunning(true);
    setSessionCleanupResult(null);
    try {
      const res = await base44.functions.invoke('repairDuplicateSessionRecords', { dry_run });
      if (res.data?.error) throw new Error(res.data.error);
      setSessionCleanupResult({ ...res.data, dry_run });
      if (!dry_run && res.data?.repairs?.length > 0) {
        const refRes = await base44.functions.invoke('repairSessionReferences', { repairs: res.data.repairs, dry_run: false });
        const ref = refRes.data || {};
        toast.success(`Session cleanup done — ${res.data.duplicates_marked_inactive?.length || 0} inactive, results repaired: ${ref.updated_results || 0}`);
      } else {
        const count = res.data?.duplicates_marked_inactive?.length || 0;
        if (count === 0) toast.success('No duplicate Session groups detected.');
        else toast.success(`Session cleanup ${dry_run ? 'preview' : 'done'} — ${count} ${dry_run ? 'would be' : ''} marked inactive`);
      }
    } catch (err) { toast.error(`Session cleanup failed: ${err.message}`); }
    setSessionCleanupRunning(false);
  };

  const runSessionVerification = async () => {
    setSessionVerifyRunning(true);
    setSessionVerifyResult(null);
    try {
      const res = await base44.functions.invoke('verifySessionIntegrity', {});
      if (res.data?.error) throw new Error(res.data.error);
      setSessionVerifyResult(res.data);
      const f = res.data?.failures?.length || 0;
      const w = res.data?.warnings?.length || 0;
      if (f === 0 && w === 0) toast.success('Session integrity verified — all checks passed');
      else if (f === 0) toast.success(`Session integrity: ${w} warning(s) — review below`);
      else toast.error(`Session integrity: ${f} failure(s) detected`);
    } catch (err) { toast.error(`Session verification failed: ${err.message}`); }
    setSessionVerifyRunning(false);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-600" /> Session Integrity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-gray-500">
          Backfill deterministic session identity, detect and clean duplicate Session groups, repair linked Results/Entry/Standings references, and ensure event builder and imports are idempotent.
          <br /><span className="text-gray-400">Recommended sequence: 1. Backfill → 2. Run Cleanup → 3. Run Verification</span>
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => runSessionBackfill(true)} disabled={sessionBackfillRunning || sessionCleanupRunning} variant="outline" className="border-teal-300 text-teal-700 hover:bg-teal-50">
            {sessionBackfillRunning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running…</> : <><Play className="w-4 h-4 mr-2" />Preview Backfill</>}
          </Button>
          <Button onClick={() => runSessionBackfill(false)} disabled={sessionBackfillRunning || sessionCleanupRunning} variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50">
            {sessionBackfillRunning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running…</> : <><Wrench className="w-4 h-4 mr-2" />Run Session Normalization Backfill</>}
          </Button>
          <Button onClick={() => runSessionCleanup(true)} disabled={sessionCleanupRunning || sessionBackfillRunning} variant="outline" className="border-yellow-300 text-yellow-700 hover:bg-yellow-50">
            {sessionCleanupRunning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running…</> : <><Play className="w-4 h-4 mr-2" />Preview Session Cleanup</>}
          </Button>
          <Button onClick={() => runSessionCleanup(false)} disabled={sessionCleanupRunning || sessionBackfillRunning} variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
            {sessionCleanupRunning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running…</> : <><Wrench className="w-4 h-4 mr-2" />Run Session Cleanup</>}
          </Button>
          <Button onClick={runSessionVerification} disabled={sessionVerifyRunning} variant="outline" className="border-green-300 text-green-700 hover:bg-green-50">
            {sessionVerifyRunning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying…</> : <><Play className="w-4 h-4 mr-2" />Run Session Verification</>}
          </Button>
        </div>

        {/* Backfill result */}
        {sessionBackfillResult && !sessionBackfillRunning && (
          <div className={`rounded-lg border p-4 space-y-3 ${sessionBackfillResult.mode === 'dry_run' ? 'border-teal-200 bg-teal-50' : 'border-green-200 bg-green-50'}`}>
            <p className={`text-sm font-semibold flex items-center gap-2 ${sessionBackfillResult.mode === 'dry_run' ? 'text-teal-800' : 'text-green-800'}`}>
              {sessionBackfillResult.mode === 'dry_run' ? <><AlertTriangle className="w-4 h-4" /> Backfill Preview</> : <><CheckCircle className="w-4 h-4" /> Backfill Complete</>}
              <span className="font-normal text-xs ml-2">{sessionBackfillResult.total_sessions} total Sessions</span>
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs">
              {[
                { label: 'Already Complete', v: sessionBackfillResult.already_complete },
                { label: 'Filled: normalized_name', v: sessionBackfillResult.backfilled_normalized_name },
                { label: 'Filled: normalized_session_key', v: sessionBackfillResult.backfilled_normalized_session_key },
                { label: 'Filled: canonical_key', v: sessionBackfillResult.backfilled_canonical_key },
              ].map(({ label, v }) => (
                <div key={label} className="bg-white rounded border p-2">
                  <p className={`text-xl font-bold ${sessionBackfillResult.mode === 'dry_run' ? 'text-teal-700' : 'text-green-700'}`}>{v ?? 0}</p>
                  <p className="text-gray-500">{label}</p>
                </div>
              ))}
            </div>
            {sessionBackfillResult.warnings?.length > 0 && (
              <ExpandableList title={`Warnings (${sessionBackfillResult.warnings.length})`} items={sessionBackfillResult.warnings} severity="medium" renderItem={w => w} />
            )}
          </div>
        )}

        {/* Cleanup result */}
        {sessionCleanupResult && !sessionCleanupRunning && (() => {
          const r = sessionCleanupResult;
          const isDry = r.dry_run;
          return (
            <div className={`rounded-lg border p-4 space-y-3 ${isDry ? 'border-yellow-200 bg-yellow-50' : r.groups_processed === 0 ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
              <p className={`text-sm font-semibold flex items-center gap-2 ${isDry ? 'text-yellow-800' : r.groups_processed === 0 ? 'text-green-800' : 'text-orange-800'}`}>
                {r.groups_processed === 0 ? <><CheckCircle className="w-4 h-4" /> No duplicates found</> : isDry ? <><AlertTriangle className="w-4 h-4" /> Cleanup Preview</> : <><CheckCircle className="w-4 h-4" /> Cleanup Complete</>}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs">
                {[
                  { label: 'Groups Detected', v: r.groups_detected ?? 0 },
                  { label: 'Groups Processed', v: r.groups_processed ?? 0 },
                  { label: 'Survivors Confirmed', v: r.survivors?.length ?? 0 },
                  { label: 'Marked Inactive', v: r.duplicates_marked_inactive?.length ?? 0 },
                ].map(({ label, v }) => (
                  <div key={label} className="bg-white rounded border p-2">
                    <p className="text-xl font-bold text-gray-700">{v}</p>
                    <p className="text-gray-500">{label}</p>
                  </div>
                ))}
              </div>
              {r.skipped_groups?.length > 0 && (
                <ExpandableList title={`Skipped (ambiguous) groups (${r.skipped_groups.length})`} items={r.skipped_groups} severity="low"
                  renderItem={g => `[${g.match_type}] "${g.key}" — ${g.reason}`} />
              )}
              {r.survivors?.length > 0 && (
                <ExpandableList title={`Survivors (${r.survivors.length})`} items={r.survivors} severity="ok"
                  renderItem={s => `${s.name} [${s.match_type}] results=${s.result_count} entries=${s.entry_count}`} />
              )}
              {r.duplicates_marked_inactive?.length > 0 && (
                <ExpandableList title={`Marked inactive (${r.duplicates_marked_inactive.length})`} items={r.duplicates_marked_inactive} severity="medium"
                  renderItem={d => `${d.name} → survivor: ${d.survivor_name}`} />
              )}
              {r.warnings?.length > 0 && (
                <ExpandableList title={`Warnings (${r.warnings.length})`} items={r.warnings} severity="medium" renderItem={w => w} />
              )}
            </div>
          );
        })()}

        {/* Verification result */}
        {sessionVerifyResult && !sessionVerifyRunning && (() => {
          const v = sessionVerifyResult;
          const allOk = v.failures?.length === 0;
          const d = v.details || {};
          return (
            <div className="space-y-3">
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 font-medium text-sm ${allOk ? 'bg-green-50 border-green-300 text-green-800' : 'bg-red-50 border-red-300 text-red-800'}`}>
                {allOk ? <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />}
                <span>{allOk ? 'Session integrity verified — all checks passed' : `${v.failures.length} failure(s) detected`}</span>
                <span className="text-xs font-normal ml-2 opacity-70">{v.generated_at ? new Date(v.generated_at).toLocaleString() : ''}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryCard label="Normalization OK" count={d.normalization_coverage?.missing_normalized_session_key?.length ?? 0} severity={v.normalization_ok ? 'ok' : 'high'} icon={v.normalization_ok ? CheckCircle : XCircle} />
                <SummaryCard label="Active Dup Groups" count={v.duplicate_groups_remaining} severity={v.duplicate_groups_remaining > 0 ? 'high' : 'ok'} icon={v.duplicate_groups_remaining > 0 ? AlertTriangle : CheckCircle} />
                <SummaryCard label="Builder Idempotent" count={d.builder_and_import_check?.convergence_failures?.filter(f => f.type === 'builder').length ?? 0} severity={v.builder_idempotence_ok ? 'ok' : 'high'} icon={v.builder_idempotence_ok ? CheckCircle : AlertTriangle} />
                <SummaryCard label="Import Matching OK" count={d.builder_and_import_check?.convergence_failures?.filter(f => f.type === 'import').length ?? 0} severity={v.import_matching_ok ? 'ok' : 'high'} icon={v.import_matching_ok ? CheckCircle : AlertTriangle} />
              </div>
              {d.active_duplicate_groups?.length > 0 && (
                <ExpandableList title={`Active duplicate groups (${d.active_duplicate_groups.length})`} items={d.active_duplicate_groups} severity="high"
                  renderItem={g => `[${g.match_type}] "${g.key}" — ${g.count} sessions: ${g.names?.join(', ')}`} />
              )}
              {d.normalization_coverage?.missing_normalized_session_key?.length > 0 && (
                <ExpandableList title={`Missing normalized_session_key (${d.normalization_coverage.missing_normalized_session_key.length})`} items={d.normalization_coverage.missing_normalized_session_key} severity="high"
                  renderItem={t => `${t.name}` || t.id} />
              )}
              {d.builder_and_import_check?.convergence_failures?.length > 0 && (
                <ExpandableList title="Builder/import convergence failures" items={d.builder_and_import_check.convergence_failures} severity="high"
                  renderItem={c => `"${c.name}" (${c.type}) created ${c.create_count}x — sources: ${c.sources?.join(', ')}`} />
              )}
              {v.suspicious_new_creates?.length > 0 && (
                <ExpandableList title="Suspicious new creates (match_method=none)" items={v.suspicious_new_creates} severity="medium"
                  renderItem={c => `"${c.name}" — source: ${c.source_path}`} />
              )}
              {v.failures?.map((f, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                  <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{f}
                </div>
              ))}
              {v.warnings?.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{w}
                </div>
              ))}
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}