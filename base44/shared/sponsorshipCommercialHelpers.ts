/**
 * sponsorshipCommercialHelpers.ts
 *
 * Phase 17C — Shared commercial validation and read helpers for linking
 * RevenueAgreement, RevenueEvent, Advertisement, and MediaAssignment to
 * Sponsorship.
 *
 * ARCHITECTURE RULES:
 *   • Organization is the canonical commercial identity.
 *   • Sponsorship is the canonical commercial relationship.
 *   • Each commercial system keeps its own responsibility.
 *   • Sponsorship NEVER becomes an invoice.
 *   • RevenueAgreement NEVER becomes a sponsor.
 *   • Advertisement NEVER becomes a sponsorship.
 *   • MediaAssignment NEVER becomes a sponsorship.
 *   • Everything references Sponsorship. Nothing duplicates Sponsorship.
 *
 * All validation functions are read-only — no writes, no repairs.
 * Public read models expose only relationship metadata, never financial amounts.
 */

import {
  loadOrganizationMap,
  isSponsorshipPublicActive,
} from './sponsorshipReadHelpers.ts';
import {
  loadSponsorshipExecutionCountsBatch,
  type SponsorshipExecutionCounts,
} from './sponsorshipActivationHelpers.ts';

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION RESULT TYPE
// ─────────────────────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sponsorship?: any;
  organization?: any;
}

function ok(sponsorship?: any, organization?: any): ValidationResult {
  return { valid: true, errors: [], sponsorship, organization };
}

function err(errors: string[]): ValidationResult {
  return { valid: false, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATE SPONSORSHIP EXISTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate that a Sponsorship exists, is not archived, and has a valid Organization.
 * Returns the Sponsorship and Organization if valid.
 */
export async function validateSponsorshipExists(
  base44: any,
  sponsorshipId: string
): Promise<ValidationResult> {
  if (!sponsorshipId) {
    return err(['linked_sponsorship_id is required']);
  }

  let sponsorship: any;
  try {
    sponsorship = await base44.asServiceRole.entities.Sponsorship.get(sponsorshipId);
  } catch {
    return err([`Sponsorship not found: ${sponsorshipId}`]);
  }

  if (!sponsorship) {
    return err([`Sponsorship not found: ${sponsorshipId}`]);
  }

  if (sponsorship.is_archived) {
    return err([`Sponsorship is archived: ${sponsorshipId}`]);
  }

  // Validate Organization exists
  const orgResult = await resolveCommercialOrganization(base44, sponsorship);
  if (!orgResult) {
    return err([`Sponsorship Organization not found: ${sponsorship.sponsor_organization_id}`]);
  }

  return ok(sponsorship, orgResult);
}

// ─────────────────────────────────────────────────────────────────────────────
// RESOLVE COMMERCIAL ORGANIZATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the Organization for a Sponsorship.
 * Returns the Organization record or null.
 */
export async function resolveCommercialOrganization(
  base44: any,
  sponsorship: any
): Promise<any | null> {
  if (!sponsorship?.sponsor_organization_id) return null;

  const orgMap = await loadOrganizationMap(base44);
  return orgMap.get(sponsorship.sponsor_organization_id) || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATE COMMERCIAL RELATIONSHIP (generic)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generic validation for any commercial record with a linked_sponsorship_id.
 * Used by RevenueEvent, Advertisement, and MediaAssignment.
 *
 * Rules:
 *   • If linked_sponsorship_id is not supplied → valid (no validation needed).
 *   • If linked_sponsorship_id is supplied → validate Sponsorship exists,
 *     is not archived, and has a valid Organization.
 *
 * Does NOT write anything. Does NOT update Sponsorship lifecycle.
 */
export async function validateCommercialRelationship(
  base44: any,
  linkedSponsorshipId: string | undefined
): Promise<ValidationResult> {
  if (!linkedSponsorshipId) {
    return ok();
  }

  return validateSponsorshipExists(base44, linkedSponsorshipId);
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATE AGREEMENT COMPATIBILITY (RevenueAgreement)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate a RevenueAgreement's compatibility with Sponsorship.
 *
 * Rules:
 *   • If agreement_type != 'sponsorship' → no Sponsorship validation needed.
 *   • If agreement_type == 'sponsorship' → linked_sponsorship_id is required,
 *     Sponsorship must exist, not be archived, and have a valid Organization.
 *   • Agreement dates should be compatible with Sponsorship dates if both exist.
 *
 * Does NOT create Sponsorship. Does NOT create Organization.
 */
export async function validateAgreementCompatibility(
  base44: any,
  agreementType: string,
  linkedSponsorshipId: string | undefined,
  options?: {
    effective_start_date?: string;
    effective_end_date?: string;
  }
): Promise<ValidationResult> {
  // Non-sponsorship agreements need no Sponsorship validation
  if (agreementType !== 'sponsorship') {
    // If a non-sponsorship agreement has a linked_sponsorship_id, still validate it
    if (linkedSponsorshipId) {
      const result = await validateSponsorshipExists(base44, linkedSponsorshipId);
      if (!result.valid) return result;
    }
    return ok();
  }

  // Sponsorship agreement — linked_sponsorship_id is required
  if (!linkedSponsorshipId) {
    return err(['linked_sponsorship_id is required for sponsorship agreement_type']);
  }

  const result = await validateSponsorshipExists(base44, linkedSponsorshipId);
  if (!result.valid) return result;

  // Optional: check date compatibility
  if (options?.effective_start_date && result.sponsorship?.start_date) {
    if (new Date(options.effective_start_date) < new Date(result.sponsorship.start_date)) {
      return err([
        `Agreement start date is before Sponsorship start date. ` +
        `Agreement: ${options.effective_start_date}, Sponsorship: ${result.sponsorship.start_date}`
      ]);
    }
  }

  if (options?.effective_end_date && result.sponsorship?.end_date) {
    if (new Date(options.effective_end_date) > new Date(result.sponsorship.end_date)) {
      return err([
        `Agreement end date is after Sponsorship end date. ` +
        `Agreement: ${options.effective_end_date}, Sponsorship: ${result.sponsorship.end_date}`
      ]);
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATE ADVERTISEMENT COMPATIBILITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate an Advertisement's compatibility with Sponsorship.
 *
 * Rules:
 *   • If linked_sponsorship_id is not supplied → valid (Advertisement is independent).
 *   • If linked_sponsorship_id is supplied → validate Sponsorship exists,
 *     is not archived, and has a valid Organization.
 *
 * Advertisement remains a delivery asset. Not every Advertisement belongs to Sponsorship.
 */
export async function validateAdvertisementCompatibility(
  base44: any,
  linkedSponsorshipId: string | undefined
): Promise<ValidationResult> {
  return validateCommercialRelationship(base44, linkedSponsorshipId);
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATE ASSIGNMENT COMPATIBILITY (MediaAssignment)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate a MediaAssignment's compatibility with Sponsorship.
 *
 * Rules:
 *   • If compensation_type != 'sponsored' → no Sponsorship validation needed.
 *   • If compensation_type == 'sponsored' and linked_sponsorship_id is supplied →
 *     validate Sponsorship exists, is not archived, and has a valid Organization.
 *   • If compensation_type == 'sponsored' and linked_sponsorship_id is NOT supplied →
 *     still valid (sponsored assignment without a formal Sponsorship link).
 *
 * Editorial assignments remain independent. Normal editorial work continues
 * functioning exactly as today.
 */
export async function validateAssignmentCompatibility(
  base44: any,
  compensationType: string | undefined,
  linkedSponsorshipId: string | undefined
): Promise<ValidationResult> {
  if (!linkedSponsorshipId) {
    return ok();
  }

  return validateSponsorshipExists(base44, linkedSponsorshipId);
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMERCIAL READ MODEL (Task 11)
// ─────────────────────────────────────────────────────────────────────────────

export interface CommercialRelationshipSummary {
  sponsorship_id: string;
  organization: {
    id: string;
    name: string;
    slug: string | null;
    logo_url: string | null;
    website_url: string | null;
  } | null;
  target: {
    entity_type: string;
    entity_id: string;
  };
  relationship_type: string;
  tier: string | null;
  campaign_name: string | null;
  status: string;
  // Counts only — no financial amounts
  agreement_count: number;
  advertisement_count: number;
  media_assignment_count: number;
  revenue_event_count: number;
}

/**
 * Build a public-safe commercial relationship summary for a Sponsorship.
 *
 * Returns relationship metadata only — NO financial amounts.
 * Includes counts of linked commercial records.
 */
export async function getCommercialRelationship(
  base44: any,
  sponsorshipId: string
): Promise<CommercialRelationshipSummary | null> {
  let sponsorship: any;
  try {
    sponsorship = await base44.asServiceRole.entities.Sponsorship.get(sponsorshipId);
  } catch {
    return null;
  }

  if (!sponsorship) return null;

  const organization = await resolveCommercialOrganization(base44, sponsorship);

  // Load counts — parallel queries
  const [agreements, advertisements, assignments, revenueEvents] = await Promise.all([
    base44.asServiceRole.entities.RevenueAgreement.filter({
      linked_sponsorship_id: sponsorshipId,
    }).catch(() => []),
    base44.asServiceRole.entities.Advertisement.filter({
      linked_sponsorship_id: sponsorshipId,
    }).catch(() => []),
    base44.asServiceRole.entities.MediaAssignment.filter({
      linked_sponsorship_id: sponsorshipId,
    }).catch(() => []),
    base44.asServiceRole.entities.RevenueEvent.filter({
      linked_sponsorship_id: sponsorshipId,
    }).catch(() => []),
  ]);

  return {
    sponsorship_id: sponsorshipId,
    organization: organization ? {
      id: organization.id,
      name: organization.name,
      slug: organization.slug || organization.canonical_slug || null,
      logo_url: sponsorship.logo_override || organization.logo_url || null,
      website_url: sponsorship.website_override || organization.website_url || null,
    } : null,
    target: {
      entity_type: sponsorship.target_entity_type,
      entity_id: sponsorship.target_entity_id,
    },
    relationship_type: sponsorship.relationship_type,
    tier: sponsorship.tier || null,
    campaign_name: sponsorship.campaign_name || null,
    status: sponsorship.status,
    agreement_count: (agreements as any[]).length,
    advertisement_count: (advertisements as any[]).length,
    media_assignment_count: (assignments as any[]).length,
    revenue_event_count: (revenueEvents as any[]).length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SPONSORSHIP COMMERCIAL COUNTS (Task 12)
// ─────────────────────────────────────────────────────────────────────────────

export interface SponsorshipCommercialCounts {
  agreement_count: number;
  advertisement_count: number;
  media_assignment_count: number;
  revenue_event_count: number;
}

/**
 * Load commercial record counts for a Sponsorship.
 * Used to enrich the Sponsorship read model with optional computed summaries.
 * Only counts — no ROI computation.
 */
export async function loadSponsorshipCommercialCounts(
  base44: any,
  sponsorshipId: string
): Promise<SponsorshipCommercialCounts> {
  const [agreements, advertisements, assignments, revenueEvents] = await Promise.all([
    base44.asServiceRole.entities.RevenueAgreement.filter({
      linked_sponsorship_id: sponsorshipId,
    }).catch(() => []),
    base44.asServiceRole.entities.Advertisement.filter({
      linked_sponsorship_id: sponsorshipId,
    }).catch(() => []),
    base44.asServiceRole.entities.MediaAssignment.filter({
      linked_sponsorship_id: sponsorshipId,
    }).catch(() => []),
    base44.asServiceRole.entities.RevenueEvent.filter({
      linked_sponsorship_id: sponsorshipId,
    }).catch(() => []),
  ]);

  return {
    agreement_count: (agreements as any[]).length,
    advertisement_count: (advertisements as any[]).length,
    media_assignment_count: (assignments as any[]).length,
    revenue_event_count: (revenueEvents as any[]).length,
  };
}

/**
 * Load commercial counts for multiple Sponsorships in batch.
 * Returns a Map<sponsorshipId, SponsorshipCommercialCounts>.
 */
export async function loadSponsorshipCommercialCountsBatch(
  base44: any,
  sponsorshipIds: string[]
): Promise<Map<string, SponsorshipCommercialCounts>> {
  const result = new Map<string, SponsorshipCommercialCounts>();

  if (sponsorshipIds.length === 0) return result;

  // Load all commercial records in parallel
  const [allAgreements, allAdvertisements, allAssignments, allRevenueEvents] = await Promise.all([
    base44.asServiceRole.entities.RevenueAgreement.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.Advertisement.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.MediaAssignment.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.RevenueEvent.list('-created_date', 500).catch(() => []),
  ]);

  // Index by linked_sponsorship_id
  const idSet = new Set(sponsorshipIds);
  const agreementCounts = new Map<string, number>();
  const adCounts = new Map<string, number>();
  const assignmentCounts = new Map<string, number>();
  const eventCounts = new Map<string, number>();

  for (const a of allAgreements as any[]) {
    if (a.linked_sponsorship_id && idSet.has(a.linked_sponsorship_id)) {
      agreementCounts.set(a.linked_sponsorship_id, (agreementCounts.get(a.linked_sponsorship_id) || 0) + 1);
    }
  }
  for (const a of allAdvertisements as any[]) {
    if (a.linked_sponsorship_id && idSet.has(a.linked_sponsorship_id)) {
      adCounts.set(a.linked_sponsorship_id, (adCounts.get(a.linked_sponsorship_id) || 0) + 1);
    }
  }
  for (const a of allAssignments as any[]) {
    if (a.linked_sponsorship_id && idSet.has(a.linked_sponsorship_id)) {
      assignmentCounts.set(a.linked_sponsorship_id, (assignmentCounts.get(a.linked_sponsorship_id) || 0) + 1);
    }
  }
  for (const a of allRevenueEvents as any[]) {
    if (a.linked_sponsorship_id && idSet.has(a.linked_sponsorship_id)) {
      eventCounts.set(a.linked_sponsorship_id, (eventCounts.get(a.linked_sponsorship_id) || 0) + 1);
    }
  }

  for (const id of sponsorshipIds) {
    result.set(id, {
      agreement_count: agreementCounts.get(id) || 0,
      advertisement_count: adCounts.get(id) || 0,
      media_assignment_count: assignmentCounts.get(id) || 0,
      revenue_event_count: eventCounts.get(id) || 0,
    });
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// SPONSORSHIPS FOR TARGET WITH COMMERCIAL COUNTS (Task 12)
// ─────────────────────────────────────────────────────────────────────────────

import {
  buildSponsorshipsForTarget,
  type PublicSponsorship,
} from './sponsorshipReadHelpers.ts';

export interface SponsorshipWithCommercialCounts extends PublicSponsorship {
  agreement_count: number;
  advertisement_count: number;
  media_assignment_count: number;
  revenue_event_count: number;
  // Phase 17D execution counts
  activation_count: number;
  active_activation_count: number;
  completed_activation_count: number;
  deliverable_count: number;
  deliverables_completed: number;
  deliverables_outstanding: number;
  deliverable_completion_percent: number;
}

/**
 * Build sponsorships for a target entity, enriched with commercial record counts.
 *
 * This wraps buildSponsorshipsForTarget and adds optional computed summaries:
 *   agreement_count, advertisement_count, media_assignment_count, revenue_event_count.
 *
 * Only counts — no ROI computation.
 */
export async function buildSponsorshipsForTargetWithCommercial(
  base44: any,
  targetType: string,
  targetId: string,
  options?: {
    includeHistorical?: boolean;
    legacySponsors?: PublicSponsorship[];
    seriesForTitleFallback?: any;
  }
): Promise<{
  sponsorships: SponsorshipWithCommercialCounts[];
  title_sponsorship: PublicSponsorship | null;
  has_title_conflict: boolean;
  modern_count: number;
  legacy_count: number;
  deduped_count: number;
  sponsorship_counts: {
    agreement_count: number;
    advertisement_count: number;
    media_assignment_count: number;
    revenue_event_count: number;
  };
}> {
  // Get the base sponsorships
  const base = await buildSponsorshipsForTarget(base44, targetType, targetId, options);

  // Load commercial counts for all modern sponsorships
  const modernSponsorshipIds = base.sponsorships
    .filter(s => s.is_modern && s.sponsorship_id)
    .map(s => s.sponsorship_id!) as string[];

  const [countsMap, executionCountsMap] = await Promise.all([
    loadSponsorshipCommercialCountsBatch(base44, modernSponsorshipIds),
    loadSponsorshipExecutionCountsBatch(base44, modernSponsorshipIds),
  ]);

  // Enrich each sponsorship with commercial counts + execution counts
  const enrichedSponsorships: SponsorshipWithCommercialCounts[] = base.sponsorships.map(s => {
    const counts = s.sponsorship_id ? countsMap.get(s.sponsorship_id) : undefined;
    const execCounts = s.sponsorship_id ? executionCountsMap.get(s.sponsorship_id) : undefined;
    return {
      ...s,
      agreement_count: counts?.agreement_count || 0,
      advertisement_count: counts?.advertisement_count || 0,
      media_assignment_count: counts?.media_assignment_count || 0,
      revenue_event_count: counts?.revenue_event_count || 0,
      activation_count: execCounts?.activation_count || 0,
      active_activation_count: execCounts?.active_activation_count || 0,
      completed_activation_count: execCounts?.completed_activation_count || 0,
      deliverable_count: execCounts?.deliverable_count || 0,
      deliverables_completed: execCounts?.deliverables_completed || 0,
      deliverables_outstanding: execCounts?.deliverables_outstanding || 0,
      deliverable_completion_percent: execCounts?.deliverable_completion_percent || 0,
    };
  });

  // Aggregate totals
  const totalCounts = enrichedSponsorships.reduce((acc, s) => ({
    agreement_count: acc.agreement_count + s.agreement_count,
    advertisement_count: acc.advertisement_count + s.advertisement_count,
    media_assignment_count: acc.media_assignment_count + s.media_assignment_count,
    revenue_event_count: acc.revenue_event_count + s.revenue_event_count,
  }), { agreement_count: 0, advertisement_count: 0, media_assignment_count: 0, revenue_event_count: 0 });

  return {
    sponsorships: enrichedSponsorships,
    title_sponsorship: base.title_sponsorship,
    has_title_conflict: base.has_title_conflict,
    modern_count: base.modern_count,
    legacy_count: base.legacy_count,
    deduped_count: base.deduped_count,
    sponsorship_counts: totalCounts,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC-SAFE SPONSORSHIP SUMMARY (for experience enrichment)
// ─────────────────────────────────────────────────────────────────────────────

export interface PublicSponsorshipCommercialSummary {
  sponsorship_id: string;
  organization_name: string | null;
  organization_logo_url: string | null;
  campaign_name: string | null;
  relationship_type: string | null;
  tier: string | null;
  agreement_count: number;
  advertisement_count: number;
  media_assignment_count: number;
  revenue_event_count: number;
}

/**
 * Build a public-safe commercial summary for a Sponsorship.
 * Only relationship metadata + counts. No financial amounts.
 * Only visible if the Sponsorship is publicly active.
 */
export function buildPublicCommercialSummary(
  sponsorship: any,
  organization: any | null,
  counts: SponsorshipCommercialCounts
): PublicSponsorshipCommercialSummary | null {
  if (!isSponsorshipPublicActive(sponsorship)) return null;

  return {
    sponsorship_id: sponsorship.id,
    organization_name: organization?.name || null,
    organization_logo_url: sponsorship.logo_override || organization?.logo_url || null,
    campaign_name: sponsorship.campaign_name || null,
    relationship_type: sponsorship.relationship_type || null,
    tier: sponsorship.tier || null,
    agreement_count: counts.agreement_count,
    advertisement_count: counts.advertisement_count,
    media_assignment_count: counts.media_assignment_count,
    revenue_event_count: counts.revenue_event_count,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC-SAFE SPONSORSHIP SUMMARY FROM LINKED ID (Tasks 13-14)
// ─────────────────────────────────────────────────────────────────────────────

export interface PublicSponsorshipSummary {
  sponsorship_id: string;
  organization: {
    id: string;
    name: string;
    slug: string | null;
    logo_url: string | null;
    website_url: string | null;
  } | null;
  target: {
    entity_type: string;
    entity_id: string;
  };
  relationship_type: string;
  tier: string | null;
  campaign_name: string | null;
  status: string;
}

/**
 * Build a public-safe sponsorship summary from a linked_sponsorship_id.
 *
 * Used by:
 *   • RevenueAgreement experience (Task 13) — expose Sponsorship summary without
 *     confidential contract values. Public-safe summary only: Organization,
 *     Target, Relationship, Tier, Campaign.
 *   • Advertisement experience (Task 14) — expose Sponsorship metadata:
 *     Sponsored by, Campaign, Partner.
 *
 * Returns null if:
 *   • linked_sponsorship_id is not supplied
 *   • Sponsorship does not exist
 *   • Sponsorship is archived
 *   • Sponsorship is not publicly active
 *   • Organization is not found
 *
 * Does NOT expose financial amounts.
 */
export async function buildPublicSponsorshipSummaryFromId(
  base44: any,
  linkedSponsorshipId: string | undefined
): Promise<PublicSponsorshipSummary | null> {
  if (!linkedSponsorshipId) return null;

  let sponsorship: any;
  try {
    sponsorship = await base44.asServiceRole.entities.Sponsorship.get(linkedSponsorshipId);
  } catch {
    return null;
  }

  if (!sponsorship) return null;
  if (!isSponsorshipPublicActive(sponsorship)) return null;

  const organization = await resolveCommercialOrganization(base44, sponsorship);
  if (!organization) return null;

  return {
    sponsorship_id: sponsorship.id,
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug || organization.canonical_slug || null,
      logo_url: sponsorship.logo_override || organization.logo_url || null,
      website_url: sponsorship.website_override || organization.website_url || null,
    },
    target: {
      entity_type: sponsorship.target_entity_type,
      entity_id: sponsorship.target_entity_id,
    },
    relationship_type: sponsorship.relationship_type,
    tier: sponsorship.tier || null,
    campaign_name: sponsorship.campaign_name || null,
    status: sponsorship.status,
  };
}