/**
 * sponsorshipHelpers.ts
 * ---------------------------------------------------------------------------
 * Phase 17A: Shared sponsorship validation, key generation, and lifecycle
 * helpers used by upsertSponsorship and audit functions.
 */

// ─── Target Validation ──────────────────────────────────────────────────────

export const SPONSORSHIP_TARGET_TYPES = [
  'RacerProfile',
  'Team',
  'Vehicle',
  'Event',
  'Series',
  'Track',
  'MediaAsset',
  'Platform',
] as const;

export const PLATFORM_SENTINEL_ID = 'hijinx-platform';

export interface TargetValidationResult {
  valid: boolean;
  error?: string;
  entity?: any;
}

/**
 * Validate that a sponsorship target entity exists and is valid.
 * Platform target uses a deterministic sentinel ID.
 */
export async function validateSponsorshipTarget(
  base44: any,
  targetEntityType: string,
  targetEntityId: string,
): Promise<TargetValidationResult> {
  if (!targetEntityType || !targetEntityId) {
    return { valid: false, error: 'target_entity_type and target_entity_id are required' };
  }

  if (!(SPONSORSHIP_TARGET_TYPES as readonly string[]).includes(targetEntityType)) {
    return { valid: false, error: `Unsupported target_entity_type: ${targetEntityType}` };
  }

  // Platform target — deterministic sentinel
  if (targetEntityType === 'Platform') {
    if (targetEntityId !== PLATFORM_SENTINEL_ID) {
      return { valid: false, error: `Platform target must use sentinel ID "${PLATFORM_SENTINEL_ID}"` };
    }
    return { valid: true };
  }

  // Entity existence validation
  try {
    let entity: any = null;
    switch (targetEntityType) {
      case 'RacerProfile':
        entity = await base44.asServiceRole.entities.RacerProfile.get(targetEntityId);
        if (entity && entity.is_archived) {
          return { valid: false, error: 'RacerProfile is archived', entity };
        }
        break;
      case 'Team':
        entity = await base44.asServiceRole.entities.Team.get(targetEntityId);
        if (entity && entity.is_archived) {
          return { valid: false, error: 'Team is archived', entity };
        }
        break;
      case 'Vehicle':
        entity = await base44.asServiceRole.entities.Vehicle.get(targetEntityId);
        if (entity && entity.is_archived) {
          return { valid: false, error: 'Vehicle is archived', entity };
        }
        break;
      case 'Event':
        entity = await base44.asServiceRole.entities.Event.get(targetEntityId);
        if (entity && entity.is_archived) {
          return { valid: false, error: 'Event is archived', entity };
        }
        break;
      case 'Series':
        entity = await base44.asServiceRole.entities.Series.get(targetEntityId);
        if (entity && entity.is_archived) {
          return { valid: false, error: 'Series is archived', entity };
        }
        break;
      case 'Track':
        entity = await base44.asServiceRole.entities.Track.get(targetEntityId);
        if (entity && entity.is_archived) {
          return { valid: false, error: 'Track is archived', entity };
        }
        break;
      case 'MediaAsset':
        entity = await base44.asServiceRole.entities.MediaAsset.get(targetEntityId);
        if (entity && entity.status === 'archived') {
          return { valid: false, error: 'MediaAsset is archived', entity };
        }
        break;
      default:
        return { valid: false, error: `Unsupported target_entity_type: ${targetEntityType}` };
    }
    if (!entity) {
      return { valid: false, error: `${targetEntityType} ${targetEntityId} not found` };
    }
    return { valid: true, entity };
  } catch (e: any) {
    return { valid: false, error: `${targetEntityType} lookup failed: ${e.message}` };
  }
}

// ─── Relationship Type Validation ────────────────────────────────────────────

export const RELATIONSHIP_TYPES = [
  'Sponsor',
  'Partner',
  'Supplier',
  'Vendor',
  'MediaPartner',
  'BroadcastPartner',
  'HospitalityPartner',
  'TechnicalPartner',
  'CommunityPartner',
  'MerchandisingPartner',
] as const;

export function isValidRelationshipType(type: string | null | undefined): boolean {
  if (!type) return false;
  return (RELATIONSHIP_TYPES as readonly string[]).includes(type);
}

// ─── Tier Validation ──────────────────────────────────────────────────────────

export const SPONSORSHIP_TIERS = [
  'Title',
  'Presenting',
  'Official',
  'Primary',
  'Supporting',
  'Associate',
] as const;

export function isValidTier(tier: string | null | undefined): boolean {
  if (!tier) return true; // tier is optional
  return (SPONSORSHIP_TIERS as readonly string[]).includes(tier);
}

/**
 * Derive prominence booleans from tier.
 * These are NOT stored on the entity — they are derived when needed.
 */
export function deriveProminenceFromTier(tier: string | null | undefined): {
  is_title: boolean;
  is_presenting: boolean;
  is_primary: boolean;
} {
  return {
    is_title: tier === 'Title',
    is_presenting: tier === 'Presenting',
    is_primary: tier === 'Title' || tier === 'Presenting' || tier === 'Primary',
  };
}

// ─── Status Lifecycle Validation ──────────────────────────────────────────────

export const SPONSORSHIP_STATUSES = [
  'draft',
  'proposed',
  'active',
  'completed',
  'expired',
  'cancelled',
  'archived',
] as const;

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['proposed', 'active', 'cancelled', 'archived'],
  proposed: ['active', 'cancelled', 'archived'],
  active: ['completed', 'expired', 'cancelled', 'archived'],
  completed: ['archived'],
  expired: ['archived'],
  cancelled: ['archived'],
  archived: [],
};

export function isValidStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return (SPONSORSHIP_STATUSES as readonly string[]).includes(status);
}

export function isValidStatusTransition(from: string, to: string): boolean {
  if (from === to) return true;
  const allowed = VALID_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

// ─── Date Validation ──────────────────────────────────────────────────────────

export function validateDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): { valid: boolean; error?: string } {
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime())) return { valid: false, error: 'Invalid start_date' };
    if (isNaN(end.getTime())) return { valid: false, error: 'Invalid end_date' };
    if (end < start) return { valid: false, error: 'end_date must be >= start_date' };
  }
  return { valid: true };
}

// ─── Season Year Validation ───────────────────────────────────────────────────

export function normalizeSeasonYear(
  year: string | number | null | undefined,
): { valid: boolean; normalized?: string; error?: string } {
  if (year === null || year === undefined || year === '') return { valid: true, normalized: undefined };
  const yearStr = String(year).trim();
  const yearNum = parseInt(yearStr, 10);
  if (isNaN(yearNum) || yearStr.length !== 4 || yearNum < 1900 || yearNum > 3000) {
    return { valid: false, error: `Invalid season_year: "${yearStr}" — must be a four-digit year` };
  }
  return { valid: true, normalized: yearStr };
}

// ─── Normalized Sponsorship Key ──────────────────────────────────────────────

/**
 * Build the application-level deduplication key for a Sponsorship.
 *
 * Key: ${sponsor_organization_id}:${target_entity_type}:${target_entity_id}:${relationship_type}:${start_date || 'null'}
 *
 * Tier is intentionally NOT part of the key — a tier change should update
 * an existing Sponsorship, not create a duplicate relationship.
 */
export function buildNormalizedSponsorshipKey(input: {
  sponsor_organization_id: string;
  target_entity_type: string;
  target_entity_id: string;
  relationship_type: string;
  start_date?: string | null;
}): string {
  const startDatePart = input.start_date || 'null';
  return [
    input.sponsor_organization_id,
    input.target_entity_type,
    input.target_entity_id,
    input.relationship_type,
    startDatePart,
  ].join(':');
}