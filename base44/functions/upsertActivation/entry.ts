/**
 * upsertActivation
 * ---------------------------------------------------------------------------
 * Phase 17D: The single authoritative write function for Activation records.
 *
 * Supports:
 *   - upsert (create or update by normalized_activation_key)
 *   - archive (soft-delete via is_archived + status)
 *   - dry_run (project outcome without writes)
 *
 * Permission: admin-only for Phase 17D (conservative — same as upsertSponsorship).
 *
 * Does NOT:
 *   - Update Sponsorship status automatically
 *   - Create RevenueEvent
 *   - Create RevenueAgreement
 *   - Create Advertisement
 *   - Create MediaAssignment
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  validateSponsorshipForActivation,
  validateActivationLinks,
  isValidActivationStatus,
  isValidActivationStatusTransition,
  isValidActivationType,
  buildNormalizedActivationKey,
  validateBudget,
  validateReach,
  validateDateRange,
} from '../../shared/sponsorshipActivationHelpers.ts';
import { archiveEntityById } from '../../shared/orchestratorHelpers.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    // 1 — Authenticate caller
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
      activation: activationInput = {},
      dry_run = false,
    } = body;

    if (operation === 'archive') {
      return await archiveEntityById(base44, user, base44.asServiceRole.entities.Activation, {
        entity_id: activationInput.activation_id,
        dry_run,
      }, { entityIdField: 'activation_id', keyField: 'normalized_activation_key', label: 'activation' });
    }

    return await handleUpsert(base44, user, activationInput, dry_run);
  } catch (error) {
    return Response.json({ error: error?.message || 'upsertActivation failed' }, { status: 500 });
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
    errors.push('activation.sponsorship_id is required');
  }
  if (!input.activation_type) {
    errors.push('activation.activation_type is required');
  }
  if (!input.title) {
    errors.push('activation.title is required');
  }
  if (errors.length > 0) {
    return Response.json({ success: false, dry_run: dryRun, errors }, { status: 400 });
  }

  // 4 — Validate activation_type
  if (!isValidActivationType(input.activation_type)) {
    return Response.json({
      success: false, dry_run: dryRun,
      errors: [`Invalid activation_type: "${input.activation_type}"`],
    }, { status: 400 });
  }

  // 5 — Validate status
  const targetStatus = input.status || 'planned';
  if (!isValidActivationStatus(targetStatus)) {
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
  const sponsorship = sponsorshipResult.sponsorship;

  // 7 — Validate linked entities (Event, Track, Media, Advertisement, MediaAssignment)
  const linkResult = await validateActivationLinks(base44, {
    linked_event_id: input.linked_event_id,
    linked_track_id: input.linked_track_id,
    linked_media_id: input.linked_media_id,
    linked_advertisement_id: input.linked_advertisement_id,
    linked_media_assignment_id: input.linked_media_assignment_id,
  });
  if (!linkResult.valid) {
    return Response.json({ success: false, dry_run: dryRun, errors: linkResult.errors }, { status: 400 });
  }

  // 8 — Validate date range
  const dateValidation = validateDateRange(input.start_date, input.end_date);
  if (!dateValidation.valid) {
    return Response.json({ success: false, dry_run: dryRun, errors: [dateValidation.error!] }, { status: 400 });
  }

  // 9 — Validate budget
  const budgetValidation = validateBudget(input.budget_amount);
  if (!budgetValidation.valid) {
    return Response.json({ success: false, dry_run: dryRun, errors: [budgetValidation.error!] }, { status: 400 });
  }

  // 10 — Validate reach
  const reachValidation = validateReach(input.estimated_reach, input.actual_reach);
  if (!reachValidation.valid) {
    return Response.json({ success: false, dry_run: dryRun, errors: reachValidation.errors }, { status: 400 });
  }

  // 11 — Build normalized key
  const normalizedKey = buildNormalizedActivationKey({
    sponsorship_id: input.sponsorship_id,
    activation_type: input.activation_type,
    linked_event_id: input.linked_event_id,
    start_date: input.start_date,
    title: input.title,
  });

  // 12 — Search existing Activation by normalized key
  let existingActivations: any[] = [];
  try {
    existingActivations = await base44.asServiceRole.entities.Activation.filter({
      normalized_activation_key: normalizedKey,
      is_archived: false,
    });
  } catch {
    // Entity might not have records yet
  }

  const activeExisting = (existingActivations || []).filter((a: any) => a.status !== 'archived');

  // 13 — If multiple exist, return review
  if (activeExisting.length > 1) {
    return Response.json({
      success: false, dry_run: dryRun,
      resolution_status: 'review',
      review_required: true,
      errors: [],
      warnings: [`Multiple Activations found with normalized_activation_key "${normalizedKey}" — manual review required`],
      activation: {
        activation_id: null,
        created: false,
        updated: false,
        reused: false,
        normalized_activation_key: normalizedKey,
      },
    }, { status: 200 });
  }

  // 14 — Dry-run: project outcome
  if (dryRun) {
    const willReuse = activeExisting.length === 1;
    return Response.json({
      success: true,
      dry_run: true,
      resolution_status: 'projected',
      errors: [],
      warnings: ['DRY RUN: no writes performed — outcome projected only'],
      activation: {
        activation_id: willReuse ? activeExisting[0].id : null,
        created: !willReuse,
        updated: willReuse,
        reused: willReuse,
        normalized_activation_key: normalizedKey,
      },
    }, { status: 200 });
  }

  // 15 — If exactly one exists, reuse/update
  if (activeExisting.length === 1) {
    const existing = activeExisting[0];

    // Validate status transition
    if (targetStatus !== existing.status) {
      if (!isValidActivationStatusTransition(existing.status, targetStatus)) {
        return Response.json({
          success: false, dry_run: false,
          errors: [`Invalid status transition: "${existing.status}" → "${targetStatus}"`],
        }, { status: 400 });
      }
    }

    const updateData: any = {
      updated_by_user_id: user.id,
    };
    if (input.activation_type !== undefined) updateData.activation_type = input.activation_type;
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description || null;
    if (input.status !== undefined) updateData.status = targetStatus;
    if (input.start_date !== undefined) updateData.start_date = input.start_date || null;
    if (input.end_date !== undefined) updateData.end_date = input.end_date || null;
    if (input.linked_event_id !== undefined) updateData.linked_event_id = input.linked_event_id || null;
    if (input.linked_track_id !== undefined) updateData.linked_track_id = input.linked_track_id || null;
    if (input.linked_media_id !== undefined) updateData.linked_media_id = input.linked_media_id || null;
    if (input.linked_advertisement_id !== undefined) updateData.linked_advertisement_id = input.linked_advertisement_id || null;
    if (input.linked_media_assignment_id !== undefined) updateData.linked_media_assignment_id = input.linked_media_assignment_id || null;
    if (input.location !== undefined) updateData.location = input.location || null;
    if (input.url !== undefined) updateData.url = input.url || null;
    if (input.budget_amount !== undefined) updateData.budget_amount = input.budget_amount;
    if (input.currency !== undefined) updateData.currency = input.currency || 'usd';
    if (input.estimated_reach !== undefined) updateData.estimated_reach = input.estimated_reach;
    if (input.actual_reach !== undefined) updateData.actual_reach = input.actual_reach;
    if (input.display_order !== undefined) updateData.display_order = input.display_order;
    if (input.public_visibility !== undefined) updateData.public_visibility = input.public_visibility;
    if (input.notes !== undefined) updateData.notes = input.notes || null;

    const updated = await base44.asServiceRole.entities.Activation.update(existing.id, updateData);

    return Response.json({
      success: true,
      dry_run: false,
      resolution_status: 'updated',
      errors: [],
      warnings: [],
      activation: {
        activation_id: updated.id,
        created: false,
        updated: true,
        reused: true,
        normalized_activation_key: normalizedKey,
      },
    }, { status: 200 });
  }

  // 16 — Create new Activation
  const newActivation = await base44.asServiceRole.entities.Activation.create({
    sponsorship_id: input.sponsorship_id,
    activation_type: input.activation_type,
    title: input.title,
    description: input.description || null,
    status: targetStatus,
    start_date: input.start_date || null,
    end_date: input.end_date || null,
    linked_event_id: input.linked_event_id || null,
    linked_track_id: input.linked_track_id || null,
    linked_media_id: input.linked_media_id || null,
    linked_advertisement_id: input.linked_advertisement_id || null,
    linked_media_assignment_id: input.linked_media_assignment_id || null,
    location: input.location || null,
    url: input.url || null,
    budget_amount: input.budget_amount ?? null,
    currency: input.currency || 'usd',
    estimated_reach: input.estimated_reach ?? null,
    actual_reach: input.actual_reach ?? null,
    display_order: input.display_order || 0,
    public_visibility: input.public_visibility || 'private',
    notes: input.notes || null,
    is_archived: false,
    normalized_activation_key: normalizedKey,
    created_by_user_id: user.id,
    updated_by_user_id: user.id,
  });

  return Response.json({
    success: true,
    dry_run: false,
    resolution_status: 'created',
    errors: [],
    warnings: [],
    activation: {
      activation_id: newActivation.id,
      created: true,
      updated: false,
      reused: false,
      normalized_activation_key: normalizedKey,
    },
  }, { status: 200 });
}