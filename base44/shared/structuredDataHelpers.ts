/**
 * structuredDataHelpers.ts
 *
 * Phase 17B — Centralized Schema.org JSON-LD builders for AI / answer-engine
 * discovery. Pure functions — no I/O, no writes, no fabrication.
 *
 * PRINCIPLES (from Phase 17B spec):
 *   - Only emit schema properties the platform can populate from reliable source data.
 *   - Never invent unsupported schema types or fabricated required properties.
 *   - Canonical URLs are absolute (Schema.org requires absolute URLs).
 *   - Relationships use existing entity references (Driver → Team, Event → Track, etc.).
 *   - No duplicate data stores — these builders read from entity records passed in.
 *
 * Used by experience functions (getRacerProfileExperience, getEventExperience,
 * getSeriesExperience, getTrackExperience, getTeamExperience) to compose the
 * `seo.structured_data` field consumed by public pages.
 *
 * The canonical base URL is passed in from SeoSettings (site.canonical_base_url).
 * Fallback: https://hijinx.com (matches seoDefaults.ts).
 */

export const STRUCTURED_DATA_CANONICAL_FALLBACK = 'https://hijinx.com';

/**
 * Build an absolute canonical URL from a base and a path.
 * Returns null if path is null/empty.
 */
export function buildCanonicalUrl(canonicalBase: string | null | undefined, path: string | null | undefined): string | null {
  if (!path) return null;
  const base = (canonicalBase || STRUCTURED_DATA_CANONICAL_FALLBACK).replace(/\/$/, '');
  return base + (path.startsWith('/') ? path : '/' + path);
}

/**
 * Remove null/undefined values from an object (shallow).
 * Schema.org JSON-LD should not include null properties.
 */
function compact<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined && v !== '') out[k] = v;
  }
  return out as Partial<T>;
}

/**
 * Build a sameAs array from social profile URLs.
 */
function buildSameAs(socials: (string | null | undefined)[]): string[] {
  return socials.filter((s): s is string => !!s && typeof s === 'string');
}

// ── Person (RacerProfile) ────────────────────────────────────────────────────
export function buildPersonSchema(racer: any, canonicalBase?: string | null): Record<string, any> | null {
  if (!racer || !racer.display_name) return null;
  const url = buildCanonicalUrl(canonicalBase, racer.slug ? `/racers/${racer.slug}` : null);
  const sameAs = buildSameAs([
    racer.website_url, racer.instagram_url, racer.facebook_url,
    racer.x_url, racer.youtube_url, racer.tiktok_url,
  ]);
  const birthPlace = (racer.hometown_city || racer.hometown_state || racer.hometown_country)
    ? compact({
        '@type': 'Place',
        name: [racer.hometown_city, racer.hometown_state, racer.hometown_country].filter(Boolean).join(', '),
        address: compact({
          '@type': 'PostalAddress',
          addressLocality: racer.hometown_city || undefined,
          addressRegion: racer.hometown_state || undefined,
          addressCountry: racer.hometown_country || undefined,
        }),
      })
    : null;

  return compact({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: racer.display_name,
    description: racer.bio || racer.tagline || undefined,
    image: racer.profile_image_url || racer.hero_image_url || undefined,
    jobTitle: racer.career_status || undefined,
    knowsAbout: racer.primary_discipline || undefined,
    birthPlace,
    url: url || undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  });
}

// ── SportsEvent (Event) ──────────────────────────────────────────────────────
export function buildSportsEventSchema(
  event: any,
  track?: any | null,
  series?: any | null,
  canonicalBase?: string | null,
): Record<string, any> | null {
  if (!event || !event.name) return null;
  const url = buildCanonicalUrl(canonicalBase, (event.slug || event.canonical_slug) ? `/events/${event.slug || event.canonical_slug}` : null);
  const location = track ? compact({
    '@type': 'Place',
    name: track.name,
    address: compact({
      '@type': 'PostalAddress',
      addressLocality: track.location_city || undefined,
      addressRegion: track.location_state || undefined,
      addressCountry: track.location_country || undefined,
    }),
    geo: (track.latitude != null && track.longitude != null)
      ? compact({ '@type': 'GeoCoordinates', latitude: track.latitude, longitude: track.longitude })
      : undefined,
  }) : undefined;
  const organizer = series ? compact({ '@type': 'SportsOrganization', name: series.name, sport: series.discipline || undefined }) : undefined;
  const eventStatus = event.status === 'Completed'
    ? 'https://schema.org/EventCompleted'
    : event.status === 'Cancelled'
      ? 'https://schema.org/EventCancelled'
      : 'https://schema.org/EventScheduled';

  return compact({
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: event.name,
    startDate: event.event_date || undefined,
    endDate: event.end_date || undefined,
    description: event.description || undefined,
    eventStatus,
    image: event.event_cover_image_url || event.event_logo_url || undefined,
    url: url || undefined,
    location,
    organizer,
    subEvent: undefined, // populated by caller if sessions exist
    offers: event.ticket_url ? compact({ '@type': 'Offer', url: event.ticket_url, availability: 'https://schema.org/InStock' }) : undefined,
    broadcastUrl: event.broadcast_url || undefined,
  });
}

// ── SportsOrganization (Series) ──────────────────────────────────────────────
export function buildSeriesSchema(series: any, canonicalBase?: string | null): Record<string, any> | null {
  if (!series || !series.name) return null;
  const url = buildCanonicalUrl(canonicalBase, (series.slug || series.canonical_slug) ? `/series/${series.slug || series.canonical_slug}` : null);
  const sameAs = buildSameAs([
    series.website_url, series.social_facebook, series.social_instagram,
    series.social_x, series.social_youtube, series.social_linkedin, series.social_tiktok,
  ]);
  return compact({
    '@context': 'https://schema.org',
    '@type': 'SportsOrganization',
    name: series.full_name || series.name,
    alternateName: series.full_name ? series.name : undefined,
    description: series.description || series.bio || undefined,
    sport: series.discipline || undefined,
    url: url || undefined,
    logo: series.logo_url || undefined,
    image: series.banner_url || series.hero_image_url || undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  });
}

// ── Place (Track) ─────────────────────────────────────────────────────────────
export function buildTrackSchema(track: any, canonicalBase?: string | null): Record<string, any> | null {
  if (!track || !track.name) return null;
  const url = buildCanonicalUrl(canonicalBase, (track.slug || track.canonical_slug) ? `/tracks/${track.slug || track.canonical_slug}` : null);
  return compact({
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: track.name,
    description: track.description || track.bio || undefined,
    url: url || undefined,
    image: track.hero_image_url || track.image_url || undefined,
    address: compact({
      '@type': 'PostalAddress',
      addressLocality: track.location_city || undefined,
      addressRegion: track.location_state || undefined,
      addressCountry: track.location_country || undefined,
      postalCode: track.zip_code || undefined,
      streetAddress: [track.address_line1, track.address_line2].filter(Boolean).join(' ') || undefined,
    }),
    geo: (track.latitude != null && track.longitude != null)
      ? compact({ '@type': 'GeoCoordinates', latitude: track.latitude, longitude: track.longitude })
      : undefined,
    hasMap: track.map_image_url || undefined,
  });
}

// ── SportsOrganization (Team) ──────────────────────────────────────────────────
export function buildTeamSchema(team: any, canonicalBase?: string | null): Record<string, any> | null {
  if (!team || !team.name) return null;
  const slug = team.slug || team.canonical_slug || null;
  const url = buildCanonicalUrl(canonicalBase, slug ? `/teams/${slug}` : null);
  const sameAs = buildSameAs([
    team.website_url, team.instagram_url, team.facebook_url,
    team.tiktok_url, team.x_url, team.youtube_url,
  ]);
  return compact({
    '@context': 'https://schema.org',
    '@type': 'SportsOrganization',
    name: team.name,
    description: team.bio || team.description_summary || team.tagline || undefined,
    sport: team.primary_discipline || undefined,
    url: url || undefined,
    logo: team.logo_url || undefined,
    image: team.hero_image_url || undefined,
    foundingDate: team.founded_year ? String(team.founded_year) : undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  });
}

// ── NewsArticle (OutletStory) ─────────────────────────────────────────────────
export function buildNewsArticleSchema(story: any, canonicalBase?: string | null): Record<string, any> | null {
  if (!story || !story.title) return null;
  const url = buildCanonicalUrl(canonicalBase, story.slug ? `/story/${story.slug}` : null);
  const author = story.author
    ? compact({ '@type': 'Person', name: story.author, jobTitle: story.author_title || undefined })
    : undefined;
  return compact({
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: story.title,
    description: story.subtitle || undefined,
    datePublished: story.published_date || undefined,
    dateModified: story.updated_date || undefined,
    image: story.cover_image_url || undefined,
    url: url || undefined,
    author,
    articleSection: story.primary_category || undefined,
    keywords: story.tags && story.tags.length > 0 ? story.tags.join(', ') : undefined,
    publisher: compact({ '@type': 'Organization', name: 'HIJINX', logo: { '@type': 'ImageObject', url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69875e8c5d41c7f087ed1b90/8021cd5dd_Asset484x.png' } }),
  });
}

// ── BreadcrumbList ────────────────────────────────────────────────────────────
export function buildBreadcrumbSchema(
  crumbs: { name: string; path: string }[],
  canonicalBase?: string | null,
): Record<string, any> | null {
  if (!crumbs || crumbs.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: buildCanonicalUrl(canonicalBase, c.path) || undefined,
    })),
  };
}

// ── ItemList (ranked results / standings) ─────────────────────────────────────
// Only semantically correct for ordered ranked lists (finishing order, standings).
export function buildResultListSchema(
  items: { name: string; position: number; url?: string | null }[],
  canonicalBase?: string | null,
): Record<string, any> | null {
  if (!items || items.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListOrder: 'https://schema.org/Ascending',
    numberOfItems: items.length,
    itemListElement: items.map((item) => ({
      '@type': 'ListItem',
      position: item.position,
      name: item.name,
      url: item.url ? buildCanonicalUrl(canonicalBase, item.url) || undefined : undefined,
    })),
  };
}

// ── WebSite (site-wide) ───────────────────────────────────────────────────────
export function buildWebSiteSchema(canonicalBase?: string | null, siteName?: string | null): Record<string, any> {
  const base = (canonicalBase || STRUCTURED_DATA_CANONICAL_FALLBACK).replace(/\/$/, '');
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName || 'HIJINX',
    url: base,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${base}/Directory?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

// ── Organization (site-wide) ──────────────────────────────────────────────────
export function buildOrganizationSchema(
  canonicalBase?: string | null,
  siteName?: string | null,
  logoUrl?: string | null,
): Record<string, any> {
  const base = (canonicalBase || STRUCTURED_DATA_CANONICAL_FALLBACK).replace(/\/$/, '');
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteName || 'HIJINX',
    url: base,
    logo: logoUrl || 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69875e8c5d41c7f087ed1b90/8021cd5dd_Asset484x.png',
    sameAs: [
      'https://hijinx.com',
    ],
  };
}