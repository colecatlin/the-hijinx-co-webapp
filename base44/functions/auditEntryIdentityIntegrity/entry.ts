/**
 * auditEntryIdentityIntegrity — Read-only Entry identity audit (Phase 4).
 *
 * Reports Entry identity health across the approved architecture:
 *   PersonIdentity → RacerProfile → SeasonParticipation → Entry
 *
 * Reports:
 *   - Total Entry records
 *   - Entries with/without racecore_id
 *   - Entries with/without participation_id
 *   - Entries with/without driver_id
 *   - Entries with valid/missing SeasonParticipation record
 *   - Entries with valid/missing Driver record
 *   - Entries where Driver conflicts with Participation legacy links
 *   - Entries whose Participation Series conflicts with Event Series
 *   - Entries whose Participation season conflicts with Event season
 *   - Entries with missing Event
 *   - Entries with missing EventClass where required
 *   - Entries with EventClass belonging to another Event
 *   - Logical duplicate Entry groups
 *   - Duplicate ENTR RaceCore IDs
 *   - Invalid ENTR formats
 *   - Archived Entries
 *   - Internal IDs for every invalid or conflicting Entry
 *   - Whether counts are complete or partial
 *
 * Does NOT repair any record. Read-only.
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const ENTR_PREFIX = 'ENTR';

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

function parseEntrId(id) {
  if (!id || typeof id !== 'string') return null;
  if (id.length < 4) return null;
  const prefix = id.substring(0, 4);
  const suffix = id.substring(4);
  return { prefix, suffix, full: id };
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

    // ── Load all required entities ───────────────────────────────────────
    const [
      entriesResult, participationsResult, driversResult,
      eventsResult, eventClassesResult, racerProfilesResult, personIdentitiesResult,
    ] = await Promise.all([
      loadAll(sr, 'Entry'),
      loadAll(sr, 'SeasonParticipation'),
      loadAll(sr, 'Driver'),
      loadAll(sr, 'Event'),
      loadAll(sr, 'EventClass'),
      loadAll(sr, 'RacerProfile'),
      loadAll(sr, 'PersonIdentity'),
    ]);

    const loadErrors = {};
    let anyPartial = false;

    for (const [name, res] of Object.entries({
      Entry: entriesResult, SeasonParticipation: participationsResult, Driver: driversResult,
      Event: eventsResult, EventClass: eventClassesResult, RacerProfile: racerProfilesResult,
      PersonIdentity: personIdentitiesResult,
    })) {
      if (res.error) { loadErrors[name] = res.error; anyPartial = true; }
      if (res.partial) anyPartial = true;
    }

    const entries = entriesResult.records || [];
    const participations = participationsResult.records || [];
    const drivers = driversResult.records || [];
    const events = eventsResult.records || [];
    const eventClasses = eventClassesResult.records || [];
    const racerProfiles = racerProfilesResult.records || [];
    const personIdentities = personIdentitiesResult.records || [];

    // ── Build lookup maps ────────────────────────────────────────────────
    const participationMap = new Map();
    for (const p of participations) participationMap.set(p.id, p);

    const driverMap = new Map();
    for (const d of drivers) driverMap.set(d.id, d);

    const eventMap = new Map();
    for (const e of events) eventMap.set(e.id, e);

    const eventClassMap = new Map();
    for (const ec of eventClasses) eventClassMap.set(ec.id, ec);

    const racerProfileMap = new Map();
    for (const rp of racerProfiles) racerProfileMap.set(rp.id, rp);

    const personIdentityMap = new Map();
    for (const pi of personIdentities) personIdentityMap.set(pi.id, pi);

    // ── Counters ─────────────────────────────────────────────────────────
    let total_entries = entries.length;
    let entries_with_racecore_id = 0;
    let entries_without_racecore_id = 0;
    let entries_with_participation_id = 0;
    let entries_without_participation_id = 0;
    let entries_with_driver_id = 0;
    let entries_without_driver_id = 0;
    let entries_with_valid_participation = 0;
    let entries_with_missing_participation = 0;
    let entries_with_valid_driver = 0;
    let entries_with_missing_driver = 0;
    let entries_driver_participation_conflict = 0;
    let entries_participation_series_conflict = 0;
    let entries_participation_season_conflict = 0;
    let entries_with_missing_event = 0;
    let entries_with_missing_event_class = 0;
    let entries_event_class_other_event = 0;
    let archived_entries = 0;

    const driver_participation_conflict_ids = [];
    const participation_series_conflict_ids = [];
    const participation_season_conflict_ids = [];
    const missing_event_ids = [];
    const missing_event_class_ids = [];
    const event_class_other_event_ids = [];
    const missing_participation_ids = [];
    const missing_driver_ids = [];

    // ── ENTR ID validation ───────────────────────────────────────────────
    const invalid_entr_format = [];
    const duplicate_entr_ids = [];
    const entrIdMap = new Map(); // racecore_id → [entryIds]

    // ── Logical duplicate groups ─────────────────────────────────────────
    const logicalKeyMap = new Map(); // key → [entryIds]

    // ── Analyze each Entry ───────────────────────────────────────────────
    for (const entry of entries) {
      // Archived check
      if (entry.is_archived) archived_entries++;

      // RaceCore ID checks
      if (entry.racecore_id) {
        entries_with_racecore_id++;
        const parsed = parseEntrId(entry.racecore_id);
        if (!parsed || parsed.prefix !== ENTR_PREFIX || parsed.suffix.length !== 9 || !isNumeric(parsed.suffix)) {
          invalid_entr_format.push({ entry_id: entry.id, racecore_id: entry.racecore_id });
        } else {
          if (!entrIdMap.has(entry.racecore_id)) entrIdMap.set(entry.racecore_id, []);
          entrIdMap.get(entry.racecore_id).push(entry.id);
        }
      } else {
        entries_without_racecore_id++;
      }

      // Participation checks
      if (entry.participation_id) {
        entries_with_participation_id++;
        const participation = participationMap.get(entry.participation_id);
        if (participation) {
          entries_with_valid_participation++;

          // Check Driver/Participation legacy conflict
          if (entry.driver_id && participation.legacy_driver_id && entry.driver_id !== participation.legacy_driver_id) {
            entries_driver_participation_conflict++;
            driver_participation_conflict_ids.push({
              entry_id: entry.id,
              entry_driver_id: entry.driver_id,
              participation_legacy_driver_id: participation.legacy_driver_id,
            });
          }

          // Check Participation Series vs Event Series
          const event = eventMap.get(entry.event_id);
          if (event && participation.series_id && event.series_id && participation.series_id !== event.series_id) {
            entries_participation_series_conflict++;
            participation_series_conflict_ids.push({
              entry_id: entry.id,
              participation_id: entry.participation_id,
              participation_series_id: participation.series_id,
              event_series_id: event.series_id,
            });
          }

          // Check Participation season vs Event season
          if (event && event.season && participation.season_year) {
            const eventSeason = String(event.season).match(/\d{4}/);
            if (eventSeason && String(participation.season_year) !== eventSeason[0]) {
              entries_participation_season_conflict++;
              participation_season_conflict_ids.push({
                entry_id: entry.id,
                participation_id: entry.participation_id,
                participation_season: participation.season_year,
                event_season: eventSeason[0],
              });
            }
          }
        } else {
          entries_with_missing_participation++;
          missing_participation_ids.push({ entry_id: entry.id, participation_id: entry.participation_id });
        }
      } else {
        entries_without_participation_id++;
      }

      // Driver checks
      if (entry.driver_id) {
        entries_with_driver_id++;
        const driver = driverMap.get(entry.driver_id);
        if (driver) {
          entries_with_valid_driver++;
        } else {
          entries_with_missing_driver++;
          missing_driver_ids.push({ entry_id: entry.id, driver_id: entry.driver_id });
        }
      } else {
        entries_without_driver_id++;
      }

      // Event checks
      const event = eventMap.get(entry.event_id);
      if (!event) {
        entries_with_missing_event++;
        missing_event_ids.push({ entry_id: entry.id, event_id: entry.event_id });
      }

      // EventClass checks
      if (entry.event_class_id) {
        const eventClass = eventClassMap.get(entry.event_class_id);
        if (!eventClass) {
          entries_with_missing_event_class++;
          missing_event_class_ids.push({ entry_id: entry.id, event_class_id: entry.event_class_id });
        } else if (event && eventClass.event_id !== event.id) {
          entries_event_class_other_event++;
          event_class_other_event_ids.push({
            entry_id: entry.id,
            event_class_id: entry.event_class_id,
            event_class_event_id: eventClass.event_id,
            entry_event_id: event.id,
          });
        }
      }

      // Logical duplicate key: event_id + participation_id + event_class_id
      if (entry.event_id && entry.participation_id) {
        const key = entry.event_id + '|' + entry.participation_id + '|' + (entry.event_class_id || 'none');
        if (!logicalKeyMap.has(key)) logicalKeyMap.set(key, []);
        logicalKeyMap.get(key).push(entry.id);
      }
    }

    // ── Detect duplicate ENTR IDs ────────────────────────────────────────
    for (const [racecoreId, entryIds] of entrIdMap.entries()) {
      if (entryIds.length > 1) {
        duplicate_entr_ids.push({ racecore_id: racecoreId, count: entryIds.length, entry_ids: entryIds });
      }
    }

    // ── Detect logical duplicate groups ───────────────────────────────────
    const logical_duplicate_groups = [];
    for (const [key, entryIds] of logicalKeyMap.entries()) {
      if (entryIds.length > 1) {
        const [eventId, participationId, classId] = key.split('|');
        logical_duplicate_groups.push({
          logical_key: key,
          event_id: eventId,
          participation_id: participationId,
          event_class_id: classId === 'none' ? null : classId,
          count: entryIds.length,
          entry_ids: entryIds,
        });
      }
    }

    // ── Build final report ───────────────────────────────────────────────
    const report = {
      read_only: true,
      records_repaired: 0,
      partial: anyPartial,
      load_errors: Object.keys(loadErrors).length > 0 ? loadErrors : null,

      records_inspected: {
        Entry: entriesResult.inspected,
        SeasonParticipation: participationsResult.inspected,
        Driver: driversResult.inspected,
        Event: eventsResult.inspected,
        EventClass: eventClassesResult.inspected,
        RacerProfile: racerProfilesResult.inspected,
        PersonIdentity: personIdentitiesResult.inspected,
      },

      summary: {
        total_entries,
        entries_with_racecore_id,
        entries_without_racecore_id,
        entries_with_participation_id,
        entries_without_participation_id,
        entries_with_driver_id,
        entries_without_driver_id,
        entries_with_valid_participation,
        entries_with_missing_participation,
        entries_with_valid_driver,
        entries_with_missing_driver,
        entries_driver_participation_conflict,
        entries_participation_series_conflict,
        entries_participation_season_conflict,
        entries_with_missing_event,
        entries_with_missing_event_class,
        entries_event_class_other_event,
        archived_entries,
      },

      entr_id_integrity: {
        invalid_entr_format,
        invalid_entr_format_count: invalid_entr_format.length,
        duplicate_entr_ids,
        duplicate_entr_count: duplicate_entr_ids.length,
      },

      logical_duplicate_groups,
      logical_duplicate_group_count: logical_duplicate_groups.length,

      conflict_details: {
        driver_participation_conflict_ids,
        participation_series_conflict_ids,
        participation_season_conflict_ids,
        missing_event_ids,
        missing_event_class_ids,
        event_class_other_event_ids,
        missing_participation_ids,
        missing_driver_ids,
      },

      counts_complete: !anyPartial,
    };

    return Response.json(report);

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}