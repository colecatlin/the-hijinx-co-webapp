/**
 * User Context Integrity Diagnostics Component
 * 
 * Verifies that EntityCollaborator and primary_entity fields are the source of truth,
 * legacy user.data entity fields don't drive access, and users have valid primary context.
 */

import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, Play, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

function SummaryCard({ label, count, severity, icon: Icon }) {
  const bg = {
    high:   'bg-red-50 border-red-200',
    medium: 'bg-yellow-50 border-yellow-200',
    low:    'bg-blue-50 border-blue-200',
    ok:     'bg-green-50 border-green-200',
  };
  const text = {
    high: 'text-red-700', medium: 'text-yellow-700', low: 'text-blue-700', ok: 'text-green-700',
  };
  const eff = count === 0 ? 'ok' : severity;
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-1 ${bg[eff]}`}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className={`w-4 h-4 ${text[eff]}`} />}
        <span className={`text-xs font-medium ${text[eff]}`}>{label}</span>
      </div>
      <p className={`text-3xl font-bold ${text[eff]}`}>{count ?? '—'}</p>
    </div>
  );
}

export default function DiagnosticsUserContext() {
  const [backfillRunning, setBackfillRunning] = useState(false);
  const [backfillResult, setBackfillResult] = useState(null);
  const [verifyRunning, setVerifyRunning] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);

  const runBackfill = async () => {
    setBackfillRunning(true);
    setBackfillResult(null);
    try {
      const res = await base44.functions.invoke('backfillPrimaryEntityContext', {});
      if (res.data?.error) throw new Error(res.data.error);
      setBackfillResult(res.data);
      toast.success(`Primary entity context backfilled for ${res.data.users_backfilled} users`);
    } catch (err) {
      toast.error(`Backfill failed: ${err.message}`);
    }
    setBackfillRunning(false);
  };

  const runVerify = async () => {
    setVerifyRunning(true);
    setVerifyResult(null);
    try {
      const res = await base44.functions.invoke('verifyUserContextIntegrity', {});
      if (res.data?.error) throw new Error(res.data.error);
      setVerifyResult(res.data);
      const total = (res.data.invalid_primary_context_count || 0) + (res.data.legacy_conflict_count || 0);
      if (total === 0) toast.success('User context integrity verified — all checks passed');
      else toast.error(`User context: ${total} issue(s) found`);
    } catch (err) {
      toast.error(`Verification failed: ${err.message}`);
    }
    setVerifyRunning(false);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-indigo-600" /> User Context Integrity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-gray-500">
          Verifies that EntityCollaborator is the source of truth for access, primary_entity_type and primary_entity_id are the source of truth for context, and legacy user.data entity fields no longer drive permissions or dashboard behavior.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={runBackfill}
            disabled={backfillRunning}
            variant="outline"
            className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
          >
            {backfillRunning ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Backfilling…</>
            ) : (
              <><Play className="w-4 h-4 mr-2" />Run Primary Entity Backfill</>
            )}
          </Button>
          <Button
            onClick={runVerify}
            disabled={verifyRunning}
            variant="outline"
            className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
          >
            {verifyRunning ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying…</>
            ) : (
              <><Play className="w-4 h-4 mr-2" />Run Context Integrity Verification</>
            )}
          </Button>
        </div>

        {/* Backfill Result */}
        {backfillResult && !backfillRunning && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-green-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Backfill Complete
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs">
              {[
                { label: 'Users Checked', v: backfillResult.users_checked },
                { label: 'Users Backfilled', v: backfillResult.users_backfilled },
                { label: 'Skipped', v: backfillResult.skipped },
                { label: 'Warnings', v: backfillResult.warnings?.length || 0 },
              ].map(({ label, v }) => (
                <div key={label} className="bg-white rounded border border-green-100 p-2">
                  <p className="text-xl font-bold text-green-700">{v}</p>
                  <p className="text-gray-500">{label}</p>
                </div>
              ))}
            </div>
            {backfillResult.warnings?.length > 0 && (
              <div className="border-t border-green-100 pt-2">
                <p className="text-xs font-semibold text-yellow-700 uppercase mb-1">Warnings</p>
                <div className="space-y-1">
                  {backfillResult.warnings.slice(0, 5).map((w, i) => (
                    <div key={i} className="text-xs text-yellow-600 flex items-start gap-2">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      <span>{w.message || JSON.stringify(w)}</span>
                    </div>
                  ))}
                  {backfillResult.warnings.length > 5 && (
                    <p className="text-xs text-gray-400">… and {backfillResult.warnings.length - 5} more</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Verification Result */}
        {verifyResult && !verifyRunning && (
          <div className="space-y-3">
            <div
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 font-medium text-sm ${
                verifyResult.valid_primary_context_count > 0 &&
                verifyResult.invalid_primary_context_count === 0 &&
                verifyResult.legacy_conflict_count === 0
                  ? 'bg-green-50 border-green-300 text-green-800'
                  : 'bg-yellow-50 border-yellow-300 text-yellow-800'
              }`}
            >
              {verifyResult.valid_primary_context_count > 0 &&
              verifyResult.invalid_primary_context_count === 0 &&
              verifyResult.legacy_conflict_count === 0 ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              )}
              <span>
                {verifyResult.invalid_primary_context_count === 0 &&
                verifyResult.legacy_conflict_count === 0
                  ? 'User context integrity verified'
                  : `${verifyResult.invalid_primary_context_count + verifyResult.legacy_conflict_count} issue(s) detected`}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SummaryCard
                label="Valid Primary Context"
                count={verifyResult.valid_primary_context_count}
                severity="ok"
                icon={CheckCircle}
              />
              <SummaryCard
                label="Missing Primary Entity"
                count={verifyResult.missing_primary_context_count}
                severity="medium"
                icon={AlertTriangle}
              />
              <SummaryCard
                label="Invalid Primary Entity"
                count={verifyResult.invalid_primary_context_count}
                severity="high"
                icon={XCircle}
              />
              <SummaryCard
                label="Legacy Conflicts"
                count={verifyResult.legacy_conflict_count}
                severity="high"
                icon={XCircle}
              />
            </div>

            {verifyResult.warnings?.length > 0 && (
              <div className="border border-yellow-200 rounded-lg bg-yellow-50 p-3">
                <p className="text-xs font-semibold text-yellow-700 uppercase mb-2">Warnings</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {verifyResult.warnings.slice(0, 10).map((w, i) => (
                    <div key={i} className="text-xs text-yellow-600 flex items-start gap-2">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      <span>
                        {w.type}: {w.message || JSON.stringify(w)}
                      </span>
                    </div>
                  ))}
                  {verifyResult.warnings.length > 10 && (
                    <p className="text-xs text-gray-400">… and {verifyResult.warnings.length - 10} more</p>
                  )}
                </div>
              </div>
            )}

            {verifyResult.failures?.length > 0 && (
              <div className="border border-red-200 rounded-lg bg-red-50 p-3">
                <p className="text-xs font-semibold text-red-700 uppercase mb-2">Failures</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {verifyResult.failures.slice(0, 10).map((f, i) => (
                    <div key={i} className="text-xs text-red-600 flex items-start gap-2">
                      <XCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      <span>{f.type ? `${f.type}: ${f.message}` : f}</span>
                    </div>
                  ))}
                  {verifyResult.failures.length > 10 && (
                    <p className="text-xs text-gray-400">… and {verifyResult.failures.length - 10} more</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}