/**
 * DiagnosticsEntryClassIntegrity.jsx
 *
 * Entry and Class integrity panel for the Diagnostics page.
 * Handles backfill, duplicate cleanup, and verification for Entries, SeriesClasses, EventClasses.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle, XCircle, Loader2, Play, Wrench } from 'lucide-react';
import { toast } from 'sonner';

function StatBox({ label, value, warn = false }) {
  const isWarn = warn && value > 0;
  return (
    <div className={`bg-white rounded border px-3 py-2 text-center ${isWarn ? 'border-amber-300 bg-amber-50' : 'border-gray-200'}`}>
      <p className={`text-2xl font-bold ${isWarn ? 'text-amber-700' : 'text-gray-700'}`}>{value ?? '—'}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function VerdictBanner({ verdict }) {
  if (!verdict) return null;
  const cfg = {
    passed:  { cls: 'bg-green-50 border-green-300 text-green-800',   Icon: CheckCircle,    msg: 'Passed — Entry and class integrity healthy' },
    warning: { cls: 'bg-yellow-50 border-yellow-300 text-yellow-800', Icon: AlertTriangle,  msg: 'Warning — some gaps detected, run backfill and cleanup' },
    failed:  { cls: 'bg-red-50 border-red-300 text-red-800',          Icon: XCircle,        msg: 'Failed — identity key gaps or active duplicates detected' },
  }[verdict] || { cls: 'bg-gray-50 border-gray-200 text-gray-700', Icon: AlertTriangle, msg: verdict };
  const { cls, Icon, msg } = cfg;
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 font-medium text-sm ${cls}`}>
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span>{msg}</span>
    </div>
  );
}

function RepairPanel({ result, label }) {
  if (!result) return null;
  const isBackfill = 'entries_backfilled' in result;
  const isRepair   = 'groups_processed' in result;
  const isVerify   = 'summary' in result;
  return (
    <div className={`rounded-lg border p-4 text-xs space-y-2 ${result.dry_run ? 'border-teal-200 bg-teal-50' : 'border-green-200 bg-green-50'}`}>
      <p className={`font-semibold text-sm flex items-center gap-2 ${result.dry_run ? 'text-teal-800' : 'text-green-800'}`}>
        <CheckCircle className="w-4 h-4" />
        {result.dry_run ? `${label} — Preview` : `${label} — Complete`}
      </p>
      {isBackfill && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            { l: 'Entries backfilled',        v: result.entries_backfilled },
            { l: 'SeriesClasses backfilled',  v: result.series_classes_backfilled },
            { l: 'EventClasses backfilled',   v: result.event_classes_backfilled },
            { l: 'Entries already done',      v: result.entries_already_complete },
            { l: 'SeriesClasses already done',v: result.series_classes_already_complete },
            { l: 'EventClasses already done', v: result.event_classes_already_complete },
          ].map(({ l, v }) => (
            <div key={l} className="bg-white rounded border border-green-100 p-2 text-center">
              <p className="text-lg font-bold text-green-700">{v ?? 0}</p>
              <p className="text-gray-500">{l}</p>
            </div>
          ))}
        </div>
      )}
      {isRepair && !isVerify && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { l: 'Groups found',      v: result.groups_detected },
            { l: 'Groups processed',  v: result.groups_processed },
            { l: 'Survivors',         v: result.survivors?.length },
            { l: 'Dups marked',       v: result.duplicates_marked?.length },
          ].map(({ l, v }) => (
            <div key={l} className="bg-white rounded border border-green-100 p-2 text-center">
              <p className="text-lg font-bold text-green-700">{v ?? 0}</p>
              <p className="text-gray-500">{l}</p>
            </div>
          ))}
        </div>
      )}
      {isVerify && (
        <div className="space-y-1">
          {(result.checks || []).map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              {c.pass ? <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" /> : c.severity === 'high' ? <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />}
              <span className={c.pass ? 'text-gray-600' : c.severity === 'high' ? 'text-red-700' : 'text-yellow-700'}>{c.label}</span>
              {!c.pass && <span className="ml-auto font-mono text-gray-500">{c.val}</span>}
            </div>
          ))}
        </div>
      )}
      {result.message && <p className="text-gray-600 italic">{result.message}</p>}
      {result.warnings?.length > 0 && (
        <div className="border-t border-amber-200 pt-2 mt-2">
          <p className="text-amber-700 font-semibold mb-1">Warnings ({result.warnings.length})</p>
          <div className="max-h-24 overflow-y-auto space-y-0.5">
            {result.warnings.map((w, i) => <p key={i} className="font-mono text-amber-700">{w}</p>)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DiagnosticsEntryClassIntegrity() {
  const [verifyReport,        setVerifyReport]        = useState(null);
  const [verifyRunning,       setVerifyRunning]        = useState(false);
  const [backfillResult,      setBackfillResult]       = useState(null);
  const [backfillRunning,     setBackfillRunning]      = useState(false);
  const [entryRepair,         setEntryRepair]          = useState(null);
  const [entryRunning,        setEntryRunning]         = useState(false);
  const [scRepair,            setScRepair]             = useState(null);
  const [scRunning,           setScRunning]            = useState(false);
  const [ecRepair,            setEcRepair]             = useState(null);
  const [ecRunning,           setEcRunning]            = useState(false);

  async function runVerify() {
    setVerifyRunning(true); setVerifyReport(null);
    try {
      const res = await base44.functions.invoke('verifyEntryAndClassIntegrity', {});
      if (res.data?.error) throw new Error(res.data.error);
      setVerifyReport(res.data);
      const v = res.data?.summary?.verdict;
      if (v === 'passed') toast.success('Entry and class integrity verified — all checks passed');
      else if (v === 'warning') toast.success('Verification complete — minor gaps detected');
      else toast.error('Verification failed — run backfill and cleanup');
    } catch (err) { toast.error(`Verification failed: ${err.message}`); }
    setVerifyRunning(false);
  }

  async function runBackfill(dry_run) {
    if (!dry_run && !window.confirm('This will write identity keys to all Entry and class records missing them. Proceed?')) return;
    setBackfillRunning(true); setBackfillResult(null);
    try {
      const res = await base44.functions.invoke('backfillEntryAndClassIdentityKeys', { dry_run });
      if (res.data?.error) throw new Error(res.data.error);
      setBackfillResult({ ...res.data, dry_run });
      if (!dry_run) toast.success(`Backfill complete — ${res.data.entries_backfilled} entries, ${res.data.series_classes_backfilled} series classes, ${res.data.event_classes_backfilled} event classes updated`);
      else toast.success('Preview complete');
    } catch (err) { toast.error(`Backfill failed: ${err.message}`); }
    setBackfillRunning(false);
  }

  async function runCleanup(fn, setState, setRunning, label, dry_run) {
    if (!dry_run && !window.confirm(`This will repair duplicate ${label} records. Proceed?`)) return;
    setRunning(true); setState(null);
    try {
      const res = await base44.functions.invoke(fn, { dry_run });
      if (res.data?.error) throw new Error(res.data.error);
      setState({ ...res.data, dry_run });
      if (!dry_run) toast.success(`${label} cleanup complete — ${res.data.duplicates_marked?.length || 0} duplicates marked`);
      else toast.success(`Preview: ${res.data.groups_detected || 0} duplicate groups found`);
    } catch (err) { toast.error(`${label} cleanup failed: ${err.message}`); }
    setRunning(false);
  }

  const e  = verifyReport?.entries        || {};
  const sc = verifyReport?.series_classes || {};
  const ec = verifyReport?.event_classes  || {};
  const sm = verifyReport?.summary        || {};

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Play className="w-4 h-4 text-blue-600" /> Entry and Class Integrity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-xs text-gray-500">
          Ensures Entries, SeriesClasses, and EventClasses have stable identity keys and are free of duplicates. Repairs re-point broken class references on Entries, Sessions, and Standings.
        </p>

        {/* ── Action buttons ──────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={runVerify} disabled={verifyRunning} variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50">
            {verifyRunning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying…</> : <><Play className="w-4 h-4 mr-2" />Run Verification</>}
          </Button>
          <Button onClick={() => runBackfill(true)} disabled={backfillRunning} variant="outline" className="border-teal-300 text-teal-700 hover:bg-teal-50">
            {backfillRunning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running…</> : <><Play className="w-4 h-4 mr-2" />Preview Backfill</>}
          </Button>
          <Button onClick={() => runBackfill(false)} disabled={backfillRunning} variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50">
            {backfillRunning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running…</> : <><Wrench className="w-4 h-4 mr-2" />Run Identity Backfill</>}
          </Button>
          <Button onClick={() => runCleanup('repairDuplicateEntries', setEntryRepair, setEntryRunning, 'Entry', true)} disabled={entryRunning} variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50">
            {entryRunning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning…</> : <><Play className="w-4 h-4 mr-2" />Scan Entry Dups</>}
          </Button>
          <Button onClick={() => runCleanup('repairDuplicateEntries', setEntryRepair, setEntryRunning, 'Entry', false)} disabled={entryRunning} variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50">
            {entryRunning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Cleaning…</> : <><Wrench className="w-4 h-4 mr-2" />Run Entry Cleanup</>}
          </Button>
          <Button onClick={() => runCleanup('repairDuplicateSeriesClasses', setScRepair, setScRunning, 'SeriesClass', true)} disabled={scRunning} variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">
            {scRunning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning…</> : <><Play className="w-4 h-4 mr-2" />Scan SeriesClass Dups</>}
          </Button>
          <Button onClick={() => runCleanup('repairDuplicateSeriesClasses', setScRepair, setScRunning, 'SeriesClass', false)} disabled={scRunning} variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50">
            {scRunning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Cleaning…</> : <><Wrench className="w-4 h-4 mr-2" />Run SeriesClass Cleanup</>}
          </Button>
          <Button onClick={() => runCleanup('repairDuplicateEventClasses', setEcRepair, setEcRunning, 'EventClass', true)} disabled={ecRunning} variant="outline" className="border-indigo-300 text-indigo-700 hover:bg-indigo-50">
            {ecRunning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning…</> : <><Play className="w-4 h-4 mr-2" />Scan EventClass Dups</>}
          </Button>
          <Button onClick={() => runCleanup('repairDuplicateEventClasses', setEcRepair, setEcRunning, 'EventClass', false)} disabled={ecRunning} variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50">
            {ecRunning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Cleaning…</> : <><Wrench className="w-4 h-4 mr-2" />Run EventClass Cleanup</>}
          </Button>
        </div>

        {/* ── Verification report ─────────────────────────────────────── */}
        {verifyReport && (
          <div className="space-y-4">
            <VerdictBanner verdict={sm.verdict} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Entries ({e.total ?? 0})</p>
                <div className="grid grid-cols-2 gap-2">
                  <StatBox label="Missing Key"      value={e.missing_identity_key}  warn />
                  <StatBox label="Dup Groups"       value={e.duplicate_groups_count} warn />
                  <StatBox label="Missing Driver"   value={e.missing_driver_ref}    warn />
                  <StatBox label="Missing Class"    value={e.missing_class_ref}     warn />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">SeriesClasses ({sc.total ?? 0})</p>
                <div className="grid grid-cols-2 gap-2">
                  <StatBox label="Missing Key"  value={sc.missing_identity_key}   warn />
                  <StatBox label="Dup Groups"   value={sc.duplicate_groups_count} warn />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">EventClasses ({ec.total ?? 0})</p>
                <div className="grid grid-cols-2 gap-2">
                  <StatBox label="Missing Key"  value={ec.missing_identity_key}   warn />
                  <StatBox label="Dup Groups"   value={ec.duplicate_groups_count} warn />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Op results ──────────────────────────────────────────────── */}
        <RepairPanel result={backfillResult} label="Identity Key Backfill" />
        <RepairPanel result={entryRepair}    label="Entry Duplicate Cleanup" />
        <RepairPanel result={scRepair}       label="SeriesClass Duplicate Cleanup" />
        <RepairPanel result={ecRepair}       label="EventClass Duplicate Cleanup" />

        <div className="text-xs text-gray-400 border-t pt-3">
          <strong>Recommended sequence:</strong> 1. Run Verification → 2. Run Identity Backfill → 3. Run Entry Cleanup → 4. Run SeriesClass Cleanup → 5. Run EventClass Cleanup → 6. Re-run Verification
        </div>
      </CardContent>
    </Card>
  );
}