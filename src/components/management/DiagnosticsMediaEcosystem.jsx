import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Play, Loader2, CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronRight,
  ShieldCheck, Camera, DollarSign, FileText, Users, Link, Eye, Shield, RefreshCw,
  Wrench, CheckCheck, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  healthy:          { color: 'bg-green-50 border-green-300 text-green-800',   icon: CheckCircle,   dot: 'bg-green-500',  label: 'Healthy' },
  minor_warnings:   { color: 'bg-yellow-50 border-yellow-300 text-yellow-800', icon: AlertTriangle, dot: 'bg-yellow-500', label: 'Minor Warnings' },
  attention_needed: { color: 'bg-orange-50 border-orange-300 text-orange-800', icon: AlertTriangle, dot: 'bg-orange-500', label: 'Attention Needed' },
  critical:         { color: 'bg-red-50 border-red-300 text-red-800',          icon: XCircle,       dot: 'bg-red-500',   label: 'Critical' },
};

const SECTION_ICONS = {
  entity_integration_status: Link,
  route_status: RefreshCw,
  access_status: Shield,
  public_visibility_status: Eye,
  credential_status: ShieldCheck,
  editorial_status: FileText,
  assignment_status: Users,
  rights_status: Camera,
  payment_status: DollarSign,
  communication_status: RefreshCw,
};

const SECTION_LABELS = {
  entity_integration_status: 'Entity Integration',
  route_status: 'Routes & Placement',
  access_status: 'Access Control',
  public_visibility_status: 'Public Visibility',
  credential_status: 'RaceCore Credentials',
  editorial_status: 'Editorial Integration',
  assignment_status: 'Assignment Workflow',
  rights_status: 'Rights & Assets',
  payment_status: 'Payment Foundation',
  communication_status: 'System Communication',
};

const ORDERED_KEYS = [
  'entity_integration_status', 'route_status', 'access_status', 'public_visibility_status',
  'credential_status', 'editorial_status', 'assignment_status', 'rights_status',
  'payment_status', 'communication_status',
];

// ── Detail key mapping ────────────────────────────────────────────────────────
const DETAIL_KEY_MAP = {
  entity_integration_status: 'entity_integration',
  route_status: 'routes',
  access_status: 'access_control',
  public_visibility_status: 'public_visibility',
  credential_status: 'credentials',
  editorial_status: 'editorial',
  assignment_status: 'assignments',
  rights_status: 'rights',
  payment_status: 'payments',
  communication_status: 'system_communication',
};

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.minor_warnings;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function CheckList({ checks = [], maxVisible = 20 }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? checks : checks.slice(0, maxVisible);
  return (
    <div className="space-y-1">
      {visible.map((c, i) => {
        const icon = c.status === 'pass'
          ? <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
          : c.status === 'warn'
            ? <AlertTriangle className="w-3 h-3 text-yellow-500 flex-shrink-0 mt-0.5" />
            : <XCircle className="w-3 h-3 text-red-500 flex-shrink-0 mt-0.5" />;
        return (
          <div key={i} className="flex items-start gap-1.5 text-xs">
            {icon}
            <span className={c.status === 'fail' ? 'text-red-700' : c.status === 'warn' ? 'text-yellow-700' : 'text-gray-600'}>
              {c.label}
              {c.detail && <span className="ml-1 text-gray-400">— {c.detail}</span>}
            </span>
          </div>
        );
      })}
      {checks.length > maxVisible && (
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-blue-600 hover:underline mt-1">
          {expanded ? 'Show less' : `Show all ${checks.length} checks`}
        </button>
      )}
    </div>
  );
}

function SectionPanel({ sectionKey, report }) {
  const [open, setOpen] = useState(false);
  const status = report[sectionKey];
  const detail = report.details?.[DETAIL_KEY_MAP[sectionKey]];
  const checks = detail?.checks || [];
  const fails = checks.filter(c => c.status === 'fail').length;
  const warns = checks.filter(c => c.status === 'warn').length;
  const Icon = SECTION_ICONS[sectionKey] || Shield;

  return (
    <div className={`border rounded-lg overflow-hidden ${fails > 0 ? 'border-red-200' : warns > 0 ? 'border-yellow-200' : 'border-green-200'}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 bg-white/60 hover:bg-white/80 text-sm font-medium">
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
          <Icon className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-gray-800">{SECTION_LABELS[sectionKey]}</span>
          <span className="text-xs text-gray-400">({checks.length} checks)</span>
        </div>
        <div className="flex items-center gap-2">
          {fails > 0 && <span className="flex items-center gap-1 text-xs text-red-600"><XCircle className="w-3 h-3" />{fails}</span>}
          {warns > 0 && <span className="flex items-center gap-1 text-xs text-yellow-600"><AlertTriangle className="w-3 h-3" />{warns}</span>}
          <StatusPill status={status} />
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 bg-gray-50/60 border-t border-gray-100 space-y-3">
          <CheckList checks={checks} />
          {detail?.warnings?.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide">Warnings</p>
              {detail.warnings.map((w, i) => (
                <div key={i} className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">{w}</div>
              ))}
            </div>
          )}
          {detail?.failures?.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Failures</p>
              {detail.failures.map((f, i) => (
                <div key={i} className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">{f}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FixLogEntry({ fix }) {
  const [open, setOpen] = useState(false);
  const severityColor = { critical: 'text-red-700 bg-red-50 border-red-200', high: 'text-orange-700 bg-orange-50 border-orange-200', medium: 'text-yellow-700 bg-yellow-50 border-yellow-200', low: 'text-blue-700 bg-blue-50 border-blue-200' };
  const sc = severityColor[fix.severity] || severityColor.low;
  return (
    <div className={`border rounded-lg overflow-hidden ${fix.resolved_boolean ? 'border-green-200' : 'border-red-200'}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3 py-2.5 bg-white/60 hover:bg-white/80 text-xs font-medium">
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
          {fix.resolved_boolean
            ? <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
            : <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
          <span className="font-mono text-gray-500">{fix.fix_id}</span>
          <span className="text-gray-700">{fix.issue_description}</span>
        </div>
        <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${sc}`}>{fix.severity}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 bg-gray-50/50 border-t border-gray-100 space-y-1.5 text-xs text-gray-600">
          <div><span className="font-semibold text-gray-500">Root cause:</span> {fix.root_cause}</div>
          <div><span className="font-semibold text-gray-500">Fix applied:</span> {fix.fix_applied}</div>
          <div><span className="font-semibold text-gray-500">Entities:</span> {fix.entities_affected?.join(', ')}</div>
          {fix.notes && <div><span className="font-semibold text-gray-500">Notes:</span> {fix.notes}</div>}
        </div>
      )}
    </div>
  );
}

export default function DiagnosticsMediaEcosystem() {
  const [report, setReport] = useState(null);
  const [running, setRunning] = useState(false);
  const [fixResult, setFixResult] = useState(null);
  const [fixRunning, setFixRunning] = useState(false);
  const [fixMode, setFixMode] = useState('dry_run'); // 'dry_run' | 'live'

  const runAudit = async () => {
    setRunning(true);
    setReport(null);
    try {
      const res = await base44.functions.invoke('buildMediaEcosystemHealthReport', {});
      if (res.data?.error) throw new Error(res.data.error);
      setReport(res.data);
      const s = res.data.overall_status;
      if (s === 'healthy') toast.success('Media Ecosystem Audit — all systems healthy');
      else if (s === 'critical') toast.error(`Media Ecosystem Audit — CRITICAL: ${res.data.launch_blockers?.length} blocker(s)`);
      else toast.success(`Media Ecosystem Audit complete — ${s}`);
    } catch (err) {
      toast.error(`Audit failed: ${err.message}`);
    }
    setRunning(false);
  };

  const runFixCycle = async (dry_run = true) => {
    setFixRunning(true);
    setFixResult(null);
    setFixMode(dry_run ? 'dry_run' : 'live');
    try {
      const res = await base44.functions.invoke('runMediaEcosystemFixCycle', { dry_run });
      if (res.data?.error) throw new Error(res.data.error);
      setFixResult(res.data);
      const d = res.data;
      if (dry_run) {
        toast.success(`Fix scan complete — ${d.issues_reviewed} issues reviewed, ${d.unresolved_count} need attention`);
      } else {
        if (d.launch_ready) toast.success(`Fix cycle complete — ${d.fixes_applied} fixes applied, platform stable`);
        else toast.error(`Fix cycle complete — ${d.fixes_applied} applied, ${d.unresolved_count} unresolved`);
      }
    } catch (err) {
      toast.error(`Fix cycle failed: ${err.message}`);
    }
    setFixRunning(false);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Camera className="w-4 h-4 text-blue-600" /> Media Ecosystem Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-gray-500">
          Full audit and fix cycle for the media ecosystem — entity integration, routes, access, credentials, editorial, assignments, rights, payments, and communication.
        </p>

        {/* ── Action Buttons ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={runAudit} disabled={running || fixRunning} variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50">
            {running ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running Audit…</> : <><Play className="w-4 h-4 mr-2" />Run Full Audit</>}
          </Button>
          <Button onClick={() => runFixCycle(true)} disabled={running || fixRunning} variant="outline" className="border-teal-300 text-teal-700 hover:bg-teal-50">
            {fixRunning && fixMode === 'dry_run' ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning…</> : <><Play className="w-4 h-4 mr-2" />Scan Issues (Dry Run)</>}
          </Button>
          <Button onClick={() => runFixCycle(false)} disabled={running || fixRunning} variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50">
            {fixRunning && fixMode === 'live' ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Applying Fixes…</> : <><Wrench className="w-4 h-4 mr-2" />Run Fix Cycle</>}
          </Button>
          {report && (
            <span className="text-xs text-gray-400 ml-1">
              Last audit: {new Date(report.generated_at).toLocaleString()} — {report.summary?.total_checks} checks
            </span>
          )}
        </div>

        {(running || fixRunning) && (
          <div className="py-6 text-center text-sm text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-400" />
            {running ? 'Auditing all media ecosystem layers…' : fixMode === 'dry_run' ? 'Scanning for issues…' : 'Applying fixes…'}
          </div>
        )}

        {/* ── Health Report Results ──────────────────────────────────────── */}
        {report && !running && (
          <div className="space-y-4">
            {/* Overall banner */}
            {(() => {
              const cfg = STATUS_CONFIG[report.overall_status] || STATUS_CONFIG.minor_warnings;
              const Icon = cfg.icon;
              return (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 font-medium text-sm ${cfg.color}`}>
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <span>Overall: {cfg.label}</span>
                    <span className="text-xs font-normal ml-2 opacity-70">
                      {report.summary?.total_checks} checks · {report.summary?.failures_count} failures · {report.summary?.warnings_count} warnings
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Launch blockers */}
            {report.launch_blockers?.length > 0 && (
              <div className="bg-red-50 border border-red-300 rounded-lg p-4 space-y-2">
                <p className="text-sm font-semibold text-red-800 flex items-center gap-2">
                  <XCircle className="w-4 h-4" /> {report.launch_blockers.length} Launch Blocker(s)
                </p>
                {report.launch_blockers.map((b, i) => (
                  <div key={i} className="text-xs text-red-700 bg-red-100 border border-red-200 rounded px-2 py-1">{b}</div>
                ))}
              </div>
            )}

            {/* Quick status grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {ORDERED_KEYS.map(key => {
                const status = report[key];
                const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.minor_warnings;
                const Icon = SECTION_ICONS[key] || Shield;
                return (
                  <div key={key} className={`rounded-lg border px-3 py-2.5 text-center ${cfg.color}`}>
                    <Icon className="w-4 h-4 mx-auto mb-1 opacity-70" />
                    <p className="text-[10px] font-semibold">{SECTION_LABELS[key]}</p>
                    <p className="text-xs font-bold mt-0.5">{cfg.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Recommended fixes */}
            {report.recommended_fixes?.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Recommended Fixes</p>
                {report.recommended_fixes.slice(0, 10).map((fix, i) => (
                  <div key={i} className={`text-xs px-3 py-1.5 rounded border ${fix.startsWith('BLOCKER') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-yellow-50 border-yellow-200 text-yellow-700'}`}>
                    {fix}
                  </div>
                ))}
              </div>
            )}

            {/* Section detail panels */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Section Details</p>
              {ORDERED_KEYS.map(key => (
                <SectionPanel key={key} sectionKey={key} report={report} />
              ))}
            </div>
          </div>
        )}

        {/* ── Fix Cycle Results ──────────────────────────────────────────── */}
        {fixResult && !fixRunning && (
          <div className="space-y-4 border-t border-gray-200 pt-4 mt-4">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-orange-600" />
              <p className="text-sm font-semibold text-gray-700">
                Fix Cycle Results — {fixResult.mode === 'dry_run' ? 'Dry Run (Preview)' : 'Live'}
              </p>
            </div>

            {/* Fix summary banner */}
            {(() => {
              const allGood = fixResult.launch_ready;
              return (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 font-medium text-sm ${allGood ? 'bg-green-50 border-green-300 text-green-800' : 'bg-yellow-50 border-yellow-300 text-yellow-800'}`}>
                  {allGood ? <CheckCheck className="w-5 h-5 text-green-600 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />}
                  <div>
                    <span>{allGood ? 'Platform stable — all critical/high issues resolved' : 'Issues remain — review fix log below'}</span>
                    <span className="text-xs font-normal ml-2 opacity-70">
                      {fixResult.issues_reviewed} reviewed · {fixResult.fixes_applied} applied · {fixResult.unresolved_count} unresolved
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Severity summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: 'Critical', items: fixResult.issues_by_severity?.critical || [], color: 'border-red-200 bg-red-50 text-red-700' },
                { label: 'High',     items: fixResult.issues_by_severity?.high || [],     color: 'border-orange-200 bg-orange-50 text-orange-700' },
                { label: 'Medium',   items: fixResult.issues_by_severity?.medium || [],   color: 'border-yellow-200 bg-yellow-50 text-yellow-700' },
                { label: 'Low',      items: fixResult.issues_by_severity?.low || [],      color: 'border-blue-200 bg-blue-50 text-blue-700' },
              ].map(({ label, items, color }) => (
                <div key={label} className={`rounded-lg border px-3 py-2 text-center text-xs ${color}`}>
                  <p className="text-lg font-bold">{items.length}</p>
                  <p className="font-semibold">{label}</p>
                  <p className="opacity-70">{items.filter(i => i.resolved_boolean).length} resolved</p>
                </div>
              ))}
            </div>

            {/* Unresolved items */}
            {fixResult.unresolved_items?.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                <p className="text-xs font-semibold text-red-800">{fixResult.unresolved_items.length} Unresolved Item(s)</p>
                {fixResult.unresolved_items.map((item, i) => (
                  <div key={i} className="text-xs text-red-700">{item.fix_id}: {item.issue_description}</div>
                ))}
              </div>
            )}

            {/* Full fix log */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fix Log ({fixResult.fix_log?.length} entries)</p>
              {fixResult.fix_log?.map((fix, i) => (
                <FixLogEntry key={i} fix={fix} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}