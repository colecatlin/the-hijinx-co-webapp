import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle, AlertTriangle, XCircle, RefreshCw, Loader2,
  ChevronDown, ChevronRight, Wrench, Play, Copy, CheckCheck,
} from 'lucide-react';
import { toast } from 'sonner';

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
  const c = data.counts || {};
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        {label}
        <span className="text-xs text-gray-400 font-normal">({data.total_records ?? 0} records)</span>
      </h4>
      <ExpandableList
        title="Duplicate groups"
        items={data.duplicate_groups || []}
        severity="high"
        renderItem={g => `[${g.match_type}] "${g.key}" — ${g.count} records: ${(g.records || []).map(r => r.name).join(', ')}`}
      />
      <ExpandableList
        title="Missing normalization"
        items={data.missing_normalization || []}
        severity="medium"
        renderItem={r => `${r.name || r.id} — missing: ${(r.missing || []).join(', ')}`}
      />
      <ExpandableList
        title="Missing slug (routing)"
        items={data.broken_routing || []}
        severity="low"
        renderItem={r => r.name || r.id}
      />
      <ExpandableList
        title="Broken required links"
        items={data.broken_required_links || []}
        severity="high"
        renderItem={r => `${r.name || r.id}: ${(r.issues || []).join('; ')}`}
      />
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

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const runDiagnostics = async () => {
    setRunning(true);
    setReport(null);
    setRepairResult(null);
    try {
      const res = await base44.functions.invoke('runFullPlatformDiagnostics', {});
      if (res.data?.error) throw new Error(res.data.error);
      setReport(res.data);
      toast.success('Diagnostics complete');
    } catch (err) {
      toast.error(`Diagnostics failed: ${err.message}`);
    }
    setRunning(false);
  };

  const runRepairs = async () => {
    setRepairing(true);
    setRepairResult(null);
    try {
      const res = await base44.functions.invoke('runBasicIntegrityRepairs', {});
      if (res.data?.error) throw new Error(res.data.error);
      setRepairResult(res.data);
      toast.success('Safe repairs completed — re-running diagnostics…');
      await runDiagnostics();
    } catch (err) {
      toast.error(`Repairs failed: ${err.message}`);
      setRepairing(false);
    }
  };

  const copyReport = () => {
    if (!report) return;
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (user?.role !== 'admin') {
    return (
      <ManagementLayout currentPage="Diagnostics">
        <ManagementShell title="Access Denied" subtitle="">
          <div className="py-20 text-center">
            <p className="text-gray-600">This page is for administrators only.</p>
          </div>
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
      <ManagementShell
        title="Platform Diagnostics"
        subtitle="Admin-only integrity audit and safe repair tooling"
      >
        {/* ── Action bar ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Button
            onClick={runDiagnostics}
            disabled={running || repairing}
            className="bg-gray-900 text-white"
          >
            {running ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running…</> : <><Play className="w-4 h-4 mr-2" />Run Diagnostics</>}
          </Button>

          {report && (
            <>
              <Button
                onClick={runRepairs}
                disabled={running || repairing}
                variant="outline"
                className="border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                {repairing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Repairing…</> : <><Wrench className="w-4 h-4 mr-2" />Run Safe Repairs</>}
              </Button>

              <Button variant="outline" onClick={copyReport} className="ml-auto">
                {copied ? <><CheckCheck className="w-4 h-4 mr-2 text-green-600" />Copied</> : <><Copy className="w-4 h-4 mr-2" />Copy Report JSON</>}
              </Button>
            </>
          )}
        </div>

        {/* ── Repair result banner ─────────────────────────────────────────── */}
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
              {repairResult.skipped_count > 0 && (
                <p className="text-xs text-yellow-700 mt-2">{repairResult.skipped_count} items skipped (see raw JSON for details)</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── No report yet ────────────────────────────────────────────────── */}
        {!report && !running && (
          <Card>
            <CardContent className="py-20 text-center">
              <AlertTriangle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No diagnostics report yet.</p>
              <p className="text-gray-400 text-sm mt-1">Click "Run Diagnostics" to scan the platform.</p>
            </CardContent>
          </Card>
        )}

        {running && (
          <Card>
            <CardContent className="py-20 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Running full platform audit — this may take 10–30 seconds…</p>
            </CardContent>
          </Card>
        )}

        {/* ── Report ──────────────────────────────────────────────────────── */}
        {report && !running && (
          <Tabs defaultValue="summary" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="source">Source</TabsTrigger>
              <TabsTrigger value="entity">Entity Layer</TabsTrigger>
              <TabsTrigger value="access">Access</TabsTrigger>
              <TabsTrigger value="routes">Routes</TabsTrigger>
            </TabsList>

            {/* ── Summary tab ─────────────────────────────────────────────── */}
            <TabsContent value="summary" className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryCard label="Total Issues"    count={sum.total_issues}            severity="high"   icon={AlertTriangle} />
                <SummaryCard label="High Priority"   count={sum.high_priority_issues}    severity="high"   icon={XCircle} />
                <SummaryCard label="Medium Priority" count={sum.medium_priority_issues}  severity="medium" icon={AlertTriangle} />
                <SummaryCard label="Low Priority"    count={sum.low_priority_issues}     severity="low"    icon={RefreshCw} />
              </div>

              <div className="text-xs text-gray-400">
                Generated at {new Date(report.generated_at).toLocaleString()}
              </div>

              {/* Issue breakdown table */}
              <Card>
                <CardHeader><CardTitle className="text-sm">Issue Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-gray-500 uppercase">
                        <th className="pb-2 pr-4">Category</th>
                        <th className="pb-2 pr-4">Check</th>
                        <th className="pb-2 pr-4">Count</th>
                        <th className="pb-2">Severity</th>
                      </tr>
                    </thead>
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

            {/* ── Source tab ──────────────────────────────────────────────── */}
            <TabsContent value="source" className="space-y-8">
              {['drivers','teams','tracks','series','events'].map(key => (
                <Card key={key}>
                  <CardHeader>
                    <CardTitle className="text-sm capitalize">{key}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EntityAuditSection label={key} data={src[key]} />
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* ── Entity Layer tab ─────────────────────────────────────────── */}
            <TabsContent value="entity" className="space-y-4">
              <ExpandableList
                title="Source records missing Entity row"
                items={ent.source_without_entity || []}
                severity="high"
                renderItem={r => `[${r.entity_type}] ${r.name || r.source_id}`}
              />
              <ExpandableList
                title="Entity rows with dangling source_entity_id"
                items={ent.entity_without_source || []}
                severity="high"
                renderItem={r => `[${r.entity_type}] ${r.name} → source ${r.source_entity_id} missing`}
              />
              <ExpandableList
                title="Events missing EntityRelationship (track/series)"
                items={ent.broken_event_relationships || []}
                severity="high"
                renderItem={r => `${r.name || r.event_entity_id}: missing ${(r.missing || []).join(', ')}`}
              />
              <ExpandableList
                title="Events missing EntityConfirmation"
                items={ent.broken_confirmations || []}
                severity="medium"
                renderItem={r => `${r.name || r.event_entity_id}: ${r.issue}`}
              />
            </TabsContent>

            {/* ── Access tab ──────────────────────────────────────────────── */}
            <TabsContent value="access" className="space-y-4">
              <ExpandableList
                title="Collaborator records pointing to missing source entity"
                items={acc.collaborator_missing_source || []}
                severity="high"
                renderItem={r => `[${r.entity_type}:${r.entity_id}] user: ${r.user_id}`}
              />
              <ExpandableList
                title="Duplicate collaborator records"
                items={acc.duplicate_collaborators || []}
                severity="low"
                renderItem={r => `${r.key} — ${r.count} records`}
              />
              <ExpandableList
                title="Owner missing access code"
                items={acc.owner_missing_access_code || []}
                severity="medium"
                renderItem={r => `[${r.entity_type}:${r.entity_id}] user: ${r.user_id}`}
              />
              <ExpandableList
                title="Expired pending invitations"
                items={acc.expired_pending_invitations || []}
                severity="medium"
                renderItem={r => `${r.email} → [${r.entity_type}:${r.entity_id}] expired ${r.expires_at}`}
              />
              <ExpandableList
                title="Invitations referencing missing entity"
                items={acc.invitation_entity_missing || []}
                severity="medium"
                renderItem={r => `${r.email} → [${r.entity_type}:${r.entity_id}]`}
              />
            </TabsContent>

            {/* ── Routes tab ──────────────────────────────────────────────── */}
            <TabsContent value="routes" className="space-y-6">
              {['drivers','teams','tracks','series','events'].map(key => {
                const d = rte[key];
                if (!d) return null;
                return (
                  <Card key={key}>
                    <CardHeader>
                      <CardTitle className="text-sm capitalize">{key} ({d.total} records)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <ExpandableList
                        title="Missing slug"
                        items={d.missing_slug || []}
                        severity="low"
                        renderItem={r => r.name || r.id}
                      />
                      <ExpandableList
                        title="Duplicate slug"
                        items={d.duplicate_slug || []}
                        severity="low"
                        renderItem={r => `"${r.slug}" — ${r.count} records: ${(r.records || []).map(x => x.name).join(', ')}`}
                      />
                      <ExpandableList
                        title="Invisible on public pages (slug exists but status hidden)"
                        items={d.invisible_public || []}
                        severity="low"
                        renderItem={r => `${r.name} — status: ${r.status || r.profile_status || r.public_status}`}
                      />
                      <ExpandableList
                        title="Missing display name"
                        items={d.missing_display || []}
                        severity="low"
                        renderItem={r => r.id}
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          </Tabs>
        )}
      </ManagementShell>
    </ManagementLayout>
  );
}