import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Play, Loader2, CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronRight,
  ShieldCheck, Camera, DollarSign, FileText, Users, Link, Eye, Shield, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  healthy:          { color: 'bg-green-50 border-green-300 text-green-800',  icon: CheckCircle,     dot: 'bg-green-500',  label: 'Healthy' },
  minor_warnings:   { color: 'bg-yellow-50 border-yellow-300 text-yellow-800', icon: AlertTriangle,  dot: 'bg-yellow-500', label: 'Minor Warnings' },
  attention_needed: { color: 'bg-orange-50 border-orange-300 text-orange-800', icon: AlertTriangle,  dot: 'bg-orange-500', label: 'Attention Needed' },
  critical:         { color: 'bg-red-50 border-red-300 text-red-800',         icon: XCircle,        dot: 'bg-red-500',    label: 'Critical' },
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

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.minor_warnings;
  const Icon = cfg.icon;
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
  const detailKey = sectionKey.replace('_status', '').replace('route', 'routes').replace('access', 'access_control').replace('credential', 'credentials').replace('editorial', 'editorial').replace('assignment', 'assignments').replace('rights', 'rights').replace('payment', 'payments').replace('communication', 'system_communication').replace('public_visibility', 'public_visibility').replace('entity_integration', 'entity_integration');
  const detail = report.details?.[detailKey] || report.details?.[sectionKey.replace('_status', '')];
  const checks = detail?.checks || [];
  const fails = checks.filter(c => c.status === 'fail').length;
  const warns = checks.filter(c => c.status === 'warn').length;
  const Icon = SECTION_ICONS[sectionKey] || Shield;
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.minor_warnings;

  return (
    <div className={`border rounded-lg overflow-hidden ${fails > 0 ? 'border-red-200' : warns > 0 ? 'border-yellow-200' : 'border-green-200'}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/60 hover:bg-white/80 text-sm font-medium"
      >
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
        <div className="px-4 pb-4 pt-2 bg-gray-50/60 border-t border-gray-100">
          <CheckList checks={checks} />
          {detail?.warnings?.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide">Warnings</p>
              {detail.warnings.map((w, i) => (
                <div key={i} className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">{w}</div>
              ))}
            </div>
          )}
          {detail?.failures?.length > 0 && (
            <div className="mt-3 space-y-1">
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

export default function DiagnosticsMediaEcosystem() {
  const [report, setReport] = useState(null);
  const [running, setRunning] = useState(false);

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

  const SECTION_KEYS = Object.keys(SECTION_LABELS).map(k => k + '_status').filter(k => k !== 'entity_integration_status_status');
  const ORDERED_KEYS = [
    'entity_integration_status',
    'route_status',
    'access_status',
    'public_visibility_status',
    'credential_status',
    'editorial_status',
    'assignment_status',
    'rights_status',
    'payment_status',
    'communication_status',
  ];

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Camera className="w-4 h-4 text-blue-600" /> Media Ecosystem Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-gray-500">
          Full audit of the media ecosystem: entity integration, routes, access control, public visibility, RaceCore credentials,
          editorial pipeline, assignments, rights, payments, and system communication. Surfaces schema conflicts, broken references,
          permission leaks, and launch blockers.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={runAudit}
            disabled={running}
            variant="outline"
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            {running
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running Media Ecosystem Audit…</>
              : <><Play className="w-4 h-4 mr-2" />Run Media Ecosystem Audit</>}
          </Button>
          {report && (
            <span className="text-xs text-gray-400">
              Last run: {new Date(report.generated_at).toLocaleString()} —
              {report.summary?.total_checks} checks,
              {' '}{report.summary?.failures_count} failures,
              {' '}{report.summary?.warnings_count} warnings
            </span>
          )}
        </div>

        {running && (
          <div className="py-8 text-center text-sm text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-400" />
            Auditing all media ecosystem layers — entity integration, routes, access, visibility, credentials, editorial, assignments, rights, payments, communication…
          </div>
        )}

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
      </CardContent>
    </Card>
  );
}