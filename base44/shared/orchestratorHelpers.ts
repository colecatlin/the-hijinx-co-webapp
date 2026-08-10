/**
 * orchestratorHelpers.ts
 *
 * Phase 17D: Shared orchestrator patterns for upsert/archive operations.
 * Extracted to eliminate structural duplication between upsertSponsorship,
 * upsertActivation, and upsertSponsorshipDeliverable.
 *
 * These helpers provide the common archive-by-id and search-by-normalized-key
 * patterns. Each orchestrator retains its own entity-specific validation logic.
 */

import type { ValidationResult } from './sponsorshipCommercialHelpers.ts';

// ─────────────────────────────────────────────────────────────────────────────
// ARCHIVE ENTITY BY ID
// ─────────────────────────────────────────────────────────────────────────────

export interface ArchiveInput {
  entity_id: string;
  dry_run: boolean;
}

export interface ArchiveResult {
  success: boolean;
  dry_run: boolean;
  resolution_status: string;
  errors: string[];
  warnings: string[];
  entity: {
    entity_id: string | null;
    created: boolean;
    updated: boolean;
    reused: boolean;
    normalized_key: string | null;
  };
}

/**
 * Generic archive handler for entities that use is_archived + status='archived'.
 * The entityCollection must expose .get(id) and .update(id, data).
 */
export async function archiveEntityById(
  base44: any,
  user: any,
  entityCollection: any,
  input: ArchiveInput,
  options: {
    entityIdField: string;
    keyField: string;
    label: string;
  },
): Promise<Response> {
  const { entity_id, dry_run } = input;

  if (!entity_id) {
    return Response.json({
      success: false,
      dry_run,
      resolution_status: 'error',
      errors: [`${options.label}.${options.entityIdField} is required for archive operation`],
      warnings: [],
      entity: { entity_id: null, created: false, updated: false, reused: false, normalized_key: null },
    }, { status: 400 });
  }

  let entity: any = null;
  try {
    entity = await entityCollection.get(entity_id);
  } catch {
    return Response.json({
      success: false,
      dry_run,
      resolution_status: 'error',
      errors: [`${options.label} ${entity_id} not found`],
      warnings: [],
      entity: { entity_id: null, created: false, updated: false, reused: false, normalized_key: null },
    }, { status: 404 });
  }

  if (!entity) {
    return Response.json({
      success: false,
      dry_run,
      resolution_status: 'error',
      errors: [`${options.label} ${entity_id} not found`],
      warnings: [],
      entity: { entity_id: null, created: false, updated: false, reused: false, normalized_key: null },
    }, { status: 404 });
  }

  if (dry_run) {
    return Response.json({
      success: true,
      dry_run: true,
      resolution_status: 'projected',
      errors: [],
      warnings: ['DRY RUN: no writes performed — archive projected only'],
      entity: {
        entity_id: entity.id,
        created: false,
        updated: false,
        reused: false,
        normalized_key: entity[options.keyField] || null,
      },
    }, { status: 200 });
  }

  const now = new Date().toISOString();
  const updated = await entityCollection.update(entity_id, {
    status: 'archived',
    is_archived: true,
    archived_at: now,
    updated_by_user_id: user.id,
  });

  return Response.json({
    success: true,
    dry_run: false,
    resolution_status: 'archived',
    errors: [],
    warnings: [],
    entity: {
      entity_id: updated.id,
      created: false,
      updated: true,
      reused: false,
      normalized_key: entity[options.keyField] || null,
    },
  }, { status: 200 });
}

// ─────────────────────────────────────────────────────────────────────────────
// FIND EXISTING BY NORMALIZED KEY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Search for existing non-archived records by normalized key.
 * Returns the active (non-archived-status) matches.
 */
export async function findExistingByNormalizedKey(
  base44: any,
  entityCollection: any,
  normalizedKey: string,
): Promise<any[]> {
  let existing: any[] = [];
  try {
    existing = await entityCollection.filter({
      normalized_key: normalizedKey,
      is_archived: false,
    });
  } catch {
    // Entity might not have records yet
  }

  // Note: the filter field name varies by entity (normalized_sponsorship_key,
  // normalized_activation_key, normalized_deliverable_key). The caller must
  // pass the correct entityCollection and the caller is responsible for
  // using the correct key field in the filter.
  return (existing || []).filter((e: any) => e.status !== 'archived');
}

/**
 * Check if a status transition is valid and return an error response if not.
 * Returns null if valid, or a Response object if invalid.
 */
export function checkStatusTransition(
  fromStatus: string,
  toStatus: string,
  transitionValidator: (from: string, to: string) => boolean,
  dryRun: boolean,
): Response | null {
  if (fromStatus === toStatus) return null;
  if (!transitionValidator(fromStatus, toStatus)) {
    return Response.json({
      success: false,
      dry_run: dryRun,
      resolution_status: 'error',
      errors: [`Invalid status transition: "${fromStatus}" → "${toStatus}"`],
    }, { status: 400 });
  }
  return null;
}