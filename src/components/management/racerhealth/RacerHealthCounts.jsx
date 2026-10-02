import React from 'react';

const GROUPS = [
  {
    title: 'Identity & profile',
    note: 'Integrity — a missing link here blocks publication.',
    keys: [
      ['person_identities', 'Person identities'],
      ['racer_profiles', 'Racer profiles'],
      ['racer_profiles_live', 'Live profiles'],
      ['racer_profiles_draft', 'Draft profiles'],
      ['identities_missing_profile', 'Identities missing a profile'],
      ['profiles_missing_identity', 'Profiles missing an identity'],
      ['duplicate_identity_candidates', 'Duplicate identity candidates'],
    ],
  },
  {
    title: 'Season participation',
    note: 'Integrity — the season-specific competition link.',
    keys: [
      ['season_participations', 'Season participations'],
      ['broken_participation_profile_references', 'Broken profile links'],
      ['broken_participation_identity_references', 'Broken identity links'],
      ['broken_participation_driver_references', 'Broken legacy Driver links'],
    ],
  },
  {
    title: 'Downstream records',
    note: 'Volume of the competition chain.',
    keys: [
      ['entries', 'Entries'],
      ['results', 'Results'],
      ['standings', 'Standings'],
      ['driver_career_stats', 'Career statistics rows'],
      ['career_stats_missing_identity', 'Stats missing an identity'],
      ['import_links_with_dangling_references', 'Import links with dangling references'],
      ['broken_canonical_driver_references', 'Broken canonical Driver links'],
    ],
  },
];

export default function RacerHealthCounts({ counts, legacy }) {
  if (!counts) return null;
  return (
    <div className="space-y-6">
      {GROUPS.map((group) => (
        <div key={group.title}>
          <div className="flex items-baseline gap-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-foreground">{group.title}</h3>
            <span className="text-[11px] text-foreground-quiet">{group.note}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {group.keys.map(([key, label]) => (
              <div key={key} className="rounded-xl border border-divider bg-surface-elevated p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground-quiet">{label}</p>
                <p className="mt-1 text-2xl font-black text-foreground">{counts[key] ?? 0}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="rounded-xl border border-divider bg-surface p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-foreground-quiet">
          Records requiring review
        </p>
        <p className="mt-1 text-3xl font-black text-warning">{counts.records_requiring_review ?? 0}</p>
        <p className="mt-1 text-[11px] text-foreground-quiet">
          Unprovable or contradictory relationships. Completeness gaps (a missing bio, image, team or result) are
          deliberately not counted here — they never block publication.
        </p>
        {legacy && (
          <p className="mt-3 text-[11px] text-foreground-secondary">
            Legacy compatibility: {legacy.drivers} Driver records ({legacy.drivers_live} live) ·{' '}
            {legacy.canonical_driver_links} identities carry a canonical Driver ·{' '}
            {legacy.profiles_with_legacy_driver} profiles carry a legacy Driver link.
          </p>
        )}
      </div>
    </div>
  );
}