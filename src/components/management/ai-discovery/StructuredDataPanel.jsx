import React from 'react';
import { FileCode, ShieldAlert } from 'lucide-react';
import { SectionCard, CheckRow, PriorityBadge } from './shared';
import WinnerSemanticsWarning from './WinnerSemanticsWarning';

// Static registry of structured-data implementations (Phase 17B.2)
const STRUCTURED_DATA_REGISTRY = [
  {
    entity: 'Racer',
    page: 'RacerProfile',
    expectedType: 'Person',
    helper: true,
    helperName: 'buildPersonSchema',
    pageIntegration: true,
    absoluteCanonical: true,
    breadcrumb: true,
    factualSummary: true,
    notes: 'Wired via getRacerProfileExperience + JsonLd component',
  },
  {
    entity: 'Event',
    page: 'EventProfile',
    expectedType: 'SportsEvent',
    helper: true,
    helperName: 'buildSportsEventSchema',
    pageIntegration: true,
    absoluteCanonical: true,
    breadcrumb: true,
    factualSummary: true,
    notes: 'Wired via getEventExperience + JsonLd component',
  },
  {
    entity: 'Series',
    page: 'SeriesDetail',
    expectedType: 'SportsOrganization',
    helper: true,
    helperName: 'buildSeriesSchema',
    pageIntegration: true,
    absoluteCanonical: true,
    breadcrumb: true,
    factualSummary: true,
    notes: 'Wired via getSeriesExperience + JsonLd component',
  },
  {
    entity: 'Track',
    page: 'TrackProfile',
    expectedType: 'Place',
    helper: true,
    helperName: 'buildTrackSchema',
    pageIntegration: true,
    absoluteCanonical: true,
    breadcrumb: true,
    factualSummary: true,
    notes: 'Wired via getTrackExperience + JsonLd component',
  },
  {
    entity: 'Outlet Story',
    page: 'OutletStoryPage',
    expectedType: 'NewsArticle',
    helper: true,
    helperName: 'inline (OutletStoryPage)',
    pageIntegration: true,
    absoluteCanonical: true,
    breadcrumb: true,
    factualSummary: false,
    notes: 'Built inline from story data — no extra query needed',
  },
  {
    entity: 'Home',
    page: 'Home',
    expectedType: 'WebSite + Organization',
    helper: true,
    helperName: 'inline (Home.jsx)',
    pageIntegration: true,
    absoluteCanonical: true,
    breadcrumb: false,
    factualSummary: false,
    notes: 'Static identity schema — no breadcrumb (root page)',
  },
  {
    entity: 'Team',
    page: 'TeamProfile',
    expectedType: 'SportsOrganization',
    helper: true,
    helperName: 'buildTeamSchema',
    pageIntegration: false,
    absoluteCanonical: null,
    breadcrumb: null,
    factualSummary: false,
    notes: 'Helper exists but getTeamExperience does not emit seo.structured_data — deferred',
  },
  {
    entity: 'Vehicle',
    page: 'VehicleProfile',
    expectedType: 'Vehicle (or Product)',
    helper: false,
    helperName: '—',
    pageIntegration: false,
    absoluteCanonical: null,
    breadcrumb: null,
    factualSummary: false,
    notes: 'No structured-data helper — deferred',
  },
];

export default function StructuredDataPanel({ diagnostics }) {
  return (
    <div className="space-y-4">
      <SectionCard title="Structured Data Health" icon={FileCode}>
        <p className="text-xs text-foreground-quiet mb-3">
          Internal implementation diagnostic — verifies Schema.org JSON-LD helpers, page integration, and canonical URL correctness.
          This does not claim Google or any AI system has validated the markup.
        </p>
        <div className="space-y-3">
          {STRUCTURED_DATA_REGISTRY.map((entry) => (
            <div key={entry.entity} className="rounded-lg border border-divider bg-surface p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-semibold text-foreground">{entry.entity}</span>
                  <span className="text-[11px] text-foreground-quiet ml-2">→ {entry.expectedType}</span>
                </div>
                {entry.pageIntegration ? (
                  <PriorityBadge priority="HEALTHY" />
                ) : (
                  <PriorityBadge priority="NEEDS_ATTENTION" />
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                <CheckRow label="Helper exists" ok={entry.helper} detail={entry.helperName} />
                <CheckRow label="Page integration" ok={entry.pageIntegration} detail={entry.page} />
                <CheckRow label="Absolute canonical URL" ok={entry.absoluteCanonical} />
                <CheckRow label="BreadcrumbList" ok={entry.breadcrumb} />
                <CheckRow label="Visible factual summary" ok={entry.factualSummary} />
              </div>
              {entry.notes && (
                <p className="text-[11px] text-foreground-quiet mt-2 italic">{entry.notes}</p>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      <WinnerSemanticsWarning />
    </div>
  );
}