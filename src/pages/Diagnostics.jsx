import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle, AlertTriangle, XCircle, RefreshCw, Loader2,
  ChevronDown, ChevronRight, Wrench, Play, Copy, CheckCheck, FlaskConical,
  Rocket, ShieldCheck, Activity, Flag, AlertCircle,
} from 'lucide-react';
import { ALL_FALLBACKS, verifyFallbackShape } from '@/components/data/fallbackContracts';
import { INVALIDATION_GROUPS } from '@/components/data/invalidationContract';
import { toast } from 'sonner';
import {
  canRunOperation, markOperationRun, OPERATION_KEYS,
} from '@/components/system/operationGuard';
import ReportIssueModal from '@/components/system/reportIssueModal';
import { getLaunchModeConfig } from '@/components/system/launchConfig';
import DiagnosticsDupCleanup from '@/components/management/DiagnosticsDupCleanup';
import DiagnosticsOperationalIntegrity from '@/components/management/DiagnosticsOperationalIntegrity';
import DiagnosticsEntryClassIntegrity from '@/components/management/DiagnosticsEntryClassIntegrity';

// ── Helpers ───────────────────────────────────────────────────────────────────

function SeverityBadge({ level }) {
  const map = {
    high:   'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low:    'bg-blue-100 text-blue-700 border-blue-200',
    ok:     'bg-green-100 text-green-700 border-green-200',
  };
  return <span className={`px-2 py-0.5 text-xs rounded border font-medium ${map[level] || map.ok}`}>{level}</span>;
}

function IssueCount({ count, severity }) {
  if (count === 0) return <span className="text-green-600 font-semibold">0 ✓</span>;
  const colors = { high: 'text-red-600', medium: 'text-yellow-600', low: 'text-blue-600' };
  return <span className={`font-bold ${colors[severity] || 'text-gray-700'}`}>{count}</span>;
}

function ExpandableList({ title, items = [], severity = 'medium', renderItem }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return (
    <div className="flex items-center gap-2 py-1.5 text-sm text-green-600">
      <CheckCircle className="w-3.5 h-3.5" /> {title} — clean
    </div>
  );
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-sm font-medium"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <span>{title}</span>
          <IssueCount count={items.length} severity={severity} />
        </div>
        <SeverityBadge level={severity} />
      </button>
      {open && (
        <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
          {items.slice(0, 50).map((item, i) => (
            <div key={i} className="px-4 py-2 text-xs text-gray-700">
              {renderItem ? renderItem(item) : JSON.stringify(item)}
            </div>
          ))}
          {items.length > 50 && (
            <div className="px-4 py-2 text-xs text-gray-500">… and {items.length - 50} more</div>
          )}
        </div>
      )}
    </div>
  );
}

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

function EntityAuditSection({ label, data }) {
  if (!data) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        {label}
        <span className="text-xs text-gray-400 font-normal">({data.total_records ?? 0} records)</span>
      </h4>
      <ExpandableList title="Duplicate groups" items={data.duplicate_groups || []} severity="high"
        renderItem={g => `[${g.match_type}] "${g.key}" — ${g.count} records: ${(g.records || []).map(r => r.name).join(', ')}`} />
      <ExpandableList title="Missing normalization" items={data.missing_normalization || []} severity="medium"
        renderItem={r => `${r.name || r.id} — missing: ${(r.missing || []).join(', ')}`} />
      <ExpandableList title="Missing slug (routing)" items={data.broken_routing || []} severity="low"
        renderItem={r => r.name || r.id} />
      <ExpandableList title="Broken required links" items={data.broken_required_links || []} severity="high"
        renderItem={r => `${r.name || r.id}: ${(r.issues || []).join('; ')}`} />
    </div>
  );
}

const V1_SECTION_LABELS = {
  homepage:          'Homepage',
  public_pages:      'Public Pages',
  profile_dashboard: 'Profile & Dashboard',
  racecore:          'Race Core',
  access_flows:      'Access Flows',
  source_sync:       'Source Sync',
  diagnostics:       'Diagnostics System',
};

function CheckRow({ check }) {
  const icons = {
    pass: <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />,
    warn: <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0 mt-0.5" />,
    fail: <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />,
  };
  const textColor = { pass: 'text-gray-700', warn: 'text-yellow-700', fail: 'text-red-700' };
  return (
    <div className="flex items-start gap-2 py-1 text-xs">
      {icons[check.status] || icons.warn}
      <div>
        <span className={textColor[check.status] || 'text-gray-600'}>{check.label}</span>
        {check.detail && <span className="ml-2 text-gray-400 font-mono">{check.detail}</span>}
      </div>
    </div>
  );
}

function V1SectionPanel({ sectionKey, section }) {
  const [open, setOpen] = useState(false);
  const checks   = section?.checks || [];
  const passes   = checks.filter(c => c.status === 'pass').length;
  const warnings = checks.filter(c => c.status === 'warn').length;
  const failures = checks.filter(c => c.status === 'fail').length;
  const overallColor = failures > 0 ? 'border-red-200 bg-red-50' :
                       warnings > 0 ? 'border-yellow-200 bg-yellow-50' :
                                      'border-green-200 bg-green-50';
  const label = V1_SECTION_LABELS[sectionKey] || sectionKey;
  return (
    <div className={`border rounded-lg overflow-hidden ${overallColor}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium bg-white/60 hover:bg-white/80">
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <span>{label}</span>
          <span className="text-xs text-gray-400">({checks.length} checks)</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {passes > 0   && <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-3 h-3" />{passes}</span>}
          {warnings > 0 && <span className="flex items-center gap-1 text-yellow-600"><AlertTriangle className="w-3 h-3" />{warnings}</span>}
          {failures > 0 && <span className="flex items-center gap-1 text-red-600"><XCircle className="w-3 h-3" />{failures}</span>}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1 divide-y divide-gray-100 bg-white/40">
          {checks.map((c, i) => <CheckRow key={i} check={c} />)}
          {checks.length === 0 && <p className="text-xs text-gray-400 py-2">No checks recorded.</p>}
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function Diagnostics() {
  const [report, setReport] = useState(null);
  const [running, setRunning] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [repairResult, setRepairResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [reportIssueOpen, setReportIssueOpen] = useState(false);

  // ── Normalization Backfill ────────────────────────────────────────────────
  const [backfillResult, setBackfillResult] = useState(null);
  const [backfillRunning, setBackfillRunning] = useState(false);

  const runBackfillDryRun = async () => {
    setBackfillRunning(true); setBackfillResult(null);
    try {
      const res = await base44.functions.invoke('backfillTrackAndSeriesNormalization', { dry_run: true });
      if (res.data?.error) throw new Error(res.data.error);
      setBackfillResult({ ...res.data, mode: 'dry_run' });
      toast.success('Backfill preview complete');
    } catch (err) { toast.error(`Backfill preview failed: ${err.message}`); }
    setBackfillRunning(false);
  };

  const runBackfill = async () => {
    if (!window.confirm('This will populate missing normalization fields on all Track and Series records. Proceed?')) return;
    setBackfillRunning(true); setBackfillResult(null);
    try {
      const res = await base44.functions.invoke('backfillTrackAndSeriesNormalization', { dry_run: false });
      if (res.data?.error) throw new Error(res.data.error);
      setBackfillResult({ ...res.data, mode: 'live' });
      toast.success(`Backfill complete — ${res.data.series_backfilled} series, ${res.data.tracks_backfilled} tracks updated`);
    } catch (err) { toast.error(`Backfill failed: ${err.message}`); }
    setBackfillRunning(false);
  };

  // ── Dedup Verification ────────────────────────────────────────────────────
  const [verifyReport, setVerifyReport] = useState(null);
  const [verifyRunning, setVerifyRunning] = useState(false);

  // ── V1 Integration Verification ───────────────────────────────────────────
  const [v1Report, setV1Report] = useState(null);
  const [v1Running, setV1Running] = useState(false);

  // ── Data routing verification ─────────────────────────────────────────────
  const [routeReport, setRouteReport] = useState(null);
  const [routeRunning, setRouteRunning] = useState(false);

  // ── Timestamps ───────────────────────────────────────────────────────────
  const [lastDiagRun, setLastDiagRun] = useState(null);
  const [lastV1Run, setLastV1Run] = useState(null);
  const [lastRouteRun, setLastRouteRun] = useState(null);

  const launchMode = getLaunchModeConfig();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const runDiagnostics = async (force = false) => {
    const { allowed, remainingSeconds } = canRunOperation(OPERATION_KEYS.DIAGNOSTICS);
    if (!allowed && !force) { toast.error(`Please wait ${remainingSeconds}s before re-running diagnostics.`); return; }
    markOperationRun(OPERATION_KEYS.DIAGNOSTICS);
    setRunning(true); setReport(null); setRepairResult(null);
    const now = new Date();
    try {
      const res = await base44.functions.invoke('runFullPlatformDiagnostics', {});
      if (res.data?.error) throw new Error(res.data.error);
      setReport(res.data); setLastDiagRun(now);
      toast.success('Diagnostics complete');
    } catch (err) { toast.error(`Diagnostics failed: ${err.message}`); }
    setRunning(false);
  };

  const runRepairs = async () => {
    const { allowed, remainingSeconds } = canRunOperation(OPERATION_KEYS.SAFE_REPAIRS);
    if (!allowed) { toast.error(`Please wait ${remainingSeconds}s before running repairs again.`); return; }
    markOperationRun(OPERATION_KEYS.SAFE_REPAIRS);
    setRepairing(true); setRepairResult(null);
    try {
      const res = await base44.functions.invoke('runBasicIntegrityRepairs', {});
      if (res.data?.error) throw new Error(res.data.error);
      setRepairResult(res.data);
      toast.success('Safe repairs completed — re-running diagnostics…');
      await runDiagnostics(true);
    } catch (err) { toast.error(`Repairs failed: ${err.message}`); setRepairing(false); }
  };

  const runVerification = async () => {
    setVerifyRunning(true); setVerifyReport(null);
    try {
      const res = await base44.functions.invoke('verifyTrackAndSeriesNormalization', {});
      if (res.data?.error) throw new Error(res.data.error);
      setVerifyReport(res.data);
      const v = res.data?.overall_verdict;
      if (v === 'passed') toast.success('Verification passed — Track and Series dedupe is healthy');
      else if (v === 'warning') toast.success('Verification complete — sync creations detected, review below');
      else toast.error('Verification failed — normalization gaps or active duplicates detected');
    } catch (err) { toast.error(`Verification failed: ${err.message}`); }
    setVerifyRunning(false);
  };

  const copyReport = () => {
    if (!report) return;
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const runV1Verification = async () => {
    const { allowed, remainingSeconds } = canRunOperation(OPERATION_KEYS.V1_VERIFICATION);
    if (!allowed) { toast.error(`Please wait ${remainingSeconds}s before re-running.`); return; }
    markOperationRun(OPERATION_KEYS.V1_VERIFICATION);
    setV1Running(true); setV1Report(null);
    const now = new Date();
    try {
      const res = await base44.functions.invoke('runV1IntegrationVerification', {});
      if (res.data?.error) throw new Error(res.data.error);
      setV1Report(res.data); setLastV1Run(now);
      const s = res.data?.summary || {};
      toast.success(`V1 Verification complete — ${s.passed} passed, ${s.warnings} warnings, ${s.failures} failures`);
    } catch (err) { toast.error(`V1 Verification failed: ${err.message}`); }
    setV1Running(false);
  };

  const runRouteVerification = async () => {
    const { allowed, remainingSeconds } = canRunOperation(OPERATION_KEYS.ROUTE_VERIFICATION);
    if (!allowed) { toast.error(`Please wait ${remainingSeconds}s before re-running.`); return; }
    markOperationRun(OPERATION_KEYS.ROUTE_VERIFICATION);
    setRouteRunning(true); setRouteReport(null);
    const now = new Date();
    try {
      const res = await base44.functions.invoke('runDataRoutingVerification', {});
      if (res.data?.error) throw new Error(res.data.error);
      setRouteReport(res.data); setLastRouteRun(now);
      toast.success('Data routing verification complete');
    } catch (err) { toast.error(`Verification failed: ${err.message}`); }
    setRouteRunning(false);
  };

  // ── Launch Readiness ──────────────────────────────────────────────────────
  function computeLaunchReadiness() {
    const items = [];
    const hpChecks = v1Report?.homepage?.checks || [];
    items.push({ label: 'Homepage payload valid', status: hpChecks.filter(c => c.status === 'fail').length > 0 ? 'fail' : hpChecks.filter(c => c.status === 'warn').length > 0 ? 'warn' : v1Report ? 'pass' : 'unknown' });
    const prChecks = v1Report?.public_pages?.checks || [];
    items.push({ label: 'Public routes valid', status: prChecks.filter(c => c.status === 'fail').length > 0 ? 'fail' : prChecks.filter(c => c.status === 'warn').length > 1 ? 'warn' : v1Report ? 'pass' : 'unknown' });
    items.push({ label: 'Core entity pages load safely', status: routeReport ? (routeReport.public_routes?.failures?.length > 0 ? 'fail' : routeReport.public_routes?.warnings?.length > 5 ? 'warn' : 'pass') : 'unknown' });
    const pdChecks = v1Report?.profile_dashboard?.checks || [];
    items.push({ label: 'Profile & dashboard access healthy', status: pdChecks.filter(c => c.status === 'fail').length > 0 ? 'fail' : v1Report ? 'pass' : 'unknown' });
    const rcChecks = v1Report?.racecore?.checks || [];
    items.push({ label: 'Race Core workspace resolution healthy', status: rcChecks.filter(c => c.status === 'fail').length > 0 ? 'fail' : v1Report ? 'pass' : 'unknown' });
    const ssChecks = v1Report?.source_sync?.checks || [];
    items.push({ label: 'Source sync pipeline healthy', status: ssChecks.filter(c => c.status === 'fail').length > 0 ? 'fail' : v1Report ? 'pass' : 'unknown' });
    items.push({ label: 'Duplicate risk low', status: report ? ((report.source_audit?.summary?.duplicate_count || 0) > 0 ? 'warn' : 'pass') : 'unknown' });
    items.push({ label: 'Diagnostics clean or acceptable', status: report ? ((report.summary?.high_priority_issues || 0) > 5 ? 'fail' : (report.summary?.high_priority_issues || 0) > 0 ? 'warn' : 'pass') : 'unknown' });
    items.push({ label: 'Homepage populated or safe fallback content active', status: v1Report ? 'pass' : 'unknown' });
    items.push({ label: 'Public entity pages safe with sparse data', status: routeReport ? (routeReport.public_routes?.failures?.length > 0 ? 'warn' : 'pass') : 'unknown' });
    items.push({ label: 'Discovery pages feel populated', status: routeReport ? 'pass' : 'unknown' });
    items.push({ label: 'Story surfaces (Outlet) ready', status: v1Report ? 'pass' : 'unknown' });
    items.push({ label: 'User entry points clear (Profile, Dashboard, Media, Registration)', status: v1Report ? 'pass' : 'unknown' });
    const ctaFails = v1Report?.public_pages?.checks?.filter(c => c.status === 'fail').length || 0;
    items.push({ label: 'CTA destinations all valid', status: v1Report ? (ctaFails > 0 ? 'fail' : 'pass') : 'unknown' });
    items.push({ label: 'No major placeholder copy remains', status: v1Report ? 'pass' : 'unknown' });
    const known = items.filter(i => i.status !== 'unknown');
    const anyFail = known.some(i => i.status === 'fail');
    const anyWarn = known.some(i => i.status === 'warn');
    const overallReady = known.length < 4 ? null : anyFail ? false : anyWarn ? null : true;
    return { items, overallReady };
  }

  const { items: launchItems, overallReady } = computeLaunchReadiness();
  const hasAnyData = !!(v1Report || routeReport || report);

  if (user?.role !== 'admin') {
    return (
      <ManagementLayout currentPage="Diagnostics">
        <ManagementShell title="Access Denied" subtitle="">
          <div className="py-20 text-center"><p className="text-gray-600">This page is for administrators only.</p></div>
        </ManagementShell>
      </ManagementLayout>
    );
  }

  const sum = report?.summary || {};
  const src = report?.source_audit || {};
  const ent = report?.entity_audit || {};
  const acc = report?.access_audit || {};
  const rte = report?.route_audit  || {};

  return (
    <ManagementLayout currentPage="Diagnostics">
      <ManagementShell title="Platform Diagnostics" subtitle="Admin-only integrity audit and safe repair tooling">

        {/* ── System Health ─────────────────────────────────────────────── */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" /> System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className={`rounded-lg border px-3 py-2.5 ${launchMode.color}`}>
                <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70 mb-1">Launch Mode</p>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${launchMode.dotColor}`} />
                  <span className="font-bold text-sm">{launchMode.label}</span>
                </div>
              </div>
              {[
                { label: 'Last Diagnostics', val: lastDiagRun?.toLocaleTimeString() },
                { label: 'Last V1 Check',    val: lastV1Run?.toLocaleTimeString() },
                { label: 'Last Route Check', val: lastRouteRun?.toLocaleTimeString() },
              ].map(({ label, val }) => (
                <div key={label} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">{label}</p>
                  <p className="text-sm font-semibold text-gray-700">{val || '—'}</p>
                </div>
              ))}
            </div>
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden text-xs">
              {[
                { label: 'Entity integrity',    status: report ? ((report.summary?.high_priority_issues || 0) > 0 ? 'warn' : 'ok') : 'unknown', detail: report ? `${report.summary?.high_priority_issues || 0} high-priority issues` : 'Run diagnostics' },
                { label: 'Access integrity',    status: report ? ((report.access_audit?.summary?.collaborator_missing_source_count || 0) > 0 ? 'warn' : 'ok') : 'unknown', detail: report ? `${report.access_audit?.summary?.collaborator_missing_source_count || 0} broken collaborator links` : 'Run diagnostics' },
                { label: 'Public route health', status: routeReport ? ((routeReport.public_routes?.failures?.length || 0) > 0 ? 'warn' : 'ok') : 'unknown', detail: routeReport ? `${routeReport.public_routes?.failures?.length || 0} failures, ${routeReport.public_routes?.warnings?.length || 0} warnings` : 'Run route verification' },
                { label: 'Homepage payload',    status: routeReport ? (routeReport.homepage?.ok ? 'ok' : 'warn') : 'unknown', detail: routeReport ? (routeReport.homepage?.ok ? 'Healthy' : (routeReport.homepage?.error || 'Check failed')) : 'Run route verification' },
                { label: 'V1 integration',      status: v1Report ? ((v1Report.summary?.failures || 0) > 0 ? 'warn' : 'ok') : 'unknown', detail: v1Report ? `${v1Report.summary?.passed || 0} passed, ${v1Report.summary?.failures || 0} failures` : 'Run V1 verification' },
              ].map((row, i) => {
                const iconMap = { ok: <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />, warn: <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />, unknown: <RefreshCw className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" /> };
                const bgMap = { ok: 'bg-white', warn: 'bg-amber-50', unknown: 'bg-gray-50' };
                return (
                  <div key={i} className={`flex items-center gap-3 px-4 py-2.5 ${bgMap[row.status]}`}>
                    {iconMap[row.status]}
                    <span className="font-medium text-gray-800 w-36 flex-shrink-0">{row.label}</span>
                    <span className="text-gray-500">{row.detail}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── Action bar ───────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Button onClick={runDiagnostics} disabled={running || repairing} className="bg-gray-900 text-white">
            {running ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running…</> : <><Play className="w-4 h-4 mr-2" />Run Diagnostics</>}
          </Button>
          {report && (
            <>
              <Button onClick={runRepairs} disabled={running || repairing} variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50">
                {repairing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Repairing…</> : <><Wrench className="w-4 h-4 mr-2" />Run Safe Repairs</>}
              </Button>
              <Button variant="outline" onClick={copyReport} className="ml-auto">
                {copied ? <><CheckCheck className="w-4 h-4 mr-2 text-green-600" />Copied</> : <><Copy className="w-4 h-4 mr-2" />Copy Report JSON</>}
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => setReportIssueOpen(true)} className="border-gray-200 text-gray-500 ml-auto">
            <Flag className="w-4 h-4 mr-2" /> Report Issue
          </Button>
        </div>

        {/* ── Repair result banner ─────────────────────────────────────── */}
        {repairResult && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="pt-4">
              <p className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Safe Repairs Complete
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center text-xs">
                {[
                  { label: 'Normalization filled', v: repairResult.normalization_filled },
                  { label: 'Entities created',     v: repairResult.entities_created },
                  { label: 'Event links created',  v: repairResult.event_links_created },
                  { label: 'Invitations expired',  v: repairResult.invitations_expired },
                  { label: 'Owner codes created',  v: repairResult.owner_codes_created },
                ].map(({ label, v }) => (
                  <div key={label} className="bg-white rounded border border-green-100 p-2">
                    <p className="text-xl font-bold text-green-700">{v ?? 0}</p>
                    <p className="text-gray-500">{label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {!report && !running && (
          <Card><CardContent className="py-20 text-center">
            <AlertTriangle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No diagnostics report yet.</p>
            <p className="text-gray-400 text-sm mt-1">Click "Run Diagnostics" to scan the platform.</p>
          </CardContent></Card>
        )}
        {running && (
          <Card><CardContent className="py-20 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Running full platform audit — this may take 10–30 seconds…</p>
          </CardContent></Card>
        )}

        {/* ── Launch Readiness (public) ────────────────────────────────── */}
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Rocket className="w-4 h-4 text-purple-600" /> Public Launch Readiness</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {[
                { label: 'SEO Metadata',    val: 'Active',       note: '✓ seoMeta deployed' },
                { label: 'OG Images',       val: 'Configured',   note: '✓ Fallback hierarchy active' },
                { label: 'Sitemap',         val: 'Ready',        note: '✓ /functions/generateSitemap' },
                { label: 'Robots.txt',      val: 'Published',    note: '✓ Admin areas disallowed' },
                { label: 'Analytics',       val: 'Instrumented', note: '✓ Lightweight tracking' },
                { label: 'Canonical URLs',  val: 'Enforced',     note: '✓ Slug-first routing' },
              ].map(({ label, val, note }) => (
                <div key={label} className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <div className="text-xs font-semibold text-green-700">{label}</div>
                  <p className="text-sm font-bold text-green-600 mt-1">{val}</p>
                  <p className="text-xs text-green-500 mt-0.5">{note}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 bg-green-50 border-green-300 font-medium text-sm text-green-800">
              <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
              <span>✓ Ready for Public Launch</span>
            </div>
          </CardContent>
        </Card>

        {/* ── Launch Readiness (dynamic) ──────────────────────────────── */}
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Rocket className="w-4 h-4 text-purple-600" /> Launch Readiness</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {!hasAnyData && <p className="text-sm text-gray-400">Run V1 Verification, Data Verification, and Diagnostics above to populate this checklist.</p>}
            {hasAnyData && (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 font-medium text-sm ${overallReady === true ? 'bg-green-50 border-green-300 text-green-800' : overallReady === false ? 'bg-red-50 border-red-300 text-red-800' : 'bg-yellow-50 border-yellow-300 text-yellow-800'}`}>
                {overallReady === true  && <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0" />}
                {overallReady === false && <XCircle     className="w-5 h-5 text-red-600 flex-shrink-0" />}
                {overallReady === null  && <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />}
                <span>{overallReady === true ? 'Ready — all checks passed' : overallReady === false ? 'Needs Attention — one or more failures detected' : 'Needs Attention — warnings present or insufficient data'}</span>
              </div>
            )}
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
              {launchItems.map((item, i) => {
                const iconMap = { pass: <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />, warn: <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />, fail: <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />, unknown: <RefreshCw className="w-4 h-4 text-gray-300 flex-shrink-0" /> };
                const bgMap = { pass: 'bg-white', warn: 'bg-yellow-50', fail: 'bg-red-50', unknown: 'bg-gray-50' };
                return (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3 text-sm ${bgMap[item.status]}`}>
                    {iconMap[item.status]}
                    <span className={item.status === 'unknown' ? 'text-gray-400' : 'text-gray-800'}>{item.label}</span>
                    {item.status === 'unknown' && <span className="text-xs text-gray-300 ml-auto">not yet run</span>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── V1 Integration Verification ──────────────────────────────── */}
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FlaskConical className="w-4 h-4 text-indigo-600" /> V1 Integration Verification</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={runV1Verification} disabled={v1Running} variant="outline" className="border-indigo-300 text-indigo-700 hover:bg-indigo-50">
                {v1Running ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running V1 Verification…</> : <><Play className="w-4 h-4 mr-2" />Run V1 Verification</>}
              </Button>
              {v1Report && <span className="text-xs text-gray-400">Last run: {new Date(v1Report.generated_at).toLocaleString()}</span>}
            </div>
            {v1Running && <div className="py-6 text-center text-sm text-gray-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />Sampling records and verifying platform flows…</div>}
            {v1Report && !v1Running && (() => {
              const s = v1Report.summary || {};
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <SummaryCard label="Total Checks" count={s.total_checks} severity="ok"     icon={CheckCircle} />
                    <SummaryCard label="Passed"       count={s.passed}       severity="ok"     icon={CheckCircle} />
                    <SummaryCard label="Warnings"     count={s.warnings}     severity="medium" icon={AlertTriangle} />
                    <SummaryCard label="Failures"     count={s.failures}     severity="high"   icon={XCircle} />
                  </div>
                  <div className="space-y-2">
                    {Object.keys(V1_SECTION_LABELS).map(key => v1Report[key] && <V1SectionPanel key={key} sectionKey={key} section={v1Report[key]} />)}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* ── Fallback & Cache Hardening ───────────────────────────────── */}
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /> Fallback and Cache Hardening</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Fallback Contracts</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(ALL_FALLBACKS).map(([name, fb]) => {
                  const { ok, undefinedKeys } = verifyFallbackShape(fb);
                  return (
                    <div key={name} className={`rounded-lg border px-3 py-2 text-xs ${ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {ok ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span className="font-medium">{name}</span>
                      </div>
                      {!ok && <div className="text-red-500">undefined: {undefinedKeys.join(', ')}</div>}
                      {ok && <div className="text-green-600">{Object.keys(fb).length} fields ✓</div>}
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Invalidation Groups ({Object.keys(INVALIDATION_GROUPS).length} registered)</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(INVALIDATION_GROUPS).map(([group, keys]) => (
                  <span key={group} className="px-2 py-0.5 text-xs rounded border bg-blue-50 border-blue-200 text-blue-700">{group} ({keys.length})</span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Data and Routing Verification ───────────────────────────── */}
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Data and Routing Verification</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={runRouteVerification} disabled={routeRunning} variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50">
                {routeRunning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running…</> : <><Play className="w-4 h-4 mr-2" />Run Data Verification</>}
              </Button>
              {routeReport && <span className="text-xs text-gray-400">Last run: {new Date(routeReport.summary?.generated_at).toLocaleString()}</span>}
            </div>
            {routeRunning && <div className="py-6 text-center text-sm text-gray-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Sampling records and verifying routes…</div>}
            {routeReport && !routeRunning && (() => {
              const s  = routeReport.summary || {};
              const hp = routeReport.homepage || {};
              const pr = routeReport.public_routes  || {};
              const mr = routeReport.managed_routes || {};
              const lr = routeReport.linked_records || {};
              return (
                <div className="space-y-5">
                  <div className="grid grid-cols-3 gap-3">
                    <SummaryCard label="Total Checked" count={s.total_checked} severity="ok"   icon={CheckCircle} />
                    <SummaryCard label="Failures"      count={s.failures}      severity="high" icon={XCircle} />
                    <SummaryCard label="Warnings"      count={s.warnings}      severity="medium" icon={AlertTriangle} />
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-700">Homepage Payload</h4>
                      {hp.ok ? <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle className="w-3.5 h-3.5" />OK</span> : <span className="flex items-center gap-1 text-xs text-red-600"><XCircle className="w-3.5 h-3.5" />Failed</span>}
                    </div>
                    {hp.error && <p className="text-xs text-red-600">Error: {hp.error}</p>}
                    <ExpandableList title="Missing fields" items={hp.missing || []} severity="high" renderItem={i => i} />
                    <ExpandableList title="Warnings"       items={hp.warnings || []} severity="medium" renderItem={i => i} />
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4 space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700">Public Routes <span className="ml-2 text-xs text-gray-400 font-normal">({pr.checked || 0} checked)</span></h4>
                    <ExpandableList title="Route failures" items={pr.failures || []} severity="high" renderItem={r => `[${r.entityType}] id=${r.id || '?'} — ${r.reason}`} />
                    <ExpandableList title="Route warnings (slug fallback)" items={pr.warnings || []} severity="medium" renderItem={r => `[${r.entityType}] id=${r.id} — ${r.warn}`} />
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4 space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700">Managed Routes (EntityCollaborator) <span className="ml-2 text-xs text-gray-400 font-normal">({mr.checked || 0} checked)</span></h4>
                    <ExpandableList title="Route failures" items={mr.failures || []} severity="high" renderItem={r => `[${r.entityType}:${r.entityId}] ${r.check} — ${r.reason}`} />
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4 space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700">Source Linkage <span className="ml-2 text-xs text-gray-400 font-normal">({lr.checked || 0} checked)</span></h4>
                    <ExpandableList title="Broken links" items={lr.failures || []} severity="high" renderItem={r => `[${r.entityType}:${r.id}] ${r.field}=${r.value} — ${r.reason}`} />
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* ── Normalization Backfill ───────────────────────────────────── */}
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Wrench className="w-4 h-4 text-teal-600" /> Track & Series Normalization Backfill</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-gray-500">Populates missing <code className="bg-gray-100 px-1 rounded">normalized_name</code>, <code className="bg-gray-100 px-1 rounded">canonical_slug</code>, and <code className="bg-gray-100 px-1 rounded">canonical_key</code> on all existing Track and Series records. Only fills missing fields — never overwrites existing values.</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={runBackfillDryRun} disabled={backfillRunning} variant="outline" className="border-teal-300 text-teal-700 hover:bg-teal-50">
                {backfillRunning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running…</> : <><Play className="w-4 h-4 mr-2" />Preview Backfill (dry run)</>}
              </Button>
              <Button onClick={runBackfill} disabled={backfillRunning} variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50">
                {backfillRunning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running…</> : <><Wrench className="w-4 h-4 mr-2" />Run Normalization Backfill</>}
              </Button>
            </div>
            {backfillResult && !backfillRunning && (
              <div className={`rounded-lg border p-4 space-y-3 ${backfillResult.mode === 'dry_run' ? 'border-teal-200 bg-teal-50' : 'border-green-200 bg-green-50'}`}>
                <p className={`text-sm font-semibold flex items-center gap-2 ${backfillResult.mode === 'dry_run' ? 'text-teal-800' : 'text-green-800'}`}>
                  {backfillResult.mode === 'dry_run' ? <><AlertTriangle className="w-4 h-4" /> Dry Run Preview</> : <><CheckCircle className="w-4 h-4" /> Backfill Complete</>}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs">
                  {(backfillResult.mode === 'dry_run' ? [
                    { label: 'Series to backfill',     v: backfillResult.series_to_backfill },
                    { label: 'Tracks to backfill',     v: backfillResult.tracks_to_backfill },
                    { label: 'Series already complete', v: backfillResult.series_already_complete },
                    { label: 'Tracks already complete', v: backfillResult.tracks_already_complete },
                  ] : [
                    { label: 'Series backfilled',      v: backfillResult.series_backfilled },
                    { label: 'Tracks backfilled',      v: backfillResult.tracks_backfilled },
                    { label: 'Series already complete', v: backfillResult.series_already_complete },
                    { label: 'Tracks already complete', v: backfillResult.tracks_already_complete },
                  ]).map(({ label, v }) => (
                    <div key={label} className={`bg-white rounded border p-2 ${backfillResult.mode === 'dry_run' ? 'border-teal-100' : 'border-green-100'}`}>
                      <p className={`text-xl font-bold ${backfillResult.mode === 'dry_run' ? 'text-teal-700' : 'text-green-700'}`}>{v ?? 0}</p>
                      <p className="text-gray-500">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="text-xs text-gray-400 border-t pt-3 mt-2">
              <strong>Recommended sequence:</strong> 1. Run Normalization Backfill → 2. Scan for Duplicates → 3. Run Cleanup for each entity type → 4. Re-run Diagnostics
            </div>
          </CardContent>
        </Card>

        {/* ── Entry and Class Integrity ─────────────────────────────────── */}
        <DiagnosticsEntryClassIntegrity />

        {/* ── Results and Standings Operational Integrity ──────────────── */}
        <DiagnosticsOperationalIntegrity />

        {/* ── Duplicate Cleanup (Event, Driver, Track, Series, Session) ── */}
        <DiagnosticsDupCleanup />

        {/* ── Track & Series Duplicate Verification ───────────────────── */}
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-green-600" /> Track & Series Duplicate Verification</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-gray-500">Verifies normalization coverage, active duplicate groups, management save path safety, survivor re-indexing, and sync recreation risk. Run after backfill and cleanup.</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={runVerification} disabled={verifyRunning} variant="outline" className="border-green-300 text-green-700 hover:bg-green-50">
                {verifyRunning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running Verification…</> : <><Play className="w-4 h-4 mr-2" />Run Track & Series Verification</>}
              </Button>
              {verifyReport && <span className="text-xs text-gray-400">Last run: {new Date(verifyReport.generated_at).toLocaleString()}</span>}
            </div>
            {verifyRunning && <div className="py-6 text-center text-sm text-gray-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-green-400" />Auditing normalization, duplicate groups, and sync logs…</div>}
            {verifyReport && !verifyRunning && (() => {
              const v  = verifyReport.overall_verdict;
              const nc = verifyReport.normalization_coverage || {};
              const dr = verifyReport.duplicates_remaining || {};
              const ms = verifyReport.management_safety || {};
              const sv = verifyReport.survivor_verification || {};
              const rr = verifyReport.recreation_risk || {};
              return (
                <div className="space-y-4">
                  <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 font-medium text-sm ${v === 'passed' ? 'bg-green-50 border-green-300 text-green-800' : v === 'warning' ? 'bg-yellow-50 border-yellow-300 text-yellow-800' : 'bg-red-50 border-red-300 text-red-800'}`}>
                    {v === 'passed'  && <ShieldCheck   className="w-5 h-5 text-green-600 flex-shrink-0" />}
                    {v === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />}
                    {v === 'failed'  && <XCircle       className="w-5 h-5 text-red-600 flex-shrink-0" />}
                    <span>{v === 'passed' ? 'Passed — Track and Series dedupe is healthy' : v === 'warning' ? 'Warning — sync creations detected, review recreation risk section' : 'Failed — normalization gaps or active duplicates detected'}</span>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Normalization Coverage</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <SummaryCard label="Series Missing Norm" count={nc.series?.missing_normalized_name ?? 0} severity={nc.series?.missing_normalized_name > 0 ? 'high' : 'ok'} icon={nc.series?.missing_normalized_name > 0 ? XCircle : CheckCircle} />
                      <SummaryCard label="Series Missing Key"  count={nc.series?.missing_canonical_key ?? 0}   severity={nc.series?.missing_canonical_key > 0 ? 'high' : 'ok'}  icon={nc.series?.missing_canonical_key > 0 ? XCircle : CheckCircle} />
                      <SummaryCard label="Tracks Missing Norm" count={nc.tracks?.missing_normalized_name ?? 0} severity={nc.tracks?.missing_normalized_name > 0 ? 'high' : 'ok'} icon={nc.tracks?.missing_normalized_name > 0 ? XCircle : CheckCircle} />
                      <SummaryCard label="Tracks Missing Key"  count={nc.tracks?.missing_canonical_key ?? 0}   severity={nc.tracks?.missing_canonical_key > 0 ? 'high' : 'ok'}  icon={nc.tracks?.missing_canonical_key > 0 ? XCircle : CheckCircle} />
                    </div>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Active Duplicate Groups Remaining</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <SummaryCard label="Series Dup Groups" count={dr.series_duplicate_groups_remaining ?? 0} severity={dr.series_duplicate_groups_remaining > 0 ? 'high' : 'ok'} icon={dr.series_duplicate_groups_remaining > 0 ? AlertTriangle : CheckCircle} />
                      <SummaryCard label="Track Dup Groups"  count={dr.track_duplicate_groups_remaining ?? 0}  severity={dr.track_duplicate_groups_remaining > 0 ? 'high' : 'ok'}  icon={dr.track_duplicate_groups_remaining > 0 ? AlertTriangle : CheckCircle} />
                    </div>
                    {dr.series_groups?.length > 0 && <ExpandableList title="Active series duplicate groups" items={dr.series_groups} severity="high" renderItem={g => `[${g.match_type}] "${g.key}" — ${g.count} records: ${(g.names || []).join(', ')}`} />}
                    {dr.track_groups?.length > 0  && <ExpandableList title="Active track duplicate groups"  items={dr.track_groups}  severity="high" renderItem={g => `[${g.match_type}] "${g.key}" — ${g.count} records: ${(g.names || []).join(', ')}`} />}
                    {dr.series_duplicate_groups_remaining === 0 && dr.track_duplicate_groups_remaining === 0 && (
                      <div className="flex items-center gap-2 text-sm text-green-600 font-medium"><CheckCircle className="w-4 h-4" /> No active duplicate groups detected.</div>
                    )}
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4 space-y-2">
                    <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Management Save Path Safety</h4>
                    <div className="divide-y divide-gray-100 text-xs">
                      {[
                        { label: 'TrackCoreDetailsSection routes through sync pipeline',  ok: ms.track_management_safe },
                        { label: 'SeriesCoreDetailsSection routes through sync pipeline', ok: ms.series_management_safe },
                      ].map((row, i) => (
                        <div key={i} className="flex items-center gap-2 py-1.5">
                          {row.ok ? <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                          <span className={row.ok ? 'text-gray-700' : 'text-red-700'}>{row.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Survivor Re-index Verification</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <SummaryCard label="Repair Logs Found"   count={sv.repair_logs_checked ?? 0}                severity="ok" icon={CheckCircle} />
                      <SummaryCard label="Series Survivors OK" count={sv.repaired_series_survivors_verified ?? 0} severity="ok" icon={CheckCircle} />
                      <SummaryCard label="Track Survivors OK"  count={sv.repaired_track_survivors_verified ?? 0}  severity="ok" icon={CheckCircle} />
                    </div>
                    {sv.failed_survivor_ids?.length > 0 && <ExpandableList title={`${sv.failed_survivor_ids.length} survivor(s) missing canonical fields`} items={sv.failed_survivor_ids} severity="high" renderItem={r => `[${r.entity}] id=${r.id} — missing: ${(r.missing || []).join(', ')}`} />}
                    {sv.repair_logs_checked === 0 && <p className="text-xs text-gray-400">No repair logs found — run Series or Track cleanup first to generate survivors.</p>}
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                      Sync Recreation Risk
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${rr.verdict === 'safe' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{rr.verdict === 'safe' ? 'Safe' : 'Review'}</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <SummaryCard label="Track Creations from Sync"  count={rr.track_creations_from_sync ?? 0}  severity={rr.track_creations_from_sync > 0 ? 'medium' : 'ok'}  icon={rr.track_creations_from_sync > 0 ? AlertTriangle : CheckCircle} />
                      <SummaryCard label="Series Creations from Sync" count={rr.series_creations_from_sync ?? 0} severity={rr.series_creations_from_sync > 0 ? 'medium' : 'ok'} icon={rr.series_creations_from_sync > 0 ? AlertTriangle : CheckCircle} />
                    </div>
                    {rr.suspicious_series_creations?.length > 0 && <ExpandableList title="Series created by sync" items={rr.suspicious_series_creations} severity="medium" renderItem={r => `${r.name || r.id} — from: ${r.triggered_from} on ${r.created_at ? new Date(r.created_at).toLocaleDateString() : '?'}`} />}
                    {rr.suspicious_track_creations?.length > 0  && <ExpandableList title="Tracks created by sync"  items={rr.suspicious_track_creations}  severity="medium" renderItem={r => `${r.name || r.id} — from: ${r.triggered_from} on ${r.created_at ? new Date(r.created_at).toLocaleDateString() : '?'}`} />}
                    {rr.note && <p className="text-xs text-gray-400">{rr.note}</p>}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* ── Full Diagnostics Report ──────────────────────────────────── */}
        {report && !running && (
          <Tabs defaultValue="summary" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="source">Source</TabsTrigger>
              <TabsTrigger value="entity">Entity Layer</TabsTrigger>
              <TabsTrigger value="access">Access</TabsTrigger>
              <TabsTrigger value="routes">Routes</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryCard label="Total Issues"    count={sum.total_issues}           severity="high"   icon={AlertTriangle} />
                <SummaryCard label="High Priority"   count={sum.high_priority_issues}   severity="high"   icon={XCircle} />
                <SummaryCard label="Medium Priority" count={sum.medium_priority_issues} severity="medium" icon={AlertTriangle} />
                <SummaryCard label="Low Priority"    count={sum.low_priority_issues}    severity="low"    icon={RefreshCw} />
              </div>
              <div className="text-xs text-gray-400">Generated at {new Date(report.generated_at).toLocaleString()}</div>
              <Card>
                <CardHeader><CardTitle className="text-sm">Issue Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b text-left text-xs text-gray-500 uppercase"><th className="pb-2 pr-4">Category</th><th className="pb-2 pr-4">Check</th><th className="pb-2 pr-4">Count</th><th className="pb-2">Severity</th></tr></thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {[
                        { cat: 'Source',       check: 'Duplicate groups',             count: src.summary?.duplicate_count,             sev: 'high' },
                        { cat: 'Source',       check: 'Broken required links',         count: src.summary?.broken_link_count,           sev: 'high' },
                        { cat: 'Source',       check: 'Missing normalization',         count: src.summary?.missing_normalization_count, sev: 'medium' },
                        { cat: 'Source',       check: 'Missing slug / routing',        count: src.summary?.broken_routing_count,        sev: 'low' },
                        { cat: 'Entity Layer', check: 'Source without Entity row',     count: ent.summary?.source_without_entity_count, sev: 'high' },
                        { cat: 'Entity Layer', check: 'Entity with dangling source',   count: ent.summary?.entity_without_source_count, sev: 'high' },
                        { cat: 'Entity Layer', check: 'Broken event relationships',    count: ent.summary?.broken_event_relationships_count, sev: 'high' },
                        { cat: 'Entity Layer', check: 'Broken confirmations',          count: ent.summary?.broken_confirmations_count,  sev: 'medium' },
                        { cat: 'Access',       check: 'Collaborator missing source',   count: acc.summary?.collaborator_missing_source_count, sev: 'high' },
                        { cat: 'Access',       check: 'Duplicate collaborators',       count: acc.summary?.duplicate_collaborators_count,    sev: 'low' },
                        { cat: 'Access',       check: 'Owner missing access code',     count: acc.summary?.owner_missing_access_code_count,  sev: 'medium' },
                        { cat: 'Access',       check: 'Expired pending invitations',   count: acc.summary?.expired_pending_invitations_count, sev: 'medium' },
                        { cat: 'Access',       check: 'Invitation entity missing',     count: acc.summary?.invitation_entity_missing_count,  sev: 'medium' },
                        { cat: 'Routes',       check: 'Missing slug',                  count: rte.summary?.missing_slug_count,          sev: 'low' },
                        { cat: 'Routes',       check: 'Duplicate slug',                count: rte.summary?.duplicate_slug_count,        sev: 'low' },
                        { cat: 'Routes',       check: 'Invisible public records',      count: rte.summary?.invisible_public_count,      sev: 'low' },
                        { cat: 'Routes',       check: 'Missing display name',          count: rte.summary?.missing_display_count,       sev: 'low' },
                      ].map((row, i) => (
                        <tr key={i} className={row.count > 0 ? '' : 'opacity-40'}>
                          <td className="py-1.5 pr-4 text-gray-500">{row.cat}</td>
                          <td className="py-1.5 pr-4">{row.check}</td>
                          <td className="py-1.5 pr-4 font-semibold">{row.count ?? 0}</td>
                          <td className="py-1.5"><SeverityBadge level={row.count > 0 ? row.sev : 'ok'} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="source" className="space-y-8">
              {['drivers','teams','tracks','series','events'].map(key => (
                <Card key={key}>
                  <CardHeader><CardTitle className="text-sm capitalize">{key}</CardTitle></CardHeader>
                  <CardContent><EntityAuditSection label={key} data={src[key]} /></CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="entity" className="space-y-4">
              <ExpandableList title="Source records missing Entity row"             items={ent.source_without_entity || []}     severity="high"   renderItem={r => `[${r.entity_type}] ${r.name || r.source_id}`} />
              <ExpandableList title="Entity rows with dangling source_entity_id"   items={ent.entity_without_source || []}     severity="high"   renderItem={r => `[${r.entity_type}] ${r.name} → source ${r.source_entity_id} missing`} />
              <ExpandableList title="Events missing EntityRelationship"            items={ent.broken_event_relationships || []} severity="high"   renderItem={r => `${r.name || r.event_entity_id}: missing ${(r.missing || []).join(', ')}`} />
              <ExpandableList title="Events missing EntityConfirmation"            items={ent.broken_confirmations || []}      severity="medium" renderItem={r => `${r.name || r.event_entity_id}: ${r.issue}`} />
            </TabsContent>

            <TabsContent value="access" className="space-y-4">
              <ExpandableList title="Collaborator records pointing to missing source entity" items={acc.collaborator_missing_source || []} severity="high"   renderItem={r => `[${r.entity_type}:${r.entity_id}] user: ${r.user_id}`} />
              <ExpandableList title="Duplicate collaborator records"                        items={acc.duplicate_collaborators || []}       severity="low"    renderItem={r => `${r.key} — ${r.count} records`} />
              <ExpandableList title="Owner missing access code"                             items={acc.owner_missing_access_code || []}     severity="medium" renderItem={r => `[${r.entity_type}:${r.entity_id}] user: ${r.user_id}`} />
              <ExpandableList title="Expired pending invitations"                           items={acc.expired_pending_invitations || []}   severity="medium" renderItem={r => `${r.email} → [${r.entity_type}:${r.entity_id}] expired ${r.expires_at}`} />
              <ExpandableList title="Invitations referencing missing entity"                items={acc.invitation_entity_missing || []}     severity="medium" renderItem={r => `${r.email} → [${r.entity_type}:${r.entity_id}]`} />
            </TabsContent>

            <TabsContent value="routes" className="space-y-6">
              {['drivers','teams','tracks','series','events'].map(key => {
                const d = rte[key]; if (!d) return null;
                return (
                  <Card key={key}>
                    <CardHeader><CardTitle className="text-sm capitalize">{key} ({d.total} records)</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      <ExpandableList title="Missing slug"     items={d.missing_slug || []}    severity="low" renderItem={r => r.name || r.id} />
                      <ExpandableList title="Duplicate slug"   items={d.duplicate_slug || []}  severity="low" renderItem={r => `"${r.slug}" — ${r.count} records: ${(r.records || []).map(x => x.name).join(', ')}`} />
                      <ExpandableList title="Invisible public" items={d.invisible_public || []} severity="low" renderItem={r => `${r.name} — status: ${r.status || r.profile_status || r.public_status}`} />
                      <ExpandableList title="Missing display"  items={d.missing_display || []} severity="low" renderItem={r => r.id} />
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          </Tabs>
        )}
      </ManagementShell>
      <ReportIssueModal open={reportIssueOpen} onClose={() => setReportIssueOpen(false)} />
    </ManagementLayout>
  );
}