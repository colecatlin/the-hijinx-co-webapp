/**
 * racerPublicProjection.ts — the only shapes public clients may receive.
 *
 * The public racer surface never hands back a stored entity object: every
 * response is built here, field by field, from an explicit allow-list. Date of
 * birth, licence number, contact email, access codes, claim evidence, claim
 * history, rejection reasons and private ownership metadata cannot be expressed
 * by these builders, so they cannot leak through a public read.
 */

const EMPTY = (value: any) => value === undefined || value === null || value === '';

/** Public-safe person identity: a name, where they are from, and a claim flag. */
export function toPublicIdentity(identity: any) {
  if (!identity || typeof identity !== 'object') return null;
  return {
    id: identity.id || null,
    racecore_id: identity.racecore_id || null,
    canonical_name: identity.canonical_name || null,
    nationality: identity.nationality || null,
    hometown_city: identity.hometown_city || null,
    hometown_state: identity.hometown_state || null,
    hometown_country: identity.hometown_country || null,
    claim_status: identity.claim_status || 'unclaimed',
    is_claimed: identity.claim_status === 'claimed',
  };
}

/** Public-safe racer profile — the public racing persona, nothing internal. */
export function toPublicRacerProfile(rp: any) {
  if (!rp || typeof rp !== 'object') return null;
  return {
    id: rp.id || null,
    slug: rp.slug || null,
    display_name: rp.display_name || null,
    racecore_id: rp.racecore_id || null,
    bio: rp.bio || null,
    tagline: rp.tagline || null,
    profile_image_url: rp.profile_image_url || null,
    hero_image_url: rp.hero_image_url || null,
    career_status: rp.career_status || null,
    primary_discipline: rp.primary_discipline || null,
    visibility: rp.visibility || 'draft',
    is_claimed: rp.is_claimed === true,
    website_url: rp.website_url || null,
    instagram_url: rp.instagram_url || null,
    facebook_url: rp.facebook_url || null,
    tiktok_url: rp.tiktok_url || null,
    x_url: rp.x_url || null,
    youtube_url: rp.youtube_url || null,
    nicknames: Array.isArray(rp.nicknames) ? rp.nicknames : [],
    years_active_start: rp.years_active_start ?? null,
    years_active_end: rp.years_active_end ?? null,
    hometown_city: rp.hometown_city || null,
    hometown_state: rp.hometown_state || null,
    hometown_country: rp.hometown_country || null,
    racing_base_city: rp.racing_base_city || null,
    racing_base_state: rp.racing_base_state || null,
    racing_base_country: rp.racing_base_country || null,
  };
}

/**
 * Legacy Driver as public clients may see it. Deliberately omits date_of_birth,
 * contact_email, numeric_id, owner_user_id and every import/source field.
 */
export function toPublicLegacyDriver(driver: any) {
  if (!driver || typeof driver !== 'object') return null;
  return {
    id: driver.id || null,
    slug: driver.slug || driver.canonical_slug || null,
    racecore_id: driver.racecore_id || null,
    first_name: driver.first_name || null,
    last_name: driver.last_name || null,
    primary_number: driver.primary_number || null,
    manufacturer: driver.manufacturer || null,
    primary_discipline: driver.primary_discipline || null,
    career_status: driver.career_status || null,
    racing_status: driver.racing_status || null,
    team_id: driver.team_id || null,
    primary_series_id: driver.primary_series_id || null,
    primary_class_id: driver.primary_class_id || null,
    hometown_city: driver.hometown_city || null,
    hometown_state: driver.hometown_state || null,
    hometown_country: driver.hometown_country || null,
    racing_base_city: driver.racing_base_city || null,
    racing_base_state: driver.racing_base_state || null,
    racing_base_country: driver.racing_base_country || null,
    visible: driver.visibility_status === 'live',
  };
}

/** Public-safe season participation — the canonical current racing context. */
export function toPublicParticipation(p: any) {
  if (!p || typeof p !== 'object') return null;
  return {
    id: p.id || null,
    racecore_id: p.racecore_id || null,
    series_id: p.series_id || null,
    series_class_id: p.series_class_id || null,
    team_id: p.team_id || null,
    vehicle_id: p.vehicle_id || null,
    car_number: p.car_number || null,
    season_year: p.season_year || null,
    racer_type: p.racer_type || null,
    status: p.status || null,
    is_primary: p.is_primary === true,
  };
}

export function toPublicEntry(entry: any) {
  if (!entry || typeof entry !== 'object') return null;
  return {
    id: entry.id || null,
    event_id: entry.event_id || null,
    participation_id: entry.participation_id || null,
    event_class_id: entry.event_class_id || null,
    series_id: entry.series_id || null,
    series_class_id: entry.series_class_id || null,
    team_id: entry.team_id || null,
    vehicle_id: entry.vehicle_id || null,
    car_number: entry.car_number || null,
    entry_status: entry.entry_status || null,
  };
}

export function toPublicResult(result: any) {
  if (!result || typeof result !== 'object') return null;
  return {
    id: result.id || null,
    event_id: result.event_id || null,
    session_id: result.session_id || null,
    session_type: result.session_type || null,
    entry_id: result.entry_id || null,
    participation_id: result.participation_id || null,
    series_id: result.series_id || null,
    series_class_id: result.series_class_id || null,
    team_id: result.team_id || null,
    position: result.position ?? null,
    status: result.status || null,
    status_state: result.status_state || null,
    laps_completed: result.laps_completed ?? null,
    best_lap_time_ms: result.best_lap_time_ms ?? null,
    points: result.points ?? null,
    published: result.published === true,
  };
}

export function toPublicStanding(standing: any) {
  if (!standing || typeof standing !== 'object') return null;
  return {
    id: standing.id || null,
    series_id: standing.series_id || null,
    series_class_id: standing.series_class_id || null,
    season_year: standing.season_year || null,
    participation_id: standing.participation_id || null,
    position: standing.position ?? null,
    rank: standing.rank ?? null,
    points_total: standing.points_total ?? 0,
    wins: standing.wins ?? 0,
    podiums: standing.podiums ?? 0,
    starts: standing.starts ?? 0,
    last_calculated: standing.last_calculated || null,
  };
}

/** Career stats summary as the public profile consumes it. */
export function toPublicCareerStats(stats: any) {
  if (!stats || typeof stats !== 'object') return null;
  return {
    career_starts: stats.career_starts ?? 0,
    career_wins: stats.career_wins ?? 0,
    career_podiums: stats.career_podiums ?? 0,
    career_top5: stats.career_top5 ?? 0,
    career_top10: stats.career_top10 ?? 0,
    career_dnf: stats.career_dnf ?? 0,
    career_points_total: stats.career_points_total ?? 0,
    championships: stats.championships ?? 0,
    seasons_count: stats.seasons_count ?? 0,
    series_count: stats.series_count ?? 0,
    first_start_date: stats.first_start_date || null,
    most_recent_start_date: stats.most_recent_start_date || null,
    last_calculated: stats.last_calculated || null,
  };
}

/** Fields that must never appear on a public racer response. */
export const FORBIDDEN_PUBLIC_KEYS = [
  'date_of_birth',
  'contact_email',
  'numeric_id',
  'license_number',
  'external_uid',
  'claim_evidence',
  'claim_history',
  'claim_rejection_reason',
  'claim_reviewed_by',
  'owner_user_id',
  'claimed_by_user_id',
  'claim_reviewed_at',
  'data_source',
  'sync_last_seen_at',
  'access_code',
];

/** Guard used by the verification pass: does a payload carry anything private? */
export function findForbiddenKeys(payload: any, path = ''): string[] {
  const found: string[] = [];
  if (!payload || typeof payload !== 'object') return found;
  for (const key of Object.keys(payload)) {
    const here = path ? path + '.' + key : key;
    if (FORBIDDEN_PUBLIC_KEYS.includes(key)) {
      const value = payload[key];
      if (!EMPTY(value)) found.push(here);
      continue;
    }
    const value = payload[key];
    if (value && typeof value === 'object') {
      found.push(...findForbiddenKeys(value, here));
    }
  }
  return found;
}