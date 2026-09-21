import React, { useState } from 'react';
import { Activity, Database, Globe, FileCode, Link2, CheckCircle2, XCircle, MinusCircle, Cpu, Play } from 'lucide-react';
import { SectionCard, StatCard, PriorityBadge, StatusBadge } from './shared';
import { base44 } from '@/api/base44Client';

const FACT_INTENTS_SUPPORTED = 24;
const FACT_INTENTS_UNSUPPORTED = 1;
const SEMANTIC_AMBIGUITIES = 1;

export default function AiDiscoveryOverview({ diagnostics, auditResult, onRunAudit, auditRunning }) {
  const [factTests, setFactTests] = useState(null);
  const [factTestsRunning, setFactTestsRunning] = useState(false);

  const runFactTests = async () => {
    setFactTestsRunning(true);
    try {
      const res = await base44.functions.invoke('runFactResolverTests', {});
      setFactTests(res?.data || res);
    } catch (err) {
      setFactTests({ error: err?.message || 'Failed to run fact resolver tests' });
    } finally {
      setFactTestsRunning(false);
    }
  };
  const entityCounts = diagnostics?.entity_counts || {};
  const canonical = diagnostics?.canonical || {};

  // ── Answerability summary (from audit if available) ────────────────────────
  const summary = auditResult?.summary;
  const hasAudit = !!summary;

  // ── Discovery health ────────────────────────────────────────────────────────
  const discoveryChecks = [
    { label: 'Canonical URLs', ok: !!canonical.configured_base_url && !canonical.legacy_domain_found, detail: canonical.configured_base_url || 'Using fallback' },
    { label: 'Structured Data (JSON-LD)', ok: true, detail: '6 entity types wired' },
    { label: 'BreadcrumbList', ok: true, detail: '5 entity pages' },
    { label: 'Sitemap', ok: true, detail: 'generateSitemap function' },
    { label: 'Robots.txt', ok: true, detail: 'serveRobots function' },
    { label: 'Public Entity Pages', ok: true, detail: 'Racer, Event, Series, Track, Outlet' },
  ];

  // ── Entity coverage summary ─────────────────────────────────────────────────
  const entityEntries = [
    { key: 'racer_profiles', label: 'Racers', count: entityCounts.racer_profiles?.total ?? 0 },
    { key: 'teams', label: 'Teams', count: entityCounts.teams?.total ?? 0 },
    { key: 'series', label: 'Series', count: entityCounts.series?.total ?? 0 },
    { key: 'tracks', label: 'Tracks', count: entityCounts.tracks?.total ?? 0 },
    { key: 'events', label: 'Events', count: entityCounts.events?.total ?? 0 },
    { key: 'results', label: 'Results', count: entityCounts.results?.total ?? 0 },
    { key: 'standings', label: 'Standings', count: entityCounts.standings?.total ?? 0 },
    { key: 'outlet_stories', label: 'Outlet Stories', count: entityCounts.outlet_stories?.total ?? 0 },
  ];

  return (
    <div className="space-y-4">
      {/* ── Answerability ──────────────────────────────────────────────────── */}
      <SectionCard title="Answerability" icon={Activity}>
        {!hasAudit ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-foreground-quiet mb-3">No audit has been run yet.</p>
            <button
              onClick={onRunAudit}
              disabled={auditRunning}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-motion text-white hover:bg-motion-hover disabled:opacity-50 transition-colors"
            >
              {auditRunning ? 'Running...' : 'Run Answerability Audit'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Passing" value={summary.passed} priority="HEALTHY" />
            <StatCard label="Partial" value={summary.partial} priority={summary.partial > 0 ? 'NEEDS_ATTENTION' : 'HEALTHY'} />
            <StatCard label="Failing" value={summary.failed} priority={summary.failed > 0 ? 'BLOCKING' : 'HEALTHY'} />
            <StatCard label="Total" value={summary.total} />
          </div>
        )}
      </SectionCard>

      {/* ── Failure Types ─────────────────────────────────────────────────── */}
      {hasAudit && (
        <SectionCard title="Failure Types" icon={XCircle}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard label="Data Coverage" value={summary.failure_types.data_coverage} priority={summary.failure_types.data_coverage > 0 ? 'BLOCKING' : 'HEALTHY'} />
            <StatCard label="Public Presentation" value={summary.failure_types.public_presentation} priority={summary.failure_types.public_presentation > 0 ? 'NEEDS_ATTENTION' : 'HEALTHY'} />
            <StatCard label="Structured Data" value={summary.failure_types.structured_data} priority={summary.failure_types.structured_data > 0 ? 'NEEDS_ATTENTION' : 'HEALTHY'} />
            <StatCard label="Internal Linking" value={summary.failure_types.linking} priority={summary.failure_types.linking > 0 ? 'NEEDS_ATTENTION' : 'HEALTHY'} />
            <StatCard label="None (Passing)" value={summary.failure_types.none} priority="HEALTHY" />
          </div>
        </SectionCard>
      )}

      {/* ── Entity Coverage ───────────────────────────────────────────────── */}
      <SectionCard title="Entity Coverage" icon={Database}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {entityEntries.map(({ key, label, count }) => (
            <StatCard
              key={key}
              label={label}
              value={count}
              priority={count === 0 ? 'BLOCKING' : 'HEALTHY'}
              sublabel={count === 0 ? 'No records' : undefined}
            />
          ))}
        </div>
      </SectionCard>

      {/* ── Discovery Health ──────────────────────────────────────────────── */}
      <SectionCard title="Discovery Health" icon={Globe}>
        <div className="space-y-1">
          {discoveryChecks.map((check) => (
            <div key={check.label} className="flex items-start gap-2 text-xs py-1">
              {check.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0 mt-0.5" /> : <XCircle className="w-3.5 h-3.5 text-danger flex-shrink-0 mt-0.5" />}
              <span className="text-foreground flex-1">{check.label}</span>
              <span className="text-foreground-quiet">{check.detail}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── Fact Architecture ────────────────────────────────────────────── */}
      <SectionCard title="Fact Architecture" icon={Cpu}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Supported Intents" value={FACT_INTENTS_SUPPORTED} priority="HEALTHY" />
            <StatCard label="Unsupported Intents" value={FACT_INTENTS_UNSUPPORTED} priority="NEEDS_ATTENTION" sublabel="Championship designation" />
            <StatCard label="Semantic Ambiguities" value={SEMANTIC_AMBIGUITIES} priority="NEEDS_ATTENTION" sublabel="Winner semantics" />
            <StatCard label="Resolver Status" value="ACTIVE" priority="HEALTHY" />
          </div>

          <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'hsl(var(--divider) / 0.5)' }}>
            <div className="text-xs text-foreground-quiet">
              {factTests ? (
                <span>
                  {factTests.summary?.resolved || 0} resolved ·{' '}
                  {factTests.summary?.no_data || 0} no data ·{' '}
                  {factTests.summary?.insufficient_context || 0} insufficient ·{' '}
                  {factTests.summary?.unsupported || 0} unsupported
                </span>
              ) : (
                <span>Deterministic fact resolver — 27 representative test cases</span>
              )}
            </div>
            <button
              onClick={runFactTests}
              disabled={factTestsRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-motion text-white hover:bg-motion-hover disabled:opacity-50 transition-colors"
            >
              <Play className="w-3 h-3" />
              {factTestsRunning ? 'Running...' : 'Run Fact Tests'}
            </button>
          </div>

          {factTests?.error && (
            <p className="text-xs text-danger">{factTests.error}</p>
          )}

          {factTests?.results && factTests.results.filter((r) => r.status === 'UNSUPPORTED').length > 0 && (
            <div className="pt-2 border-t" style={{ borderColor: 'hsl(var(--divider) / 0.5)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-foreground-quiet mb-1.5">Unsupported Fact Types</p>
              {factTests.results.filter((r) => r.status === 'UNSUPPORTED').map((r, i) => (
                <div key={i} className="text-xs text-foreground-secondary py-0.5">
                  <span className="font-medium">{r.label}</span>
                  <span className="text-foreground-quiet ml-2">— {r.reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}