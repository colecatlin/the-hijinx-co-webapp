/**
 * DiagnosticsSourceImportIntegrity.jsx
 * Source Import Integrity diagnostic panel for admin Diagnostics page.
 * 
 * Displays:
 * - pipeline compliance status
 * - duplicate risk assessment
 * - normalization field coverage
 * - row-level reporting status
 * 
 * Actions:
 * - Run Source Import Verification
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, AlertTriangle, Loader2, Play, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function DiagnosticsSourceImportIntegrity() {
  const [verifyResult, setVerifyResult] = useState(null);

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.asServiceRole.functions.invoke('verifySourceImportIntegrity', {});
      return res?.data;
    },
    onSuccess: (data) => {
      setVerifyResult(data);
      if (data?.summary?.overall_ok) {
        toast.success('Source import integrity verified');
      } else {
        toast.warning('Source import integrity check found issues');
      }
    },
    onError: (err) => {
      toast.error(`Verification failed: ${err.message}`);
    },
  });

  const r = verifyResult;
  const allOk = r?.summary?.overall_ok;

  return (
    <div className="space-y-4 mb-6">
      <Card className="bg-[#262626] border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            {allOk ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span>Source Import Integrity Healthy</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <span>Source Import Integrity Issues Detected</span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          {/* Summary row */}
          {r && (
            <div className="grid grid-cols-4 gap-3">
              <div className={`bg-[#171717] rounded p-3 border ${r.pipeline_compliance_ok ? 'border-green-700' : 'border-red-700'}`}>
                <p className="text-gray-400 mb-1">Pipeline Compliance</p>
                <p className={r.pipeline_compliance_ok ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                  {r.pipeline_compliance_ok ? '✓ OK' : '✗ Issues'}
                </p>
              </div>
              <div className={`bg-[#171717] rounded p-3 border ${!r.duplicate_risk_remaining ? 'border-green-700' : 'border-yellow-700'}`}>
                <p className="text-gray-400 mb-1">Duplicate Risk</p>
                <p className={!r.duplicate_risk_remaining ? 'text-green-400 font-semibold' : 'text-yellow-400 font-semibold'}>
                  {!r.duplicate_risk_remaining ? '✓ Low' : '⚠ Detected'}
                </p>
              </div>
              <div className={`bg-[#171717] rounded p-3 border ${r.normalization_after_import_ok ? 'border-green-700' : 'border-red-700'}`}>
                <p className="text-gray-400 mb-1">Normalization</p>
                <p className={r.normalization_after_import_ok ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                  {r.normalization_after_import_ok ? '✓ OK' : '✗ Missing'}
                </p>
              </div>
              <div className={`bg-[#171717] rounded p-3 border ${r.reporting_ok ? 'border-green-700' : 'border-red-700'}`}>
                <p className="text-gray-400 mb-1">Row-Level Reporting</p>
                <p className={r.reporting_ok ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                  {r.reporting_ok ? '✓ OK' : '✗ Incomplete'}
                </p>
              </div>
            </div>
          )}

          {/* Failures */}
          {r?.failures?.length > 0 && (
            <div className="bg-red-900/20 border border-red-700 rounded p-3">
              <p className="text-red-400 font-semibold text-xs mb-2">Failures ({r.failures.length})</p>
              <ul className="space-y-1">
                {r.failures.map((f, i) => (
                  <li key={i} className="flex gap-2 text-xs text-red-300">
                    <XCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {r?.warnings?.length > 0 && (
            <div className="bg-yellow-900/20 border border-yellow-700 rounded p-3">
              <p className="text-yellow-400 font-semibold text-xs mb-2">Warnings ({r.warnings.length})</p>
              <ul className="space-y-1">
                {r.warnings.map((w, i) => (
                  <li key={i} className="flex gap-2 text-xs text-yellow-300">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action button */}
      <Button
        onClick={() => verifyMutation.mutate()}
        disabled={verifyMutation.isPending}
        size="sm"
        className="bg-blue-600 hover:bg-blue-700 text-xs h-8 w-full"
      >
        {verifyMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}
        Run Source Import Verification
      </Button>
    </div>
  );
}