/**
 * Operational Source Boundary Diagnostics
 * 
 * Verifies that operational imports cannot silently invent source truth.
 */

import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, Play, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

function SummaryCard({ label, count, severity, icon: Icon }) {
  const bg = {
    high: 'bg-red-50 border-red-200',
    medium: 'bg-yellow-50 border-yellow-200',
    ok: 'bg-green-50 border-green-200',
  };
  const text = {
    high: 'text-red-700',
    medium: 'text-yellow-700',
    ok: 'text-green-700',
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

export default function DiagnosticsOperationalSourceBoundary() {
  const [verifyRunning, setVerifyRunning] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);

  const runVerify = async () => {
    setVerifyRunning(true);
    setVerifyResult(null);
    try {
      const res = await base44.functions.invoke('verifyOperationalSourceBoundary', {});
      if (res.data?.error) throw new Error(res.data.error);
      setVerifyResult(res.data);
      const s = res.data?.summary || {};
      if (s.errors === 0 && s.warnings === 0) {
        toast.success('Operational source boundary verified');
      } else {
        toast.warning(`${s.warnings} warnings, ${s.errors} errors detected`);
      }
    } catch (err) {
      toast.error(`Verification failed: ${err.message}`);
    }
    setVerifyRunning(false);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" /> Operational Source Boundary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-gray-500">
          Verifies that operational imports (Entry, Results, Standings) resolve against existing source entities
          and never silently create missing Driver, Team, Track, Series, Event, or Session records.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={runVerify}
            disabled={verifyRunning}
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            {verifyRunning ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying…</>
            ) : (
              <><Play className="w-4 h-4 mr-2" />Run Boundary Verification</>
            )}
          </Button>
        </div>

        {verifyResult && !verifyRunning && (
          <div className="space-y-3">
            <div
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 font-medium text-sm ${
                verifyResult.boundary_enforced
                  ? 'bg-green-50 border-green-300 text-green-800'
                  : 'bg-red-50 border-red-300 text-red-800'
              }`}
            >
              {verifyResult.boundary_enforced ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              )}
              <span>
                {verifyResult.boundary_enforced
                  ? 'Source boundary enforced'
                  : 'Boundary violations detected'}
              </span>
            </div>

            {verifyResult.summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryCard
                  label="Total Checks"
                  count={verifyResult.summary.total_checks}
                  severity="ok"
                  icon={CheckCircle}
                />
                <SummaryCard
                  label="Passed"
                  count={verifyResult.summary.ok}
                  severity="ok"
                  icon={CheckCircle}
                />
                <SummaryCard
                  label="Warnings"
                  count={verifyResult.summary.warnings}
                  severity={verifyResult.summary.warnings > 0 ? 'medium' : 'ok'}
                  icon={AlertTriangle}
                />
                <SummaryCard
                  label="Errors"
                  count={verifyResult.summary.errors}
                  severity={verifyResult.summary.errors > 0 ? 'high' : 'ok'}
                  icon={XCircle}
                />
              </div>
            )}

            {verifyResult.checks && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {verifyResult.checks.map((check, i) => {
                  const iconMap = {
                    ok: <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />,
                    warning: <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />,
                    error: <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                  };
                  const bgMap = {
                    ok: 'bg-white',
                    warning: 'bg-yellow-50',
                    error: 'bg-red-50'
                  };
                  return (
                    <div key={i} className={`flex items-start gap-3 px-4 py-2.5 text-xs border-b border-gray-100 ${bgMap[check.status]}`}>
                      {iconMap[check.status]}
                      <div className="flex-1">
                        <span className="font-medium text-gray-900">{check.name}</span>
                        <p className="text-gray-500 mt-0.5">{check.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}