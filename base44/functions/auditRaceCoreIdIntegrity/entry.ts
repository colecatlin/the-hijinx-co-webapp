/**
 * auditRaceCoreIdIntegrity — HTTP handler.
 *
 * Read-only audit of RaceCore ID integrity across all eight supported entity
 * families (PERS, RACR, PART, DRVR, ENTR, RSLT, STND, TRCK), including the
 * issuance registry, counters, and family health states.
 *
 * Reports per family:
 *   - Total records / records with IDs / records missing IDs
 *   - Malformed IDs, wrong-family IDs, duplicate IDs
 *   - Archived entities with IDs
 *   - Counter state (value, duplicate counters, drift)
 *   - Highest observed valid sequence
 *   - Registry entries vs source entity consistency
 *   - Family health state
 *   - Burned/gap sequences
 *   - Affected Base44 record IDs for diagnosis
 *
 * Also reports cross-family:
 *   - Registry entries without entities (orphaned)
 *   - Entities with IDs absent from registry
 *   - Registry ownership conflicts
 *   - Retired IDs attached to live entities
 *   - Active registry entries pointing to missing entities
 *
 * Does NOT repair any record.
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  RACECORE_FAMILIES, ALL_PREFIXES, parseRaceCoreId, formatId,
  getEntityTypeForPrefix, getPrefixForEntityType,
  loadIssuancesByPrefix, getAllFamilyStates,
} from '../../shared/racecoreRegistry.ts';

const ENTITY_FAMILIES = RACECORE_FAMILIES.map(f => f.entityType);
const ENTITY_PREFIX_MAP: Record<string, string> = {};
const PREFIX_ENTITY_MAP: Record<string, string> = {};
for (const fam of RACECORE_FAMILIES) {
  ENTITY_PREFIX_MAP[fam.entityType] = fam.prefix;
  PREFIX_ENTITY_MAP[fam.prefix] = fam.entityType;
}

function isNumeric(str: string): boolean {
  return /^\d+$/.test(str);
}

async function loadAll(sr: any, entityName: string): Promise<{ records: any[]; error: string | null; partial: boolean }> {
  let all: any[] = [];
  let page = await sr.entities[entityName].list('-created_date', 500).catch((e: Error) => ({ items: [] as any[], has_more: false, error: e.message }));
  const items = Array.isArray(page) ? page : (page.items || []);
  all = all.concat(items);
  let hadError = false;
  while (page && page.has_more && page.next_cursor) {
    page = await sr.entities[entityName].list('-created_date', 500, page.next_cursor).catch(() => ({ items: [] as any[], has_more: false }));
    all = all.concat(page.items || []);
    if (all.length > 50000) { hadError = true; break; }
  }
  return { records: all, error: hadError ? 'truncated at 50000' : null, partial: hadError };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

    const sr = base44.asServiceRole;

    // ── Load all entity records, counters, registry, family states ────
    const loadResults: Record<string, any[]> = {};
    const loadErrors: Record<string, string> = {};
    let anyPartial = false;

    for (const entityName of ENTITY_FAMILIES) {
      const result = await loadAll(sr, entityName);
      loadResults[entityName] = result.records;
      if (result.error) { loadErrors[entityName] = result.error; anyPartial = true; }
      if (result.partial) anyPartial = true;
    }

    const counterResult = await loadAll(sr, 'RaceCoreIdCounter');
    const counters = counterResult.records;
    if (counterResult.error) { loadErrors.RaceCoreIdCounter = counterResult.error; anyPartial = true; }

    // Load registry and family states per prefix
    const registryByPrefix: Record<string, any[]> = {};
    for (const prefix of ALL_PREFIXES) {
      registryByPrefix[prefix] = await loadIssuancesByPrefix(sr, prefix).catch(() => []);
    }

    const familyStates = await getAllFamilyStates(sr).catch(() => ({}));

    // ── Build counter map ─────────────────────────────────────────────
    const counterMap: Record<string, any> = {};
    for (const prefix of ALL_PREFIXES) {
      counterMap[prefix] = { last_issued_number: 0, counter_record_id: null, found: false, duplicate: false, count: 0 };
    }
    for (const c of counters) {
      const prefix = c.prefix;
      if (ALL_PREFIXES.includes(prefix)) {
        if (!counterMap[prefix].found) {
          counterMap[prefix] = {
            last_issued_number: c.last_issued_number || 0,
            counter_record_id: c.id,
            found: true,
            duplicate: false,
            count: 1,
          };
        } else {
          counterMap[prefix].duplicate = true;
          counterMap[prefix].count++;
        }
      }
    }

    // ── Analyze each entity family ─────────────────────────────────────
    const entityReports: Record<string, any> = {};
    const allAssignedIds: Record<string, Record<number, { entity: string; record_id: string }[]>> = {};
    for (const prefix of ALL_PREFIXES) {
      allAssignedIds[prefix] = {};
    }

    for (const entityName of ENTITY_FAMILIES) {
      const records = loadResults[entityName] || [];
      const expectedPrefix = ENTITY_PREFIX_MAP[entityName];

      let total_records = records.length;
      let records_with_id = 0;
      let records_without_id = 0;
      let ids_invalid_prefix: any[] = [];
      let ids_invalid_length: any[] = [];
      let ids_nonnumeric_suffix: any[] = [];
      let ids_wrong_entity_family: any[] = [];
      let valid_ids: any[] = [];
      let archived_with_id: any[] = [];

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

        if (!ALL_PREFIXES.includes(parsed.prefix)) {
          ids_invalid_prefix.push({ record_id: record.id, racecore_id: rcId, reason: 'invalid_prefix:' + parsed.prefix });
          continue;
        }

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

        if (parsed.suffix.length !== 9) {
          ids_invalid_length.push({ record_id: record.id, racecore_id: rcId, suffix_length: parsed.suffix.length });
          continue;
        }

        if (!isNumeric(parsed.suffix)) {
          ids_nonnumeric_suffix.push({ record_id: record.id, racecore_id: rcId, suffix: parsed.suffix });
          continue;
        }

        const seqNum = parsed.sequence;
        valid_ids.push({ record_id: record.id, racecore_id: rcId, sequence: seqNum });

        if (record.is_archived === true) {
          archived_with_id.push({ record_id: record.id, racecore_id: rcId, sequence: seqNum });
        }

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
        archived_with_id,
      };
    }

    // ── Detect duplicate RaceCore IDs ─────────────────────────────────
    const duplicate_ids: any[] = [];
    for (const prefix of ALL_PREFIXES) {
      const seqMap = allAssignedIds[prefix];
      for (const seqNumStr of Object.keys(seqMap)) {
        const assignments = seqMap[seqNumStr];
        if (assignments.length > 1) {
          duplicate_ids.push({
            racecore_id: formatId(prefix, parseInt(seqNumStr, 10)),
            count: assignments.length,
            records: assignments.map((a: any) => ({ entity: a.entity, record_id: a.record_id })),
          });
        }
      }
    }

    // ── Highest assigned sequence per prefix ──────────────────────────
    const highest_assigned_sequence: Record<string, number> = {};
    for (const prefix of ALL_PREFIXES) {
      let highest = 0;
      const seqMap = allAssignedIds[prefix];
      for (const seqNumStr of Object.keys(seqMap)) {
        const n = parseInt(seqNumStr, 10);
        if (n > highest) highest = n;
      }
      highest_assigned_sequence[prefix] = highest;
    }

    // ── Counter analysis ──────────────────────────────────────────────
    const counter_values: Record<string, any> = {};
    const counter_lower_than_assigned: any[] = [];
    const counter_higher_than_assigned: any[] = [];
    const duplicate_counters: any[] = [];
    const burned_sequences: Record<string, any> = {};

    for (const prefix of ALL_PREFIXES) {
      const cm = counterMap[prefix];
      const counterVal = cm.last_issued_number;
      const highestAssigned = highest_assigned_sequence[prefix] || 0;

      counter_values[prefix] = {
        counter_value: counterVal,
        counter_record_id: cm.counter_record_id,
        counter_exists: cm.found,
        duplicate: cm.duplicate,
        duplicate_count: cm.count,
        highest_assigned_sequence: highestAssigned,
        family_status: familyStates[prefix]?.status || 'MIGRATION_PENDING',
      };

      if (cm.duplicate) {
        duplicate_counters.push({ prefix, count: cm.count });
      }
      if (cm.found && counterVal < highestAssigned) {
        counter_lower_than_assigned.push({ prefix, counter_value: counterVal, highest_assigned: highestAssigned });
      }
      if (cm.found && counterVal > highestAssigned) {
        counter_higher_than_assigned.push({ prefix, counter_value: counterVal, highest_assigned: highestAssigned, excess: counterVal - highestAssigned });
      }

      const burned: number[] = [];
      const seqMap = allAssignedIds[prefix];
      for (let s = 1; s <= counterVal; s++) {
        if (!seqMap[s]) burned.push(s);
      }
      burned_sequences[prefix] = { count: burned.length, sequences: burned };
    }

    // ── Registry consistency analysis ─────────────────────────────────
    const registry_entries_without_entities: any[] = [];
    const entities_with_ids_absent_from_registry: any[] = [];
    const registry_ownership_conflicts: any[] = [];
    const retired_ids_attached_to_active_entities: any[] = [];
    const active_registry_entries_pointing_to_missing_entities: any[] = [];
    const archived_entities_with_active_issuance: any[] = [];
    const hard_deleted_source_identities_retained: any[] = [];

    for (const prefix of ALL_PREFIXES) {
      const entityType = PREFIX_ENTITY_MAP[prefix];
      const regRecords = registryByPrefix[prefix] || [];
      const validSourceIds = new Map<string, any>();
      for (const v of (entityReports[entityType]?.valid_ids || [])) {
        validSourceIds.set(v.racecore_id, v);
      }

      // Build a set of source record IDs that still exist
      const sourceRecordIds = new Set((loadResults[entityType] || []).map((r: any) => r.id));

      for (const reg of regRecords) {
        // Check if source still exists
        const sourceExists = sourceRecordIds.has(reg.source_record_id);

        if (!sourceExists && !reg.is_source_deleted) {
          // Source gone but not flagged as deleted
          registry_entries_without_entities.push({
            racecore_id: reg.racecore_id,
            prefix,
            entity_type: entityType,
            registry_source_id: reg.source_record_id,
            issuance_status: reg.issuance_status,
          });
        }

        if (reg.is_source_deleted) {
          hard_deleted_source_identities_retained.push({
            racecore_id: reg.racecore_id,
            prefix,
            entity_type: entityType,
            source_record_id: reg.source_record_id,
          });
        }

        // Check if a live entity claims this ID but registry says different source
        const sourceInfo = validSourceIds.get(reg.racecore_id);
        if (sourceInfo && sourceInfo.record_id !== reg.source_record_id) {
          registry_ownership_conflicts.push({
            racecore_id: reg.racecore_id,
            prefix,
            entity_type: entityType,
            registry_says: reg.source_record_id,
            entity_has: sourceInfo.record_id,
          });
        }

        // Check retired IDs attached to active entities
        if (reg.issuance_status === 'RETIRED' && sourceInfo) {
          const sourceRecord = (loadResults[entityType] || []).find((r: any) => r.id === reg.source_record_id);
          if (sourceRecord && !sourceRecord.is_archived) {
            retired_ids_attached_to_active_entities.push({
              racecore_id: reg.racecore_id,
              prefix,
              entity_type: entityType,
              record_id: reg.source_record_id,
            });
          }
        }

        // Check active registry entries pointing to missing entities
        if (reg.issuance_status === 'ACTIVE' && !sourceExists && !reg.is_source_deleted) {
          active_registry_entries_pointing_to_missing_entities.push({
            racecore_id: reg.racecore_id,
            prefix,
            entity_type: entityType,
            source_record_id: reg.source_record_id,
          });
        }

        // Check archived entities with active issuance
        if (reg.issuance_status === 'ACTIVE' && sourceExists) {
          const sourceRecord = (loadResults[entityType] || []).find((r: any) => r.id === reg.source_record_id);
          if (sourceRecord && sourceRecord.is_archived) {
            archived_entities_with_active_issuance.push({
              racecore_id: reg.racecore_id,
              prefix,
              entity_type: entityType,
              record_id: reg.source_record_id,
            });
          }
        }
      }

      // Entities with IDs absent from registry
      const regIds = new Set(regRecords.map((r: any) => r.racecore_id));
      for (const v of (entityReports[entityType]?.valid_ids || [])) {
        if (!regIds.has(v.racecore_id)) {
          entities_with_ids_absent_from_registry.push({
            racecore_id: v.racecore_id,
            prefix,
            entity_type: entityType,
            record_id: v.record_id,
          });
        }
      }
    }

    // ── Collect all invalid record IDs ─────────────────────────────────
    const all_invalid_records: any[] = [];
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

    // ── Build final report ─────────────────────────────────────────────
    const records_inspected: Record<string, number> = { RaceCoreIdCounter: counters.length };
    for (const entityName of ENTITY_FAMILIES) {
      records_inspected[entityName] = (loadResults[entityName] || []).length;
    }
    for (const prefix of ALL_PREFIXES) {
      records_inspected['Registry_' + prefix] = (registryByPrefix[prefix] || []).length;
    }

    const report = {
      read_only: true,
      records_repaired: 0,
      partial: anyPartial,
      load_errors: Object.keys(loadErrors).length > 0 ? loadErrors : null,
      records_inspected,

      entity_families: {} as Record<string, any>,

      duplicate_ids,
      duplicate_count: duplicate_ids.length,

      highest_assigned_sequence,
      counter_values,
      counter_lower_than_assigned,
      counter_higher_than_assigned,
      duplicate_counters,
      burned_sequences,

      // Registry consistency
      registry_entries_without_entities,
      registry_entities_absent_count: entities_with_ids_absent_from_registry.length,
      entities_with_ids_absent_from_registry,
      registry_ownership_conflicts,
      retired_ids_attached_to_active_entities,
      active_registry_entries_pointing_to_missing_entities,
      archived_entities_with_active_issuance,
      hard_deleted_source_identities_retained,

      // Family health states
      family_health_states: familyStates,

      all_invalid_records,
      total_invalid_records: all_invalid_records.length,
    };

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
        archived_with_id_count: r.archived_with_id.length,
        ids_invalid_prefix: r.ids_invalid_prefix,
        ids_invalid_length: r.ids_invalid_length,
        ids_nonnumeric_suffix: r.ids_nonnumeric_suffix,
        ids_wrong_entity_family: r.ids_wrong_entity_family,
        archived_with_id: r.archived_with_id,
      };
    }

    return Response.json(report);
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}