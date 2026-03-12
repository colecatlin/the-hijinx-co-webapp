import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, Play, Wrench, AlertTriangle, CheckCircle, ShieldCheck, XCircle, BarChart3 } from 'lucide-react';
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

export default function DiagnosticsResultsAndStandingsIntegrity() {
  const [resultBackfillResult, setResultBackfillResult] = useState(null);
  const [resultBackfillRunning, setResultBackfillRunning] = useState(false);
  const [standingBackfillResult, setStandingBackfillResult] = useState(null);
  const [standingBackfillRunning, setStandingBackfillRunning] = useState(false);
  const [resultCleanupResult, setResultCleanupResult] = useState(null);
  const [resultCleanupRunning, setResultCleanupRunning] = useState(false);
  const [standingCleanupResult, setStandingCleanupResult] = useState(null);
  const [standingCleanupRunning, setStandingCleanupRunning] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyRunning, setVerifyRunning] = useState(false);

  const runResultBackfill = async (dry_run = false) => {
    if (!dry_run && !window.confirm('This will populate missing normalized_result_key fields. Proceed?')) return;
    setResultBackfillRunning(true);
    setResultBackfillResult(null);
    try {
      const res = await base44.functions.invoke('backfillResultNormalization', { dry_run });
      if (res.data?.error) throw new Error(res.data.error);
      setResultBackfillResult({ ...res.data, mode: dry_run ? 'dry_run' : 'live' });
      toast.success(dry_run ? 'Result backfill preview complete' : `Result backfill complete — ${res.data.keys_backfilled} keys filled`);
    } catch (err) { toast.error(`Result backfill failed: ${err.message}`); }
    setResultBackfillRunning(false);
  };

  const runStandingBackfill = async (dry_run = false) => {
    if (!dry_run && !window.confirm('This will populate missing normalized_standing_key fields. Proceed?')) return;
    setStandingBackfillRunning(true);
    setStandingBackfillResult(null);
    try {
      const res = await base44.functions.invoke('backfillStandingNormalization', { dry_run });
      if (res.data?.error) throw new Error(res.data.error);
      setStandingBackfillResult({ ...res.data, mode: dry_run ? 'dry_run' : 'live' });
      toast.success(dry_run ? 'Standing backfill preview complete' : `Standing backfill complete — ${res.data.keys_backfilled} keys filled`);
    } catch (err) { toast.error(`Standing backfill failed: ${err.message}`); }
    setStandingBackfillRunning(false);
  };

  const runResultCleanup = async (dry_run = false) => {
    if (!dry_run && !window.confirm('This will mark duplicate Results inactive. Proceed?')) return;
    setResultCleanupRunning(true);
    setResultCleanupResult(null);
    try {
      const res = await base44.functions.invoke('repairDuplicateResults', { dry_run });
      if (res.data?.error) throw new Error(res.data.error);
      setResultCleanupResult({ ...res.data, dry_run });
      const count = res.data?.duplicates_marked_inactive?.length || 0;
      if (count === 0) toast.success('No duplicate Results detected.');
      else toast.success(`Result cleanup ${dry_run ? 'preview' : 'done'} — ${count} ${dry_run ? 'would be' : ''} marked`);
    } catch (err) { toast.error(`Result cleanup failed: ${err.message}`); }
    setResultCleanupRunning(false);
  };

  const runStandingCleanup = async (dry_run = false) => {
    if (!dry_run && !window.confirm('This will mark duplicate Standings inactive. Proceed?')) return;
    setStandingCleanupRunning(true);
    setStandingCleanupResult(null);
    try {
      const res = await base44.functions.invoke('repairDuplicateStandings', { dry_run });
      if (res.data?.error) throw new Error(res.data.error);
      setStandingCleanupResult({ ...res.data, dry_run });
      const count = res.data?.duplicates_marked_inactive?.length || 0;
      if (count === 0) toast.success('No duplicate Standings detected.');
      else toast.success(`Standing cleanup ${dry_run ? 'preview' : 'done'} — ${count} ${dry_run ? 'would be' : ''} marked`);
    } catch (err) { toast.error(`Standing cleanup failed: ${err.message}`); }
    setStandingCleanupRunning(false);
  };

  const runVerification = async () => {
    setVerifyRunning(true);
    setVerifyResult(null);
    try {
      const res = await base44.functions.invoke('verifyResultsAndStandingsIntegrity', {});
      if (res.data?.error) throw new Error(res.data.error);
      setVerifyResult(res.data);
      const f = res.data?.failures?.length || 0;
      if (f === 0) toast.success('Results and Standings integrity verified');
      else toast.error(`${f} failure(s) detected`);
    } catch (err) { toast.error(`Verification failed: ${err.message}`); }
    setVerifyRunning(false);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-600" /> Results & Standings Integrity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-gray-500">
          Backfill deterministic identity keys, detect and clean duplicate result/standings rows, and verify imports are idempotent.
          <br /><span className="text-gray-400">Recommended sequence: 1. Backfill Results → 2. Backfill Standings → 3. Run Cleanup → 4. Run Verification</span>
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => runResultBackfill(true)} disabled={resultBackfillRunning || standingBackfillRunning} variant="outline" className="border-teal-300 text-teal-700 hover:bg-teal-50 text-xs">
            {resultBackfillRunning ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Running…</> : <><Play className="w-3 h-3 mr-1" />Preview Result Backfill</>}
          </Button>
          <Button onClick={() => runResultBackfill(false)} disabled={resultBackfillRunning || standingBackfillRunning} variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50 text-xs">
            {resultBackfillRunning ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Running…</> : <><Wrench className="w-3 h-3 mr-1" />Run Result Backfill</>}
          </Button>
          <Button onClick={() => runStandingBackfill(true)} disabled={standingBackfillRunning || resultBackfillRunning} variant="outline" className="border-teal-300 text-teal-700 hover:bg-teal-50 text-xs">
            {standingBackfillRunning ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Running…</> : <><Play className="w-3 h-3 mr-1" />Preview Standing Backfill</>}
          </Button>
          <Button onClick={() => runStandingBackfill(false)} disabled={standingBackfillRunning || resultBackfillRunning} variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50 text-xs">
            {standingBackfillRunning ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Running…</> : <><Wrench className="w-3 h-3 mr-1" />Run Standing Backfill</>}
          </Button>
          <Button onClick={() => runResultCleanup(true)} disabled={resultCleanupRunning || standingCleanupRunning} variant="outline" className="border-yellow-300 text-yellow-700 hover:bg-yellow-50 text-xs">
            {resultCleanupRunning ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Running…</> : <><Play className="w-3 h-3 mr-1" />Preview Cleanup</>}
          </Button>
          <Button onClick={() => runResultCleanup(false)} disabled={resultCleanupRunning || standingCleanupRunning} variant="outline" className="border-red-300 text-red-700 hover:bg-red-50 text-xs">
            {resultCleanupRunning ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Running…</> : <><Wrench className="w-3 h-3 mr-1" />Run Cleanup</>}
          </Button>
          <Button onClick={runVerification} disabled={verifyRunning} variant="outline" className="border-green-300 text-green-700 hover:bg-green-50 text-xs">
            {verifyRunning ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Verifying…</> : <><Play className="w-3 h-3 mr-1" />Run Verification</>}
          </Button>
        </div>

        {resultBackfillResult && !resultBackfillRunning && (
          <div className={`rounded-lg border p-3 space-y-2 text-xs ${resultBackfillResult.mode === 'dry_run' ? 'border-teal-200 bg-teal-50' : 'border-green-200 bg-green-50'}`}>
            <p className={`font-semibold flex items-center gap-2 ${resultBackfillResult.mode === 'dry_run' ? 'text-teal-800' : 'text-green-800'}`}>
              {resultBackfillResult.mode === 'dry_run' ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />} Result Backfill {resultBackfillResult.mode === 'dry_run' ? 'Preview' : 'Complete'}
            </p>
            <div className="grid grid-cols-2 gap-2 text-center">
              {[
                { label: 'Total', v: resultBackfillResult.total_results },
                { label: 'Backfilled', v: resultBackfillResult.keys_backfilled },
                { label: 'Already Done', v: resultBackfillResult.skipped },
              ].map(({ label, v }) => (
                <div key={label} className="bg-white rounded border p-1">
                  <p className="font-bold text-xs">{v}</p>
                  <p className="text-gray-500 text-[10px]">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {standingBackfillResult && !standingBackfillRunning && (
          <div className={`rounded-lg border p-3 space-y-2 text-xs ${standingBackfillResult.mode === 'dry_run' ? 'border-teal-200 bg-teal-50' : 'border-green-200 bg-green-50'}`}>
            <p className={`font-semibold flex items-center gap-2 ${standingBackfillResult.mode === 'dry_run' ? 'text-teal-800' : 'text-green-800'}`}>
              {standingBackfillResult.mode === 'dry_run' ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />} Standing Backfill {standingBackfillResult.mode === 'dry_run' ? 'Preview' : 'Complete'}
            </p>
            <div className="grid grid-cols-2 gap-2 text-center">
              {[
                { label: 'Total', v: standingBackfillResult.total_standings },
                { label: 'Backfilled', v: standingBackfillResult.keys_backfilled },
                { label: 'Already Done', v: standingBackfillResult.skipped },
              ].map(({ label, v }) => (
                <div key={label} className="bg-white rounded border p-1">
                  <p className="font-bold text-xs">{v}</p>
                  <p className="text-gray-500 text-[10px]">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {resultCleanupResult && !resultCleanupRunning && (
          <div className={`rounded-lg border p-3 space-y-2 text-xs ${resultCleanupResult.dry_run ? 'border-yellow-200 bg-yellow-50' : resultCleanupResult.groups_processed === 0 ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
            <p className={`font-semibold flex items-center gap-2 ${resultCleanupResult.dry_run ? 'text-yellow-800' : resultCleanupResult.groups_processed === 0 ? 'text-green-800' : 'text-orange-800'}`}>
              {resultCleanupResult.groups_processed === 0 ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />} Result Cleanup {resultCleanupResult.dry_run ? 'Preview' : 'Done'}
            </p>
            <p className="text-gray-600">{resultCleanupResult.duplicates_marked_inactive.length} duplicate(s) {resultCleanupResult.dry_run ? 'would be' : ''} marked</p>
          </div>
        )}

        {standingCleanupResult && !standingCleanupRunning && (
          <div className={`rounded-lg border p-3 space-y-2 text-xs ${standingCleanupResult.dry_run ? 'border-yellow-200 bg-yellow-50' : standingCleanupResult.groups_processed === 0 ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
            <p className={`font-semibold flex items-center gap-2 ${standingCleanupResult.dry_run ? 'text-yellow-800' : standingCleanupResult.groups_processed === 0 ? 'text-green-800' : 'text-orange-800'}`}>
              {standingCleanupResult.groups_processed === 0 ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />} Standing Cleanup {standingCleanupResult.dry_run ? 'Preview' : 'Done'}
            </p>
            <p className="text-gray-600">{standingCleanupResult.duplicates_marked_inactive.length} duplicate(s) {standingCleanupResult.dry_run ? 'would be' : ''} marked</p>
          </div>
        )}

        {verifyResult && !verifyRunning && (
          <div className="space-y-2">
            <div className={`flex items-center gap-2 px-3 py-2 rounded border-2 text-sm font-medium ${verifyResult.import_idempotence_ok ? 'bg-green-50 border-green-300 text-green-800' : 'bg-red-50 border-red-300 text-red-800'}`}>
              {verifyResult.import_idempotence_ok ? <ShieldCheck className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {verifyResult.import_idempotence_ok ? 'Results & Standings integrity verified' : `${verifyResult.failures?.length || 0} failure(s)`}
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <SummaryCard label="Results OK" count={verifyResult.details?.results_with_key} severity={verifyResult.result_normalization_ok ? 'ok' : 'high'} icon={verifyResult.result_normalization_ok ? CheckCircle : XCircle} />
              <SummaryCard label="Standings OK" count={verifyResult.details?.standings_with_key} severity={verifyResult.standings_normalization_ok ? 'ok' : 'high'} icon={verifyResult.standings_normalization_ok ? CheckCircle : XCircle} />
              <SummaryCard label="Dup Results" count={verifyResult.duplicate_results_remaining} severity={verifyResult.duplicate_results_remaining > 0 ? 'high' : 'ok'} icon={verifyResult.duplicate_results_remaining > 0 ? AlertTriangle : CheckCircle} />
              <SummaryCard label="Dup Standings" count={verifyResult.duplicate_standings_remaining} severity={verifyResult.duplicate_standings_remaining > 0 ? 'high' : 'ok'} icon={verifyResult.duplicate_standings_remaining > 0 ? AlertTriangle : CheckCircle} />
            </div>
            {verifyResult.failures?.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
                <XCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />{f}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}