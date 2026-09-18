import React from 'react';
import { Database, Link2, CheckCircle2, XCircle } from 'lucide-react';
import { SectionCard, PriorityBadge } from './shared';

const ENTITY_IMPACTS = {
  racer_profiles: {
    zero: 'Racer identity questions cannot currently be answered — racer profiles, team affiliation, class participation.',
    label: 'Racers',
    lifecycle: ['live', 'draft', 'archived'],
  },
  teams: {
    zero: 'Team affiliation questions cannot currently be answered — "who races for [team]?" requires team records.',
    label: 'Teams',
    lifecycle: ['active'],
  },
  series: {
    zero: 'Series questions cannot currently be answered — events in a series, classes in a series.',
    label: 'Series',
    lifecycle: ['live', 'draft', 'archived'],
  },
  tracks: {
    zero: 'Track location questions cannot currently be answered — "where is [track]?" requires track records.',
    label: 'Tracks',
    lifecycle: ['live', 'draft', 'archived'],
  },
  events: {
    zero: 'Event questions cannot currently be answered — when, where, what series.',
    label: 'Events',
    lifecycle: ['published', 'draft', 'archived'],
  },
  results: {
    zero: 'Race winner and finishing-position questions cannot currently be answered — no result records exist.',
    label: 'Results',
    lifecycle: null,
  },
  standings: {
    zero: 'Points leader, championship position, and championship winner questions cannot currently be answered — no standings records exist.',
    label: 'Standings',
    lifecycle: null,
  },
  outlet_stories: {
    zero: 'Editorial coverage questions cannot currently be answered — "what did HIJINX report about [topic]?" requires published stories.',
    label: 'Outlet Stories',
    lifecycle: ['published', 'draft', 'archived'],
  },
};

const RELATIONSHIP_LABELS = {
  events_with_track: 'Events → Track',
  events_with_series: 'Events → Series',
  results_with_racer: 'Results → Racer',
  results_with_event: 'Results → Event',
  racers_with_team: 'Racers → Team',
  standings_with_racer: 'Standings → Racer',
  standings_with_series: 'Standings → Series',
  standings_with_season: 'Standings → Season',
};

export default function EntityCoveragePanel({ diagnostics }) {
  const entityCounts = diagnostics?.entity_counts || {};
  const relCoverage = diagnostics?.relationship_coverage || {};

  return (
    <div className="space-y-4">
      {/* ── Entity Counts ───────────────────────────────────────────────────── */}
      <SectionCard title="Entity Coverage" icon={Database}>
        <div className="space-y-3">
          {Object.entries(ENTITY_IMPACTS).map(([key, config]) => {
            const counts = entityCounts[key] || { total: 0 };
            const isZero = counts.total === 0;
            return (
              <div key={key} className="rounded-lg border border-divider bg-surface p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-foreground">{config.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold tabular-nums text-foreground">{counts.total}</span>
                    <span className="text-[11px] text-foreground-quiet">records</span>
                    {isZero ? (
                      <PriorityBadge priority="BLOCKING" />
                    ) : (
                      <PriorityBadge priority="HEALTHY" />
                    )}
                  </div>
                </div>
                {/* Lifecycle breakdown */}
                {config.lifecycle && counts.total > 0 && (
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-foreground-quiet">
                    {config.lifecycle.map((state) => (
                      <span key={state}>
                        {state}: <span className="text-foreground-secondary font-medium">{counts[state] ?? 0}</span>
                      </span>
                    ))}
                  </div>
                )}
                {/* Impact statement */}
                {isZero && (
                  <p className="text-xs text-danger mt-1.5">{config.zero}</p>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* ── Relationship Coverage ────────────────────────────────────────────── */}
      <SectionCard title="Relationship Coverage" icon={Link2}>
        <p className="text-xs text-foreground-quiet mb-3">
          Counts alone are insufficient — these diagnose whether entity relationships are complete enough for crawlers to follow factual connections.
        </p>
        <div className="space-y-2">
          {Object.entries(RELATIONSHIP_LABELS).map(([key, label]) => {
            const rel = relCoverage[key] || { complete: 0, total: 0 };
            const pct = rel.total > 0 ? Math.round((rel.complete / rel.total) * 100) : 0;
            const isComplete = rel.total > 0 && rel.complete === rel.total;
            const isEmpty = rel.total === 0;
            return (
              <div key={key} className="flex items-center justify-between rounded-lg border border-divider bg-surface px-3 py-2">
                <span className="text-sm text-foreground">{label}</span>
                <div className="flex items-center gap-2">
                  {isEmpty ? (
                    <span className="text-[11px] text-foreground-quiet">No records</span>
                  ) : (
                    <>
                      <span className="text-sm font-mono tabular-nums text-foreground-secondary">
                        {rel.complete} / {rel.total}
                      </span>
                      {isComplete ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-warning" />
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}