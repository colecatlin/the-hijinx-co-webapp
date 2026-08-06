/**
 * auditRaceCoreIdIntegrity — HTTP handler.
 *
 * Read-only audit of RaceCore ID integrity across all Phase 2B entity families.
 *
 * Reports:
 *   - Total records per entity family
 *   - Records with RaceCore ID
 *   - Records without RaceCore ID
 *   - IDs with invalid prefix
 *   - IDs with invalid numeric length
 *   - IDs with nonnumeric suffixes
 *   - Duplicate RaceCore IDs
 *   - RaceCore IDs assigned to the wrong entity family
 *   - Highest assigned sequence per prefix
 *   - Current counter value per prefix
 *   - Counter values lower than assigned IDs
 *   - Counter values higher than assigned IDs
 *   - Burned or unassigned sequence count where it can be determined
 *   - Internal IDs for all invalid or duplicate records
 *
 * Does NOT repair any record.
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const ENTITY_PREFIX_MAP = {
  PersonIdentity: 'PERS',
  RacerProfile: 'RACR',
  SeasonParticipation: 'PART',
  Driver: 'DRVR',
  Entry: 'ENTR',
  Results: 'RSLT',
};

const PREFIX_ENTITY_MAP = {
  PERS: 'PersonIdentity',
  RACR: 'RacerProfile',
  PART: 'SeasonParticipation',
  DRVR: 'Driver',
  ENTR: 'Entry',
  RSLT: 'Results',
};

const ENTITY_FAMILIES = ['PersonIdentity', 'RacerProfile', 'SeasonParticipation', 'Driver', 'Entry', 'Results'];
const ALL_PREFIXES = ['PERS', 'RACR', 'PART', 'DRVR', 'ENTR', 'RSLT'];

async function loadAll(sr, entityName, sortField, batchSize) {
  const sort = sortField || '-created_date';
  const size = batchSize || 200;
  let all = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let batch;
    try {
      batch = await sr.entities[entityName].list(sort, size, offset);
    } catch (e) {
      return { records: all, error: e.message, partial: true, inspected: all.length };
    }
    if (!batch || batch.length === 0) {
      hasMore = false;
      break;
    }
    all = all.concat(batch);
    offset += batch.length;
    if (batch.length < size) {
      hasMore = false;
    }
  }

  return { records: all, error: null, partial: false, inspected: all.length };
}

function parseRaceCoreId(id) {
  if (!id || typeof id !== 'string') return null;
  if (id.length < 4) return null;
  const prefix = id.substring(0, 4);
  const suffix = id.substring(4);
  return { prefix: prefix, suffix: suffix, full: id };
}

function isNumeric(str) {
  return /^\d+$/.test(str);
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

    const sr = base44.asServiceRole;

    // ── Load all entity records and counters ─────────────────────────────
    const loadResults = {};
    const loadErrors = {};
    let anyPartial = false;

    for (const entityName of ENTITY_FAMILIES) {
      const result = await loadAll(sr, entityName);
      loadResults[entityName] = result.records || [];
      if (result.error) {
        loadErrors[entityName] = result.error;
        anyPartial = true;
      }
      if (result.partial) {
        anyPartial = true;
      }
    }

    const counterResult = await loadAll(sr, 'RaceCoreIdCounter');
    const counters = counterResult.records || [];
    if (counterResult.error) {
      loadErrors.RaceCoreIdCounter = counterResult.error;
      anyPartial = true;
    }

    // ── Build counter map ────────────────────────────────────────────────
    const counterMap = {};
    for (const prefix of ALL_PREFIXES) {
      counterMap[prefix] = { last_issued_number: 0, counter_record_id: null, found: false };
    }
    for (const c of counters) {
      const prefix = c.prefix;
      if (ALL_PREFIXES.includes(prefix)) {
        counterMap[prefix] = {
          last_issued_number: c.last_issued_number || 0,
          counter_record_id: c.id,
          found: true,
        };
      }
    }

    // ── Analyze each entity family ───────────────────────────────────────
    const entityReports = {};
    const allAssignedIds = {}; // prefix → Map(sequence → [entityType, recordId])
    for (const prefix of ALL_PREFIXES) {
      allAssignedIds[prefix] = {};
    }

    for (const entityName of ENTITY_FAMILIES) {
      const records = loadResults[entityName] || [];
      const expectedPrefix = ENTITY_PREFIX_MAP[entityName];

      let total_records = records.length;
      let records_with_id = 0;
      let records_without_id = 0;
      let ids_invalid_prefix = [];
      let ids_invalid_length = [];
      let ids_nonnumeric_suffix = [];
      let ids_wrong_entity_family = [];
      let valid_ids = [];

      for (const record of records) {
        const rcId = record.racecore_id;

        if (!rcId) {
          records_without_id++;
          continue;
        }

        records_with_id++;

        const parsed = parseRaceCoreId(rcId);
        if (!parsed) {
          ids_invalid_prefix.push({ record_id: record.id, racecore_id: rcId, reason: 'unparseable' });
          continue;
        }

        // Check prefix validity
        if (!ALL_PREFIXES.includes(parsed.prefix)) {
          ids_invalid_prefix.push({ record_id: record.id, racecore_id: rcId, reason: 'invalid_prefix:' + parsed.prefix });
          continue;
        }

        // Check wrong entity family
        if (parsed.prefix !== expectedPrefix) {
          ids_wrong_entity_family.push({
            record_id: record.id,
            racecore_id: rcId,
            expected_prefix: expectedPrefix,
            actual_prefix: parsed.prefix,
            wrong_entity: PREFIX_ENTITY_MAP[parsed.prefix] || 'unknown',
          });
          continue;
        }

        // Check numeric length (exactly 9 digits)
        if (parsed.suffix.length !== 9) {
          ids_invalid_length.push({ record_id: record.id, racecore_id: rcId, suffix_length: parsed.suffix.length });
          continue;
        }

        // Check numeric suffix
        if (!isNumeric(parsed.suffix)) {
          ids_nonnumeric_suffix.push({ record_id: record.id, racecore_id: rcId, suffix: parsed.suffix });
          continue;
        }

        // Valid ID — track for duplicate and sequence analysis
        const seqNum = parseInt(parsed.suffix, 10);
        valid_ids.push({
          record_id: record.id,
          racecore_id: rcId,
          sequence: seqNum,
        });

        // Track in allAssignedIds for duplicate detection
        if (!allAssignedIds[parsed.prefix][seqNum]) {
          allAssignedIds[parsed.prefix][seqNum] = [];
        }
        allAssignedIds[parsed.prefix][seqNum].push({ entity: entityName, record_id: record.id });
      }

      entityReports[entityName] = {
        total_records,
        records_with_id,
        records_without_id,
        ids_invalid_prefix,
        ids_invalid_length,
        ids_nonnumeric_suffix,
        ids_wrong_entity_family,
        valid_ids,
      };
    }

    // ── Detect duplicate RaceCore IDs ───────────────────────────────────
    const duplicate_ids = [];
    for (const prefix of ALL_PREFIXES) {
      const seqMap = allAssignedIds[prefix];
      for (const seqNum in seqMap) {
        const assignments = seqMap[seqNum];
        if (assignments.length > 1) {
          const racecoreId = prefix + String(parseInt(seqNum, 10)).padStart(9, '0');
          duplicate_ids.push({
            racecore_id: racecoreId,
            count: assignments.length,
            records: assignments.map(function(a) { return { entity: a.entity, record_id: a.record_id }; }),
          });
        }
      }
    }

    // ── Compute highest assigned sequence per prefix ────────────────────
    const highest_assigned_sequence = {};
    for (const prefix of ALL_PREFIXES) {
      let highest = 0;
      const seqMap = allAssignedIds[prefix];
      for (const seqNum in seqMap) {
        const n = parseInt(seqNum, 10);
        if (n > highest) highest = n;
      }
      highest_assigned_sequence[prefix] = highest;
    }

    // ── Compute counter analysis ────────────────────────────────────────
    const counter_values = {};
    const counter_lower_than_assigned = [];
    const counter_higher_than_assigned = [];
    const burned_sequences = {};

    for (const prefix of ALL_PREFIXES) {
      const counterVal = counterMap[prefix].last_issued_number;
      const highestAssigned = highest_assigned_sequence[prefix] || 0;

      counter_values[prefix] = {
        counter_value: counterVal,
        counter_record_id: counterMap[prefix].counter_record_id,
        counter_exists: counterMap[prefix].found,
        highest_assigned_sequence: highestAssigned,
      };

      if (counterVal < highestAssigned) {
        counter_lower_than_assigned.push({
          prefix: prefix,
          counter_value: counterVal,
          highest_assigned: highestAssigned,
        });
      }

      if (counterVal > highestAssigned) {
        counter_higher_than_assigned.push({
          prefix: prefix,
          counter_value: counterVal,
          highest_assigned: highestAssigned,
          excess: counterVal - highestAssigned,
        });
      }

      // Compute burned sequences: sequences 1..counterVal that are not assigned
      const burned = [];
      const seqMap = allAssignedIds[prefix];
      for (let s = 1; s <= counterVal; s++) {
        if (!seqMap[s]) {
          burned.push(s);
        }
      }
      burned_sequences[prefix] = {
        count: burned.length,
        sequences: burned,
      };
    }

    // ── Collect all invalid record IDs ───────────────────────────────────
    const all_invalid_records = [];
    for (const entityName of ENTITY_FAMILIES) {
      const report = entityReports[entityName];
      for (const item of report.ids_invalid_prefix) {
        all_invalid_records.push({ entity: entityName, record_id: item.record_id, racecore_id: item.racecore_id, issue: 'invalid_prefix' });
      }
      for (const item of report.ids_invalid_length) {
        all_invalid_records.push({ entity: entityName, record_id: item.record_id, racecore_id: item.racecore_id, issue: 'invalid_length' });
      }
      for (const item of report.ids_nonnumeric_suffix) {
        all_invalid_records.push({ entity: entityName, record_id: item.record_id, racecore_id: item.racecore_id, issue: 'nonnumeric_suffix' });
      }
      for (const item of report.ids_wrong_entity_family) {
        all_invalid_records.push({ entity: entityName, record_id: item.record_id, racecore_id: item.racecore_id, issue: 'wrong_entity_family' });
      }
    }

    for (const dup of duplicate_ids) {
      for (const r of dup.records) {
        all_invalid_records.push({ entity: r.entity, record_id: r.record_id, racecore_id: dup.racecore_id, issue: 'duplicate' });
      }
    }

    // ── Build final report ──────────────────────────────────────────────
    const report = {
      read_only: true,
      records_repaired: 0,
      partial: anyPartial,
      load_errors: Object.keys(loadErrors).length > 0 ? loadErrors : null,

      records_inspected: {
        PersonIdentity: (loadResults.PersonIdentity || []).length,
        RacerProfile: (loadResults.RacerProfile || []).length,
        SeasonParticipation: (loadResults.SeasonParticipation || []).length,
        Driver: (loadResults.Driver || []).length,
        Entry: (loadResults.Entry || []).length,
        Results: (loadResults.Results || []).length,
        RaceCoreIdCounter: counters.length,
      },

      entity_families: {},

      duplicate_ids: duplicate_ids,
      duplicate_count: duplicate_ids.length,

      highest_assigned_sequence: highest_assigned_sequence,
      counter_values: counter_values,
      counter_lower_than_assigned: counter_lower_than_assigned,
      counter_higher_than_assigned: counter_higher_than_assigned,
      burned_sequences: burned_sequences,

      all_invalid_records: all_invalid_records,
      total_invalid_records: all_invalid_records.length,
    };

    // Add per-entity details
    for (const entityName of ENTITY_FAMILIES) {
      const r = entityReports[entityName];
      report.entity_families[entityName] = {
        expected_prefix: ENTITY_PREFIX_MAP[entityName],
        total_records: r.total_records,
        records_with_id: r.records_with_id,
        records_without_id: r.records_without_id,
        invalid_prefix_count: r.ids_invalid_prefix.length,
        invalid_length_count: r.ids_invalid_length.length,
        nonnumeric_suffix_count: r.ids_nonnumeric_suffix.length,
        wrong_entity_family_count: r.ids_wrong_entity_family.length,
        valid_id_count: r.valid_ids.length,
        ids_invalid_prefix: r.ids_invalid_prefix,
        ids_invalid_length: r.ids_invalid_length,
        ids_nonnumeric_suffix: r.ids_nonnumeric_suffix,
        ids_wrong_entity_family: r.ids_wrong_entity_family,
      };
    }

    return Response.json(report);
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}