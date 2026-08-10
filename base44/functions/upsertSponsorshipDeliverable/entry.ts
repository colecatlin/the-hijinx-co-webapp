/**
 * upsertSponsorshipDeliverable
 * ---------------------------------------------------------------------------
 * Phase 17D: The single authoritative write function for SponsorshipDeliverable records.
 *
 * Supports:
 *   - upsert (create or update by normalized_deliverable_key)
 *   - complete (mark deliverable completed — idempotent)
 *   - archive (soft-delete via is_archived + status)
 *   - dry_run (project outcome without writes)
 *
 * Permission: admin-only for Phase 17D (conservative — same as upsertSponsorship).
 *
 * Does NOT:
 *   - Auto-complete parent Activation when all Deliverables complete
 *   - Create RevenueEvent
 *   - Change RevenueAgreement status
 *   - Change Sponsorship financial fields
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  validateSponsorshipForActivation,
  validateDeliverableLinks,
  isValidDeliverableType,
  isValidDeliverableStatus,
  isValidDeliverableStatusTransition,
  buildNormalizedDeliverableKey,
  calculateDeliverableProgress,
  validateDateRange,
} from '../../shared/sponsorshipActivationHelpers.ts';
import { archiveEntityById } from '../../shared/orchestratorHelpers.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    // 1 — Authenticate
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2 — Authorize (admin-only for Phase 17D)
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden — admin only for Phase 17D' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      operation = 'upsert',
      deliverable: deliverableInput = {},
      dry_run = false,
    } = body;

    if (operation === 'archive') {
      return await archiveEntityById(base44, user, base44.asServiceRole.entities.SponsorshipDeliverable, {
        entity_id: deliverableInput.deliverable_id,
        dry_run,
      }, { entityIdField: 'deliverable_id', keyField: 'normalized_deliverable_key', label: 'deliverable' });
    }

    if (operation === 'complete') {
      return await handleComplete(base44, user, deliverableInput, dry_run);
    }

    return await handleUpsert(base44, user, deliverableInput, dry_run);
  } catch (error) {
    return Response.json({ error: error?.message || 'upsertSponsorshipDeliverable failed' }, { status: 500 });
  }
}

// ─── Upsert Handler ──────────────────────────────────────────────────────────

async function handleUpsert(
  base44: any,
  user: any,
  input: any,
  dryRun: boolean,
): Promise<Response> {
  const errors: string[] = [];

  // 3 — Validate required fields
  if (!input.sponsorship_id) {
    errors.push('deliverable.sponsorship_id is required');
  }
  if (!input.deliverable_type) {
    errors.push('deliverable.deliverable_type is required');
  }
  if (!input.title) {
    errors.push('deliverable.title is required');
  }
  if (errors.length > 0) {
    return Response.json({ success: false, dry_run: dryRun, errors }, { status: 400 });
  }

  // 4 — Validate deliverable_type
  if (!isValidDeliverableType(input.deliverable_type)) {
    return Response.json({
      success: false, dry_run: dryRun,
      errors: [`Invalid deliverable_type: "${input.deliverable_type}"`],
    }, { status: 400 });
  }

  // 5 — Validate status
  const targetStatus = input.status || 'planned';
  if (!isValidDeliverableStatus(targetStatus)) {
    return Response.json({
      success: false, dry_run: dryRun,
      errors: [`Invalid status: "${targetStatus}"`],
    }, { status: 400 });
  }

  // 6 — Load and validate Sponsorship
  const sponsorshipResult = await validateSponsorshipForActivation(base44, input.sponsorship_id);
  if (!sponsorshipResult.valid) {
    return Response.json({ success: false, dry_run: dryRun, errors: sponsorshipResult.errors }, { status: 400 });
  }

  // 7 — If activation_id supplied, validate it exists and matches sponsorship
  let activation: any = null;
  if (input.activation_id) {
    try {
      activation = await base44.asServiceRole.entities.Activation.get(input.activation_id);
    } catch {
      return Response.json({
        success: false, dry_run: dryRun,
        errors: [`Activation not found: ${input.activation_id}`],
      }, { status: 400 });
    }
    if (!activation) {
      return Response.json({
        success: false, dry_run: dryRun,
        errors: [`Activation not found: ${input.activation_id}`],
      }, { status: 400 });
    }
    if (activation.sponsorship_id !== input.sponsorship_id) {
      return Response.json({
        success: false, dry_run: dryRun,
        errors: [
          `Activation/Sponsorship mismatch: Activation.sponsorship_id "${activation.sponsorship_id}" does not match Deliverable.sponsorship_id "${input.sponsorship_id}"`
        ],
      }, { status: 400 });
    }
  }

  // 8 — Validate linked entities + sponsorship mismatch checks
  const linkResult = await validateDeliverableLinks(base44, {
    sponsorship_id: input.sponsorship_id,
    linked_event_id: input.linked_event_id,
    linked_track_id: input.linked_track_id,
    linked_media_id: input.linked_media_id,
    linked_advertisement_id: input.linked_advertisement_id,
    linked_media_assignment_id: input.linked_media_assignment_id,
  });
  if (!linkResult.valid) {
    return Response.json({ success: false, dry_run: dryRun, errors: linkResult.errors }, { status: 400 });
  }

  // 9 — Validate quantity
  const quantityRequired = input.quantity_required ?? 1;
  if (quantityRequired < 1) {
    return Response.json({
      success: false, dry_run: dryRun,
      errors: ['quantity_required must be >= 1'],
    }, { status: 400 });
  }

  const quantityCompleted = input.quantity_completed ?? 0;
  if (quantityCompleted < 0) {
    return Response.json({
      success: false, dry_run: dryRun,
      errors: ['quantity_completed must be >= 0'],
    }, { status: 400 });
  }

  // 10 — Validate due_date
  if (input.due_date) {
    const dueDate = new Date(input.due_date);
    if (isNaN(dueDate.getTime())) {
      return Response.json({
        success: false, dry_run: dryRun,
        errors: ['Invalid due_date'],
      }, { status: 400 });
    }
  }

  // 11 — Build normalized key
  const normalizedKey = buildNormalizedDeliverableKey({
    sponsorship_id: input.sponsorship_id,
    activation_id: input.activation_id,
    deliverable_type: input.deliverable_type,
    linked_event_id: input.linked_event_id,
    title: input.title,
  });

  // 12 — Search existing Deliverable by normalized key
  let existingDeliverables: any[] = [];
  try {
    existingDeliverables = await base44.asServiceRole.entities.SponsorshipDeliverable.filter({
      normalized_deliverable_key: normalizedKey,
      is_archived: false,
    });
  } catch {
    // Entity might not have records yet
  }

  const activeExisting = (existingDeliverables || []).filter((d: any) => d.status !== 'archived');

  // 13 — If multiple exist, return review
  if (activeExisting.length > 1) {
    return Response.json({
      success: false, dry_run: dryRun,
      resolution_status: 'review',
      review_required: true,
      errors: [],
      warnings: [`Multiple Deliverables found with normalized_deliverable_key "${normalizedKey}" — manual review required`],
      deliverable: {
        deliverable_id: null,
        created: false,
        updated: false,
        reused: false,
        normalized_deliverable_key: normalizedKey,
      },
    }, { status: 200 });
  }

  // 14 — Dry-run
  if (dryRun) {
    const willReuse = activeExisting.length === 1;
    return Response.json({
      success: true,
      dry_run: true,
      resolution_status: 'projected',
      errors: [],
      warnings: ['DRY RUN: no writes performed — outcome projected only'],
      deliverable: {
        deliverable_id: willReuse ? activeExisting[0].id : null,
        created: !willReuse,
        updated: willReuse,
        reused: willReuse,
        normalized_deliverable_key: normalizedKey,
      },
    }, { status: 200 });
  }

  // 15 — If exactly one exists, reuse/update
  if (activeExisting.length === 1) {
    const existing = activeExisting[0];

    if (targetStatus !== existing.status) {
      if (!isValidDeliverableStatusTransition(existing.status, targetStatus)) {
        return Response.json({
          success: false, dry_run: false,
          errors: [`Invalid status transition: "${existing.status}" → "${targetStatus}"`],
        }, { status: 400 });
      }
    }

    const updateData: any = {
      updated_by_user_id: user.id,
    };
    if (input.activation_id !== undefined) updateData.activation_id = input.activation_id || null;
    if (input.deliverable_type !== undefined) updateData.deliverable_type = input.deliverable_type;
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description || null;
    if (input.status !== undefined) updateData.status = targetStatus;
    if (input.quantity_required !== undefined) updateData.quantity_required = quantityRequired;
    if (input.quantity_completed !== undefined) updateData.quantity_completed = quantityCompleted;
    if (input.due_date !== undefined) updateData.due_date = input.due_date || null;
    if (input.linked_event_id !== undefined) updateData.linked_event_id = input.linked_event_id || null;
    if (input.linked_track_id !== undefined) updateData.linked_track_id = input.linked_track_id || null;
    if (input.linked_media_id !== undefined) updateData.linked_media_id = input.linked_media_id || null;
    if (input.linked_advertisement_id !== undefined) updateData.linked_advertisement_id = input.linked_advertisement_id || null;
    if (input.linked_media_assignment_id !== undefined) updateData.linked_media_assignment_id = input.linked_media_assignment_id || null;
    if (input.evidence_url !== undefined) updateData.evidence_url = input.evidence_url || null;
    if (input.evidence_notes !== undefined) updateData.evidence_notes = input.evidence_notes || null;
    if (input.public_visibility !== undefined) updateData.public_visibility = input.public_visibility;
    if (input.display_order !== undefined) updateData.display_order = input.display_order;
    if (input.notes !== undefined) updateData.notes = input.notes || null;

    // Auto-set completed_at if status is being set to completed and it wasn't before
    if (targetStatus === 'completed' && existing.status !== 'completed' && !existing.completed_at) {
      updateData.completed_at = new Date().toISOString();
    }

    const updated = await base44.asServiceRole.entities.SponsorshipDeliverable.update(existing.id, updateData);

    const progress = calculateDeliverableProgress(updated.quantity_required, updated.quantity_completed);

    return Response.json({
      success: true,
      dry_run: false,
      resolution_status: 'updated',
      errors: [],
      warnings: progress.over_delivered ? ['over_delivered: quantity_completed exceeds quantity_required'] : [],
      deliverable: {
        deliverable_id: updated.id,
        created: false,
        updated: true,
        reused: true,
        normalized_deliverable_key: normalizedKey,
        progress,
      },
    }, { status: 200 });
  }

  // 16 — Create new Deliverable
  const newDeliverable = await base44.asServiceRole.entities.SponsorshipDeliverable.create({
    sponsorship_id: input.sponsorship_id,
    activation_id: input.activation_id || null,
    deliverable_type: input.deliverable_type,
    title: input.title,
    description: input.description || null,
    status: targetStatus,
    quantity_required: quantityRequired,
    quantity_completed: quantityCompleted,
    due_date: input.due_date || null,
    completed_at: targetStatus === 'completed' ? new Date().toISOString() : null,
    linked_event_id: input.linked_event_id || null,
    linked_track_id: input.linked_track_id || null,
    linked_media_id: input.linked_media_id || null,
    linked_advertisement_id: input.linked_advertisement_id || null,
    linked_media_assignment_id: input.linked_media_assignment_id || null,
    evidence_url: input.evidence_url || null,
    evidence_notes: input.evidence_notes || null,
    public_visibility: input.public_visibility || 'private',
    display_order: input.display_order || 0,
    notes: input.notes || null,
    is_archived: false,
    normalized_deliverable_key: normalizedKey,
    created_by_user_id: user.id,
    updated_by_user_id: user.id,
  });

  const progress = calculateDeliverableProgress(newDeliverable.quantity_required, newDeliverable.quantity_completed);

  return Response.json({
    success: true,
    dry_run: false,
    resolution_status: 'created',
    errors: [],
    warnings: progress.over_delivered ? ['over_delivered: quantity_completed exceeds quantity_required'] : [],
    deliverable: {
      deliverable_id: newDeliverable.id,
      created: true,
      updated: false,
      reused: false,
      normalized_deliverable_key: normalizedKey,
      progress,
    },
  }, { status: 200 });
}

// ─── Complete Handler ────────────────────────────────────────────────────────

async function handleComplete(
  base44: any,
  user: any,
  input: any,
  dryRun: boolean,
): Promise<Response> {
  if (!input.deliverable_id) {
    return Response.json({
      success: false, dry_run: dryRun,
      errors: ['deliverable.deliverable_id is required for complete operation'],
    }, { status: 400 });
  }

  let deliverable: any = null;
  try {
    deliverable = await base44.asServiceRole.entities.SponsorshipDeliverable.get(input.deliverable_id);
  } catch {
    return Response.json({
      success: false, dry_run: dryRun,
      errors: [`Deliverable ${input.deliverable_id} not found`],
    }, { status: 404 });
  }

  if (!deliverable) {
    return Response.json({
      success: false, dry_run: dryRun,
      errors: [`Deliverable ${input.deliverable_id} not found`],
    }, { status: 404 });
  }

  const progress = calculateDeliverableProgress(deliverable.quantity_required, deliverable.quantity_completed);

  if (dryRun) {
    return Response.json({
      success: true,
      dry_run: true,
      resolution_status: 'projected',
      errors: [],
      warnings: ['DRY RUN: no writes performed — completion projected only'],
      deliverable: {
        deliverable_id: deliverable.id,
        created: false,
        updated: false,
        reused: false,
        normalized_deliverable_key: deliverable.normalized_deliverable_key,
        progress,
        will_complete: true,
      },
    }, { status: 200 });
  }

  // Idempotent: if already completed, don't change completed_at
  const updateData: any = {
    status: 'completed',
    updated_by_user_id: user.id,
  };

  if (deliverable.status !== 'completed') {
    if (!isValidDeliverableStatusTransition(deliverable.status, 'completed')) {
      return Response.json({
        success: false, dry_run: false,
        errors: [`Invalid status transition: "${deliverable.status}" → "completed"`],
      }, { status: 400 });
    }
    // Set completed_at only if it was not already set
    if (!deliverable.completed_at) {
      updateData.completed_at = new Date().toISOString();
    }
  }

  const updated = await base44.asServiceRole.entities.SponsorshipDeliverable.update(input.deliverable_id, updateData);
  const updatedProgress = calculateDeliverableProgress(updated.quantity_required, updated.quantity_completed);

  return Response.json({
    success: true,
    dry_run: false,
    resolution_status: 'completed',
    errors: [],
    warnings: updatedProgress.over_delivered ? ['over_delivered: quantity_completed exceeds quantity_required'] : [],
    deliverable: {
      deliverable_id: updated.id,
      created: false,
      updated: true,
      reused: false,
      normalized_deliverable_key: deliverable.normalized_deliverable_key,
      progress: updatedProgress,
      idempotent: deliverable.status === 'completed',
    },
  }, { status: 200 });
}

// ─── Archive Handler ─────────────────────────────────────────────────────────