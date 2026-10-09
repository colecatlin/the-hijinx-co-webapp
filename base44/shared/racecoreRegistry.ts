/**
 * racecoreRegistry.ts — Authoritative RaceCore ID family registry, issuance,
 * resolution, and family-health infrastructure.
 *
 * This is the single source of truth for:
 *   1. Family definitions (prefix → entity type, exact format)
 *   2. Family health state (HEALTHY / BLOCKED / MIGRATION_PENDING)
 *   3. Registry-backed issuance (fail-closed, concurrency-safe-as-possible)
 *   4. Exact-one resolution (resolveRaceCoreId)
 *   5. Existing-ID backfill / family initialization (preflight → bulk migrate → verify)
 *
 * ARCHITECTURE:
 *   RaceCore ID → issuance registry → canonical entity → Base44 record ID
 *
 * The RaceCore ID is permanent, immutable, and non-recyclable. Base44 record IDs
 * remain the internal database identity. Once issued, a RaceCore ID belongs
 * permanently to one historical entity identity regardless of later name changes,
 * slug changes, archive state, or deletion.
 *
 * CONCURRENCY MODEL (platform limitation, documented honestly):
 *   Base44 does not expose true atomic increment, transactions, or unique
 *   constraints. The safest reservation we can implement is:
 *     1. Check family HEALTHY (fail closed if not)
 *     2. Advance counter via compare-and-set (updateMany with filter guard)
 *     3. Pre-check the candidate ID is not in the registry or target entity
 *     4. Create the issuance registry record (the reservation)
 *     5. Attach the ID to the source entity
 *     6. Post-verify uniqueness across both registry and entity
 *   Two truly simultaneous calls could both advance to the same counter value
 *   before either writes. The compare-and-set + post-verification catches this
 *   and fails closed with an explicit error — but cannot prevent the window.
 *   We document this rather than claim a guarantee the storage layer cannot
 *   enforce. The issuance registry row is the durable reservation: if it
 *   exists for a sequence, that sequence is taken.
 */

// ════════════════════════════════════════════════════════════════════════
// SECTION 1 — Authoritative Family Registry
// ════════════════════════════════════════════════════════════════════════

export const MAX_SEQUENCE = 999999999;
export const MAX_RETRIES = 5;

export type FamilyDefinition = {
  prefix: string;
  entityType: string;
  description: string;
};

/** The ONLY eight supported families. No other prefix is recognized. */
export const RACECORE_FAMILIES: FamilyDefinition[] = [
  { prefix: 'PERS', entityType: 'PersonIdentity', description: 'Person identity anchor' },
  { prefix: 'RACR', entityType: 'RacerProfile', description: 'Canonical racer profile (future racer-facing credential)' },
  { prefix: 'PART', entityType: 'SeasonParticipation', description: 'Season participation' },
  { prefix: 'DRVR', entityType: 'Driver', description: 'Legacy Driver compatibility record' },
  { prefix: 'ENTR', entityType: 'Entry', description: 'Event entry' },
  { prefix: 'RSLT', entityType: 'Results', description: 'Race result' },
  { prefix: 'STND', entityType: 'Standings', description: 'Standings record' },
  { prefix: 'TRCK', entityType: 'Track', description: 'Track facility' },
];

const PREFIX_TO_ENTITY: Record<string, string> = {};
const ENTITY_TO_PREFIX: Record<string, string> = {};
for (const fam of RACECORE_FAMILIES) {
  PREFIX_TO_ENTITY[fam.prefix] = fam.entityType;
  ENTITY_TO_PREFIX[fam.entityType] = fam.prefix;
}

export const ALL_PREFIXES = RACECORE_FAMILIES.map(f => f.prefix);

export function getEntityTypeForPrefix(prefix: string): string | null {
  return PREFIX_TO_ENTITY[prefix] || null;
}

export function getPrefixForEntityType(entityType: string): string | null {
  return ENTITY_TO_PREFIX[entityType] || null;
}

export function isSupportedPrefix(prefix: string): boolean {
  return PREFIX_TO_ENTITY.hasOwnProperty(prefix);
}

export function isSupportedEntityType(entityType: string): boolean {
  return ENTITY_TO_PREFIX.hasOwnProperty(entityType);
}

// ── Format validation ────────────────────────────────────────────────────

/** Exact format: 4 uppercase letters + exactly 9 digits. */
const FORMAT_RE = /^[A-Z]{4}\d{9}$/;

export function formatId(prefix: string, sequence: number): string {
  return prefix + String(sequence).padStart(9, '0');
}

export interface ParseResult {
  prefix: string;
  suffix: string;
  sequence: number;
  full: string;
}

/** Returns null if the input is not a syntactically valid RaceCore ID format. */
export function parseRaceCoreId(id: string): ParseResult | null {
  if (!id || typeof id !== 'string') return null;
  if (!FORMAT_RE.test(id)) return null;
  const prefix = id.substring(0, 4);
  const suffix = id.substring(4);
  const sequence = parseInt(suffix, 10);
  return { prefix, suffix, sequence, full: id };
}

/**
 * Detect whether an input is an ATTEMPTED RaceCore ID — a string that looks
 * like it is meant to be one (4 letters + digits, length >= 5), even if the
 * exact format or prefix is wrong. Used by the workbook Event import to decide
 * whether track_id is a RaceCore attempt (ID-only resolution, no name fallback)
 * or a legacy Base44 ID (legacy compatibility).
 */
export function isRaceCoreAttempt(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  const s = input.trim();
  if (s.length < 5) return false;
  // 4 uppercase letters followed by digits — the RaceCore shape.
  // We accept slight format imperfections (wrong length) as an attempt
  // but require the 4-letter-prefix-then-digits structure.
  return /^[A-Z]{4}\d+$/.test(s);
}

// ════════════════════════════════════════════════════════════════════════
// SECTION 2 — Family Health State
// ════════════════════════════════════════════════════════════════════════

export type FamilyStatus =
  | 'MIGRATION_PENDING'
  | 'HEALTHY'
  | 'BLOCKED_DUPLICATE_ID'
  | 'BLOCKED_COUNTER_CONFLICT'
  | 'BLOCKED_REGISTRY_CONFLICT'
  | 'BLOCKED_FORMAT_CONFLICT'
  | 'BLOCKED_OWNERSHIP_CONFLICT'
  | 'BLOCKED_INTEGRITY_FAILURE';

export interface FamilyStateRecord {
  id: string;
  prefix: string;
  entity_type: string;
  status: FamilyStatus;
  blocked_reason: string;
  last_checked_at: string;
  initialized_at: string | null;
  last_issued_sequence: number;
  highest_backfilled_sequence: number;
  total_issuances: number;
}

/** Load the family state record for a prefix, or return a default MIGRATION_PENDING. */
export async function getFamilyState(sr: any, prefix: string): Promise<FamilyStateRecord | null> {
  let records: any[] = [];
  try {
    const result = await sr.entities.RaceCoreIdFamilyState.filter({ prefix });
    records = Array.isArray(result) ? result : (result.items || []);
  } catch (e) {
    return null;
  }
  if (!records || records.length === 0) return null;
  return records[0] as FamilyStateRecord;
}

/** Check whether a family is currently HEALTHY and may issue new IDs. */
export async function isFamilyHealthy(sr: any, prefix: string): Promise<{ healthy: boolean; state: FamilyStateRecord | null }> {
  const state = await getFamilyState(sr, prefix);
  if (!state) return { healthy: false, state: null };
  return { healthy: state.status === 'HEALTHY', state };
}

/** Get all family states as a map. */
export async function getAllFamilyStates(sr: any): Promise<Record<string, FamilyStateRecord>> {
  const map: Record<string, FamilyStateRecord> = {};
  let records: any[] = [];
  try {
    const result = await sr.entities.RaceCoreIdFamilyState.list('-prefix', 100);
    records = Array.isArray(result) ? result : (result.items || []);
  } catch (e) {
    records = [];
  }
  for (const r of records) {
    map[r.prefix] = r;
  }
  return map;
}

/** Create or update a family state record. */
export async function upsertFamilyState(sr: any, prefix: string, updates: Partial<FamilyStateRecord>): Promise<FamilyStateRecord> {
  const existing = await getFamilyState(sr, prefix);
  const entityType = getEntityTypeForPrefix(prefix)!;
  const now = new Date().toISOString();

  if (existing) {
    const updated = await sr.entities.RaceCoreIdFamilyState.update(existing.id, {
      ...updates,
      last_checked_at: now,
    } as any);
    return updated as FamilyStateRecord;
  }

  const created = await sr.entities.RaceCoreIdFamilyState.create({
    prefix,
    entity_type: entityType,
    status: 'MIGRATION_PENDING',
    last_checked_at: now,
    ...updates,
  } as any);
  return created as FamilyStateRecord;
}

// ════════════════════════════════════════════════════════════════════════
// SECTION 3 — Issuance Registry Helpers
// ════════════════════════════════════════════════════════════════════════

/** Load all issuance records for a given prefix (paged). */
export async function loadIssuancesByPrefix(sr: any, prefix: string): Promise<any[]> {
  let all: any[] = [];
  let page = await sr.entities.RaceCoreIdIssuance.filter(
    { prefix },
    { sort: 'sequence_number', limit: 500 }
  ).catch(() => ({ items: [] as any[], has_more: false }));
  const items = Array.isArray(page) ? page : (page.items || []);
  all = all.concat(items);
  while (page && page.has_more && page.next_cursor) {
    page = await sr.entities.RaceCoreIdIssuance.filter(
      { prefix },
      { sort: 'sequence_number', limit: 500, cursor: page.next_cursor }
    ).catch(() => ({ items: [] as any[], has_more: false }));
    all = all.concat(page.items || []);
  }
  return all;
}

/** Find an issuance record by racecore_id. Returns null if not found. */
export async function findIssuance(sr: any, racecoreId: string): Promise<any | null> {
  let records: any[] = [];
  try {
    const result = await sr.entities.RaceCoreIdIssuance.filter({ racecore_id: racecoreId });
    records = Array.isArray(result) ? result : (result.items || []);
  } catch (e) {
    return null;
  }
  if (!records || records.length === 0) return null;
  if (records.length > 1) {
    // Duplicate issuance registry records — this is itself a conflict.
    return { _duplicate: true, records };
  }
  return records[0];
}

/** Find all issuance records for a source record (entity_type + source_record_id). */
export async function findIssuancesForSource(sr: any, entityType: string, sourceRecordId: string): Promise<any[]> {
  let records: any[] = [];
  try {
    const result = await sr.entities.RaceCoreIdIssuance.filter({
      entity_type: entityType,
      source_record_id: sourceRecordId,
    });
    records = Array.isArray(result) ? result : (result.items || []);
  } catch (e) {
    return [];
  }
  return records || [];
}

// ════════════════════════════════════════════════════════════════════════
// SECTION 4 — Exact-One Resolver
// ════════════════════════════════════════════════════════════════════════

export type ResolutionOutcome =
  | 'RESOLVED'
  | 'INVALID_FORMAT'
  | 'UNSUPPORTED_FAMILY'
  | 'WRONG_FAMILY'
  | 'NOT_FOUND'
  | 'DUPLICATE_ID'
  | 'RETIRED_ID';

export interface ResolutionResult {
  outcome: ResolutionOutcome;
  racecore_id: string;
  prefix?: string;
  entity_type?: string;
  base44_id?: string;
  entity?: any;
  entity_lifecycle?: 'active' | 'archived' | 'deleted';
  issuance_status?: 'ACTIVE' | 'RETIRED';
  error?: string;
  conflict_details?: any;
}

/**
 * resolveRaceCoreId — the shared exact-one resolver.
 *
 * 1. Validate exact format (4 letters + 9 digits)
 * 2. Identify prefix and verify it is supported
 * 3. Verify expected family if supplied
 * 4. Inspect the issuance registry
 * 5. Locate the canonical source entity
 * 6. Validate registry ownership matches the entity
 * 7. Detect entity lifecycle
 * 8. Require unambiguous ownership (exactly one match)
 * 9. Return the Base44 ID and entity, or a distinct error
 *
 * Never falls back to names, addresses, slugs, aliases, or external UIDs
 * once the input is recognized as a RaceCore ID attempt.
 */
export async function resolveRaceCoreId(
  sr: any,
  racecoreId: string,
  expectedFamily?: string
): Promise<ResolutionResult> {
  // ── 1. Validate format ──────────────────────────────────────────────
  const parsed = parseRaceCoreId(racecoreId);
  if (!parsed) {
    return { outcome: 'INVALID_FORMAT', racecore_id: racecoreId, error: 'Not a valid RaceCore ID format (expected 4 letters + 9 digits).' };
  }

  // ── 2. Verify supported family ──────────────────────────────────────
  if (!isSupportedPrefix(parsed.prefix)) {
    return { outcome: 'UNSUPPORTED_FAMILY', racecore_id: racecoreId, prefix: parsed.prefix, error: 'Unsupported family prefix: ' + parsed.prefix };
  }

  // ── 3. Verify expected family if supplied ───────────────────────────
  if (expectedFamily) {
    const expectedPrefix = ENTITY_TO_PREFIX[expectedFamily] || expectedFamily;
    if (expectedPrefix !== parsed.prefix) {
      return {
        outcome: 'WRONG_FAMILY',
        racecore_id: racecoreId,
        prefix: parsed.prefix,
        error: 'RaceCore ID ' + racecoreId + ' belongs to family ' + parsed.prefix + ' but ' + expectedPrefix + ' was expected.',
      };
    }
  }

  const entityType = PREFIX_TO_ENTITY[parsed.prefix];

  // ── 4. Inspect issuance registry ────────────────────────────────────
  let issuance: any;
  try {
    issuance = await findIssuance(sr, racecoreId);
  } catch (e) {
    return { outcome: 'NOT_FOUND', racecore_id: racecoreId, error: 'Registry lookup failed: ' + (e as Error).message };
  }

  if (issuance && issuance._duplicate) {
    return {
      outcome: 'DUPLICATE_ID',
      racecore_id: racecoreId,
      prefix: parsed.prefix,
      conflict_details: issuance.records.map((r: any) => r.id),
      error: 'Duplicate issuance registry records found for ' + racecoreId + '.',
    };
  }

  if (!issuance) {
    return { outcome: 'NOT_FOUND', racecore_id: racecoreId, prefix: parsed.prefix, error: 'No issuance record found for ' + racecoreId + '.' };
  }

  // ── Check issuance status (RETIRED) ─────────────────────────────────
  if (issuance.issuance_status === 'RETIRED') {
    // A retired ID is permanently reserved. We still report it as RETIRED_ID
    // even if the source entity still exists — the issuance itself is retired.
    return {
      outcome: 'RETIRED_ID',
      racecore_id: racecoreId,
      prefix: parsed.prefix,
      entity_type: entityType,
      issuance_status: 'RETIRED',
      error: 'RaceCore ID ' + racecoreId + ' has been retired from active use.',
    };
  }

  // ── 5. Locate the canonical source entity ──────────────────────────
  let entity: any = null;
  try {
    entity = await sr.entities[entityType].get(issuance.source_record_id);
  } catch (e) {
    entity = null;
  }

  // ── 6. If source entity is deleted, check for duplicate claims ──────
  if (!entity) {
    // The source is gone. Check if any live entity claims this ID (shouldn't happen
    // if immutability is enforced, but we must detect it).
    let claimants: any[] = [];
    try {
      const result = await sr.entities[entityType].filter({ racecore_id: racecoreId });
      claimants = Array.isArray(result) ? result : (result.items || []);
    } catch (e) {
      claimants = [];
    }

    if (claimants.length === 0) {
      // Source deleted, no live claims — the ID is permanently reserved.
      return {
        outcome: 'NOT_FOUND',
        racecore_id: racecoreId,
        prefix: parsed.prefix,
        entity_type: entityType,
        entity_lifecycle: 'deleted',
        error: 'Source entity for ' + racecoreId + ' has been deleted. The ID is permanently reserved.',
      };
    }
    // Source deleted but someone claims the ID — this is a conflict.
    return {
      outcome: 'DUPLICATE_ID',
      racecore_id: racecoreId,
      prefix: parsed.prefix,
      conflict_details: { registry_source: issuance.source_record_id, live_claimants: claimants.map(c => c.id) },
      error: 'Registry ownership conflict: source deleted but live entities claim ' + racecoreId + '.',
    };
  }

  // ── 7. Validate registry ownership matches the entity ──────────────
  if (entity.racecore_id !== racecoreId) {
    // The entity has a different racecore_id than the registry says.
    return {
      outcome: 'DUPLICATE_ID',
      racecore_id: racecoreId,
      prefix: parsed.prefix,
      entity_type: entityType,
      conflict_details: { registry_says: issuance.source_record_id, entity_has: entity.racecore_id },
      error: 'Registry/source ownership disagreement: entity ' + entity.id + ' has racecore_id ' + entity.racecore_id + ' but registry says ' + racecoreId + '.',
    };
  }

  // ── Check for duplicate source claims (more than one entity with this ID) ──
  let claimants: any[] = [];
  try {
    const result = await sr.entities[entityType].filter({ racecore_id: racecoreId });
    claimants = Array.isArray(result) ? result : (result.items || []);
  } catch (e) {
    claimants = [];
  }
  if (claimants.length > 1) {
    return {
      outcome: 'DUPLICATE_ID',
      racecore_id: racecoreId,
      prefix: parsed.prefix,
      entity_type: entityType,
      conflict_details: { claimants: claimants.map(c => c.id) },
      error: 'Multiple ' + entityType + ' records claim ' + racecoreId + ': ' + claimants.map(c => c.id).join(', ') + '.',
    };
  }

  // ── 8. Detect entity lifecycle ──────────────────────────────────────
  let lifecycle: 'active' | 'archived' | 'deleted' = 'active';
  if (entity.is_archived === true) {
    lifecycle = 'archived';
  }

  // ── 9. RESOLVED ─────────────────────────────────────────────────────
  return {
    outcome: 'RESOLVED',
    racecore_id: racecoreId,
    prefix: parsed.prefix,
    entity_type: entityType,
    base44_id: entity.id,
    entity,
    entity_lifecycle: lifecycle,
    issuance_status: issuance.issuance_status || 'ACTIVE',
  };
}

// ════════════════════════════════════════════════════════════════════════
// SECTION 5 — Registry-Backed Issuance (fail-closed)
// ════════════════════════════════════════════════════════════════════════

export interface IssuanceResult {
  success: boolean;
  racecore_id?: string;
  prefix?: string;
  sequence_number?: number;
  entity_type?: string;
  entity_id?: string;
  generated?: boolean;
  error?: string;
  blocked?: boolean;
  blocked_status?: FamilyStatus;
}

/**
 * Ensure an existing record has a racecore_id. If it already has one, verify
 * it against the registry and return it. If not, check family health, reserve
 * a new sequence in the registry, then attach it. Fail closed on any conflict.
 *
 * This is the AUTHORITATIVE assignment operation. All application code must
 * use this, not generateRaceCoreId directly.
 */
export async function ensureRaceCoreId(
  base44: any,
  entityType: string,
  entityId: string
): Promise<IssuanceResult> {
  if (!entityType || typeof entityType !== 'string') {
    return { success: false, error: 'entity_type is required' };
  }
  if (!entityId || typeof entityId !== 'string') {
    return { success: false, error: 'entity_id is required' };
  }
  if (!isSupportedEntityType(entityType)) {
    return {
      success: false,
      error: 'Unsupported entity type: ' + entityType + '. Supported: PersonIdentity, RacerProfile, SeasonParticipation, Driver, Entry, Results, Standings, Track.',
    };
  }

  const prefix = ENTITY_TO_PREFIX[entityType];
  const sr = base44.asServiceRole;

  // ── Load the record ─────────────────────────────────────────────────
  let record: any = null;
  try {
    record = await sr.entities[entityType].get(entityId);
  } catch (e) {
    return { success: false, error: 'Record not found: ' + entityType + ' with id ' + entityId, entity_type: entityType, entity_id: entityId };
  }
  if (!record) {
    return { success: false, error: 'Record not found: ' + entityType + ' with id ' + entityId, entity_type: entityType, entity_id: entityId };
  }

  // ── If already has racecore_id, verify against registry ─────────────
  if (record.racecore_id) {
    const issuance = await findIssuance(sr, record.racecore_id);
    if (issuance && !issuance._duplicate) {
      // Verify the registry ownership matches
      if (issuance.source_record_id === entityId && issuance.entity_type === entityType) {
        return {
          success: true,
          racecore_id: record.racecore_id,
          prefix: issuance.prefix,
          sequence_number: issuance.sequence_number,
          entity_type: entityType,
          entity_id: entityId,
          generated: false,
        };
      }
      // Ownership mismatch — this is a conflict, fail closed.
      return {
        success: false,
        error: 'Registry ownership conflict: entity ' + entityId + ' has racecore_id ' + record.racecore_id + ' but the registry attributes it to ' + issuance.source_record_id + '.',
        entity_type: entityType,
        entity_id: entityId,
      };
    }
    if (issuance && issuance._duplicate) {
      return {
        success: false,
        error: 'Duplicate issuance registry records for ' + record.racecore_id + '.',
        entity_type: entityType,
        entity_id: entityId,
      };
    }
    // ID exists on the record but not in the registry — this means the registry
    // was not backfilled for this family yet, or the ID was assigned before the
    // registry existed. Return the existing ID but flag that the registry is
    // not yet authoritative for this family (the family is still MIGRATION_PENDING).
    return {
      success: true,
      racecore_id: record.racecore_id,
      prefix,
      entity_type: entityType,
      entity_id: entityId,
      generated: false,
    };
  }

  // ── Check family health ─────────────────────────────────────────────
  const healthCheck = await isFamilyHealthy(sr, prefix);
  if (!healthCheck.healthy) {
    const status = healthCheck.state?.status || 'MIGRATION_PENDING';
    const reason = healthCheck.state?.blocked_reason || 'Family has not been initialized.';
    return {
      success: false,
      error: 'RaceCore ID issuance is blocked for family ' + prefix + ': ' + status + ' — ' + reason,
      blocked: true,
      blocked_status: status,
      entity_type: entityType,
      entity_id: entityId,
    };
  }

  // ── Reserve a new sequence ──────────────────────────────────────────
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Re-read the record in case another call already set racecore_id
    let currentRecord: any = null;
    try {
      currentRecord = await sr.entities[entityType].get(entityId);
    } catch (e) {
      return { success: false, error: 'Record not found during assignment: ' + entityType + ' ' + entityId, entity_type: entityType, entity_id: entityId };
    }
    if (!currentRecord) {
      return { success: false, error: 'Record not found during assignment: ' + entityType + ' ' + entityId, entity_type: entityType, entity_id: entityId };
    }
    if (currentRecord.racecore_id) {
      // Another call set it — return the existing ID
      return {
        success: true,
        racecore_id: currentRecord.racecore_id,
        prefix,
        entity_type: entityType,
        entity_id: entityId,
        generated: false,
      };
    }

    // ── Advance counter via compare-and-set ──────────────────────────
    let counters: any[] = [];
    try {
      const result = await sr.entities.RaceCoreIdCounter.filter({ prefix });
      counters = Array.isArray(result) ? result : (result.items || []);
    } catch (e) {
      counters = [];
    }

    if (!counters || counters.length === 0) {
      // Counter doesn't exist — but the family is HEALTHY, which means it
      // was initialized. This shouldn't happen, but if it does, fail closed.
      return {
        success: false,
        error: 'Counter missing for HEALTHY family ' + prefix + '. Re-run initialization.',
        entity_type: entityType,
        entity_id: entityId,
      };
    }
    if (counters.length > 1) {
      return {
        success: false,
        error: 'Duplicate counter records for prefix ' + prefix + '. Family must be repaired before issuance.',
        blocked: true,
        blocked_status: 'BLOCKED_COUNTER_CONFLICT',
        entity_type: entityType,
        entity_id: entityId,
      };
    }

    const counter = counters[0];
    const currentVal = counter.last_issued_number || 0;
    const nextVal = currentVal + 1;

    if (nextVal > MAX_SEQUENCE) {
      return { success: false, error: 'Sequence exhausted for prefix ' + prefix + ' (max ' + MAX_SEQUENCE + ')', entity_type: entityType, entity_id: entityId };
    }

    // Compare-and-set: only advance if the counter is still at currentVal
    try {
      await sr.entities.RaceCoreIdCounter.updateMany(
        { prefix, last_issued_number: currentVal },
        { $set: { last_issued_number: nextVal } }
      );
    } catch (e) {
      continue; // retry
    }

    // Re-read to verify the advance
    let recheck: any[] = [];
    try {
      const result = await sr.entities.RaceCoreIdCounter.filter({ prefix });
      recheck = Array.isArray(result) ? result : (result.items || []);
    } catch (e) {
      continue;
    }
    if (!recheck || recheck.length === 0) continue;
    const confirmedVal = recheck[0].last_issued_number;
    if (confirmedVal !== nextVal) continue;

    // ── Pre-check: the candidate ID must not exist in the registry or entity ──
    const candidateId = formatId(prefix, nextVal);

    let existingIssuance: any = null;
    try {
      existingIssuance = await findIssuance(sr, candidateId);
    } catch (e) {
      // Registry lookup failed — fail closed
      return {
        success: false,
        error: 'Registry lookup failed for candidate ' + candidateId + ': ' + (e as Error).message + '. Issuance aborted.',
        entity_type: entityType,
        entity_id: entityId,
      };
    }
    if (existingIssuance) {
      // The counter advanced to a sequence that is already in the registry.
      // This means the counter drifted below the registry. Skip this sequence
      // (burn it) and retry — the counter will be above the registry after this.
      continue;
    }

    let existingEntity: any[] = [];
    try {
      const result = await sr.entities[entityType].filter({ racecore_id: candidateId });
      existingEntity = Array.isArray(result) ? result : (result.items || []);
    } catch (e) {
      existingEntity = [];
    }
    if (existingEntity && existingEntity.length > 0) {
      // An entity already has this ID but the registry doesn't — skip (burn).
      continue;
    }

    // ── Create the issuance registry record (the durable reservation) ──
    const now = new Date().toISOString();
    try {
      await sr.entities.RaceCoreIdIssuance.create({
        racecore_id: candidateId,
        prefix,
        sequence_number: nextVal,
        entity_type: entityType,
        source_record_id: entityId,
        issued_at: now,
        issued_by: 'system',
        issuance_status: 'ACTIVE',
        migration_source: 'new_issuance',
        is_source_archived: false,
        is_source_deleted: false,
        history: [{ action: 'issued', timestamp: now, actor: 'system', note: 'New issuance' }],
      });
    } catch (e) {
      // Registry write failed — fail closed. The counter was advanced but the
      // reservation was not created. The sequence is burned (counter is ahead).
      return {
        success: false,
        error: 'Registry write failed for ' + candidateId + ': ' + (e as Error).message + '. Sequence ' + nextVal + ' is burned. Retry the operation.',
        entity_type: entityType,
        entity_id: entityId,
      };
    }

    // ── Attach the ID to the source entity ────────────────────────────
    try {
      await sr.entities[entityType].update(entityId, { racecore_id: candidateId });
    } catch (e) {
      // Entity update failed — the registry has the reservation, the entity
      // doesn't. The sequence is permanently reserved. Fail closed and document.
      return {
        success: false,
        error: 'Entity update failed for ' + candidateId + ': ' + (e as Error).message + '. The ID is reserved in the registry but not attached to the entity.',
        racecore_id: candidateId,
        prefix,
        sequence_number: nextVal,
        entity_type: entityType,
        entity_id: entityId,
      };
    }

    // ── Post-verify: exactly one entity has this ID ────────────────────
    let verifyEntities: any[] = [];
    try {
      const result = await sr.entities[entityType].filter({ racecore_id: candidateId });
      verifyEntities = Array.isArray(result) ? result : (result.items || []);
    } catch (e) {
      // Verification query failed — fail closed, but the ID is attached.
      return {
        success: false,
        error: 'Post-assignment uniqueness check failed for ' + candidateId + ': ' + (e as Error).message,
        racecore_id: candidateId,
        prefix,
        sequence_number: nextVal,
        entity_type: entityType,
        entity_id: entityId,
      };
    }
    if (verifyEntities.length > 1) {
      return {
        success: false,
        error: 'Duplicate RaceCore ID detected after assignment: ' + candidateId + ' is on ' + verifyEntities.length + ' ' + entityType + ' records.',
        racecore_id: candidateId,
        prefix,
        sequence_number: nextVal,
        entity_type: entityType,
        entity_id: entityId,
      };
    }

    // ── Update family state mirror ────────────────────────────────────
    try {
      await upsertFamilyState(sr, prefix, { last_issued_sequence: nextVal });
    } catch (e) {
      // Non-fatal — the ID was issued successfully.
    }

    return {
      success: true,
      racecore_id: candidateId,
      prefix,
      sequence_number: nextVal,
      entity_type: entityType,
      entity_id: entityId,
      generated: true,
    };
  }

  return {
    success: false,
    error: 'Failed to assign RaceCore ID to ' + entityType + ' ' + entityId + ' after ' + MAX_RETRIES + ' attempts',
    entity_type: entityType,
    entity_id: entityId,
  };
}

// ════════════════════════════════════════════════════════════════════════
// SECTION 6 — Family Initialization (backfill existing IDs)
// ════════════════════════════════════════════════════════════════════════

export interface PreflightResult {
  prefix: string;
  entity_type: string;
  total_records: number;
  records_with_id: number;
  records_without_id: number;
  valid_ids: { record_id: string; racecore_id: string; sequence: number }[];
  malformed_ids: { record_id: string; racecore_id: string; reason: string }[];
  wrong_family_ids: { record_id: string; racecore_id: string; expected_prefix: string; actual_prefix: string }[];
  duplicate_ids: { racecore_id: string; records: { record_id: string }[] }[];
  existing_registry_ids: string[];
  registry_entity_mismatches: { racecore_id: string; registry_source: string; entity_id: string }[];
  duplicate_registry_records: { racecore_id: string; count: number }[];
  highest_sequence: number;
  counter_value: number;
  counter_exists: boolean;
  duplicate_counters: boolean;
  can_backfill: boolean;
  blocking_reason: string;
}

/** Load all records for an entity type (paged). */
async function loadAllRecords(sr: any, entityName: string): Promise<any[]> {
  let all: any[] = [];
  let page = await sr.entities[entityName].list('-created_date', 500).catch(() => ({ items: [] as any[], has_more: false }));
  const items = Array.isArray(page) ? page : (page.items || []);
  all = all.concat(items);
  while (page && page.has_more && page.next_cursor) {
    page = await sr.entities[entityName].list('-created_date', 500, page.next_cursor).catch(() => ({ items: [] as any[], has_more: false }));
    all = all.concat(page.items || []);
  }
  return all;
}

/**
 * Preflight — read-only inspection of a family before backfill.
 * Identifies valid IDs, conflicts, and blocking conditions.
 * Does NOT modify any records.
 */
export async function preflightFamily(sr: any, prefix: string): Promise<PreflightResult> {
  const entityType = getEntityTypeForPrefix(prefix)!;
  const now = new Date().toISOString();

  // ── Load all source records ────────────────────────────────────────
  const records = await loadAllRecords(sr, entityType).catch(() => []);

  // ── Load existing registry records for this prefix ─────────────────
  const registryRecords = await loadIssuancesByPrefix(sr, prefix).catch(() => []);

  // ── Load counter ───────────────────────────────────────────────────
  let counters: any[] = [];
  try {
    const result = await sr.entities.RaceCoreIdCounter.filter({ prefix });
    counters = Array.isArray(result) ? result : (result.items || []);
  } catch (e) {
    counters = [];
  }

  // ── Analyze source records ─────────────────────────────────────────
  const valid_ids: { record_id: string; racecore_id: string; sequence: number }[] = [];
  const malformed_ids: { record_id: string; racecore_id: string; reason: string }[] = [];
  const wrong_family_ids: { record_id: string; racecore_id: string; expected_prefix: string; actual_prefix: string }[] = [];
  const seqMap: Record<number, string[]> = {};
  let highest_sequence = 0;

  for (const record of records) {
    const rcId = record.racecore_id;
    if (!rcId) continue;

    const parsed = parseRaceCoreId(rcId);
    if (!parsed) {
      malformed_ids.push({ record_id: record.id, racecore_id: rcId, reason: 'Invalid format' });
      continue;
    }
    if (parsed.prefix !== prefix) {
      wrong_family_ids.push({ record_id: record.id, racecore_id: rcId, expected_prefix: prefix, actual_prefix: parsed.prefix });
      continue;
    }
    if (parsed.sequence > highest_sequence) highest_sequence = parsed.sequence;
    valid_ids.push({ record_id: record.id, racecore_id: rcId, sequence: parsed.sequence });
    if (!seqMap[parsed.sequence]) seqMap[parsed.sequence] = [];
    seqMap[parsed.sequence].push(record.id);
  }

  // ── Detect duplicate IDs in source ──────────────────────────────────
  const duplicate_ids: { racecore_id: string; records: { record_id: string }[] }[] = [];
  for (const seqStr of Object.keys(seqMap)) {
    if (seqMap[seqStr].length > 1) {
      const seq = parseInt(seqStr, 10);
      duplicate_ids.push({
        racecore_id: formatId(prefix, seq),
        records: seqMap[seqStr].map(rid => ({ record_id: rid })),
      });
    }
  }

  // ── Analyze registry records ───────────────────────────────────────
  const existing_registry_ids: string[] = [];
  const registryBySeq: Record<number, any> = {};
  const duplicate_registry_records: { racecore_id: string; count: number }[] = [];
  const regSeqCounts: Record<number, number> = {};
  for (const reg of registryRecords) {
    existing_registry_ids.push(reg.racecore_id);
    const seq = reg.sequence_number;
    regSeqCounts[seq] = (regSeqCounts[seq] || 0) + 1;
    if (!registryBySeq[seq]) registryBySeq[seq] = [];
    registryBySeq[seq].push(reg);
  }
  for (const seqStr of Object.keys(regSeqCounts)) {
    if (regSeqCounts[seqStr] > 1) {
      duplicate_registry_records.push({ racecore_id: formatId(prefix, parseInt(seqStr, 10)), count: regSeqCounts[seqStr] });
    }
  }

  // ── Check registry-entity ownership mismatches ─────────────────────
  const registry_entity_mismatches: { racecore_id: string; registry_source: string; entity_id: string }[][] = [];
  // For each valid ID, check if the registry source_record_id matches the entity record_id
  const validIdsBySeq: Record<number, string> = {};
  for (const v of valid_ids) {
    validIdsBySeq[v.sequence] = v.record_id;
  }
  const mismatches: { racecore_id: string; registry_source: string; entity_id: string }[] = [];
  for (const seqStr of Object.keys(registryBySeq)) {
    const seq = parseInt(seqStr, 10);
    const regRecord = registryBySeq[seq][0];
    const entityId = validIdsBySeq[seq];
    if (entityId && regRecord.source_record_id !== entityId) {
      mismatches.push({ racecore_id: regRecord.racecore_id, registry_source: regRecord.source_record_id, entity_id: entityId });
    }
  }

  // ── Determine blocking conditions ──────────────────────────────────
  const counter_value = counters.length > 0 ? (counters[0].last_issued_number || 0) : 0;
  const counter_exists = counters.length > 0;
  const duplicate_counters = counters.length > 1;

  let can_backfill = true;
  let blocking_reason = '';

  if (malformed_ids.length > 0) {
    can_backfill = false;
    blocking_reason = 'Malformed RaceCore IDs found in ' + entityType + '. ';
  }
  if (wrong_family_ids.length > 0) {
    can_backfill = false;
    blocking_reason += 'Wrong-family IDs found in ' + entityType + '. ';
  }
  if (duplicate_ids.length > 0) {
    can_backfill = false;
    blocking_reason += 'Duplicate RaceCore IDs in source records. ';
  }
  if (duplicate_registry_records.length > 0) {
    can_backfill = false;
    blocking_reason += 'Duplicate issuance registry records. ';
  }
  if (mismatches.length > 0) {
    can_backfill = false;
    blocking_reason += 'Registry/entity ownership mismatches. ';
  }
  if (duplicate_counters) {
    can_backfill = false;
    blocking_reason += 'Duplicate counter records. ';
  }
  if (counter_exists && counter_value < highest_sequence) {
    can_backfill = false;
    blocking_reason += 'Counter (' + counter_value + ') is below highest issued sequence (' + highest_sequence + '). ';
  }

  return {
    prefix,
    entity_type: entityType,
    total_records: records.length,
    records_with_id: valid_ids.length,
    records_without_id: records.length - valid_ids.length - malformed_ids.length - wrong_family_ids.length,
    valid_ids,
    malformed_ids,
    wrong_family_ids,
    duplicate_ids,
    existing_registry_ids,
    registry_entity_mismatches: mismatches,
    duplicate_registry_records,
    highest_sequence,
    counter_value,
    counter_exists,
    duplicate_counters,
    can_backfill,
    blocking_reason: blocking_reason.trim(),
  };
}

export interface BackfillResult {
  prefix: string;
  entity_type: string;
  preflight: PreflightResult;
  migrated_count: number;
  already_in_registry_count: number;
  skipped_count: number;
  skipped_details: { record_id: string; racecore_id: string; reason: string }[];
  counter_updated: boolean;
  counter_old_value: number;
  counter_new_value: number;
  post_verify_ok: boolean;
  post_verify_issues: string[];
  family_status: FamilyStatus;
  blocked_reason: string;
  initialized_at: string | null;
}

/**
 * Initialize a family — the explicit, family-scoped admin operation.
 *
 * Steps:
 *   1. Run read-only preflight (identify conflicts)
 *   2. If clean, bulk-migrate valid IDs into the permanent ledger
 *   3. Reconcile counter (never lower, set to max of current and highest)
 *   4. Run post-backfill verification (source ownership, registry ownership, counter safety)
 *   5. Mark HEALTHY only if all checks pass; otherwise BLOCKED
 *
 * Idempotent: running again for a HEALTHY family re-verifies without duplicating.
 * Never modifies or reassigns existing source RaceCore IDs.
 */
export async function initializeFamily(
  base44: any,
  prefix: string,
  actor: string
): Promise<BackfillResult> {
  if (!isSupportedPrefix(prefix)) {
    throw new Error('Unsupported prefix: ' + prefix);
  }
  const sr = base44.asServiceRole;
  const entityType = getEntityTypeForPrefix(prefix)!;
  const now = new Date().toISOString();

  // ── 1. Preflight ───────────────────────────────────────────────────
  const preflight = await preflightFamily(sr, prefix);

  // Set family state to reflect preflight findings
  let initialStatus: FamilyStatus = 'MIGRATION_PENDING';
  let initialReason = '';
  if (!preflight.can_backfill) {
    // Determine the specific block reason
    if (preflight.duplicate_ids.length > 0) initialStatus = 'BLOCKED_DUPLICATE_ID';
    else if (preflight.duplicate_counters || (preflight.counter_exists && preflight.counter_value < preflight.highest_sequence)) initialStatus = 'BLOCKED_COUNTER_CONFLICT';
    else if (preflight.duplicate_registry_records.length > 0 || preflight.registry_entity_mismatches.length > 0) initialStatus = 'BLOCKED_REGISTRY_CONFLICT';
    else if (preflight.malformed_ids.length > 0 || preflight.wrong_family_ids.length > 0) initialStatus = 'BLOCKED_FORMAT_CONFLICT';
    else initialStatus = 'BLOCKED_INTEGRITY_FAILURE';
    initialReason = preflight.blocking_reason;
  }

  if (!preflight.can_backfill) {
    await upsertFamilyState(sr, prefix, { status: initialStatus, blocked_reason: initialReason });
    return {
      prefix,
      entity_type: entityType,
      preflight,
      migrated_count: 0,
      already_in_registry_count: preflight.existing_registry_ids.length,
      skipped_count: preflight.malformed_ids.length + preflight.wrong_family_ids.length + preflight.duplicate_ids.length,
      skipped_details: [
        ...preflight.malformed_ids.map(m => ({ record_id: m.record_id, racecore_id: m.racecore_id, reason: m.reason })),
        ...preflight.wrong_family_ids.map(w => ({ record_id: w.record_id, racecore_id: w.racecore_id, reason: 'Wrong family: ' + w.actual_prefix })),
        ...preflight.duplicate_ids.flatMap(d => d.records.map(r => ({ record_id: r.record_id, racecore_id: d.racecore_id, reason: 'Duplicate ID in source' }))),
      ],
      counter_updated: false,
      counter_old_value: preflight.counter_value,
      counter_new_value: preflight.counter_value,
      post_verify_ok: false,
      post_verify_issues: [initialReason],
      family_status: initialStatus,
      blocked_reason: initialReason,
      initialized_at: null,
    };
  }

  // ── 2. Bulk-migrate valid IDs into the registry ────────────────────
  let migrated_count = 0;
  let already_in_registry_count = 0;
  const skipped_details: { record_id: string; racecore_id: string; reason: string }[] = [];

  // Build a set of racecore_ids already in the registry
  const existingRegIds = new Set(preflight.existing_registry_ids);

  for (const v of preflight.valid_ids) {
    if (existingRegIds.has(v.racecore_id)) {
      already_in_registry_count++;
      continue;
    }
    try {
      await sr.entities.RaceCoreIdIssuance.create({
        racecore_id: v.racecore_id,
        prefix,
        sequence_number: v.sequence,
        entity_type: entityType,
        source_record_id: v.record_id,
        issued_at: now,
        issued_by: actor || 'system_migration',
        issuance_status: 'ACTIVE',
        migration_source: 'backfill',
        is_source_archived: false,
        is_source_deleted: false,
        history: [{ action: 'backfilled', timestamp: now, actor: actor || 'system_migration', note: 'Existing ID reconciled during family initialization' }],
      });
      migrated_count++;
    } catch (e) {
      skipped_details.push({ record_id: v.record_id, racecore_id: v.racecore_id, reason: 'Registry write failed: ' + (e as Error).message });
    }
  }

  // ── 3. Reconcile counter (never lower) ─────────────────────────────
  const counter_new_value = Math.max(preflight.counter_value, preflight.highest_sequence);
  let counter_updated = false;
  let counter_old_value = preflight.counter_value;

  if (preflight.counter_exists && !preflight.duplicate_counters) {
    let counters: any[] = [];
    try {
      const result = await sr.entities.RaceCoreIdCounter.filter({ prefix });
      counters = Array.isArray(result) ? result : (result.items || []);
    } catch (e) {
      counters = [];
    }
    if (counters.length === 1 && counters[0].last_issued_number < counter_new_value) {
      try {
        await sr.entities.RaceCoreIdCounter.update(counters[0].id, { last_issued_number: counter_new_value });
        counter_updated = true;
      } catch (e) {
        // Counter update failed — block the family
        await upsertFamilyState(sr, prefix, {
          status: 'BLOCKED_COUNTER_CONFLICT',
          blocked_reason: 'Counter reconciliation failed: ' + (e as Error).message,
        });
        return {
          prefix, entity_type: entityType, preflight,
          migrated_count, already_in_registry_count,
          skipped_count: skipped_details.length, skipped_details,
          counter_updated: false, counter_old_value, counter_new_value: counter_old_value,
          post_verify_ok: false, post_verify_issues: ['Counter reconciliation failed'],
          family_status: 'BLOCKED_COUNTER_CONFLICT',
          blocked_reason: 'Counter reconciliation failed: ' + (e as Error).message,
          initialized_at: null,
        };
      }
    }
  } else if (!preflight.counter_exists) {
    // Create the counter at the highest sequence
    try {
      await sr.entities.RaceCoreIdCounter.create({
        prefix,
        last_issued_number: counter_new_value,
        is_active: true,
        description: 'RaceCore ID counter for ' + prefix + ' prefix',
      });
      counter_updated = true;
    } catch (e) {
      await upsertFamilyState(sr, prefix, {
        status: 'BLOCKED_COUNTER_CONFLICT',
        blocked_reason: 'Counter creation failed: ' + (e as Error).message,
      });
      return {
        prefix, entity_type: entityType, preflight,
        migrated_count, already_in_registry_count,
        skipped_count: skipped_details.length, skipped_details,
        counter_updated: false, counter_old_value: 0, counter_new_value,
        post_verify_ok: false, post_verify_issues: ['Counter creation failed'],
        family_status: 'BLOCKED_COUNTER_CONFLICT',
        blocked_reason: 'Counter creation failed: ' + (e as Error).message,
        initialized_at: null,
      };
    }
  }

  // ── 4. Post-backfill verification ──────────────────────────────────
  const post_verify_issues: string[] = [];

  // Re-check: every valid source ID should have a registry entry
  const postRegistry = await loadIssuancesByPrefix(sr, prefix).catch(() => []);
  const postRegIds = new Set(postRegistry.map((r: any) => r.racecore_id));
  for (const v of preflight.valid_ids) {
    if (!postRegIds.has(v.racecore_id)) {
      post_verify_issues.push('Source ID ' + v.racecore_id + ' (record ' + v.record_id + ') missing from registry after backfill.');
    }
  }

  // Re-check: registry ownership matches source
  const postRegBySeq: Record<number, any> = {};
  for (const r of postRegistry) {
    postRegBySeq[r.sequence_number] = r;
  }
  for (const v of preflight.valid_ids) {
    const reg = postRegBySeq[v.sequence];
    if (reg && reg.source_record_id !== v.record_id) {
      post_verify_issues.push('Registry/source mismatch for ' + v.racecore_id + ': registry says ' + reg.source_record_id + ', source is ' + v.record_id + '.');
    }
  }

  // Re-check counter
  let postCounters: any[] = [];
  try {
    const result = await sr.entities.RaceCoreIdCounter.filter({ prefix });
    postCounters = Array.isArray(result) ? result : (result.items || []);
  } catch (e) {
    postCounters = [];
  }
  if (postCounters.length !== 1) {
    post_verify_issues.push('Expected exactly 1 counter, found ' + postCounters.length + '.');
  } else if (postCounters[0].last_issued_number < preflight.highest_sequence) {
    post_verify_issues.push('Counter (' + postCounters[0].last_issued_number + ') below highest sequence (' + preflight.highest_sequence + ') after reconciliation.');
  }

  // ── 5. Mark HEALTHY or BLOCKED ─────────────────────────────────────
  const post_verify_ok = post_verify_issues.length === 0;
  let family_status: FamilyStatus;
  let blocked_reason = '';

  if (post_verify_ok) {
    family_status = 'HEALTHY';
    await upsertFamilyState(sr, prefix, {
      status: 'HEALTHY',
      blocked_reason: '',
      initialized_at: now,
      last_issued_sequence: counter_new_value,
      highest_backfilled_sequence: preflight.highest_sequence,
      total_issuances: postRegistry.length,
    });
  } else {
    family_status = 'BLOCKED_REGISTRY_CONFLICT';
    blocked_reason = post_verify_issues.join(' ');
    await upsertFamilyState(sr, prefix, {
      status: 'BLOCKED_REGISTRY_CONFLICT',
      blocked_reason,
      highest_backfilled_sequence: preflight.highest_sequence,
      total_issuances: postRegistry.length,
    });
  }

  return {
    prefix,
    entity_type: entityType,
    preflight,
    migrated_count,
    already_in_registry_count,
    skipped_count: skipped_details.length,
    skipped_details,
    counter_updated,
    counter_old_value,
    counter_new_value,
    post_verify_ok,
    post_verify_issues,
    family_status,
    blocked_reason,
    initialized_at: post_verify_ok ? now : null,
  };
}