/**
 * RacerCard.jsx
 *
 * Collectible racing card for the racer directory. Front/back flip behaviour is
 * preserved, as is every data source: the number, flag, hometown, team, series,
 * class and the Wins/Podiums/Top5s/Top10s band are all supplied to this
 * component (the band comes from the canonical career-total source passed in as
 * `overallStats` — this component never computes statistics).
 *
 * Career classification is not rendered. Claim/ownership state is not rendered.
 * RaceCore IDs are never rendered.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import CountryFlag from '@/components/shared/CountryFlag';
import { getRacerProfileUrl } from './racerProfileAdapter';

export default function RacerCard({
  racerProfile,
  legacyDriver = null,
  program = null,
  programs = [],
  allSeries = [],
  team = null,
  media = null,
  overallStats = null,
  programClassName = null,
  isRookie = false,
  nonClickable = false,
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const navigate = useNavigate();

  const handleFlip = () => setIsFlipped(!isFlipped);

  const handleProfileClick = (event) => {
    event.stopPropagation();
    navigate(getRacerProfileUrl(racerProfile));
  };

  const displayName = racerProfile.display_name || '';
  const nameParts = displayName.split(' ').filter(Boolean);
  const firstName = legacyDriver?.first_name || nameParts[0] || '';
  const lastName = legacyDriver?.last_name || nameParts.slice(1).join(' ') || '';
  const bibNumber = legacyDriver?.primary_number || program?.bib_number || program?.vehicle_number || null;

  const countryAbbr = racerProfile.hometown_country
    ? racerProfile.hometown_country.substring(0, 3).toUpperCase()
    : '';
  const hometown = [racerProfile.hometown_city, racerProfile.hometown_state, countryAbbr].filter(Boolean).join(', ');

  const seriesName = program?.series_id
    ? allSeries.find((series) => series.id === program.series_id)?.name || null
    : program?.series_name || null;

  const profileImg = racerProfile.profile_image_url || media?.headshot_url || legacyDriver?.profile_image_url || null;
  const heroImg = racerProfile.hero_image_url || media?.hero_image_url || legacyDriver?.hero_image_url || null;
  const displayImg = profileImg || heroImg;

  const identities = [seriesName, programClassName].filter(Boolean);

  const statBand = overallStats?.available
    ? [
        { label: 'Wins', value: overallStats.wins },
        { label: 'Podiums', value: overallStats.podiums },
        { label: 'Top5s', value: overallStats.top5 },
        { label: 'Top10s', value: overallStats.top10 },
      ]
    : [];

  const backFacts = [
    hometown && { label: 'Hometown', value: hometown },
    (team?.name || program?.team_name) && { label: 'Team', value: team?.name || program?.team_name },
    seriesName && { label: 'Series', value: seriesName },
    programClassName && { label: 'Class', value: programClassName },
  ].filter(Boolean);

  return (
    <div
      className="relative h-[480px] cursor-pointer"
      style={{ perspective: '1000px' }}
      onClick={
        nonClickable
          ? () => {}
          : (event) => {
              if (!event.target.closest('button')) handleFlip();
            }
      }
    >
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: 'preserve-3d', pointerEvents: 'auto' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
      >
        {/* ── FRONT: photograph, number, name, racing identity ── */}
        <div
          className="absolute inset-0 border border-divider bg-surface-elevated"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="relative flex h-full flex-col">
            <div className="relative flex-1 overflow-hidden bg-surface-sunken">
              {displayImg ? (
                <img
                  src={displayImg}
                  alt={displayName}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center">
                  <div className="text-6xl font-black text-foreground-quiet">
                    {firstName[0] || ''}
                    {lastName[0] || ''}
                  </div>
                  {bibNumber && <div className="mt-3 text-7xl font-black text-foreground-quiet/60">{bibNumber}</div>}
                </div>
              )}

              {bibNumber && (
                <div className="absolute right-0 top-0 border-b border-l border-divider bg-canvas px-4 py-2">
                  <div className="font-mono text-3xl font-black leading-none text-foreground">{bibNumber}</div>
                </div>
              )}

              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8">
                <span className="font-mono text-[9px] tracking-[0.4em] uppercase text-motion">INDEX46</span>
              </div>
            </div>

            <div className="border-t border-divider bg-surface-elevated px-4 py-3">
              <div className="flex items-center gap-2">
                <CountryFlag country={racerProfile.hometown_country} />
                <span className="min-w-0 flex-1 truncate text-lg font-black uppercase tracking-tight text-foreground">
                  {displayName}
                </span>
                <svg className="h-4 w-4 flex-shrink-0 text-foreground-quiet" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              {identities.length > 0 && (
                <div className="mt-1 truncate text-xs text-foreground-secondary">{identities.join(' · ')}</div>
              )}
            </div>
          </div>
        </div>

        {/* ── BACK: compact racer profile, canonical statistics, photography ── */}
        <div
          className="absolute inset-0 flex flex-col border border-divider bg-surface-elevated"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="p-4 pb-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <CountryFlag country={racerProfile.hometown_country} />
                  <span className="truncate text-base font-black uppercase tracking-tight text-foreground">
                    {displayName}
                  </span>
                </div>
                <div className="mt-1 font-mono text-[9px] tracking-[0.4em] uppercase text-motion">INDEX46</div>
              </div>
              {bibNumber && (
                <div className="flex-shrink-0 border border-divider px-2.5 py-1">
                  <div className="font-mono text-xl font-black leading-none text-foreground">{bibNumber}</div>
                </div>
              )}
            </div>

            {backFacts.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
                {backFacts.map((fact) => (
                  <div key={fact.label} className={fact.label === 'Team' || fact.label === 'Hometown' ? 'col-span-2' : ''}>
                    <div className="text-[9px] font-bold uppercase tracking-[0.28em] text-foreground-quiet">
                      {fact.label}
                    </div>
                    <div className="truncate text-xs font-semibold text-foreground">{fact.value}</div>
                  </div>
                ))}
              </div>
            )}

            {statBand.length > 0 && (
              <div className="mt-3 flex items-baseline justify-between border-t border-divider pt-3">
                {statBand.map((stat) => (
                  <span key={stat.label} className="flex flex-col">
                    <span className="font-mono text-base font-black leading-none tabular-nums text-foreground">
                      {stat.value}
                    </span>
                    <span className="mt-1 text-[9px] uppercase tracking-wide text-foreground-quiet">{stat.label}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Photography — the lower ~28% of the card composition */}
          <div className="mt-auto flex h-[28%] flex-shrink-0 flex-col justify-end overflow-hidden border-t border-divider">
            <div className="relative flex-1 bg-surface-sunken">
              {displayImg ? (
                <img
                  src={displayImg}
                  alt={displayName}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-black text-foreground-quiet">
                  {firstName[0] || ''}
                  {lastName[0] || ''}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
              {!nonClickable && (
                <button
                  type="button"
                  onClick={handleProfileClick}
                  className="absolute bottom-2.5 right-3 font-mono text-[10px] tracking-[0.25em] uppercase text-white transition-colors hover:text-motion"
                >
                  Profile →
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}