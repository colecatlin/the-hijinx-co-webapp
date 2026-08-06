/**
 * auditResultIdentityIntegrity — Read-only Result identity audit (Phase 5).
 *
 * Reports Result identity health across the approved architecture:
 *   PersonIdentity → RacerProfile → SeasonParticipation → Entry → Result
 *
 * Reports:
 *   - Total Result records
 *   - Results with/without racecore_id (RSLT)
 *   - Results with/without entry_id
 *   - Results with/without participation_id
 *   - Results with/without driver_id
 *   - Results with valid/missing Entry record
 *   - Results with valid/missing Participation record
 *   - Results with valid/missing Driver record
 *   - Results whose Entry belongs to a different Event
 *   - Results whose Participation season conflicts with Event season
 *   - Results whose Participation series conflicts with Event series
 *   - Results with missing Event
 *   - Results with missing Session (when session_id set)
 *   - Logical duplicate Result groups (event_id + session_id + entry_id)
 *   - Duplicate RSLT RaceCore IDs
 *   - Invalid RSLT formats
 *   - Archived Results
 *   - Internal IDs for every invalid or conflicting Result
 *   - Whether counts are complete or partial
 *
 * Does NOT repair any record. Read-only.
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const RSLT_PREFIX = 'RSLT';

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

function parseRsltId(id) {
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
      resultsResult, entriesResult, participationsResult, driversResult,
      eventsResult, sessionsResult, eventClassesResult,
    ] = await Promise.all([
      loadAll(sr, 'Results'),
      loadAll(sr, 'Entry'),
      loadAll(sr, 'SeasonParticipation'),
      loadAll(sr, 'Driver'),
      loadAll(sr, 'Event'),
      loadAll(sr, 'Session'),
      loadAll(sr, 'EventClass'),
    ]);

    const loadErrors = {};
    let anyPartial = false;

    for (const [name, res] of Object.entries({
      Results: resultsResult, Entry: entriesResult, SeasonParticipation: participationsResult,
      Driver: driversResult, Event: eventsResult, Session: sessionsResult,
      EventClass: eventClassesResult,
    })) {
      if (res.error) { loadErrors[name] = res.error; anyPartial = true; }
      if (res.partial) anyPartial = true;
    }

    const results = resultsResult.records || [];
    const entries = entriesResult.records || [];
    const participations = participationsResult.records || [];
    const drivers = driversResult.records || [];
    const events = eventsResult.records || [];
    const sessions = sessionsResult.records || [];

    // ── Build lookup maps ────────────────────────────────────────────────
    const entryMap = new Map();
    for (const e of entries) entryMap.set(e.id, e);

    const participationMap = new Map();
    for (const p of participations) participationMap.set(p.id, p);

    const driverMap = new Map();
    for (const d of drivers) driverMap.set(d.id, d);

    const eventMap = new Map();
    for (const ev of events) eventMap.set(ev.id, ev);

    const sessionMap = new Map();
    for (const s of sessions) sessionMap.set(s.id, s);

    // ── Counters ─────────────────────────────────────────────────────────
    let total_results = results.length;
    let results_with_racecore_id = 0;
    let results_without_racecore_id = 0;
    let results_with_entry_id = 0;
    let results_without_entry_id = 0;
    let results_with_participation_id = 0;
    let results_without_participation_id = 0;
    let results_with_driver_id = 0;
    let results_without_driver_id = 0;
    let results_with_valid_entry = 0;
    let results_with_missing_entry = 0;
    let results_with_valid_participation = 0;
    let results_with_missing_participation = 0;
    let results_with_valid_driver = 0;
    let results_with_missing_driver = 0;
    let results_entry_event_conflict = 0;
    let results_participation_series_conflict = 0;
    let results_participation_season_conflict = 0;
    let results_with_missing_event = 0;
    let results_with_missing_session = 0;
    let archived_results = 0;

    const entry_event_conflict_ids = [];
    const participation_series_conflict_ids = [];
    const participation_season_conflict_ids = [];
    const missing_event_ids = [];
    const missing_session_ids = [];
    const missing_entry_ids = [];
    const missing_participation_ids = [];
    const missing_driver_ids = [];

    // ── RSLT ID validation ───────────────────────────────────────────────
    const invalid_rslt_format = [];
    const duplicate_rslt_ids = [];
    const rsltIdMap = new Map();

    // ── Logical duplicate groups ─────────────────────────────────────────
    const logicalKeyMap = new Map();

    // ── Analyze each Result ──────────────────────────────────────────────
    for (const result of results) {
      if (result.is_archived) archived_results++;

      // RaceCore ID checks
      if (result.racecore_id) {
        results_with_racecore_id++;
        const parsed = parseRsltId(result.racecore_id);
        if (!parsed || parsed.prefix !== RSLT_PREFIX || parsed.suffix.length !== 9 || !isNumeric(parsed.suffix)) {
          invalid_rslt_format.push({ result_id: result.id, racecore_id: result.racecore_id });
        } else {
          if (!rsltIdMap.has(result.racecore_id)) rsltIdMap.set(result.racecore_id, []);
          rsltIdMap.get(result.racecore_id).push(result.id);
        }
      } else {
        results_without_racecore_id++;
      }

      // Entry checks
      if (result.entry_id) {
        results_with_entry_id++;
        const entry = entryMap.get(result.entry_id);
        if (entry) {
          results_with_valid_entry++;

          // Check Entry/Event conflict
          if (result.event_id && entry.event_id !== result.event_id) {
            results_entry_event_conflict++;
            entry_event_conflict_ids.push({
              result_id: result.id,
              result_event_id: result.event_id,
              entry_event_id: entry.event_id,
            });
          }

          // Check Participation from Entry
          if (entry.participation_id) {
            results_with_participation_id++;
            const participation = participationMap.get(entry.participation_id);
            if (participation) {
              results_with_valid_participation++;

              // Series conflict
              const event = eventMap.get(result.event_id);
              if (event && participation.series_id && event.series_id && participation.series_id !== event.series_id) {
                results_participation_series_conflict++;
                participation_series_conflict_ids.push({
                  result_id: result.id,
                  participation_id: entry.participation_id,
                  participation_series_id: participation.series_id,
                  event_series_id: event.series_id,
                });
              }

              // Season conflict
              if (event && event.season && participation.season_year) {
                const eventSeason = String(event.season).match(/\d{4}/);
                if (eventSeason && String(participation.season_year) !== eventSeason[0]) {
                  results_participation_season_conflict++;
                  participation_season_conflict_ids.push({
                    result_id: result.id,
                    participation_id: entry.participation_id,
                    participation_season: participation.season_year,
                    event_season: eventSeason[0],
                  });
                }
              }
            } else {
              results_with_missing_participation++;
              missing_participation_ids.push({ result_id: result.id, participation_id: entry.participation_id });
            }
          } else {
            results_without_participation_id++;
          }
        } else {
          results_with_missing_entry++;
          missing_entry_ids.push({ result_id: result.id, entry_id: result.entry_id });
        }
      } else {
        results_without_entry_id++;
        // Check participation_id directly on result (backfill path)
        if (result.participation_id) {
          results_with_participation_id++;
          const participation = participationMap.get(result.participation_id);
          if (participation) {
            results_with_valid_participation++;
          } else {
            results_with_missing_participation++;
            missing_participation_ids.push({ result_id: result.id, participation_id: result.participation_id });
          }
        } else {
          results_without_participation_id++;
        }
      }

      // Driver checks
      if (result.driver_id) {
        results_with_driver_id++;
        const driver = driverMap.get(result.driver_id);
        if (driver) {
          results_with_valid_driver++;
        } else {
          results_with_missing_driver++;
          missing_driver_ids.push({ result_id: result.id, driver_id: result.driver_id });
        }
      } else {
        results_without_driver_id++;
      }

      // Event checks
      const event = eventMap.get(result.event_id);
      if (!event) {
        results_with_missing_event++;
        missing_event_ids.push({ result_id: result.id, event_id: result.event_id });
      }

      // Session checks
      if (result.session_id) {
        const session = sessionMap.get(result.session_id);
        if (!session) {
          results_with_missing_session++;
          missing_session_ids.push({ result_id: result.id, session_id: result.session_id });
        }
      }

      // Logical duplicate key: event_id + session_id + entry_id
      if (result.event_id && result.session_id && result.entry_id) {
        const key = result.event_id + '|' + result.session_id + '|' + result.entry_id;
        if (!logicalKeyMap.has(key)) logicalKeyMap.set(key, []);
        logicalKeyMap.get(key).push(result.id);
      }
    }

    // ── Detect duplicate RSLT IDs ────────────────────────────────────────
    for (const [racecoreId, resultIds] of rsltIdMap.entries()) {
      if (resultIds.length > 1) {
        duplicate_rslt_ids.push({ racecore_id: racecoreId, count: resultIds.length, result_ids: resultIds });
      }
    }

    // ── Detect logical duplicate groups ──────────────────────────────────
    const logical_duplicate_groups = [];
    for (const [key, resultIds] of logicalKeyMap.entries()) {
      if (resultIds.length > 1) {
        const [eventId, sessionId, entryId] = key.split('|');
        logical_duplicate_groups.push({
          logical_key: key,
          event_id: eventId,
          session_id: sessionId,
          entry_id: entryId,
          count: resultIds.length,
          result_ids: resultIds,
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
        Results: resultsResult.inspected,
        Entry: entriesResult.inspected,
        SeasonParticipation: participationsResult.inspected,
        Driver: driversResult.inspected,
        Event: eventsResult.inspected,
        Session: sessionsResult.inspected,
        EventClass: eventClassesResult.inspected,
      },

      summary: {
        total_results,
        results_with_racecore_id,
        results_without_racecore_id,
        results_with_entry_id,
        results_without_entry_id,
        results_with_participation_id,
        results_without_participation_id,
        results_with_driver_id,
        results_without_driver_id,
        results_with_valid_entry,
        results_with_missing_entry,
        results_with_valid_participation,
        results_with_missing_participation,
        results_with_valid_driver,
        results_with_missing_driver,
        results_entry_event_conflict,
        results_participation_series_conflict,
        results_participation_season_conflict,
        results_with_missing_event,
        results_with_missing_session,
        archived_results,
      },

      rslt_id_integrity: {
        invalid_rslt_format,
        invalid_rslt_format_count: invalid_rslt_format.length,
        duplicate_rslt_ids,
        duplicate_rslt_count: duplicate_rslt_ids.length,
      },

      logical_duplicate_groups,
      logical_duplicate_group_count: logical_duplicate_groups.length,

      conflict_details: {
        entry_event_conflict_ids,
        participation_series_conflict_ids,
        participation_season_conflict_ids,
        missing_event_ids,
        missing_session_ids,
        missing_entry_ids,
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