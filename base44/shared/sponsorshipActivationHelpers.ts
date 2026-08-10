/**
 * sponsorshipActivationHelpers.ts
 *
 * Phase 17D — Shared activation and deliverable validation, deduplication,
 * progress, and hydration helpers for the Sponsorship execution layer.
 *
 * ARCHITECTURE RULES:
 *   • Activation = execution of a Sponsorship.
 *   • SponsorshipDeliverable = promised obligation.
 *   • Activations and Deliverables are separate concepts.
 *   • No financial values on Deliverable.
 *   • Budget is operational planning metadata (cents), NOT recognized revenue.
 *   • No automatic RevenueEvent creation from Activation/Deliverable.
 *   • No automatic parent lifecycle changes.
 *
 * All validation functions are read-only — no writes, no repairs.
 */

import { validateSponsorshipExists } from './sponsorshipCommercialHelpers.ts';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ActivationValidationResult {
  valid: boolean;
  errors: string[];
  sponsorship?: any;
  activation?: any;
}

export interface DeliverableValidationResult {
  valid: boolean;
  errors: string[];
  sponsorship?: any;
  activation?: any;
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVATION TYPE VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

export const ACTIVATION_TYPES = [
  'EventExperience',
  'Hospitality',
  'FanActivation',
  'Giveaway',
  'Display',
  'Booth',
  'VehicleBranding',
  'MediaIntegration',
  'SocialCampaign',
  'ContentCampaign',
  'DriverAppearance',
  'TeamAppearance',
  'ProductSampling',
  'Merchandise',
  'Digital',
  'Community',
  'Other',
] as const;

export function isValidActivationType(type: string | null | undefined): boolean {
  if (!type) return false;
  return (ACTIVATION_TYPES as readonly string[]).includes(type);
}

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERABLE TYPE VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

export const DELIVERABLE_TYPES = [
  'LogoPlacement',
  'SocialPost',
  'VideoIntegration',
  'MediaArticle',
  'Newsletter',
  'LivestreamMention',
  'EventSignage',
  'VehicleBranding',
  'HospitalityPass',
  'VIPExperience',
  'DriverAppearance',
  'TeamAppearance',
  'ProductDisplay',
  'ProductSampling',
  'Giveaway',
  'MerchandiseInclusion',
  'Booth',
  'PhotoContent',
  'VideoContent',
  'PodcastIntegration',
  'DigitalPlacement',
  'Other',
] as const;

export function isValidDeliverableType(type: string | null | undefined): boolean {
  if (!type) return false;
  return (DELIVERABLE_TYPES as readonly string[]).includes(type);
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS LIFECYCLE VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

export const ACTIVATION_STATUSES = [
  'planned',
  'approved',
  'active',
  'completed',
  'cancelled',
  'archived',
] as const;

const ACTIVATION_TRANSITIONS: Record<string, string[]> = {
  planned: ['approved', 'active', 'cancelled', 'archived'],
  approved: ['active', 'cancelled', 'archived'],
  active: ['completed', 'cancelled', 'archived'],
  completed: ['archived'],
  cancelled: ['archived'],
  archived: [],
};

export function isValidActivationStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return (ACTIVATION_STATUSES as readonly string[]).includes(status);
}

export function isValidActivationStatusTransition(from: string, to: string): boolean {
  if (from === to) return true;
  const allowed = ACTIVATION_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

export const DELIVERABLE_STATUSES = [
  'planned',
  'in_progress',
  'submitted',
  'approved',
  'completed',
  'cancelled',
  'archived',
] as const;

const DELIVERABLE_TRANSITIONS: Record<string, string[]> = {
  planned: ['in_progress', 'submitted', 'approved', 'completed', 'cancelled', 'archived'],
  in_progress: ['submitted', 'approved', 'completed', 'cancelled', 'archived'],
  submitted: ['approved', 'completed', 'cancelled', 'archived'],
  approved: ['completed', 'cancelled', 'archived'],
  completed: ['archived'],
  cancelled: ['archived'],
  archived: [],
};

export function isValidDeliverableStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return (DELIVERABLE_STATUSES as readonly string[]).includes(status);
}

export function isValidDeliverableStatusTransition(from: string, to: string): boolean {
  if (from === to) return true;
  const allowed = DELIVERABLE_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATE SPONSORSHIP FOR ACTIVATION (Task 5)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate that a Sponsorship exists, is not archived, and has a valid Organization.
 * Reuses the Phase 17C validateSponsorshipExists helper.
 */
export async function validateSponsorshipForActivation(
  base44: any,
  sponsorshipId: string
): Promise<ActivationValidationResult> {
  const result = await validateSponsorshipExists(base44, sponsorshipId);
  if (!result.valid) {
    return { valid: false, errors: result.errors };
  }
  return { valid: true, errors: [], sponsorship: result.sponsorship };
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATE ACTIVATION LINKS (Task 11)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate all optional linked records on an Activation.
 * Each linked entity must exist. Event/Track mismatch is checked when both supplied.
 *
 * Does NOT write anything. Does NOT auto-attach.
 */
export async function validateActivationLinks(
  base44: any,
  input: {
    linked_event_id?: string;
    linked_track_id?: string;
    linked_media_id?: string;
    linked_advertisement_id?: string;
    linked_media_assignment_id?: string;
  }
): Promise<{ valid: boolean; errors: string[]; event?: any; track?: any; media?: any; advertisement?: any; assignment?: any }> {
  const errors: string[] = [];
  let event: any = null;
  let track: any = null;
  let media: any = null;
  let advertisement: any = null;
  let assignment: any = null;

  // Event
  if (input.linked_event_id) {
    try {
      event = await base44.asServiceRole.entities.Event.get(input.linked_event_id);
      if (!event) {
        errors.push(`Linked Event not found: ${input.linked_event_id}`);
      } else if (event.is_archived) {
        errors.push(`Linked Event is archived: ${input.linked_event_id}`);
      }
    } catch {
      errors.push(`Linked Event not found: ${input.linked_event_id}`);
    }
  }

  // Track
  if (input.linked_track_id) {
    try {
      track = await base44.asServiceRole.entities.Track.get(input.linked_track_id);
      if (!track) {
        errors.push(`Linked Track not found: ${input.linked_track_id}`);
      } else if (track.is_archived) {
        errors.push(`Linked Track is archived: ${input.linked_track_id}`);
      }
    } catch {
      errors.push(`Linked Track not found: ${input.linked_track_id}`);
    }
  }

  // Media
  if (input.linked_media_id) {
    try {
      media = await base44.asServiceRole.entities.MediaAsset.get(input.linked_media_id);
      if (!media) {
        errors.push(`Linked MediaAsset not found: ${input.linked_media_id}`);
      }
    } catch {
      errors.push(`Linked MediaAsset not found: ${input.linked_media_id}`);
    }
  }

  // Advertisement
  if (input.linked_advertisement_id) {
    try {
      advertisement = await base44.asServiceRole.entities.Advertisement.get(input.linked_advertisement_id);
      if (!advertisement) {
        errors.push(`Linked Advertisement not found: ${input.linked_advertisement_id}`);
      }
    } catch {
      errors.push(`Linked Advertisement not found: ${input.linked_advertisement_id}`);
    }
  }

  // MediaAssignment
  if (input.linked_media_assignment_id) {
    try {
      assignment = await base44.asServiceRole.entities.MediaAssignment.get(input.linked_media_assignment_id);
      if (!assignment) {
        errors.push(`Linked MediaAssignment not found: ${input.linked_media_assignment_id}`);
      }
    } catch {
      errors.push(`Linked MediaAssignment not found: ${input.linked_media_assignment_id}`);
    }
  }

  // Event/Track mismatch check
  if (event && track && event.track_id) {
    if (event.track_id !== input.linked_track_id) {
      errors.push(
        `Event/Track mismatch: Event.track_id "${event.track_id}" does not match linked_track_id "${input.linked_track_id}"`
      );
    }
  }

  return { valid: errors.length === 0, errors, event, track, media, advertisement, assignment };
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATE DELIVERABLE LINKS (Task 12)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate all optional linked records on a Deliverable.
 * Also checks that linked Advertisement/MediaAssignment sponsorship matches.
 *
 * Does NOT write anything. Does NOT auto-attach.
 */
export async function validateDeliverableLinks(
  base44: any,
  input: {
    sponsorship_id: string;
    linked_event_id?: string;
    linked_track_id?: string;
    linked_media_id?: string;
    linked_advertisement_id?: string;
    linked_media_assignment_id?: string;
  }
): Promise<DeliverableValidationResult> {
  const errors: string[] = [];

  // Reuse activation link validation for existence checks
  const linkResult = await validateActivationLinks(base44, {
    linked_event_id: input.linked_event_id,
    linked_track_id: input.linked_track_id,
    linked_media_id: input.linked_media_id,
    linked_advertisement_id: input.linked_advertisement_id,
    linked_media_assignment_id: input.linked_media_assignment_id,
  });

  errors.push(...linkResult.errors);

  // Advertisement sponsorship mismatch
  if (linkResult.advertisement?.linked_sponsorship_id) {
    if (linkResult.advertisement.linked_sponsorship_id !== input.sponsorship_id) {
      errors.push(
        `Advertisement Sponsorship mismatch: Advertisement.linked_sponsorship_id "${linkResult.advertisement.linked_sponsorship_id}" does not match Deliverable.sponsorship_id "${input.sponsorship_id}"`
      );
    }
  }

  // MediaAssignment sponsorship mismatch
  if (linkResult.assignment?.linked_sponsorship_id) {
    if (linkResult.assignment.linked_sponsorship_id !== input.sponsorship_id) {
      errors.push(
        `MediaAssignment Sponsorship mismatch: MediaAssignment.linked_sponsorship_id "${linkResult.assignment.linked_sponsorship_id}" does not match Deliverable.sponsorship_id "${input.sponsorship_id}"`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZED KEY BUILDERS (Tasks 6, 7)
// ─────────────────────────────────────────────────────────────────────────────

function normalizeTitle(title: string): string {
  return (title || '').toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

/**
 * Build the application-level deduplication key for an Activation.
 *
 * Key: ${sponsorship_id}:${activation_type}:${linked_event_id || 'none'}:${start_date || 'none'}:${normalized_title}
 *
 * Description and budget are intentionally NOT part of the key.
 */
export function buildNormalizedActivationKey(input: {
  sponsorship_id: string;
  activation_type: string;
  linked_event_id?: string | null;
  start_date?: string | null;
  title: string;
}): string {
  return [
    input.sponsorship_id,
    input.activation_type,
    input.linked_event_id || 'none',
    input.start_date || 'none',
    normalizeTitle(input.title),
  ].join(':');
}

/**
 * Build the application-level deduplication key for a Deliverable.
 *
 * Key: ${sponsorship_id}:${activation_id || 'none'}:${deliverable_type}:${linked_event_id || 'none'}:${normalized_title}
 *
 * Quantity and status are intentionally NOT part of the key.
 */
export function buildNormalizedDeliverableKey(input: {
  sponsorship_id: string;
  activation_id?: string | null;
  deliverable_type: string;
  linked_event_id?: string | null;
  title: string;
}): string {
  return [
    input.sponsorship_id,
    input.activation_id || 'none',
    input.deliverable_type,
    input.linked_event_id || 'none',
    normalizeTitle(input.title),
  ].join(':');
}

// ─────────────────────────────────────────────────────────────────────────────
// QUANTITY + COMPLETION RULES (Task 13)
// ─────────────────────────────────────────────────────────────────────────────

export interface DeliverableProgress {
  quantity_required: number;
  quantity_completed: number;
  completion_percent: number;
  is_complete: boolean;
  over_delivered: boolean;
}

/**
 * Calculate deterministic deliverable progress.
 * completion_percent = min(100, (quantity_completed / quantity_required) * 100)
 * is_complete = quantity_completed >= quantity_required
 * over_delivered = quantity_completed > quantity_required
 */
export function calculateDeliverableProgress(
  quantityRequired: number | null | undefined,
  quantityCompleted: number | null | undefined
): DeliverableProgress {
  const required = Math.max(0, Number(quantityRequired ?? 1));
  const completed = Math.max(0, Number(quantityCompleted ?? 0));
  const effectiveRequired = required < 1 ? 1 : required;
  const percent = Math.min(100, Math.round((completed / effectiveRequired) * 100));
  return {
    quantity_required: required,
    quantity_completed: completed,
    completion_percent: percent,
    is_complete: completed >= required,
    over_delivered: completed > required,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HYDRATION HELPERS (Task 5)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hydrate an Activation with its Sponsorship and Organization context.
 * Read-only.
 */
export async function hydrateActivationContext(
  base44: any,
  activation: any
): Promise<{
  activation: any;
  sponsorship: any | null;
  organization: any | null;
}> {
  if (!activation?.sponsorship_id) {
    return { activation, sponsorship: null, organization: null };
  }

  let sponsorship: any = null;
  try {
    sponsorship = await base44.asServiceRole.entities.Sponsorship.get(activation.sponsorship_id);
  } catch {
    return { activation, sponsorship: null, organization: null };
  }

  if (!sponsorship) {
    return { activation, sponsorship: null, organization: null };
  }

  let organization: any = null;
  if (sponsorship.sponsor_organization_id) {
    try {
      organization = await base44.asServiceRole.entities.Organization.get(sponsorship.sponsor_organization_id);
    } catch {
      // Organization lookup failed — return null
    }
  }

  return { activation, sponsorship, organization };
}

/**
 * Hydrate a Deliverable with its Sponsorship, Activation, and Organization context.
 * Read-only.
 */
export async function hydrateDeliverableContext(
  base44: any,
  deliverable: any
): Promise<{
  deliverable: any;
  sponsorship: any | null;
  activation: any | null;
  organization: any | null;
}> {
  if (!deliverable?.sponsorship_id) {
    return { deliverable, sponsorship: null, activation: null, organization: null };
  }

  let sponsorship: any = null;
  try {
    sponsorship = await base44.asServiceRole.entities.Sponsorship.get(deliverable.sponsorship_id);
  } catch {
    return { deliverable, sponsorship: null, activation: null, organization: null };
  }

  let activation: any = null;
  if (deliverable.activation_id) {
    try {
      activation = await base44.asServiceRole.entities.Activation.get(deliverable.activation_id);
    } catch {
      // Activation lookup failed
    }
  }

  let organization: any = null;
  if (sponsorship?.sponsor_organization_id) {
    try {
      organization = await base44.asServiceRole.entities.Organization.get(sponsorship.sponsor_organization_id);
    } catch {
      // Organization lookup failed
    }
  }

  return { deliverable, sponsorship, activation, organization };
}

// ─────────────────────────────────────────────────────────────────────────────
// BUDGET + REACH VALIDATION (Tasks 15, 16)
// ─────────────────────────────────────────────────────────────────────────────

export function validateBudget(budgetAmount: number | null | undefined): { valid: boolean; error?: string } {
  if (budgetAmount === null || budgetAmount === undefined) return { valid: true };
  if (typeof budgetAmount !== 'number' || isNaN(budgetAmount)) {
    return { valid: false, error: 'budget_amount must be a number' };
  }
  if (budgetAmount < 0) {
    return { valid: false, error: 'budget_amount must be >= 0' };
  }
  return { valid: true };
}

export function validateReach(
  estimatedReach: number | null | undefined,
  actualReach: number | null | undefined
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (estimatedReach !== null && estimatedReach !== undefined) {
    if (typeof estimatedReach !== 'number' || isNaN(estimatedReach) || estimatedReach < 0) {
      errors.push('estimated_reach must be >= 0');
    }
  }
  if (actualReach !== null && actualReach !== undefined) {
    if (typeof actualReach !== 'number' || isNaN(actualReach) || actualReach < 0) {
      errors.push('actual_reach must be >= 0');
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validateDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined
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

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVATION EXECUTION COUNTS (Task 17)
// ─────────────────────────────────────────────────────────────────────────────

export interface SponsorshipExecutionCounts {
  activation_count: number;
  active_activation_count: number;
  completed_activation_count: number;
  deliverable_count: number;
  deliverables_completed: number;
  deliverables_outstanding: number;
  deliverable_completion_percent: number;
}

/**
 * Load activation and deliverable counts for a Sponsorship.
 * Used to enrich the Sponsorship commercial read model with execution progress.
 * Only counts — no ROI computation.
 */
export async function loadSponsorshipExecutionCounts(
  base44: any,
  sponsorshipId: string
): Promise<SponsorshipExecutionCounts> {
  const [activations, deliverables] = await Promise.all([
    base44.asServiceRole.entities.Activation.filter({
      sponsorship_id: sponsorshipId,
      is_archived: false,
    }).catch(() => []),
    base44.asServiceRole.entities.SponsorshipDeliverable.filter({
      sponsorship_id: sponsorshipId,
      is_archived: false,
    }).catch(() => []),
  ]);

  const activeActivations = (activations as any[]).filter((a: any) =>
    a.status === 'planned' || a.status === 'approved' || a.status === 'active'
  );
  const completedActivations = (activations as any[]).filter((a: any) =>
    a.status === 'completed'
  );

  const deliverableList = deliverables as any[];
  const completedDeliverables = deliverableList.filter((d: any) => d.status === 'completed');
  const outstandingDeliverables = deliverableList.filter((d: any) =>
    d.status !== 'completed' && d.status !== 'cancelled' && d.status !== 'archived'
  );

  const totalRequired = deliverableList.reduce((sum: number, d: any) =>
    sum + Math.max(1, Number(d.quantity_required ?? 1)), 0);
  const totalCompleted = deliverableList.reduce((sum: number, d: any) =>
    sum + Math.max(0, Number(d.quantity_completed ?? 0)), 0);
  const completionPercent = totalRequired > 0
    ? Math.min(100, Math.round((totalCompleted / totalRequired) * 100))
    : 0;

  return {
    activation_count: (activations as any[]).length,
    active_activation_count: activeActivations.length,
    completed_activation_count: completedActivations.length,
    deliverable_count: deliverableList.length,
    deliverables_completed: completedDeliverables.length,
    deliverables_outstanding: outstandingDeliverables.length,
    deliverable_completion_percent: completionPercent,
  };
}

/**
 * Load execution counts for multiple Sponsorships in batch.
 * Returns a Map<sponsorshipId, SponsorshipExecutionCounts>.
 */
export async function loadSponsorshipExecutionCountsBatch(
  base44: any,
  sponsorshipIds: string[]
): Promise<Map<string, SponsorshipExecutionCounts>> {
  const result = new Map<string, SponsorshipExecutionCounts>();
  if (sponsorshipIds.length === 0) return result;

  const [allActivations, allDeliverables] = await Promise.all([
    base44.asServiceRole.entities.Activation.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.SponsorshipDeliverable.list('-created_date', 500).catch(() => []),
  ]);

  const idSet = new Set(sponsorshipIds);

  // Index by sponsorship_id
  const activationsBySponsorship = new Map<string, any[]>();
  const deliverablesBySponsorship = new Map<string, any[]>();

  for (const a of allActivations as any[]) {
    if (a.sponsorship_id && idSet.has(a.sponsorship_id)) {
      if (!activationsBySponsorship.has(a.sponsorship_id)) {
        activationsBySponsorship.set(a.sponsorship_id, []);
      }
      activationsBySponsorship.get(a.sponsorship_id)!.push(a);
    }
  }
  for (const d of allDeliverables as any[]) {
    if (d.sponsorship_id && idSet.has(d.sponsorship_id)) {
      if (!deliverablesBySponsorship.has(d.sponsorship_id)) {
        deliverablesBySponsorship.set(d.sponsorship_id, []);
      }
      deliverablesBySponsorship.get(d.sponsorship_id)!.push(d);
    }
  }

  for (const id of sponsorshipIds) {
    const activations = (activationsBySponsorship.get(id) || []).filter((a: any) => !a.is_archived);
    const deliverableList = (deliverablesBySponsorship.get(id) || []).filter((d: any) => !d.is_archived);

    const activeActivations = activations.filter((a: any) =>
      a.status === 'planned' || a.status === 'approved' || a.status === 'active');
    const completedActivations = activations.filter((a: any) => a.status === 'completed');
    const completedDeliverables = deliverableList.filter((d: any) => d.status === 'completed');
    const outstandingDeliverables = deliverableList.filter((d: any) =>
      d.status !== 'completed' && d.status !== 'cancelled' && d.status !== 'archived');

    const totalRequired = deliverableList.reduce((sum: number, d: any) =>
      sum + Math.max(1, Number(d.quantity_required ?? 1)), 0);
    const totalCompleted = deliverableList.reduce((sum: number, d: any) =>
      sum + Math.max(0, Number(d.quantity_completed ?? 0)), 0);
    const completionPercent = totalRequired > 0
      ? Math.min(100, Math.round((totalCompleted / totalRequired) * 100))
      : 0;

    result.set(id, {
      activation_count: activations.length,
      active_activation_count: activeActivations.length,
      completed_activation_count: completedActivations.length,
      deliverable_count: deliverableList.length,
      deliverables_completed: completedDeliverables.length,
      deliverables_outstanding: outstandingDeliverables.length,
      deliverable_completion_percent: completionPercent,
    });
  }

  return result;
}