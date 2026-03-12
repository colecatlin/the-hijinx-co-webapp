/**
 * Diagnostics Architecture Health
 * 
 * Displays architecture verification results from buildArchitectureHealthReport.
 */

import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Play, AlertTriangle, ShieldCheck, XCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function DiagnosticsArchitectureHealth() {
  const [report, setReport] = useState(null);
  const [running, setRunning] = useState(false);

  const runHealthCheck = async () => {
    setRunning(true);
    setReport(null);
    try {
      const res = await base44.functions.invoke('buildArchitectureHealthReport', {});
      if (res.data?.error) throw new Error(res.data.error);
      setReport(res.data);
      const status = res.data.overall_architecture_status;
      if (status === 'healthy') {
        toast.success('Architecture is healthy');
      } else if (status === 'minor_warnings') {
        toast.success('Architecture has minor warnings — review below');
      } else if (status === 'attention_needed') {
        toast.error('Architecture needs attention — review below');
      } else {
        toast.error('Architecture has critical issues — review below');
      }
    } catch (err) {
      toast.error(`Health check failed: ${err.message}`);
    }
    setRunning(false);
  };

  if (!report && !running) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" /> Architecture Health
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-gray-500">
            Comprehensive verification that the three critical architecture risks (operational boundary, user context truth, shared logic consistency) are stable and functioning correctly across the platform.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={runHealthCheck} disabled={running} variant="outline" className="border-indigo-300 text-indigo-700 hover:bg-indigo-50">
              {running ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running…</> : <><Play className="w-4 h-4 mr-2" />Run Architecture Health Check</>}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (running) {
    return (
      <Card className="mb-6">
        <CardContent className="py-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto mb-3" />
          <p className="text-gray-500">Running comprehensive architecture verification…</p>
        </CardContent>
      </Card>
    );
  }

  if (!report) return null;

  const overallOk = report.overall_architecture_status === 'healthy';

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600" /> Architecture Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Button onClick={runHealthCheck} disabled={running} variant="outline" className="border-indigo-300 text-indigo-700 hover:bg-indigo-50">
            {running ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running…</> : <><Play className="w-4 h-4 mr-2" />Run Architecture Health Check</>}
          </Button>
          {report && <span className="text-xs text-gray-400">Last run: {new Date(report.generated_at).toLocaleString()}</span>}
        </div>

        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 font-medium text-sm ${
          overallOk ? 'bg-green-50 border-green-300 text-green-800' : 
          report.overall_architecture_status === 'minor_warnings' ? 'bg-blue-50 border-blue-300 text-blue-800' :
          report.overall_architecture_status === 'attention_needed' ? 'bg-yellow-50 border-yellow-300 text-yellow-800' :
          'bg-red-50 border-red-300 text-red-800'
        }`}>
          {overallOk ? <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0" /> : 
           report.overall_architecture_status === 'minor_warnings' ? <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0" /> :
           report.overall_architecture_status === 'attention_needed' ? <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" /> :
           <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
          <span>Architecture Status: <strong>{report.overall_architecture_status}</strong></span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className={`rounded-lg border px-3 py-2 text-center text-xs ${
            report.operational_boundary_health.violations === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
          }`}>
            <p className="font-semibold text-gray-700">Operational Boundary</p>
            <p className="text-2xl font-bold mt-1">{report.operational_boundary_health.violations === 0 ? '✓' : '⚠'}</p>
          </div>
          <div className={`rounded-lg border px-3 py-2 text-center text-xs ${
            report.user_context_health.legacy_fields_found === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
          }`}>
            <p className="font-semibold text-gray-700">User Context Truth</p>
            <p className="text-2xl font-bold mt-1">{report.user_context_health.legacy_fields_found === 0 ? '✓' : '⚠'}</p>
          </div>
          <div className={`rounded-lg border px-3 py-2 text-center text-xs ${
            report.shared_logic_health.high_drift_pages.length === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
          }`}>
            <p className="font-semibold text-gray-700">Shared Logic</p>
            <p className="text-2xl font-bold mt-1">{report.shared_logic_health.high_drift_pages.length === 0 ? '✓' : '⚠'}</p>
          </div>
          <div className={`rounded-lg border px-3 py-2 text-center text-xs ${
            report.cache_invalidation_health.inline_invalidation_found === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
          }`}>
            <p className="font-semibold text-gray-700">Cache Invalidation</p>
            <p className="text-2xl font-bold mt-1">{report.cache_invalidation_health.inline_invalidation_found === 0 ? '✓' : '⚠'}</p>
          </div>
          <div className={`rounded-lg border px-3 py-2 text-center text-xs ${
            report.import_idempotence_health.duplicate_creating_imports === 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <p className="font-semibold text-gray-700">Import Idempotence</p>
            <p className="text-2xl font-bold mt-1">{report.import_idempotence_health.duplicate_creating_imports === 0 ? '✓' : '✗'}</p>
          </div>
        </div>

        {report.warnings?.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide">Warnings</p>
            {report.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{w}
              </div>
            ))}
          </div>
        )}

        {report.failures?.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Failures</p>
            {report.failures.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{f}
              </div>
            ))}
          </div>
        )}

        {report.recommended_actions?.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Recommended Actions</p>
            {report.recommended_actions.map((action, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-3 py-2">
                <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{action}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}