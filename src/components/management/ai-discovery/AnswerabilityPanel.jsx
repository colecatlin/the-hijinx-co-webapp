import React, { useState } from 'react';
import { Activity, Play, RefreshCw, AlertOctagon, ChevronDown, ChevronRight } from 'lucide-react';
import { SectionCard, StatusBadge, FailureTypeBadge } from './shared';

const CATEGORY_LABELS = {
  RESULTS: 'Results',
  STANDINGS: 'Standings',
  RACERS: 'Racers',
  EVENTS: 'Events',
  TEAMS: 'Teams',
  SERIES: 'Series',
  TRACKS: 'Tracks',
  OUTLET: 'Outlet',
  PLATFORM: 'Platform',
  STRUCTURED_DATA: 'Structured Data',
};

const CATEGORY_ORDER = ['RESULTS', 'STANDINGS', 'RACERS', 'EVENTS', 'TEAMS', 'SERIES', 'TRACKS', 'OUTLET', 'PLATFORM', 'STRUCTURED_DATA'];

export default function AnswerabilityPanel({ auditResult, auditRunning, auditError, onRunAudit }) {
  const [expandedCategories, setExpandedCategories] = useState(new Set(CATEGORY_ORDER));

  const toggleCategory = (cat) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const tests = auditResult?.tests || [];
  const summary = auditResult?.summary;
  const computedAt = auditResult?.computed_at;

  // Group tests by category
  const byCategory = {};
  for (const t of tests) {
    const cat = t.category || 'GENERAL';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(t);
  }

  return (
    <div className="space-y-4">
      {/* ── Run Audit bar ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between rounded-xl border border-divider bg-surface-elevated px-4 py-3">
        <div className="flex items-center gap-3">
          <Activity className="w-4 h-4 text-motion" />
          <div>
            <p className="text-sm font-semibold text-foreground">Answerability Audit</p>
            {computedAt ? (
              <p className="text-[11px] text-foreground-quiet">Last run: {new Date(computedAt).toLocaleString()}</p>
            ) : (
              <p className="text-[11px] text-foreground-quiet">Not yet run</p>
            )}
          </div>
        </div>
        <button
          onClick={onRunAudit}
          disabled={auditRunning}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-motion text-white hover:bg-motion-hover disabled:opacity-50 transition-colors"
        >
          {auditRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          {auditRunning ? 'Running...' : 'Run Audit'}
        </button>
      </div>

      {/* ── Error state ──────────────────────────────────────────────────────── */}
      {auditError && (
        <div className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3">
          <AlertOctagon className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-danger">Audit Unavailable</p>
            <p className="text-xs text-foreground-secondary mt-0.5">{auditError}</p>
            <button onClick={onRunAudit} className="text-xs text-motion mt-1 hover:underline">Retry</button>
          </div>
        </div>
      )}

      {/* ── Running state ───────────────────────────────────────────────────── */}
      {auditRunning && !auditResult && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-5 h-5 text-motion animate-spin" />
          <span className="ml-2 text-sm text-foreground-quiet">Running answerability audit...</span>
        </div>
      )}

      {/* ── Results ─────────────────────────────────────────────────────────── */}
      {tests.length > 0 && (
        <div className="space-y-3">
          {CATEGORY_ORDER.map((cat) => {
            const catTests = byCategory[cat];
            if (!catTests || catTests.length === 0) return null;
            const isExpanded = expandedCategories.has(cat);
            return (
              <div key={cat} className="rounded-xl border border-divider bg-surface-elevated overflow-hidden">
                <button
                  onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface-interactive transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-foreground-quiet" /> : <ChevronRight className="w-4 h-4 text-foreground-quiet" />}
                    <span className="text-sm font-semibold text-foreground">{CATEGORY_LABELS[cat] || cat}</span>
                    <span className="text-[11px] text-foreground-quiet">({catTests.length})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {catTests.filter((t) => t.verdict === 'PASS').length > 0 && (
                      <span className="text-[11px] text-success">{catTests.filter((t) => t.verdict === 'PASS').length} pass</span>
                    )}
                    {catTests.filter((t) => t.verdict === 'FAIL').length > 0 && (
                      <span className="text-[11px] text-danger">{catTests.filter((t) => t.verdict === 'FAIL').length} fail</span>
                    )}
                  </div>
                </button>
                {isExpanded && (
                  <div className="divide-y divide-divider">
                    {catTests.map((t, i) => <TestRow key={i} test={t} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {!auditRunning && !auditError && tests.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Activity className="w-8 h-8 text-foreground-quiet mb-2" />
          <p className="text-sm text-foreground-quiet mb-3">Run the audit to see answerability diagnostics.</p>
          <button
            onClick={onRunAudit}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-motion text-white hover:bg-motion-hover transition-colors"
          >
            Run Answerability Audit
          </button>
        </div>
      )}
    </div>
  );
}

function TestRow({ test }) {
  const [expanded, setExpanded] = useState(false);
  const sourceEntities = test.source_entities || {};
  const hasSourceEntities = Object.keys(sourceEntities).length > 0;

  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{test.question}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <StatusBadge status={test.verdict} />
            {test.failure_type && test.failure_type !== 'NONE' && <FailureTypeBadge type={test.failure_type} />}
          </div>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-[11px] text-motion hover:underline shrink-0">
          {expanded ? 'Hide' : 'Details'}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 text-xs">
          {/* Required relationship */}
          <div>
            <span className="text-foreground-quiet font-medium">Required relationship: </span>
            <span className="text-foreground-secondary">{test.expected_fact_relationship}</span>
          </div>

          {/* Available entities */}
          <div>
            <span className="text-foreground-quiet font-medium">Available: </span>
            {hasSourceEntities ? (
              <span className="text-foreground-secondary">
                {Object.entries(sourceEntities).map(([k, v]) => `${k}: ${v === '—' ? '✕' : '✓'}`).join(' · ')}
              </span>
            ) : (
              <span className="text-danger">No source records found</span>
            )}
          </div>

          {/* Public page */}
          {test.public_page && test.public_page !== '—' && (
            <div>
              <span className="text-foreground-quiet font-medium">Public page: </span>
              <span className="text-motion font-mono">{test.public_page}</span>
            </div>
          )}

          {/* Checks grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
            <CheckItem label="Answer in HTML" ok={test.answer_present} />
            <CheckItem label="Structured data" ok={test.structured_data_present} />
            <CheckItem label="Internal links" ok={test.internal_links_present} />
            <CheckItem label="Canonical correct" ok={test.canonical_correct} />
            {test.absolute_canonical !== undefined && <CheckItem label="Absolute canonical" ok={test.absolute_canonical} />}
            {test.breadcrumb_present !== undefined && <CheckItem label="BreadcrumbList" ok={test.breadcrumb_present} />}
            {test.season_context !== undefined && <CheckItem label="Season context" ok={test.season_context} />}
          </div>

          {/* Reason */}
          {test.notes && (
            <div>
              <span className="text-foreground-quiet font-medium">Reason: </span>
              <span className="text-foreground-secondary">{test.notes}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CheckItem({ label, ok }) {
  return (
    <div className="flex items-center gap-1.5">
      {ok ? <span className="text-success">✓</span> : <span className="text-danger">✕</span>}
      <span className="text-foreground-secondary">{label}</span>
    </div>
  );
}