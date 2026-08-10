/**
 * sponsorshipReadHelpers.ts
 *
 * Phase 17B — Canonical READ helper layer for the unified sponsorship
 * architecture. Provides a single consistent public sponsorship shape
 * that merges modern Sponsorship records with legacy DriverSponsor,
 * EntrySponsor, and Series title-sponsor string fields.
 *
 * READ PRIORITY (locked architecture rule):
 *   1. Modern Sponsorship
 *   2. Legacy entity-linked sponsor records (DriverSponsor, EntrySponsor)
 *   3. Legacy string fields (Series.title_sponsor_name)
 *
 * Modern data wins. Legacy data remains compatibility-only.
 * No automatic synchronization exists in Phase 17B.
 *
 * All functions are pure/read-only — no writes, no repairs.
 */

import {
  normalizeOrganizationName,
  extractWebsiteDomain,
} from './organizationResolution.ts';

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC SPONSORSHIP SHAPE
// ─────────────────────────────────────────────────────────────────────────────

export interface PublicSponsorship {
  source: 'modern' | 'driver_legacy' | 'entry_legacy' | 'series_legacy';
  sponsorship_id: string | null;
  organization_id: string | null;
  organization_slug: string | null;
  organization_name: string | null;
  organization_logo_url: string | null;
  organization_website_url: string | null;
  target_entity_type: string | null;
  target_entity_id: string | null;
  relationship_type: string | null;
  tier: string | null;
  category: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  season_year: string | null;
  display_order: number;
  campaign_name: string | null;
  legacy_record_id: string | null;
  is_modern: boolean;
  is_legacy_fallback: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// VISIBILITY / STATUS RULES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Statuses that are visible in the default public active context.
 */
const PUBLIC_ACTIVE_STATUSES = ['active'];

/**
 * Statuses that are visible in historical contexts.
 */
const PUBLIC_HISTORICAL_STATUSES = ['active', 'completed', 'expired'];

/**
 * Statuses that are NEVER publicly displayed (admin/internal only).
 */
const PRIVATE_STATUSES = ['draft', 'proposed', 'cancelled', 'archived'];

/**
 * Check if a Sponsorship is publicly visible for the default active context.
 * Rules: not archived, public_visibility = public, status = active.
 */
export function isSponsorshipPublicActive(s: any): boolean {
  if (!s) return false;
  if (s.is_archived) return false;
  if (s.public_visibility !== 'public') return false;
  return PUBLIC_ACTIVE_STATUSES.includes(s.status);
}

/**
 * Check if a Sponsorship is publicly visible for a historical context
 * (includes completed and expired).
 */
export function isSponsorshipPublicHistorical(s: any): boolean {
  if (!s) return false;
  if (s.is_archived) return false;
  if (s.public_visibility !== 'public') return false;
  return PUBLIC_HISTORICAL_STATUSES.includes(s.status);
}

/**
 * Check if a Sponsorship should be excluded from public display entirely.
 */
export function isSponsorshipExcludedFromPublic(s: any): boolean {
  if (!s) return true;
  if (s.is_archived) return true;
  if (s.public_visibility === 'private') return true;
  return PRIVATE_STATUSES.includes(s.status);
}

// ─────────────────────────────────────────────────────────────────────────────
// BATCH LOADING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Load all Organizations and build a Map for O(1) hydration.
 * Single query — avoids N+1 per Sponsorship.
 */
export async function loadOrganizationMap(base44: any): Promise<Map<string, any>> {
  const orgs = await base44.asServiceRole.entities.Organization.list('-created_date', 500).catch(() => []);
  const map = new Map<string, any>();
  (orgs as any[]).forEach((o: any) => map.set(o.id, o));
  return map;
}

/**
 * Load Sponsorship records for a specific target entity.
 * Returns raw records (filtering by visibility is done by the caller).
 */
export async function loadSponsorshipsForTarget(
  base44: any,
  targetType: string,
  targetId: string
): Promise<any[]> {
  const sponsorships = await base44.asServiceRole.entities.Sponsorship.filter({
    target_entity_type: targetType,
    target_entity_id: targetId,
  }).catch(() => []);
  return (sponsorships as any[]).filter((s: any) => !s.is_archived);
}

/**
 * Load Sponsorship records for an Organization (reverse relationship).
 * Returns raw records (filtering by visibility is done by the caller).
 */
export async function loadSponsorshipsForOrganization(
  base44: any,
  organizationId: string
): Promise<any[]> {
  const sponsorships = await base44.asServiceRole.entities.Sponsorship.filter({
    sponsor_organization_id: organizationId,
  }).catch(() => []);
  return (sponsorships as any[]).filter((s: any) => !s.is_archived);
}

/**
 * Load ALL Sponsorship records (for audit / parity functions).
 */
export async function loadAllSponsorships(base44: any): Promise<any[]> {
  const sponsorships = await base44.asServiceRole.entities.Sponsorship.list('-created_date', 500).catch(() => []);
  return sponsorships as any[];
}

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalize a modern Sponsorship + its Organization to the public shape.
 * Applies logo/website override rules.
 */
export function normalizeModernSponsorship(
  sponsorship: any,
  organization: any | null
): PublicSponsorship {
  return {
    source: 'modern',
    sponsorship_id: sponsorship.id || null,
    organization_id: organization?.id || sponsorship.sponsor_organization_id || null,
    organization_slug: organization?.slug || organization?.canonical_slug || null,
    organization_name: organization?.name || null,
    organization_logo_url: sponsorship.logo_override || organization?.logo_url || null,
    organization_website_url: sponsorship.website_override || organization?.website_url || null,
    target_entity_type: sponsorship.target_entity_type || null,
    target_entity_id: sponsorship.target_entity_id || null,
    relationship_type: sponsorship.relationship_type || null,
    tier: sponsorship.tier || null,
    category: sponsorship.category || null,
    status: sponsorship.status || null,
    start_date: sponsorship.start_date || null,
    end_date: sponsorship.end_date || null,
    season_year: sponsorship.season_year || null,
    display_order: sponsorship.display_order || 0,
    campaign_name: sponsorship.campaign_name || null,
    legacy_record_id: sponsorship.legacy_driver_sponsor_id || sponsorship.legacy_entry_sponsor_id || null,
    is_modern: true,
    is_legacy_fallback: false,
  };
}

/**
 * Normalize a legacy DriverSponsor to the public shape.
 */
export function normalizeDriverSponsorLegacy(ds: any): PublicSponsorship {
  return {
    source: 'driver_legacy',
    sponsorship_id: null,
    organization_id: null,
    organization_slug: null,
    organization_name: ds.sponsor_name || null,
    organization_logo_url: ds.logo_url || null,
    organization_website_url: ds.website_url || null,
    target_entity_type: 'RacerProfile',
    target_entity_id: ds.driver_id || null,
    relationship_type: 'Sponsor',
    tier: mapLegacySponsorTypeToTier(ds.sponsor_type),
    category: null,
    status: 'active',
    start_date: ds.start_date || null,
    end_date: ds.end_date || null,
    season_year: null,
    display_order: 999,
    campaign_name: null,
    legacy_record_id: ds.id || null,
    is_modern: false,
    is_legacy_fallback: true,
  };
}

/**
 * Normalize a legacy EntrySponsor to the public shape.
 * Preserves its current semantic meaning (per-entry branding).
 */
export function normalizeEntrySponsorLegacy(es: any): PublicSponsorship {
  return {
    source: 'entry_legacy',
    sponsorship_id: null,
    organization_id: null,
    organization_slug: null,
    organization_name: es.sponsor_name || null,
    organization_logo_url: es.sponsor_logo_url || null,
    organization_website_url: es.sponsor_url || null,
    target_entity_type: 'Entry',
    target_entity_id: es.entry_id || null,
    relationship_type: 'Sponsor',
    tier: es.sponsor_tier || null,
    category: null,
    status: 'active',
    start_date: null,
    end_date: null,
    season_year: null,
    display_order: 999,
    campaign_name: null,
    legacy_record_id: es.id || null,
    is_modern: false,
    is_legacy_fallback: true,
  };
}

/**
 * Normalize a legacy Series title-sponsor string field to the public shape.
 * Returns null if no title sponsor name exists.
 */
export function normalizeSeriesTitleLegacy(series: any): PublicSponsorship | null {
  if (!series?.title_sponsor_name) return null;
  return {
    source: 'series_legacy',
    sponsorship_id: null,
    organization_id: null,
    organization_slug: null,
    organization_name: series.title_sponsor_name,
    organization_logo_url: series.title_sponsor_logo_url || null,
    organization_website_url: series.title_sponsor_url || null,
    target_entity_type: 'Series',
    target_entity_id: series.id || null,
    relationship_type: 'Sponsor',
    tier: 'Title',
    category: null,
    status: 'active',
    start_date: null,
    end_date: null,
    season_year: null,
    display_order: 0,
    campaign_name: null,
    legacy_record_id: null,
    is_modern: false,
    is_legacy_fallback: true,
  };
}

/**
 * Map legacy DriverSponsor.sponsor_type to the modern tier enum.
 */
function mapLegacySponsorTypeToTier(sponsorType: string | undefined): string | null {
  if (!sponsorType) return null;
  switch (sponsorType) {
    case 'Primary': return 'Primary';
    case 'Associate': return 'Associate';
    case 'Personal': return 'Supporting';
    case 'Apparel': return 'Supporting';
    case 'Technical': return 'Supporting';
    default: return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MERGE + DEDUPLICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Merge modern and legacy sponsorships, deduplicating by organization identity.
 *
 * Dedup priority:
 *   1. Exact Organization ID (modern resolution)
 *   2. Exact legacy link field (legacy_driver_sponsor_id / legacy_entry_sponsor_id)
 *   3. Exact normalized organization name
 *   4. Exact website domain
 *   5. Exact Organization alias (checked externally)
 *
 * Modern record wins over legacy record.
 * Similar-name-only records do NOT dedupe — both are kept.
 */
export function mergeModernAndLegacySponsorships(
  modern: PublicSponsorship[],
  legacy: PublicSponsorship[]
): PublicSponsorship[] {
  const result: PublicSponsorship[] = [];
  const seenKeys = new Set<string>();

  // Modern first (preferred)
  for (const m of modern) {
    const keys = buildDedupKeys(m);
    const dedupKey = keys[0]; // Primary key
    if (!seenKeys.has(dedupKey)) {
      result.push(m);
      keys.forEach(k => seenKeys.add(k));
    }
  }

  // Legacy fallback (only if not already covered by modern)
  for (const l of legacy) {
    const keys = buildDedupKeys(l);
    const dedupKey = keys[0];
    if (!seenKeys.has(dedupKey)) {
      result.push(l);
      keys.forEach(k => seenKeys.add(k));
    }
  }

  // Sort by display_order, then by name
  result.sort((a, b) => {
    if (a.display_order !== b.display_order) return a.display_order - b.display_order;
    return (a.organization_name || '').localeCompare(b.organization_name || '');
  });

  return result;
}

/**
 * Build dedup keys for a PublicSponsorship.
 * Returns multiple keys to catch all dedup dimensions.
 */
function buildDedupKeys(s: PublicSponsorship): string[] {
  const keys: string[] = [];

  // 1. Organization ID (strongest)
  if (s.organization_id) keys.push(`org:${s.organization_id}`);

  // 2. Legacy record link
  if (s.legacy_record_id) keys.push(`legacy:${s.legacy_record_id}`);

  // 3. Normalized organization name
  if (s.organization_name) {
    const normalized = normalizeOrganizationName(s.organization_name);
    if (normalized) keys.push(`name:${normalized}`);
  }

  // 4. Website domain
  if (s.organization_website_url) {
    const domain = extractWebsiteDomain(s.organization_website_url);
    if (domain) keys.push(`domain:${domain}`);
  }

  // Fallback: use source + record id if nothing else
  if (keys.length === 0) {
    keys.push(`fallback:${s.source}:${s.legacy_record_id || s.sponsorship_id || Math.random()}`);
  }

  return keys;
}

/**
 * Deduplicate a list of PublicSponsorships (standalone, no modern/legacy split).
 * Uses the same dedup logic as mergeModernAndLegacySponsorships.
 */
export function dedupeSponsorDisplay(sponsorships: PublicSponsorship[]): PublicSponsorship[] {
  const result: PublicSponsorship[] = [];
  const seenKeys = new Set<string>();

  for (const s of sponsorships) {
    const keys = buildDedupKeys(s);
    const dedupKey = keys[0];
    if (!seenKeys.has(dedupKey)) {
      result.push(s);
      keys.forEach(k => seenKeys.add(k));
    }
  }

  return result.sort((a, b) => {
    if (a.display_order !== b.display_order) return a.display_order - b.display_order;
    return (a.organization_name || '').localeCompare(b.organization_name || '');
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TITLE SPONSOR RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the title sponsor for a Series.
 *
 * Rules:
 *   1. If exactly one active modern Sponsorship with tier=Title exists, use it.
 *   2. If none exists, fall back to Series.title_sponsor_name.
 *   3. If multiple active Title Sponsorships exist, return the first for display
 *      but set has_title_conflict = true for audit.
 *
 * Returns { title_sponsorship, has_title_conflict }.
 */
export function resolveTitleSponsorship(
  modernSponsorships: PublicSponsorship[],
  series: any
): { title_sponsorship: PublicSponsorship | null; has_title_conflict: boolean } {
  const titleSponsorships = modernSponsorships.filter(
    s => s.tier === 'Title' && s.status === 'active'
  );

  if (titleSponsorships.length === 1) {
    return { title_sponsorship: titleSponsorships[0], has_title_conflict: false };
  }

  if (titleSponsorships.length > 1) {
    // Conflict: multiple active Title sponsorships
    // Return first for display, but flag conflict
    return { title_sponsorship: titleSponsorships[0], has_title_conflict: true };
  }

  // No modern Title sponsorship — fall back to legacy string
  const legacy = normalizeSeriesTitleLegacy(series);
  return { title_sponsorship: legacy, has_title_conflict: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD UNIFIED SPONSORSHIPS FOR A TARGET
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the unified sponsorships list for a target entity.
 *
 * This is the primary entry point for experience functions.
 * It loads modern Sponsorships, hydrates Organizations, normalizes to the
 * public shape, merges with legacy fallbacks, and deduplicates.
 *
 * @param base44 - The base44 client
 * @param targetType - The target entity type (RacerProfile, Series, etc.)
 * @param targetId - The target entity ID
 * @param options - { includeHistorical, legacySponsors, seriesForTitleFallback }
 */
export async function buildSponsorshipsForTarget(
  base44: any,
  targetType: string,
  targetId: string,
  options?: {
    includeHistorical?: boolean;
    legacySponsors?: PublicSponsorship[];
    seriesForTitleFallback?: any;
  }
): Promise<{
  sponsorships: PublicSponsorship[];
  title_sponsorship: PublicSponsorship | null;
  has_title_conflict: boolean;
  modern_count: number;
  legacy_count: number;
  deduped_count: number;
}> {
  const includeHistorical = options?.includeHistorical || false;
  const visibilityFilter = includeHistorical ? isSponsorshipPublicHistorical : isSponsorshipPublicActive;

  // Load modern Sponsorships for this target
  const rawSponsorships = await loadSponsorshipsForTarget(base44, targetType, targetId);
  const publicSponsorships = rawSponsorships.filter(visibilityFilter);

  // Load Organization map (single query, shared across all sponsorships)
  const orgMap = await loadOrganizationMap(base44);

  // Normalize modern sponsorships
  const modern: PublicSponsorship[] = publicSponsorships.map(s =>
    normalizeModernSponsorship(s, orgMap.get(s.sponsor_organization_id) || null)
  );

  // Merge with legacy fallback
  const legacy = options?.legacySponsors || [];
  const merged = mergeModernAndLegacySponsorships(modern, legacy);

  // Title sponsor resolution (Series only)
  let titleSponsorship: PublicSponsorship | null = null;
  let hasTitleConflict = false;
  if (targetType === 'Series' && options?.seriesForTitleFallback) {
    const titleResult = resolveTitleSponsorship(modern, options.seriesForTitleFallback);
    titleSponsorship = titleResult.title_sponsorship;
    hasTitleConflict = titleResult.has_title_conflict;
  }

  return {
    sponsorships: merged,
    title_sponsorship: titleSponsorship,
    has_title_conflict: hasTitleConflict,
    modern_count: modern.length,
    legacy_count: legacy.length,
    deduped_count: merged.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ORGANIZATION REVERSE RELATIONSHIPS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the reverse sponsorship view for an Organization.
 * Returns active, completed, and expired relationships.
 */
export async function buildSponsorshipsForOrganization(
  base44: any,
  organizationId: string
): Promise<{
  active: PublicSponsorship[];
  completed: PublicSponsorship[];
  expired: PublicSponsorship[];
  all: PublicSponsorship[];
  target_summaries: Array<{ target_entity_type: string; target_entity_id: string; count: number }>;
}> {
  const rawSponsorships = await loadSponsorshipsForOrganization(base44, organizationId);
  const orgMap = await loadOrganizationMap(base44);
  const organization = orgMap.get(organizationId) || null;

  const all: PublicSponsorship[] = rawSponsorships
    .filter(s => !s.is_archived && s.public_visibility === 'public')
    .map(s => normalizeModernSponsorship(s, organization));

  const active = all.filter(s => s.status === 'active');
  const completed = all.filter(s => s.status === 'completed');
  const expired = all.filter(s => s.status === 'expired');

  // Target summaries
  const targetCounts = new Map<string, number>();
  all.forEach(s => {
    const key = `${s.target_entity_type}:${s.target_entity_id}`;
    targetCounts.set(key, (targetCounts.get(key) || 0) + 1);
  });
  const targetSummaries = Array.from(targetCounts.entries()).map(([key, count]) => {
    const [type, id] = key.split(':');
    return { target_entity_type: type, target_entity_id: id, count };
  });

  return { active, completed, expired, all, target_summaries: targetSummaries };
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY SPONSOR ORGANIZATION CANDIDATE RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve a legacy sponsor string to an Organization candidate.
 *
 * Uses deterministic matching only (exact normalized name, exact alias,
 * exact website domain, external_uid). Fuzzy similarity is NEVER used
 * for automatic resolution — similar names return as candidate_only.
 *
 * @returns { organization_id, resolution_status, candidates }
 *   resolution_status: 'resolved' | 'not_found' | 'ambiguous' | 'candidate_only'
 */
export async function resolveLegacySponsorOrganizationCandidate(
  base44: any,
  sponsorName: string,
  websiteUrl?: string
): Promise<{
  organization_id: string | null;
  resolution_status: 'resolved' | 'not_found' | 'ambiguous' | 'candidate_only';
  candidates: any[];
}> {
  if (!sponsorName) {
    return { organization_id: null, resolution_status: 'not_found', candidates: [] };
  }

  const normalizedName = normalizeOrganizationName(sponsorName);
  const domain = websiteUrl ? extractWebsiteDomain(websiteUrl) : null;

  // Load all Organizations and active aliases
  const [allOrgs, allAliases] = await Promise.all([
    base44.asServiceRole.entities.Organization.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.EntityAlias.filter({
      entity_type: 'Organization',
      active: true,
    }).catch(() => []),
  ]);

  const candidates: any[] = [];

  // 1. Exact normalized_name match
  const nameMatches = (allOrgs as any[]).filter((o: any) =>
    o.normalized_name === normalizedName
  );
  nameMatches.forEach((o: any) => {
    if (!candidates.find(c => c.id === o.id)) {
      candidates.push({ organization: o, match_type: 'normalized_name', confidence: 'high' });
    }
  });

  // 2. Exact alias match
  const aliasMatches = (allAliases as any[]).filter((a: any) =>
    a.alias_normalized === normalizedName
  );
  for (const alias of aliasMatches) {
    const org = (allOrgs as any[]).find((o: any) => o.id === alias.entity_id);
    if (org && !candidates.find(c => c.id === org.id)) {
      candidates.push({ organization: org, match_type: 'alias', confidence: 'high', alias });
    }
  }

  // 3. Exact website domain match
  if (domain) {
    const domainMatches = (allOrgs as any[]).filter((o: any) => {
      if (!o.website_url) return false;
      return extractWebsiteDomain(o.website_url) === domain;
    });
    domainMatches.forEach((o: any) => {
      if (!candidates.find(c => c.id === o.id)) {
        candidates.push({ organization: o, match_type: 'website_domain', confidence: 'high' });
      }
    });
  }

  // Determine resolution status
  if (candidates.length === 0) {
    return { organization_id: null, resolution_status: 'not_found', candidates: [] };
  }

  if (candidates.length === 1) {
    return {
      organization_id: candidates[0].organization.id,
      resolution_status: 'resolved',
      candidates,
    };
  }

  // Multiple candidates — check if they all point to the same Organization
  const uniqueOrgIds = new Set(candidates.map(c => c.organization.id));
  if (uniqueOrgIds.size === 1) {
    return {
      organization_id: candidates[0].organization.id,
      resolution_status: 'resolved',
      candidates,
    };
  }

  // Ambiguous — multiple different Organizations match
  return {
    organization_id: null,
    resolution_status: 'ambiguous',
    candidates,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM SPONSORSHIP SENTINEL
// ─────────────────────────────────────────────────────────────────────────────

export const PLATFORM_SPONSORSHIP_SENTINEL = 'hijinx-platform';

/**
 * Build platform-level sponsorships (Organization → Platform).
 */
export async function buildPlatformSponsorships(
  base44: any
): Promise<PublicSponsorship[]> {
  const rawSponsorships = await loadSponsorshipsForTarget(
    base44,
    'Platform',
    PLATFORM_SPONSORSHIP_SENTINEL
  );
  const publicSponsorships = rawSponsorships.filter(isSponsorshipPublicActive);
  const orgMap = await loadOrganizationMap(base44);

  return publicSponsorships.map(s =>
    normalizeModernSponsorship(s, orgMap.get(s.sponsor_organization_id) || null)
  );
}