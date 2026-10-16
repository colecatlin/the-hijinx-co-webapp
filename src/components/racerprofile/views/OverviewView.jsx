import React from 'react';
import { Link } from 'react-router-dom';
import { format, isValid } from 'date-fns';
import RacerSectionHeading from '@/components/racerprofile/RacerSectionHeading';
import RacerStatLine from '@/components/racerprofile/RacerStatLine';
import RacerCurrentProgram from '@/components/racerprofile/RacerCurrentProgram';
import RacerMediaStrip from '@/components/racerprofile/RacerMediaStrip';
import RacerPartnerRow from '@/components/racerprofile/RacerPartnerRow';
import { resolveCurrentPartners } from '@/components/racerprofile/racerPartners';
import LatestFromRacer from './LatestFromRacer';

/**
 * OverviewView — the baseline racer identity and its activity layer.
 *
 * Section order is fixed: current program → latest → recent results → career
 * snapshot → featured media → partners → about. Identity itself (photography,
 * name, number, facts, social links) is the shared header above the views.
 *
 * Every value comes from the single experience response. Nothing here fetches.
 */

function formatDay(value, pattern = 'd MMM yyyy') {
  if (!value) return null;
  const date = new Date(value);
  return isValid(date) ? format(date, pattern) : null;
}

export default function OverviewView({
  racerName,
  currentContext,
  timeline = [],
  careerStats,
  statistics,
  mediaEcosystem,
  media,
  racerProfile,
  legacyDriver,
  sponsorships = [],
  sponsorPresentation = null,
}) {
  const recentResults = (timeline || []).filter((item) => item?.type === 'race_result').slice(0, 5);

  const snapshotSource = careerStats || statistics?.career || null;
  const snapshotItems = snapshotSource
    ? [
        { label: 'wins', value: snapshotSource.career_wins ?? snapshotSource.wins ?? 0 },
        { label: 'podiums', value: snapshotSource.career_podiums ?? snapshotSource.podiums ?? 0 },
        { label: 'starts', value: snapshotSource.career_starts ?? snapshotSource.starts ?? 0 },
        { label: 'points', value: snapshotSource.career_points_total ?? snapshotSource.points ?? 0 },
        {
          label: 'championships',
          value: snapshotSource.championships ?? statistics?.career?.championships ?? null,
        },
      ].filter((item) => item.value !== null && item.value !== undefined)
    : [];

  const galleryPhotos = mediaEcosystem?.gallery_photos || media?.gallery_urls || [];
  const heroImage = racerProfile?.hero_image_url || mediaEcosystem?.hero_image_url || media?.hero_image_url || null;
  const portraitImage = racerProfile?.profile_image_url || mediaEcosystem?.headshot_url || media?.headshot_url || null;

  const currentPartners = resolveCurrentPartners(sponsorships, sponsorPresentation);

  const hometown = [racerProfile?.hometown_city, racerProfile?.hometown_state, racerProfile?.hometown_country]
    .filter(Boolean)
    .join(', ');
  const racingBase = [
    racerProfile?.racing_base_city,
    racerProfile?.racing_base_state,
    racerProfile?.racing_base_country,
  ]
    .filter(Boolean)
    .join(', ');
  const yearsLabel = racerProfile?.years_active_start
    ? `${racerProfile.years_active_start}–${racerProfile.years_active_end || 'Present'}`
    : legacyDriver?.years_active_start
    ? `${legacyDriver.years_active_start}–${legacyDriver.years_active_end || 'Present'}`
    : null;

  const aboutFacts = [
    hometown && { label: 'Hometown', value: hometown },
    racingBase && { label: 'Racing Base', value: racingBase },
    yearsLabel && { label: 'Active', value: yearsLabel },
    racerProfile?.nicknames?.length > 0 && { label: 'Known As', value: racerProfile.nicknames.join(', ') },
  ].filter(Boolean);

  const hasAbout = Boolean(racerProfile?.bio) || aboutFacts.length > 0;

  return (
    <div className="mx-auto max-w-7xl space-y-14 px-4 py-10 sm:px-6">
      {/* CURRENT PROGRAM */}
      {currentContext && <RacerCurrentProgram currentContext={currentContext} />}

      {/* LATEST (placeholder — no social integration) */}
      <LatestFromRacer racerName={racerName} />

      {/* RECENT RESULTS */}
      {recentResults.length > 0 && (
        <section>
          <RacerSectionHeading label="Form" title="Recent Results" />
          <div>
            {recentResults.map((result) => {
              const meta = result.metadata || {};
              const day = formatDay(result.date);
              const hasEvent = Boolean(meta.event_id);
              const Row = hasEvent ? Link : 'div';
              const rowProps = hasEvent ? { to: `/EventProfile?id=${meta.event_id}` } : {};
              return (
                <Row
                  key={`${result.date}-${result.title}`}
                  {...rowProps}
                  className="grid grid-cols-[auto_1fr_auto] items-baseline gap-4 border-b border-divider py-4 last:border-0"
                >
                  <span className="font-mono text-[11px] text-foreground-quiet">{day || '—'}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {meta.event_name || result.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-foreground-secondary">
                      {[meta.track_name, meta.session_type, meta.series_name].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-lg font-black tabular-nums text-foreground">
                      {meta.position ? `P${meta.position}` : meta.status || '—'}
                    </span>
                    {meta.points != null && (
                      <span className="block font-mono text-[10px] text-foreground-quiet">{meta.points} pts</span>
                    )}
                  </span>
                </Row>
              );
            })}
          </div>
        </section>
      )}

      {/* CAREER SNAPSHOT */}
      {snapshotItems.length > 0 && (
        <section>
          <RacerSectionHeading label="Record" title="Career Snapshot" />
          <RacerStatLine items={snapshotItems} />
        </section>
      )}

      {/* FEATURED MEDIA */}
      {(galleryPhotos.length > 0 || heroImage || portraitImage) && (
        <RacerMediaStrip
          heroImage={heroImage}
          portraitImage={portraitImage}
          photos={galleryPhotos}
          alt={`${racerName || 'Racer'} photography`}
        />
      )}

      {/* PARTNERS */}
      {currentPartners.length > 0 && (
        <section>
          <RacerSectionHeading label="Support" title="Partners" />
          <div>
            {currentPartners.map((partner) => (
              <RacerPartnerRow key={`${partner.name}-${partner.season || ''}`} partner={partner} />
            ))}
          </div>
        </section>
      )}

      {/* ABOUT */}
      {hasAbout && (
        <section>
          <RacerSectionHeading label="Profile" title="About" />
          {racerProfile?.bio && (
            <p className="max-w-3xl text-base leading-relaxed text-foreground-secondary">{racerProfile.bio}</p>
          )}
          {aboutFacts.length > 0 && (
            <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-3">
              {aboutFacts.map((fact) => (
                <div key={fact.label} className="border-t border-divider pt-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-foreground-quiet">
                    {fact.label}
                  </div>
                  <div className="mt-1.5 text-sm font-semibold text-foreground">{fact.value}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}