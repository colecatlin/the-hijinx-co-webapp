/**
 * DiagnosticsBugBurndown.jsx
 * 
 * Bug Burn-Down section for the Diagnostics page.
 * Displays critical/high/medium/low bug counts and launch readiness.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Play, Loader2, CheckCircle2, AlertTriangle, XCircle, Zap,
} from 'lucide-react';
import { toast } from 'sonner';

function SeverityBadge({ severity, count }) {
  const styles = {
    critical: 'bg-red-900/30 border-red-600 text-red-300',
    high: 'bg-orange-900/30 border-orange-600 text-orange-300',
    medium: 'bg-yellow-900/30 border-yellow-600 text-yellow-300',
    low: 'bg-blue-900/30 border-blue-600 text-blue-300',
    healthy: 'bg-green-900/30 border-green-600 text-green-300',
  };
  const icons = {
    critical: <XCircle className="w-4 h-4" />,
    high: <AlertTriangle className="w-4 h-4" />,
    medium: <AlertTriangle className="w-4 h-4" />,
    low: <Zap className="w-4 h-4" />,
    healthy: <CheckCircle2 className="w-4 h-4" />,
  };
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded border ${styles[severity]}`}>
      {icons[severity]}
      <span className="font-semibold">{count}</span>
      <span className="text-xs opacity-75 capitalize">{severity}</span>
    </div>
  );
}

export default function DiagnosticsBugBurndown() {
  const [verificationResult, setVerificationResult] = useState(null);
  const [burndownReport, setBurndownReport] = useState(null);
  const [verificationRunning, setVerificationRunning] = useState(false);

  async function runPostCleanupVerification() {
    setVerificationRunning(true);
    try {
      const res = await base44.asServiceRole.functions.invoke('runPostCleanupVerification', {});
      if (res?.data?.error) throw new Error(res.data.error);
      setVerificationResult(res?.data);
      toast.success(`Post-cleanup verification: ${res?.data?.platform_status}`);
    } catch (e) {
      toast.error(e.message);
    }
    setVerificationRunning(false);
  }

  async function fetchBurndownReport() {
    try {
      const res = await base44.asServiceRole.functions.invoke('buildBugBurndownReport', {});
      if (res?.data?.error) throw new Error(res.data.error);
      setBurndownReport(res?.data);
    } catch (e) {
      toast.error(`Failed to fetch burndown report: ${e.message}`);
    }
  }

  React.useEffect(() => {
    if (verificationResult) {
      fetchBurndownReport();
    }
  }, [verificationResult]);

  const summary = verificationResult?.summary || {};
  const report = burndownReport || {};
  const latest = report.latest_verification || {};

  const isLaunchReady = report.is_launch_ready;
  const statusColor = verificationResult?.platform_status === 'critical' ? 'red' :
                      verificationResult?.platform_status === 'degraded' ? 'orange' :
                      verificationResult?.platform_status === 'acceptable' ? 'yellow' : 'green';

  return (
    <div className="space-y-4">
      {/* ── Launch Readiness Banner ── */}
      {verificationResult && (
        <div className={`rounded-lg border-2 px-4 py-3 flex items-center gap-3 font-semibold text-sm ${
          isLaunchReady 
            ? 'bg-green-900/30 border-green-600 text-green-300'
            : summary.critical_open > 0
            ? 'bg-red-900/30 border-red-600 text-red-300'
            : 'bg-yellow-900/30 border-yellow-600 text-yellow-300'
        }`}>
          {isLaunchReady ? (
            <><CheckCircle2 className="w-5 h-5 flex-shrink-0" />Launch Ready — All Critical Bugs Fixed</>
          ) : summary.critical_open > 0 ? (
            <><XCircle className="w-5 h-5 flex-shrink-0" />Critical Bugs Open — Fix Before Launch</>
          ) : (
            <><AlertTriangle className="w-5 h-5 flex-shrink-0" />High-Priority Bugs Remain — Monitor Before Launch</>
          )}
        </div>
      )}

      {/* ── Bug Count Tiles ── */}
      {verificationResult && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-[#1a1a1a] rounded border border-gray-700 px-3 py-2.5 text-center">
            <p className="text-gray-400 text-xs mb-1">Critical Open</p>
            <p className={`font-bold text-lg ${summary.critical_open === 0 ? 'text-green-400' : 'text-red-400'}`}>
              {summary.critical_open || 0}
            </p>
          </div>
          <div className="bg-[#1a1a1a] rounded border border-gray-700 px-3 py-2.5 text-center">
            <p className="text-gray-400 text-xs mb-1">High Priority</p>
            <p className={`font-bold text-lg ${summary.high_open === 0 ? 'text-green-400' : 'text-orange-400'}`}>
              {summary.high_open || 0}
            </p>
          </div>
          <div className="bg-[#1a1a1a] rounded border border-gray-700 px-3 py-2.5 text-center">
            <p className="text-gray-400 text-xs mb-1">Medium Priority</p>
            <p className={`font-bold text-lg ${summary.medium_open === 0 ? 'text-green-400' : 'text-yellow-400'}`}>
              {summary.medium_open || 0}
            </p>
          </div>
          <div className="bg-[#1a1a1a] rounded border border-gray-700 px-3 py-2.5 text-center">
            <p className="text-gray-400 text-xs mb-1">Low Priority</p>
            <p className="font-bold text-lg text-blue-400">{summary.low_open || 0}</p>
          </div>
          <div className="bg-[#1a1a1a] rounded border border-gray-700 px-3 py-2.5 text-center">
            <p className="text-gray-400 text-xs mb-1">Resolved This Pass</p>
            <p className="font-bold text-lg text-green-400">{report.resolved_this_pass || 0}</p>
          </div>
        </div>
      )}

      {/* ── Platform Health Details ── */}
      {latest && (
        <Card className="bg-[#1e1e1e] border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-xs font-semibold">Platform Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex items-center justify-between text-gray-300">
              <span>System Status</span>
              <span className={`font-semibold ${
                latest.system_status === 'healthy' ? 'text-green-400' :
                latest.system_status === 'failure' || latest.system_status === 'error' ? 'text-red-400' :
                latest.system_status === 'warning' ? 'text-yellow-400' : 'text-gray-400'
              }`}>
                {latest.system_status || 'unknown'}
              </span>
            </div>
            <div className="flex items-center justify-between text-gray-300">
              <span>Duplicate Severity</span>
              <span className={`font-semibold ${
                latest.duplicate_severity === 0 ? 'text-green-400' :
                latest.duplicate_severity === 1 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                Level {latest.duplicate_severity}
              </span>
            </div>
            <div className="flex items-center justify-between text-gray-300">
              <span>Orphaned Records</span>
              <span className={`font-semibold ${
                (latest.orphaned_records || 0) === 0 ? 'text-green-400' :
                (latest.orphaned_records || 0) > 100 ? 'text-orange-400' : 'text-yellow-400'
              }`}>
                {latest.orphaned_records || 0}
              </span>
            </div>
            <div className="flex items-center justify-between text-gray-300">
              <span>Missing Normalization</span>
              <span className={`font-semibold ${
                (latest.missing_normalization || 0) === 0 ? 'text-green-400' :
                (latest.missing_normalization || 0) > 50 ? 'text-orange-400' : 'text-yellow-400'
              }`}>
                {latest.missing_normalization || 0}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Launch Blockers ── */}
      {report.launch_blockers && report.launch_blockers.length > 0 && (
        <Card className="bg-red-900/20 border-red-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-red-300 text-xs font-semibold">Launch Blockers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            {report.launch_blockers.map((blocker, i) => (
              <div key={i} className="flex items-start gap-2 text-red-300">
                <span className="mt-0.5">•</span>
                <span>{blocker.issue}{blocker.note ? ` (${blocker.note})` : ''}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Recommendations ── */}
      {report.recommendations && report.recommendations.length > 0 && (
        <Card className="bg-[#1e1e1e] border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-xs font-semibold">Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            {report.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2 text-gray-300">
                <span className="text-green-400 mt-0.5">✓</span>
                <span>{rec}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Run Button ── */}
      <Button 
        onClick={runPostCleanupVerification} 
        disabled={verificationRunning} 
        size="sm" 
        className="bg-indigo-700 hover:bg-indigo-600 text-xs w-full"
      >
        {verificationRunning ? (
          <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Running Verification…</>
        ) : (
          <><Play className="w-3 h-3 mr-1" />Run Post-Cleanup Verification</>
        )}
      </Button>

      {verificationResult && !verificationRunning && (
        <p className="text-xs text-gray-400">Last run: {new Date(verificationResult.generated_at).toLocaleString()}</p>
      )}
    </div>
  );
}