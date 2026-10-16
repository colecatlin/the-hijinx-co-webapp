import React from 'react';
import EntityFactualSummary from '@/components/shared/EntityFactualSummary';
import SocialShareButtons from '@/components/shared/SocialShareButtons';
import CountryFlag from '@/components/shared/CountryFlag';
import RacerEditControl from './RacerEditControl';

/**
 * RacerIdentityHeader — the shared racer identity block, present on all five
 * views. Composition: photography band → flag, number, name, tagline → racing
 * facts → social links, sharing and the conditional Edit Profile control.
 *
 * Deliberately absent: career classification, claim/ownership state, profile
 * completeness and every internal identifier.
 */
export default function RacerIdentityHeader({
  experience,
  racerProfile,
  identity,
  legacyDriver,
  media,
  currentContext,
  user,
  routeSlug,
  canManage,
  onEditSaved,
}) {
  const fullName = racerProfile?.display_name || '';
  const heroImg = racerProfile?.hero_image_url || media?.hero_image_url || legacyDriver?.hero_image_url || null;
  const portraitImg = racerProfile?.profile_image_url || media?.headshot_url || legacyDriver?.profile_image_url || null;

  const hometown = [racerProfile?.hometown_city, racerProfile?.hometown_state]
    .filter(Boolean)
    .join(', ');
  const racingBase = [racerProfile?.racing_base_city, racerProfile?.racing_base_state]
    .filter(Boolean)
    .join(', ');

  const yearsLabel = racerProfile?.years_active_start
    ? `${racerProfile.years_active_start}–${racerProfile.years_active_end || 'Present'}`
    : legacyDriver?.years_active_start
    ? `${legacyDriver.years_active_start}–${legacyDriver.years_active_end || 'Present'}`
    : null;

  const socials = [
    { label: 'Website', href: racerProfile?.website_url },
    { label: 'Instagram', href: racerProfile?.instagram_url },
    { label: 'Facebook', href: racerProfile?.facebook_url },
    { label: 'X', href: racerProfile?.x_url },
    { label: 'YouTube', href: racerProfile?.youtube_url },
    { label: 'TikTok', href: racerProfile?.tiktok_url },
  ].filter((social) => social.href);

  return (
    <header>
      {/* PHOTOGRAPHY BAND */}
      <div className="relative h-[340px] w-full overflow-hidden bg-[#0A0A0A] sm:h-[420px]">
        {heroImg ? (
          <>
            <img
              src={heroImg}
              alt={fullName}
              className="h-full w-full object-cover"
              fetchpriority="high"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-[#0A0A0A]" />
        )}

        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto flex max-w-7xl items-end justify-between gap-6 px-4 pb-7 sm:px-6">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-3 font-mono text-[10px] tracking-[0.4em] uppercase text-motion">
                <span>INDEX46</span>
                {racerProfile?.primary_discipline && (
                  <span className="tracking-[0.3em] text-white/50">{racerProfile.primary_discipline}</span>
                )}
              </div>

              <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
                <h1 className="text-4xl font-black uppercase leading-[0.9] tracking-tight text-white sm:text-6xl">
                  {fullName}
                </h1>
                {legacyDriver?.primary_number && (
                  <span className="font-mono text-3xl font-black leading-none text-motion sm:text-5xl">
                    #{legacyDriver.primary_number}
                  </span>
                )}
              </div>

              {racerProfile?.tagline && (
                <p className="mt-3 max-w-2xl text-sm italic text-white/70 sm:text-base">{racerProfile.tagline}</p>
              )}
            </div>

            {portraitImg && (
              <div className="hidden flex-shrink-0 sm:block">
                <img
                  src={portraitImg}
                  alt={fullName}
                  className="h-40 w-32 border border-white/15 object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RACING FACTS + ACTIONS */}
      <div className="border-b border-divider">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex flex-wrap items-center gap-x-7 gap-y-2 text-xs text-foreground-secondary">
              {(hometown || racerProfile?.hometown_country) && (
                <span className="inline-flex items-center gap-2">
                  <CountryFlag country={racerProfile?.hometown_country} />
                  {hometown || racerProfile?.hometown_country}
                </span>
              )}
              {racingBase && <span>Racing base {racingBase}</span>}
              {yearsLabel && <span>Active {yearsLabel}</span>}
              {currentContext?.series?.name && <span>{currentContext.series.name}</span>}
              {currentContext?.class?.name && <span>{currentContext.class.name}</span>}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {socials.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  {socials.map((social) => (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[10px] tracking-[0.25em] uppercase text-foreground-secondary transition-colors hover:text-motion"
                    >
                      {social.label}
                    </a>
                  ))}
                </div>
              )}

              <SocialShareButtons url={window.location.href} title={`${fullName} - Racer Profile`} description="" />

              <RacerEditControl
                canManage={canManage}
                racerProfile={racerProfile}
                identity={identity}
                user={user}
                routeSlug={routeSlug}
                onUpdated={onEditSaved}
              />
            </div>
          </div>

          <EntityFactualSummary type="racer" data={experience} />
        </div>
      </div>
    </header>
  );
}