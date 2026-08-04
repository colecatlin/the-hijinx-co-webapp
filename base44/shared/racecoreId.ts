/**
 * racecoreId.ts — Shared RaceCore ID generation and assignment logic.
 *
 * Used by:
 *   - base44/functions/generateRaceCoreId/entry.ts  (HTTP handler — restricted)
 *   - base44/functions/ensureRaceCoreId/entry.ts   (HTTP handler)
 *   - base44/functions/resolveRacerProfile/entry.ts (direct import)
 *   - base44/functions/resolveSeasonParticipation/entry.ts (direct import)
 *   - base44/functions/auditRaceCoreIdIntegrity/entry.ts (direct import)
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
 *   in ensureRaceCoreId (post-assignment) catches this after the
 *   fact and returns a hard error. True elimination requires
 *   platform-level atomic increment with return value, which
 *   Base44 does not currently support.
 */

const SUPPORTED_PREFIXES = ['PERS', 'RACR', 'PART', 'DRVR'];

const PREFIX_TO_ENTITY = {
  PERS: 'PersonIdentity',
  RACR: 'RacerProfile',
  PART: 'SeasonParticipation',
  DRVR: 'Driver',
};

const ENTITY_TO_PREFIX = {
  PersonIdentity: 'PERS',
  RacerProfile: 'RACR',
  SeasonParticipation: 'PART',
  Driver: 'DRVR',
};

const MAX_SEQUENCE = 999999999;
const MAX_RETRIES = 5;

function formatId(prefix, num) {
  return prefix + String(num).padStart(9, '0');
}

/**
 * Generate a unique RaceCore ID for the given prefix.
 * Returns { success, prefix, sequence_number, racecore_id } or { success: false, error }.
 *
 * This is an INTERNAL helper. Normal application code must use ensureRaceCoreId
 * to assign IDs to specific records. The standalone HTTP handler is restricted.
 */
export async function generateRaceCoreId(base44, prefix) {
  if (!prefix || typeof prefix !== 'string') {
    return { success: false, error: 'prefix is required' };
  }

  const upperPrefix = prefix.toUpperCase();

  if (!SUPPORTED_PREFIXES.includes(upperPrefix)) {
    return {
      success: false,
      error: 'Unsupported prefix: ' + prefix + '. Phase 3 supports: PERS, RACR, PART, DRVR',
    };
  }

  const sr = base44.asServiceRole;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // ── Load or initialize counter ──────────────────────────────────────
    let counters = await sr.entities.RaceCoreIdCounter
      .filter({ prefix: upperPrefix })
      .catch(function() { return []; });

    if (!counters || counters.length === 0) {
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
        .catch(function() { return []; });
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
      continue;
    }

    // ── Re-read to verify ────────────────────────────────────────────────
    const recheck = await sr.entities.RaceCoreIdCounter
      .filter({ prefix: upperPrefix })
      .catch(function() { return []; });
    if (!recheck || recheck.length === 0) {
      continue;
    }

    const confirmedVal = recheck[0].last_issued_number;

    if (confirmedVal !== nextVal) {
      continue;
    }

    // ── Duplicate check: verify no record in the target entity has this ID ──
    const racecoreId = formatId(upperPrefix, nextVal);
    const entityName = PREFIX_TO_ENTITY[upperPrefix];

    let existing = [];
    try {
      existing = await sr.entities[entityName].filter({ racecore_id: racecoreId });
    } catch (e) {
      existing = [];
    }

    if (existing && existing.length > 0) {
      continue;
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

// ── Helper: load a single record by ID ──────────────────────────────────────

async function loadRecord(sr, entityType, entityId) {
  try {
    return await sr.entities[entityType].get(entityId);
  } catch (e) {
    return null;
  }
}

// ── Helper: check uniqueness of a racecore_id across the entity family ──────

async function checkUniqueness(sr, entityType, racecoreId, targetEntityId) {
  let records = [];
  try {
    records = await sr.entities[entityType].filter({ racecore_id: racecoreId });
  } catch (e) {
    records = [];
  }

  if (!records || records.length <= 1) {
    return { verified_unique: true, duplicate_detected: false, conflicting_entity_ids: [] };
  }

  // More than one record has this ID — duplicate detected
  // Return ALL IDs that share this racecore_id (including the target)
  var allIds = [];
  for (var i = 0; i < records.length; i++) {
    allIds.push(records[i].id);
  }

  return {
    verified_unique: false,
    duplicate_detected: true,
    conflicting_entity_ids: allIds,
  };
}

/**
 * Ensure an existing record has a racecore_id. If it already has one, return it.
 * If not, generate a new one, assign it, verify the assignment, and check
 * uniqueness across the entity family. Idempotent.
 *
 * This is the AUTHORITATIVE assignment operation. Normal application code
 * must use this function, not generateRaceCoreId directly.
 *
 * Returns:
 *   { success, entity_type, entity_id, racecore_id, generated, assigned,
 *     verified_unique, duplicate_detected, conflicting_entity_ids, attempts }
 *
 * CONCURRENCY LIMITATION:
 *   Base44 cannot mathematically guarantee sequence uniqueness under perfect
 *   simultaneous concurrency. Two concurrent ensureRaceCoreId calls for
 *   different records could both generate the same candidate ID, both assign
 *   it, and both pass the pre-assignment duplicate check. The post-assignment
 *   uniqueness check catches this and returns a hard error, but cannot
 *   prevent it. True elimination requires platform-level atomic increment
 *   with return value, which Base44 does not currently support.
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
      error: 'Unsupported entity type: ' + entityType + '. Phase 3 supports: PersonIdentity, RacerProfile, SeasonParticipation, Driver',
    };
  }

  const prefix = ENTITY_TO_PREFIX[entityType];
  const sr = base44.asServiceRole;

  // ── Load the record ───────────────────────────────────────────────────
  let record = await loadRecord(sr, entityType, entityId);
  if (!record) {
    return {
      success: false,
      error: 'Record not found: ' + entityType + ' with id ' + entityId,
      entity_type: entityType,
      entity_id: entityId,
      racecore_id: null,
      generated: false,
      assigned: false,
      verified_unique: false,
      duplicate_detected: false,
      conflicting_entity_ids: [],
      attempts: 0,
    };
  }

  // ── If already has racecore_id, return it without advancing the counter ──
  if (record.racecore_id) {
    const uniquenessCheck = await checkUniqueness(sr, entityType, record.racecore_id, entityId);
    return {
      success: true,
      entity_type: entityType,
      entity_id: entityId,
      racecore_id: record.racecore_id,
      generated: false,
      assigned: false,
      verified_unique: uniquenessCheck.verified_unique,
      duplicate_detected: uniquenessCheck.duplicate_detected,
      conflicting_entity_ids: uniquenessCheck.conflicting_entity_ids,
      attempts: 0,
    };
  }

  // ── If empty, loop to assign a new ID ──────────────────────────────────
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    // Re-read record to check if another call already set racecore_id
    let currentRecord = await loadRecord(sr, entityType, entityId);
    if (!currentRecord) {
      return {
        success: false,
        error: 'Record not found during assignment: ' + entityType + ' with id ' + entityId,
        entity_type: entityType,
        entity_id: entityId,
        racecore_id: null,
        generated: false,
        assigned: false,
        verified_unique: false,
        duplicate_detected: false,
        conflicting_entity_ids: [],
        attempts: attempt,
      };
    }

    // If another call already set racecore_id, return it (don't overwrite)
    if (currentRecord.racecore_id) {
      const uniquenessCheck = await checkUniqueness(sr, entityType, currentRecord.racecore_id, entityId);
      return {
        success: true,
        entity_type: entityType,
        entity_id: entityId,
        racecore_id: currentRecord.racecore_id,
        generated: false,
        assigned: false,
        verified_unique: uniquenessCheck.verified_unique,
        duplicate_detected: uniquenessCheck.duplicate_detected,
        conflicting_entity_ids: uniquenessCheck.conflicting_entity_ids,
        attempts: attempt,
      };
    }

    // ── Reserve a candidate sequence ────────────────────────────────────
    const genResult = await generateRaceCoreId(base44, prefix);
    if (!genResult.success) {
      return {
        success: false,
        error: genResult.error,
        entity_type: entityType,
        entity_id: entityId,
        racecore_id: null,
        generated: false,
        assigned: false,
        verified_unique: false,
        duplicate_detected: false,
        conflicting_entity_ids: [],
        attempts: attempt,
      };
    }

    // ── Assign the candidate directly to the target entity ──────────────
    try {
      await sr.entities[entityType].update(entityId, {
        racecore_id: genResult.racecore_id,
      });
    } catch (e) {
      continue; // retry with new sequence
    }

    // ── Re-read the target entity ───────────────────────────────────────
    let updatedRecord = await loadRecord(sr, entityType, entityId);
    if (!updatedRecord) {
      continue; // retry
    }

    // ── If target does not contain the assigned candidate, retry ────────
    if (updatedRecord.racecore_id !== genResult.racecore_id) {
      // Another call set a different ID, or update failed
      if (updatedRecord.racecore_id) {
        // Another call set a different ID — return it (don't overwrite)
        const uniquenessCheck = await checkUniqueness(sr, entityType, updatedRecord.racecore_id, entityId);
        return {
          success: true,
          entity_type: entityType,
          entity_id: entityId,
          racecore_id: updatedRecord.racecore_id,
          generated: false,
          assigned: false,
          verified_unique: uniquenessCheck.verified_unique,
          duplicate_detected: uniquenessCheck.duplicate_detected,
          conflicting_entity_ids: uniquenessCheck.conflicting_entity_ids,
          attempts: attempt,
        };
      }
      // Still empty — update failed silently, retry with new sequence
      continue;
    }

    // ── Query the complete target entity family for that racecore_id ────
    const uniquenessCheck = await checkUniqueness(sr, entityType, genResult.racecore_id, entityId);

    // ── If more than one record has the same ID, return a hard error ─────
    if (uniquenessCheck.duplicate_detected) {
      return {
        success: false,
        error: 'Duplicate RaceCore ID detected: ' + genResult.racecore_id + ' is assigned to multiple ' + entityType + ' records. Conflicting IDs: ' + uniquenessCheck.conflicting_entity_ids.join(', '),
        entity_type: entityType,
        entity_id: entityId,
        racecore_id: genResult.racecore_id,
        generated: true,
        assigned: true,
        verified_unique: false,
        duplicate_detected: true,
        conflicting_entity_ids: uniquenessCheck.conflicting_entity_ids,
        attempts: attempt,
      };
    }

    // ── Success: exactly one record has the ID ──────────────────────────
    return {
      success: true,
      entity_type: entityType,
      entity_id: entityId,
      racecore_id: genResult.racecore_id,
      generated: true,
      assigned: true,
      verified_unique: true,
      duplicate_detected: false,
      conflicting_entity_ids: [],
      attempts: attempt,
    };
  }

  // ── Failed after MAX_RETRIES ──────────────────────────────────────────
  return {
    success: false,
    error: 'Failed to assign RaceCore ID to ' + entityType + ' ' + entityId + ' after ' + MAX_RETRIES + ' attempts',
    entity_type: entityType,
    entity_id: entityId,
    racecore_id: null,
    generated: false,
    assigned: false,
    verified_unique: false,
    duplicate_detected: false,
    conflicting_entity_ids: [],
    attempts: MAX_RETRIES,
  };
}