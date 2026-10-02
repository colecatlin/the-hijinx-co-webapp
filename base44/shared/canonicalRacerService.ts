/**
 * canonicalRacerService.ts — THE canonical racer creation / update service.
 *
 * Every modern racer creation surface (Quick Add, workbook racers tab,
 * identity-first CSV, Smart CSV, admin creation) calls upsertCanonicalRacer.
 * UI and input formats may differ; creation logic may not be duplicated.
 *
 * Fixed creation order:
 *   1 resolve PersonIdentity
 *   2 resolve / create RacerProfile   (fields seeded from authoritative input)
 *   3 ensure the legacy Driver compatibility record
 *   4 resolve / create SeasonParticipation when series + season context exists
 *   5 write / update the DriverImportIdentityLink idempotency link
 *   6 validate the relationship graph
 *   7 return the canonical ids
 *
 * Server-side only: slugs, RaceCore IDs and access codes are generated here,
 * never in a browser. Never produces a Driver-only racer. Never merges or
 * attaches a person on a name-only match. Never fabricates a participation
 * without provable season context.
 */
import { ensureRaceCoreId } from './racecoreId.ts';
import {
  matchPersonIdentity,
  normalizeIdentityName,
  detectSurnameFirst,
  invertSurnameFirst,
  confidenceLevelFromScore,
  hasTrustedEvidence,
} from './personIdentityMatcher.ts';
import { slugify, generateUniqueRacerSlug, recordRacerSlugHistory } from './racerSlugService.ts';
import { validateRacerRelationshipGraph } from './racerRelationshipGraph.ts';

const CAREER_STATUS_MAP: Record<string, string> = {
  novice: 'Novice',
  beginner: 'Novice',
  amateur: 'Amateur',
  'semi professional': 'Semi-Professional',
  'semi-professional': 'Semi-Professional',
  semipro: 'Semi-Professional',
  professional: 'Professional',
  pro: 'Professional',
};

const DISCIPLINES = [
  'Stock Car', 'Open Wheel', 'Sports Car', 'Touring Car', 'Off Road', 'Dirt Oval',
  'Rally', 'Rallycross', 'Drift', 'Drag Racing', 'Motorcycle', 'Karting',
  'Snowmobile', 'Watercraft', 'Aviation', 'Alternative',
];

function text(value: any): string {
  return typeof value === 'string' ? value.trim() : '';
}

function numberOrNull(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Map free-text status wording onto the fixed career_status enum. */
export function mapCareerStatus(value: any): string | null {
  const key = text(value).toLowerCase();
  if (!key) return null;
  if (CAREER_STATUS_MAP[key]) return CAREER_STATUS_MAP[key];
  if (key.includes('semi')) return 'Semi-Professional';
  if (key.includes('profession') || key.includes('pro ')) return 'Professional';
  if (key.includes('amateur')) return 'Amateur';
  if (key.includes('novice')) return 'Novice';
  return null;
}

/** Filter a discipline onto the Driver enum; RacerProfile keeps the free string. */
export function mapDiscipline(value: any): string | null {
  const key = text(value).toLowerCase();
  if (!key) return null;
  for (const d of DISCIPLINES) if (d.toLowerCase() === key) return d;
  return null;
}

function splitName(canonicalName: string): { first_name: string; last_name: string } {
  const parts = text(canonicalName).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: '', last_name: '' };
  if (parts.length === 1) return { first_name: parts[0], last_name: parts[0] };
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') };
}

async function resolveTeam(sr: any, value: any) {
  const raw = text(value);
  if (!raw) return { status: 'none' as const };
  const byId = await sr.entities.Team.get(raw).catch(() => null);
  if (byId) return { status: 'ok' as const, team: byId, method: 'internal_id' };

  const teams = await sr.entities.Team.list('-created_date', 500).catch(() => []);
  const exact = (teams || []).filter((t: any) => t && text(t.name).toLowerCase() === raw.toLowerCase());
  if (exact.length === 1) return { status: 'ok' as const, team: exact[0], method: 'name' };
  if (exact.length > 1) return { status: 'review' as const, matches: exact.map((t: any) => ({ id: t.id, name: t.name })) };

  const aliases = await sr.entities.EntityAlias
    .filter({ entity_type: 'Team', alias_normalized: raw.toLowerCase(), active: true }).catch(() => []);
  const ids = Array.from(new Set((aliases || []).map((a: any) => a.entity_id).filter(Boolean)));
  if (ids.length === 1) {
    const team = await sr.entities.Team.get(ids[0] as string).catch(() => null);
    if (team) return { status: 'ok' as const, team, method: 'alias' };
  }
  if (ids.length > 1) return { status: 'review' as const, matches: ids.map((id) => ({ id, name: null })) };
  return { status: 'not_found' as const };
}

async function generateDriverSlug(sr: any, name: string): Promise<string | null> {
  const base = slugify(name);
  if (!base) return null;
  for (let suffix = 1; suffix <= 60; suffix++) {
    const candidate = suffix === 1 ? base : base + '-' + suffix;
    const clash = await sr.entities.Driver
      .filter({ canonical_slug: candidate }).catch(() => []);
    if ((clash || []).length === 0) return candidate;
  }
  return base + '-' + Date.now().toString(36);
}

async function generateNumericId(sr: any): Promise<string> {
  for (let attempt = 0; attempt < 25; attempt++) {
    const candidate = String(Math.floor(10000000 + Math.random() * 89999999));
    const clash = await sr.entities.Driver.filter({ numeric_id: candidate }).catch(() => []);
    if ((clash || []).length === 0) return candidate;
  }
  return String(Date.now()).slice(-8);
}

function seedIfEmpty(target: Record<string, any>, source: Record<string, any>) {
  for (const key of Object.keys(source)) {
    const value = source[key];
    if (value === undefined || value === null || value === '') continue;
    const current = target[key];
    if (current === undefined || current === null || current === '') target[key] = value;
  }
}

export interface CanonicalRacerResult {
  status: 'created' | 'updated' | 'reused' | 'review_required' | 'blocked' | 'error';
  review_required: boolean;
  review_reasons: string[];
  warnings: string[];
  person_identity_id: string | null;
  racer_profile_id: string | null;
  legacy_driver_id: string | null;
  season_participation_id: string | null;
  racecore_ids: Record<string, string | null>;
  slug: string | null;
  graph_ok: boolean | null;
  created: { identity: boolean; profile: boolean; driver: boolean; participation: boolean };
}

export async function upsertCanonicalRacer(
  base44: any,
  input: Record<string, any>,
  actor: { id?: string | null; full_name?: string | null } = {},
): Promise<CanonicalRacerResult> {
  const sr = base44.asServiceRole;
  const warnings: string[] = [];
  const reviewReasons: string[] = [];
  const created = { identity: false, profile: false, driver: false, participation: false };
  const racecoreIds: Record<string, string | null> = { PERS: null, RACR: null, DRVR: null, PART: null };

  const rawName = text(input.full_name) || [text(input.first_name), text(input.last_name)].filter(Boolean).join(' ');
  if (!rawName) {
    return {
      status: 'blocked', review_required: false, review_reasons: ['A racer name is required'],
      warnings, person_identity_id: null, racer_profile_id: null, legacy_driver_id: null,
      season_participation_id: null, racecore_ids: racecoreIds, slug: null, graph_ok: null, created,
    };
  }

  const sourceType = text(input.source_type) || 'canonical_racer_service';
  const sourceName = text(input.source_name) || 'Canonical racer service';
  const creationReason = text(input.creation_reason) || 'admin_create';

  // ── 5a. Idempotency: an existing source link is the strongest reuse signal ──
  const sourceKey = text(input.source_key) || null;
  if (sourceKey) {
    const links = await sr.entities.DriverImportIdentityLink
      .filter({ source_key: sourceKey, is_archived: false }).catch(() => []);
    const link = (links || [])[0];
    if (link) {
      const profile = link.racer_profile_id
        ? await sr.entities.RacerProfile.get(link.racer_profile_id).catch(() => null) : null;
      const identity = link.person_identity_id
        ? await sr.entities.PersonIdentity.get(link.person_identity_id).catch(() => null) : null;
      if (profile && identity) {
        if (profile.legacy_driver_id) racecoreIds.DRVR = (await sr.entities.Driver.get(profile.legacy_driver_id).catch(() => null))?.racecore_id || null;
        racecoreIds.PERS = identity.racecore_id || null;
        racecoreIds.RACR = profile.racecore_id || null;
        if (link.season_participation_id) {
          const participation = await sr.entities.SeasonParticipation.get(link.season_participation_id).catch(() => null);
          racecoreIds.PART = participation?.racecore_id || null;
        }
        return {
          status: 'reused', review_required: false, review_reasons: [],
          warnings: ['This racer was already imported from the same source — the existing records were reused.'],
          person_identity_id: identity.id, racer_profile_id: profile.id,
          legacy_driver_id: profile.legacy_driver_id || null,
          season_participation_id: link.season_participation_id || null,
          racecore_ids: racecoreIds, slug: profile.slug || null, graph_ok: null, created,
        };
      }
    }
  }

  // ── 1. Resolve PersonIdentity ────────────────────────────────────────────
  const match = await matchPersonIdentity(sr, {
    name: rawName,
    dob: text(input.date_of_birth) || null,
    license_number: text(input.license_number) || null,
    external_uid: text(input.external_uid) || null,
    series_name: text(input.series) || text(input.series_name) || null,
    exclude_identity_ids: Array.isArray(input.exclude_identity_ids) ? input.exclude_identity_ids : null,
  });

  if (match.action === 'BLOCKED') {
    return {
      status: 'blocked', review_required: false,
      review_reasons: ['Trusted identity conflict: ' + match.reason],
      warnings, person_identity_id: null, racer_profile_id: null, legacy_driver_id: null,
      season_participation_id: null, racecore_ids: racecoreIds, slug: null, graph_ok: null, created,
    };
  }
  if (match.action === 'REVIEW') {
    return {
      status: 'review_required', review_required: true,
      review_reasons: ['Identity needs human confirmation (' + match.reason + ') — signals: ' + match.signals.join(', ')],
      warnings, person_identity_id: match.identity_id, racer_profile_id: null, legacy_driver_id: null,
      season_participation_id: null, racecore_ids: racecoreIds, slug: null, graph_ok: null, created,
    };
  }

  let identity: any = match.identity;
  if (match.action === 'NEW_IDENTITY') {
    const canonicalName = detectSurnameFirst(rawName) ? invertSurnameFirst(rawName) : rawName;
    identity = await sr.entities.PersonIdentity.create({
      status: 'active',
      confidence_level: confidenceLevelFromScore(match.confidence),
      confidence_score: match.confidence,
      canonical_name: canonicalName,
      date_of_birth: text(input.date_of_birth) || null,
      license_number: text(input.license_number) || null,
      external_uid: text(input.external_uid) || null,
      nationality: text(input.nationality) || null,
      hometown_city: text(input.hometown_city) || null,
      hometown_state: text(input.hometown_state) || null,
      hometown_country: text(input.hometown_country) || null,
      data_source: sourceName,
    });
    created.identity = true;

    const normalized = normalizeIdentityName(rawName);
    if (normalized) {
      await sr.entities.IdentityAlias.create({
        identity_id: identity.id,
        alias_name: rawName,
        alias_normalized: normalized,
        alias_type: 'source_variant',
        confidence: match.confidence,
        source: sourceName,
        source_type: 'import',
        is_primary: true,
        active: true,
      }).catch(() => null);
    }
    await ensureRaceCoreId(base44, 'PersonIdentity', identity.id)
      .then((r: any) => { if (r?.success) racecoreIds.PERS = r.racecore_id; })
      .catch(() => null);
  }
  if (!racecoreIds.PERS && identity?.racecore_id) racecoreIds.PERS = identity.racecore_id;

  // A stronger evidence signal should raise the stored confidence.
  if (identity && match.action === 'ATTACHED' && hasTrustedEvidence(match.signals)
      && match.confidence > (identity.confidence_score || 0)) {
    await sr.entities.PersonIdentity.update(identity.id, {
      confidence_score: match.confidence,
      confidence_level: confidenceLevelFromScore(match.confidence),
    }).catch(() => null);
  }

  // ── 2. Resolve / create RacerProfile ─────────────────────────────────────
  const existingProfiles = await sr.entities.RacerProfile
    .filter({ person_identity_id: identity.id, is_archived: false }).catch(() => []);
  const profileList = (existingProfiles || []).filter(Boolean);

  if (profileList.length > 1) {
    return {
      status: 'review_required', review_required: true,
      review_reasons: ['AMBIGUOUS_RACER_PROFILE: this identity has ' + profileList.length + ' RacerProfiles'],
      warnings, person_identity_id: identity.id, racer_profile_id: null, legacy_driver_id: null,
      season_participation_id: null, racecore_ids: racecoreIds, slug: null, graph_ok: null, created,
    };
  }

  const careerStatus = mapCareerStatus(input.career_status);
  const discipline = text(input.primary_discipline) || null;
  const publicSeed: Record<string, any> = {
    bio: text(input.bio) || null,
    tagline: text(input.tagline) || null,
    profile_image_url: text(input.profile_image_url) || null,
    hero_image_url: text(input.hero_image_url) || null,
    website_url: text(input.website_url) || null,
    instagram_url: text(input.instagram_url) || null,
    facebook_url: text(input.facebook_url) || null,
    tiktok_url: text(input.tiktok_url) || null,
    x_url: text(input.x_url) || null,
    youtube_url: text(input.youtube_url) || null,
    racing_base_city: text(input.racing_base_city) || null,
    racing_base_state: text(input.racing_base_state) || null,
    racing_base_country: text(input.racing_base_country) || null,
    years_active_start: numberOrNull(input.years_active_start),
    years_active_end: numberOrNull(input.years_active_end),
  };

  let profile: any = profileList[0] || null;
  if (profile) {
    const patch: Record<string, any> = {};
    seedIfEmpty(patch, publicSeed);
    if (careerStatus && !profile.career_status) patch.career_status = careerStatus;
    if (discipline && !profile.primary_discipline) patch.primary_discipline = discipline;
    if (Array.isArray(input.nicknames) && input.nicknames.length > 0 && (!profile.nicknames || profile.nicknames.length === 0)) {
      patch.nicknames = input.nicknames.filter((n: any) => typeof n === 'string' && n.trim());
    }
    if (Object.keys(patch).length > 0) {
      await sr.entities.RacerProfile.update(profile.id, patch).catch(() => null);
      profile = { ...profile, ...patch };
    }
    warnings.push('Existing racer profile reused.');
  } else {
    const displayName = text(input.display_name) || identity.canonical_name || rawName;
    const slug = await generateUniqueRacerSlug(sr, displayName);
    const payload: Record<string, any> = {
      person_identity_id: identity.id,
      display_name: displayName,
      slug,
      visibility: 'draft',
      is_claimed: false,
      is_archived: false,
      hometown_city: identity.hometown_city || text(input.hometown_city) || null,
      hometown_state: identity.hometown_state || text(input.hometown_state) || null,
      hometown_country: identity.hometown_country || text(input.hometown_country) || null,
    };
    if (careerStatus) payload.career_status = careerStatus;
    if (discipline) payload.primary_discipline = discipline;
    for (const key of Object.keys(publicSeed)) {
      if (publicSeed[key] !== null && publicSeed[key] !== undefined) payload[key] = publicSeed[key];
    }
    if (Array.isArray(input.nicknames)) payload.nicknames = input.nicknames.filter((n: any) => typeof n === 'string' && n.trim());

    profile = await sr.entities.RacerProfile.create(payload);
    created.profile = true;
    await ensureRaceCoreId(base44, 'RacerProfile', profile.id)
      .then((r: any) => { if (r?.success) racecoreIds.RACR = r.racecore_id; })
      .catch(() => null);
  }
  if (!racecoreIds.RACR && profile?.racecore_id) racecoreIds.RACR = profile.racecore_id;

  // ── 3. Legacy Driver compatibility record ────────────────────────────────
  let driver: any = profile.legacy_driver_id
    ? await sr.entities.Driver.get(profile.legacy_driver_id).catch(() => null) : null;

  if (!driver && identity.canonical_driver_id) {
    driver = await sr.entities.Driver.get(identity.canonical_driver_id).catch(() => null);
  }
  if (!driver) {
    const linkRows = await sr.entities.DriverImportIdentityLink
      .filter({ person_identity_id: identity.id, is_archived: false }).catch(() => []);
    for (const link of (linkRows || [])) {
      if (!link || !link.legacy_driver_id) continue;
      const candidate = await sr.entities.Driver.get(link.legacy_driver_id).catch(() => null);
      if (candidate) { driver = candidate; break; }
    }
  }

  if (!driver) {
    const names = splitName(identity.canonical_name || rawName);
    const driverSlug = await generateDriverSlug(sr, (names.first_name + ' ' + names.last_name).trim());
    const seriesResolved = text(input.series) || text(input.series_name) || null;
    let seriesId: string | null = null;
    if (seriesResolved) {
      const byId = await sr.entities.Series.get(seriesResolved).catch(() => null);
      if (byId) seriesId = byId.id;
    }
    driver = await sr.entities.Driver.create({
      first_name: names.first_name,
      last_name: names.last_name,
      slug: driverSlug,
      canonical_slug: driverSlug,
      normalized_name: normalizeIdentityName(names.first_name + ' ' + names.last_name),
      canonical_key: 'Driver:' + (normalizeIdentityName(names.first_name + ' ' + names.last_name) || driverSlug),
      numeric_id: await generateNumericId(sr),
      date_of_birth: identity.date_of_birth || text(input.date_of_birth) || null,
      contact_email: text(input.contact_email) || null,
      hometown_city: identity.hometown_city || null,
      hometown_state: identity.hometown_state || null,
      hometown_country: identity.hometown_country || null,
      racing_base_city: text(input.racing_base_city) || null,
      racing_base_state: text(input.racing_base_state) || null,
      racing_base_country: text(input.racing_base_country) || null,
      primary_number: text(input.car_number) || text(input.primary_number) || null,
      primary_discipline: mapDiscipline(input.primary_discipline),
      primary_series_id: seriesId,
      career_status: careerStatus,
      racing_status: 'Active',
      visibility_status: 'draft',
      external_uid: text(input.external_uid) || null,
      data_source: sourceName,
      is_archived: false,
    });
    created.driver = true;
    await ensureRaceCoreId(base44, 'Driver', driver.id)
      .then((r: any) => { if (r?.success) racecoreIds.DRVR = r.racecore_id; })
      .catch(() => null);
  } else if (driver.racecore_id) {
    racecoreIds.DRVR = driver.racecore_id;
  }

  if (!profile.legacy_driver_id && driver?.id) {
    await sr.entities.RacerProfile.update(profile.id, { legacy_driver_id: driver.id }).catch(() => null);
    profile = { ...profile, legacy_driver_id: driver.id };
  }
  if (identity && !identity.canonical_driver_id && driver?.id) {
    await sr.entities.PersonIdentity.update(identity.id, { canonical_driver_id: driver.id }).catch(() => null);
    identity = { ...identity, canonical_driver_id: driver.id };
  }

  // ── 4. SeasonParticipation when series + season context exists ───────────
  let participation: any = null;
  const seriesValue = text(input.series) || text(input.series_name) || null;
  const seasonYear = text(input.season_year) || null;

  if (seriesValue && !seasonYear) {
    reviewReasons.push('PARTICIPATION_CONTEXT_INCOMPLETE: a series was supplied without a season year — no participation was created.');
  } else if (!seriesValue && seasonYear) {
    reviewReasons.push('PARTICIPATION_CONTEXT_INCOMPLETE: a season year was supplied without a series — no participation was created.');
  } else if (seriesValue && seasonYear) {
    const { resolveSeries, resolveClass } = await import('./driverImportHelpers.ts');
    const seriesResult = await resolveSeries(sr, seriesValue);
    if (seriesResult.status !== 'ok') {
      reviewReasons.push('PARTICIPATION_CONTEXT_INCOMPLETE: series "' + seriesValue + '" could not be resolved deterministically (' + (seriesResult.error || seriesResult.status) + ').');
    } else {
      const series = seriesResult.series;
      let classId: string | null = null;
      const classValue = text(input.class) || text(input.series_class) || null;
      if (classValue) {
        const classResult = await resolveClass(sr, series.id, classValue);
        if (classResult.status === 'ok') classId = classResult.classRecord.id;
        else reviewReasons.push('Class "' + classValue + '" could not be resolved in series "' + series.name + '" (' + (classResult.error || classResult.status) + ').');
      }

      let teamId: string | null = null;
      const teamValue = text(input.team) || text(input.team_name) || null;
      if (teamValue) {
        const teamResult = await resolveTeam(sr, teamValue);
        if (teamResult.status === 'ok') teamId = teamResult.team.id;
        else if (teamResult.status === 'review') reviewReasons.push('Team "' + teamValue + '" is ambiguous — needs a human decision.');
        else reviewReasons.push('Team "' + teamValue + '" was not found; the participation was created without a team.');
      }

      const racerType = text(input.racer_type) || 'Driver';
      const existing = await sr.entities.SeasonParticipation.filter({
        racer_profile_id: profile.id, series_id: series.id, season_year: seasonYear, racer_type: racerType,
      }).catch(() => []);
      participation = (existing || [])[0] || null;

      if (participation) {
        const patch: Record<string, any> = {};
        if (classId && !participation.series_class_id) patch.series_class_id = classId;
        if (teamId && !participation.team_id) patch.team_id = teamId;
        const carNumber = text(input.car_number) || null;
        if (carNumber && !participation.car_number) patch.car_number = carNumber;
        const vehicleId = text(input.vehicle_id) || null;
        if (vehicleId && !participation.vehicle_id) patch.vehicle_id = vehicleId;
        if (input.is_primary === true && participation.is_primary !== true) patch.is_primary = true;
        if (Object.keys(patch).length > 0) {
          await sr.entities.SeasonParticipation.update(participation.id, patch).catch(() => null);
          participation = { ...participation, ...patch };
        }
        warnings.push('Existing season participation reused.');
      } else {
        participation = await sr.entities.SeasonParticipation.create({
          racer_profile_id: profile.id,
          person_identity_id: identity.id,
          legacy_driver_id: driver?.id || null,
          series_id: series.id,
          series_class_id: classId,
          team_id: teamId,
          car_number: text(input.car_number) || null,
          vehicle_id: text(input.vehicle_id) || null,
          season_year: seasonYear,
          racer_type: racerType,
          status: 'Active',
          is_primary: input.is_primary === true,
          is_archived: false,
        });
        created.participation = true;
        await ensureRaceCoreId(base44, 'SeasonParticipation', participation.id)
          .then((r: any) => { if (r?.success) racecoreIds.PART = r.racecore_id; })
          .catch(() => null);
      }
      if (!racecoreIds.PART && participation?.racecore_id) racecoreIds.PART = participation.racecore_id;
    }
  }

  // ── 5. Idempotency link ──────────────────────────────────────────────────
  if (sourceKey) {
    const { validateSourceLinkRecords } = await import('./driverImportHelpers.ts');
    const linkPayload: Record<string, any> = {
      source_key: sourceKey,
      source_type: sourceType,
      season_year: seasonYear || seriesValue || 'unknown',
      first_name_normalized: text(input.first_name) || splitName(identity.canonical_name || rawName).first_name,
      last_name_normalized: text(input.last_name) || splitName(identity.canonical_name || rawName).last_name,
      series_id: participation?.series_id || (text(input.series) || 'unknown'),
      class_id: participation?.series_class_id || text(input.class) || 'unknown',
      person_identity_id: identity.id,
      racer_profile_id: profile.id,
      season_participation_id: participation?.id || null,
      legacy_driver_id: driver?.id || null,
      import_run_id: text(input.import_run_id) || null,
      status: 'resolved',
      is_archived: false,
    };
    const problems = await validateSourceLinkRecords(sr, linkPayload);
    if (problems.length === 0) {
      const existingLinks = await sr.entities.DriverImportIdentityLink
        .filter({ source_key: sourceKey, is_archived: false }).catch(() => []);
      if ((existingLinks || []).length === 0) {
        await sr.entities.DriverImportIdentityLink.create(linkPayload).catch(() => null);
      } else if (existingLinks[0]?.id) {
        await sr.entities.DriverImportIdentityLink.update(existingLinks[0].id, linkPayload).catch(() => null);
      }
    } else {
      warnings.push('Source link not written — unresolved references: ' + problems.join(', '));
    }
  }

  // ── 6. Validate the relationship graph ───────────────────────────────────
  let graphOk: boolean | null = null;
  try {
    const graph = await validateRacerRelationshipGraph(sr, { racer_profile_id: profile.id });
    graphOk = graph.ok;
    for (const error of graph.errors) warnings.push('GRAPH:' + error.code);
    for (const warning of graph.warnings) warnings.push('GRAPH:' + warning.code);
    if (!graph.ok) reviewReasons.push('Relationship graph has integrity errors: ' + graph.errors.map((e) => e.code).join(', '));
  } catch (error: any) {
    warnings.push('Graph validation failed: ' + (error?.message || 'unknown error'));
  }

  // ── 7. Return the canonical ids ──────────────────────────────────────────
  await sr.entities.AuditLog.create({
    entity_type: 'RacerProfile',
    entity_id: profile.id,
    entity_name: profile.display_name,
    action: created.profile ? 'created' : 'updated',
    performed_by: actor.id || 'system',
    performed_by_name: actor.full_name || null,
    timestamp: new Date().toISOString(),
    notes: 'upsertCanonicalRacer via ' + sourceName + ' (reason: ' + creationReason + ')',
    after_data: {
      person_identity_id: identity.id,
      racer_profile_id: profile.id,
      legacy_driver_id: driver?.id || null,
      season_participation_id: participation?.id || null,
      created,
    },
  }).catch(() => null);

  return {
    status: created.profile ? 'created' : 'updated',
    review_required: reviewReasons.length > 0,
    review_reasons: reviewReasons,
    warnings,
    person_identity_id: identity.id,
    racer_profile_id: profile.id,
    legacy_driver_id: driver?.id || null,
    season_participation_id: participation?.id || null,
    racecore_ids: racecoreIds,
    slug: profile.slug || null,
    graph_ok: graphOk,
    created,
  };
}

/**
 * Canonical name change: the identity owns the human name, and the profile and
 * legacy Driver compatibility copies follow in one audited operation. The public
 * slug is never changed implicitly.
 */
export async function updateCanonicalRacerName(
  base44: any,
  input: { person_identity_id?: string; racer_profile_id?: string; canonical_name?: string; preserve_previous_as_alias?: boolean },
  actor: { id?: string | null; full_name?: string | null } = {},
) {
  const sr = base44.asServiceRole;
  const name = text(input.canonical_name);
  if (!name) return { status: 'blocked', error: 'canonical_name is required' };

  let identity = input.person_identity_id
    ? await sr.entities.PersonIdentity.get(input.person_identity_id).catch(() => null) : null;
  let profile = input.racer_profile_id
    ? await sr.entities.RacerProfile.get(input.racer_profile_id).catch(() => null) : null;
  if (!identity && profile?.person_identity_id) {
    identity = await sr.entities.PersonIdentity.get(profile.person_identity_id).catch(() => null);
  }
  if (!identity) return { status: 'blocked', error: 'PersonIdentity not found' };
  if (!profile) {
    const profiles = await sr.entities.RacerProfile
      .filter({ person_identity_id: identity.id, is_archived: false }).catch(() => []);
    profile = (profiles || [])[0] || null;
  }

  const previousName = identity.canonical_name || null;
  const updated: string[] = [];

  if (previousName !== name) {
    await sr.entities.PersonIdentity.update(identity.id, { canonical_name: name });
    updated.push('PersonIdentity.canonical_name');
    if (input.preserve_previous_as_alias !== false && previousName) {
      const normalized = normalizeIdentityName(previousName);
      if (normalized) {
        await sr.entities.IdentityAlias.create({
          identity_id: identity.id,
          alias_name: previousName,
          alias_normalized: normalized,
          alias_type: 'historical_name',
          confidence: 90,
          source: 'canonical_name_change',
          source_type: 'manual_admin',
          is_primary: false,
          active: true,
        }).catch(() => null);
      }
    }
  }

  if (profile && profile.display_name !== name) {
    await sr.entities.RacerProfile.update(profile.id, { display_name: name });
    updated.push('RacerProfile.display_name');
  }

  const driverId = profile?.legacy_driver_id || identity.canonical_driver_id || null;
  if (driverId) {
    const names = splitName(name);
    const driver = await sr.entities.Driver.get(driverId).catch(() => null);
    if (driver) {
      const driverPatch: Record<string, any> = {};
      if (driver.first_name !== names.first_name) driverPatch.first_name = names.first_name;
      if (driver.last_name !== names.last_name) driverPatch.last_name = names.last_name;
      if (Object.keys(driverPatch).length > 0) {
        await sr.entities.Driver.update(driverId, driverPatch);
        updated.push('Driver.first_name/last_name');
      }
    }
  }

  await sr.entities.AuditLog.create({
    entity_type: 'PersonIdentity',
    entity_id: identity.id,
    entity_name: name,
    action: 'updated',
    before_data: { canonical_name: previousName },
    after_data: { canonical_name: name, updated },
    performed_by: actor.id || 'system',
    performed_by_name: actor.full_name || null,
    timestamp: new Date().toISOString(),
    notes: 'Canonical racer name change (profile slug unchanged)',
  }).catch(() => null);

  return {
    status: updated.length > 0 ? 'updated' : 'no_change',
    canonical_name: name,
    previous_name: previousName,
    slug_unchanged: true,
    current_slug: profile?.slug || null,
    updated,
  };
}

/**
 * Canonical hometown change: the identity owns the hometown, and the profile
 * (plus the Driver while it remains required) follows.
 */
export async function updateCanonicalRacerHometown(
  base44: any,
  input: {
    person_identity_id?: string;
    racer_profile_id?: string;
    hometown_city?: string; hometown_state?: string; hometown_country?: string;
  },
  actor: { id?: string | null; full_name?: string | null } = {},
) {
  const sr = base44.asServiceRole;
  let identity = input.person_identity_id
    ? await sr.entities.PersonIdentity.get(input.person_identity_id).catch(() => null) : null;
  let profile = input.racer_profile_id
    ? await sr.entities.RacerProfile.get(input.racer_profile_id).catch(() => null) : null;
  if (!identity && profile?.person_identity_id) {
    identity = await sr.entities.PersonIdentity.get(profile.person_identity_id).catch(() => null);
  }
  if (!identity) return { status: 'blocked', error: 'PersonIdentity not found' };
  if (!profile) {
    const profiles = await sr.entities.RacerProfile
      .filter({ person_identity_id: identity.id, is_archived: false }).catch(() => []);
    profile = (profiles || [])[0] || null;
  }

  const hometown = {
    hometown_city: text(input.hometown_city) || null,
    hometown_state: text(input.hometown_state) || null,
    hometown_country: text(input.hometown_country) || null,
  };
  const updated: string[] = [];

  await sr.entities.PersonIdentity.update(identity.id, hometown);
  updated.push('PersonIdentity.hometown');

  if (profile) {
    await sr.entities.RacerProfile.update(profile.id, hometown);
    updated.push('RacerProfile.hometown (compatibility)');
    const driverId = profile.legacy_driver_id || identity.canonical_driver_id || null;
    if (driverId) {
      const driver = await sr.entities.Driver.get(driverId).catch(() => null);
      if (driver) {
        await sr.entities.Driver.update(driverId, hometown);
        updated.push('Driver.hometown (compatibility)');
      }
    }
  }

  await sr.entities.AuditLog.create({
    entity_type: 'PersonIdentity',
    entity_id: identity.id,
    entity_name: identity.canonical_name,
    action: 'updated',
    after_data: { ...hometown, updated },
    performed_by: actor.id || 'system',
    performed_by_name: actor.full_name || null,
    timestamp: new Date().toISOString(),
    notes: 'Canonical racer hometown change',
  }).catch(() => null);

  return { status: 'updated', hometown, updated };
}

/** Explicit slug change — slug history is retained so the old address keeps working. */
export async function changeRacerSlug(
  base44: any,
  input: { racer_profile_id: string; new_slug: string; confirm?: boolean },
  actor: { id?: string | null; full_name?: string | null } = {},
) {
  const sr = base44.asServiceRole;
  const profile = await sr.entities.RacerProfile.get(input.racer_profile_id).catch(() => null);
  if (!profile) return { status: 'blocked', error: 'RacerProfile not found' };
  const desired = slugify(input.new_slug || '');
  if (!desired) return { status: 'blocked', error: 'new_slug is not a valid slug' };
  if (desired === profile.slug) return { status: 'no_change', slug: desired };

  const taken = await sr.entities.RacerProfile.filter({ slug: desired }).catch(() => []);
  if ((taken || []).some((p: any) => p && p.id !== profile.id)) {
    return { status: 'blocked', error: 'That slug already belongs to another racer' };
  }
  const retired = await sr.entities.EntityAlias
    .filter({ entity_type: 'RacerProfile', alias_normalized: desired, active: true }).catch(() => []);
  if ((retired || []).length > 0) {
    return { status: 'blocked', error: 'That slug is a retired address of another racer and can never be reassigned' };
  }

  const previous = profile.slug || null;
  if (previous) {
    const history = await recordRacerSlugHistory(sr, {
      racer_profile_id: profile.id, previous_slug: previous,
      created_by: actor.id || null, notes: 'Retired when the public slug changed',
    });
    if (!history.recorded && history.reason === 'slug_belongs_to_another_racer') {
      return { status: 'blocked', error: 'The current slug already belongs to another racer — resolve that first' };
    }
  }
  await sr.entities.RacerProfile.update(profile.id, { slug: desired });
  await sr.entities.AuditLog.create({
    entity_type: 'RacerProfile', entity_id: profile.id, entity_name: profile.display_name,
    action: 'updated', before_data: { slug: previous }, after_data: { slug: desired },
    performed_by: actor.id || 'system', performed_by_name: actor.full_name || null,
    timestamp: new Date().toISOString(), notes: 'Explicit racer slug change — previous slug retained as an alias',
  }).catch(() => null);

  return { status: 'updated', slug: desired, previous_slug: previous };
}