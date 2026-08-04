/**
 * racecoreId.ts — Shared RaceCore ID generation and assignment logic.
 *
 * Used by:
 *   - base44/functions/generateRaceCoreId/entry.ts  (HTTP handler)
 *   - base44/functions/ensureRaceCoreId/entry.ts   (HTTP handler)
 *   - base44/functions/resolveRacerProfile/entry.ts (direct import)
 *   - base44/functions/resolveSeasonParticipation/entry.ts (direct import)
 *
 * CONCURRENCY NOTE:
 *   Base44 does not expose true atomic increment, transactions, or
 *   compare-and-set with return values. The SDK's updateMany supports
 *   MongoDB $inc/$set but does not return the updated document or
 *   match count. Therefore this module uses a best-safe approach:
 *     1. Read counter
 *     2. Calculate next = last + 1
 *     3. Compare-and-set via updateMany with filter {last_issued_number: current}
 *     4. Re-read to verify
 *     5. Duplicate-check the generated ID against the target entity
 *     6. Retry up to MAX_RETRIES on conflict
 *
 * REMAINING RACE CONDITION:
 *   Two concurrent calls could both read the same counter value,
 *   both compare-and-set to the same next value, both re-read the
 *   same confirmed value, and both pass the duplicate check (since
 *   neither has written the ID to an entity yet). Both would return
 *   the same RaceCore ID. This is a narrow window and unlikely in
 *   practice (admin-only, infrequent calls). The duplicate check
 *   catches sequential re-use. True elimination requires platform-
 *   level atomic increment with return value, which Base44 does not
 *   currently support.
 */

const SUPPORTED_PREFIXES = ['PERS', 'RACR', 'PART'];

const PREFIX_TO_ENTITY = {
  PERS: 'PersonIdentity',
  RACR: 'RacerProfile',
  PART: 'SeasonParticipation',
};

const ENTITY_TO_PREFIX = {
  PersonIdentity: 'PERS',
  RacerProfile: 'RACR',
  SeasonParticipation: 'PART',
};

const MAX_SEQUENCE = 999999999;
const MAX_RETRIES = 5;

function formatId(prefix, num) {
  return prefix + String(num).padStart(9, '0');
}

/**
 * Generate a unique RaceCore ID for the given prefix.
 * Returns { success, prefix, sequence_number, racecore_id } or { success: false, error }.
 */
export async function generateRaceCoreId(base44, prefix) {
  if (!prefix || typeof prefix !== 'string') {
    return { success: false, error: 'prefix is required' };
  }

  const upperPrefix = prefix.toUpperCase();

  if (!SUPPORTED_PREFIXES.includes(upperPrefix)) {
    return {
      success: false,
      error: 'Unsupported prefix: ' + prefix + '. Phase 2 supports: PERS, RACR, PART',
    };
  }

  const sr = base44.asServiceRole;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // ── Load or initialize counter ──────────────────────────────────────
    let counters = await sr.entities.RaceCoreIdCounter
      .filter({ prefix: upperPrefix })
      .catch(() => []);

    if (!counters || counters.length === 0) {
      // Try to create — another concurrent call might beat us
      try {
        await sr.entities.RaceCoreIdCounter.create({
          prefix: upperPrefix,
          last_issued_number: 0,
          is_active: true,
          description: 'RaceCore ID counter for ' + upperPrefix + ' prefix',
        });
      } catch (e) {
        // Another call likely created it — fall through to re-read
      }
      counters = await sr.entities.RaceCoreIdCounter
        .filter({ prefix: upperPrefix })
        .catch(() => []);
      if (!counters || counters.length === 0) {
        return {
          success: false,
          error: 'Failed to initialize counter for prefix ' + upperPrefix,
        };
      }
    }

    const counter = counters[0];
    const currentVal = counter.last_issued_number || 0;
    const nextVal = currentVal + 1;

    if (nextVal > MAX_SEQUENCE) {
      return {
        success: false,
        error: 'Sequence exhausted for prefix ' + upperPrefix + ' (max ' + MAX_SEQUENCE + ')',
      };
    }

    // ── Compare-and-set: only update if last_issued_number is still currentVal ──
    try {
      await sr.entities.RaceCoreIdCounter.updateMany(
        { prefix: upperPrefix, last_issued_number: currentVal },
        { $set: { last_issued_number: nextVal } }
      );
    } catch (e) {
      continue; // retry
    }

    // ── Re-read to verify ────────────────────────────────────────────────
    const recheck = await sr.entities.RaceCoreIdCounter
      .filter({ prefix: upperPrefix })
      .catch(() => []);
    if (!recheck || recheck.length === 0) {
      continue; // counter disappeared — retry
    }

    const confirmedVal = recheck[0].last_issued_number;

    if (confirmedVal !== nextVal) {
      // Someone else changed the counter before our update landed — retry
      continue;
    }

    // ── Duplicate check: verify no record in the target entity has this ID ──
    const racecoreId = formatId(upperPrefix, nextVal);
    const entityName = PREFIX_TO_ENTITY[upperPrefix];

    let existing = [];
    try {
      existing = await sr.entities[entityName].filter({ racecore_id: racecoreId });
    } catch (e) {
      // Entity might not have any records yet — treat as no duplicates
      existing = [];
    }

    if (existing && existing.length > 0) {
      // ID already assigned to a record — another call got here first
      continue; // retry with next sequence
    }

    return {
      success: true,
      prefix: upperPrefix,
      sequence_number: nextVal,
      racecore_id: racecoreId,
    };
  }

  return {
    success: false,
    error: 'Failed to generate RaceCore ID for prefix ' + upperPrefix + ' after ' + MAX_RETRIES + ' retries',
  };
}

/**
 * Ensure an existing record has a racecore_id. If it already has one, return it.
 * If not, generate a new one and assign it. Idempotent.
 * Returns { success, entity_type, entity_id, racecore_id, generated } or { success: false, error }.
 */
export async function ensureRaceCoreId(base44, entityType, entityId) {
  if (!entityType || typeof entityType !== 'string') {
    return { success: false, error: 'entity_type is required' };
  }
  if (!entityId || typeof entityId !== 'string') {
    return { success: false, error: 'entity_id is required' };
  }

  if (!ENTITY_TO_PREFIX.hasOwnProperty(entityType)) {
    return {
      success: false,
      error: 'Unsupported entity type: ' + entityType + '. Phase 2 supports: PersonIdentity, RacerProfile, SeasonParticipation',
    };
  }

  const prefix = ENTITY_TO_PREFIX[entityType];
  const sr = base44.asServiceRole;

  // ── Load the record ───────────────────────────────────────────────────
  let record = null;
  try {
    record = await sr.entities[entityType].get(entityId);
  } catch (e) {
    return {
      success: false,
      error: 'Record not found: ' + entityType + ' with id ' + entityId,
    };
  }

  if (!record) {
    return {
      success: false,
      error: 'Record not found: ' + entityType + ' with id ' + entityId,
    };
  }

  // ── If already has racecore_id, return it (idempotent) ─────────────────
  if (record.racecore_id) {
    return {
      success: true,
      entity_type: entityType,
      entity_id: entityId,
      racecore_id: record.racecore_id,
      generated: false,
    };
  }

  // ── Generate new ID ───────────────────────────────────────────────────
  const genResult = await generateRaceCoreId(base44, prefix);
  if (!genResult.success) {
    return { success: false, error: genResult.error };
  }

  // ── Update only the racecore_id field ──────────────────────────────────
  try {
    await sr.entities[entityType].update(entityId, {
      racecore_id: genResult.racecore_id,
    });
  } catch (e) {
    return {
      success: false,
      error: 'Failed to assign racecore_id to ' + entityType + ' ' + entityId + ': ' + e.message,
    };
  }

  // ── Re-read to confirm ────────────────────────────────────────────────
  let updated = null;
  try {
    updated = await sr.entities[entityType].get(entityId);
  } catch (e) {
    // Update succeeded but re-read failed — return the generated ID
  }

  return {
    success: true,
    entity_type: entityType,
    entity_id: entityId,
    racecore_id: (updated && updated.racecore_id) ? updated.racecore_id : genResult.racecore_id,
    generated: true,
  };
}