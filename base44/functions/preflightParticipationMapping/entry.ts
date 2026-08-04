/**
 * preflightParticipationMapping.js
 *
 * Phase 1 read-only preflight: analyzes all existing Entry records and reports
 * whether they can be mapped to proposed SeasonParticipation records.
 *
 * STRICTLY READ-ONLY:
 *   - Does not create, update, archive, merge, or delete any record.
 *   - Does not call any write-capable helper.
 *   - Does not create RacerProfile or SeasonParticipation records.
 *   - Does not modify any existing record.
 *
 * Loads records in batches so analysis is not limited to the first page.
 *
 * Proposed grouping key (analysis only — never written):
 *   person_identity_id + series_id + normalized season_year + racer_type
 *
 * For Phase 1, racer_type is inferred as "Driver" for all records because
 * current records do not yet store racer type. This is clearly labeled in
 * the report.
 *
 * Output: JSON report with complete counts.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// ── Helpers ─────────────────────────────────────────────────────────────────

function normalizeSeasonYear(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/\d{4}/);
  if (match) return match[0];
  return trimmed;
}

// ── Batched loader ────────────────────────────────────────────────────────────

async function loadAll(base44, entityName, sortField, batchSize) {
  const sr = base44.asServiceRole;
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

// ── Main handler ──────────────────────────────────────────────────────────────

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

    const [entriesResult, driversResult, identitiesResult, eventsResult, seriesResult] = await Promise.all([
      loadAll(base44, 'Entry'),
      loadAll(base44, 'Driver'),
      loadAll(base44, 'PersonIdentity'),
      loadAll(base44, 'Event'),
      loadAll(base44, 'Series'),
    ]);

    const loadErrors = {};
    const partialLoads = {};

    if (entriesResult.error) { loadErrors.Entry = entriesResult.error; partialLoads.Entry = entriesResult.partial; }
    if (driversResult.error) { loadErrors.Driver = driversResult.error; partialLoads.Driver = driversResult.partial; }
    if (identitiesResult.error) { loadErrors.PersonIdentity = identitiesResult.error; partialLoads.PersonIdentity = identitiesResult.partial; }
    if (eventsResult.error) { loadErrors.Event = eventsResult.error; partialLoads.Event = eventsResult.partial; }
    if (seriesResult.error) { loadErrors.Series = seriesResult.error; partialLoads.Series = seriesResult.partial; }

    const entries = entriesResult.records || [];
    const drivers = driversResult.records || [];
    const identities = identitiesResult.records || [];
    const events = eventsResult.records || [];
    const series = seriesResult.records || [];

    // ── Build lookup maps ───────────────────────────────────────────────────
    const driverMap = new Map();
    for (const d of drivers) driverMap.set(d.id, d);

    const driverToIdentityMap = new Map();
    for (const pi of identities) {
      if (pi.canonical_driver_id) driverToIdentityMap.set(pi.canonical_driver_id, pi);
      if (Array.isArray(pi.merged_driver_ids)) {
        for (const did of pi.merged_driver_ids) {
          if (!driverToIdentityMap.has(did)) driverToIdentityMap.set(did, pi);
        }
      }
    }

    const eventMap = new Map();
    for (const e of events) eventMap.set(e.id, e);

    const seriesMap = new Map();
    for (const s of series) seriesMap.set(s.id, s);

    // ── Counters ───────────────────────────────────────────────────────────
    let total_entries = 0;
    let entries_with_driver_id = 0;
    let entries_without_driver_id = 0;
    let entries_with_valid_driver = 0;
    let entries_with_missing_driver_record = 0;
    let entries_with_resolved_person_identity = 0;
    let entries_without_resolved_person_identity = 0;
    let entries_with_series_id = 0;
    let entries_without_series_id = 0;
    let entries_with_valid_series = 0;
    let entries_with_missing_series_record = 0;
    let entries_with_event_id = 0;
    let entries_without_event_id = 0;
    let entries_with_valid_event = 0;
    let entries_with_missing_event_record = 0;
    let entries_with_season_year = 0;
    let entries_without_season_year = 0;
    let entries_auto_mappable = 0;
    let entries_requiring_review = 0;

    const review_reasons = {
      missing_driver_id: 0,
      missing_driver_record: 0,
      missing_person_identity: 0,
      missing_series_id: 0,
      missing_series_record: 0,
      missing_event_id: 0,
      missing_event_record: 0,
      missing_season_value: 0
    };

    const participationGroups = new Map();

    // ── Analyze each Entry ──────────────────────────────────────────────────
    for (const entry of entries) {
      total_entries++;

      const reviewReasons = [];

      let driver = null;
      let personIdentity = null;

      if (entry.driver_id) {
        entries_with_driver_id++;
        driver = driverMap.get(entry.driver_id);
        if (driver) {
          entries_with_valid_driver++;
          personIdentity = driverToIdentityMap.get(entry.driver_id);
          if (personIdentity) {
            entries_with_resolved_person_identity++;
          } else {
            entries_without_resolved_person_identity++;
            reviewReasons.push('missing_person_identity');
          }
        } else {
          entries_with_missing_driver_record++;
          reviewReasons.push('missing_driver_record');
        }
      } else {
        entries_without_driver_id++;
        reviewReasons.push('missing_driver_id');
      }

      let seriesExists = false;
      if (entry.series_id) {
        entries_with_series_id++;
        if (seriesMap.has(entry.series_id)) {
          entries_with_valid_series++;
          seriesExists = true;
        } else {
          entries_with_missing_series_record++;
          reviewReasons.push('missing_series_record');
        }
      } else {
        entries_without_series_id++;
        reviewReasons.push('missing_series_id');
      }

      let event = null;
      if (entry.event_id) {
        entries_with_event_id++;
        event = eventMap.get(entry.event_id);
        if (event) {
          entries_with_valid_event++;
        } else {
          entries_with_missing_event_record++;
          reviewReasons.push('missing_event_record');
        }
      } else {
        entries_without_event_id++;
        reviewReasons.push('missing_event_id');
      }

      let seasonYear = null;
      if (event && event.season) {
        seasonYear = normalizeSeasonYear(event.season);
        if (seasonYear) {
          entries_with_season_year++;
        } else {
          entries_without_season_year++;
          reviewReasons.push('missing_season_value');
        }
      } else {
        entries_without_season_year++;
        reviewReasons.push('missing_season_value');
      }

      const isAutoMappable = !!(personIdentity && seriesExists && seasonYear);

      if (isAutoMappable) {
        entries_auto_mappable++;
      } else {
        entries_requiring_review++;
      }

      for (const reason of reviewReasons) {
        if (review_reasons.hasOwnProperty(reason)) {
          review_reasons[reason]++;
        }
      }

      if (isAutoMappable) {
        const inferredRacerType = 'Driver';
        const groupKey = personIdentity.id + '|' + entry.series_id + '|' + seasonYear + '|' + inferredRacerType;

        if (!participationGroups.has(groupKey)) {
          participationGroups.set(groupKey, {
            person_identity_id: personIdentity.id,
            series_id: entry.series_id,
            season_year: seasonYear,
            racer_type: inferredRacerType,
            racer_type_inferred: true,
            entry_ids: [],
            legacy_driver_ids: new Set(),
            team_ids: new Set(),
            car_numbers: new Set(),
            event_class_ids: new Set(),
            vehicle_ids: new Set(),
          });
        }

        const group = participationGroups.get(groupKey);
        group.entry_ids.push(entry.id);
        if (entry.driver_id) group.legacy_driver_ids.add(entry.driver_id);
        if (entry.team_id) group.team_ids.add(entry.team_id);
        if (entry.car_number) group.car_numbers.add(entry.car_number);
        if (entry.event_class_id) group.event_class_ids.add(entry.event_class_id);
        if (entry.vehicle_id) group.vehicle_ids.add(entry.vehicle_id);
      }
    }

    // ── Analyze groups for context diversity ────────────────────────────────
    let groups_with_multiple_legacy_driver_ids = 0;
    let groups_with_multiple_team_ids = 0;
    let groups_with_multiple_car_numbers = 0;
    let groups_with_multiple_event_class_ids = 0;
    let groups_with_multiple_vehicle_ids = 0;

    for (const group of participationGroups.values()) {
      if (group.legacy_driver_ids.size > 1) groups_with_multiple_legacy_driver_ids++;
      if (group.team_ids.size > 1) groups_with_multiple_team_ids++;
      if (group.car_numbers.size > 1) groups_with_multiple_car_numbers++;
      if (group.event_class_ids.size > 1) groups_with_multiple_event_class_ids++;
      if (group.vehicle_ids.size > 1) groups_with_multiple_vehicle_ids++;
    }

    // ── Build report ───────────────────────────────────────────────────────
    const report = {
      phase: 'Phase 1 — Read-only preflight',
      read_only: true,
      records_created: false,
      records_modified: false,
      racer_type_note: 'racer_type is inferred as "Driver" for all records in Phase 1 because current records do not yet store racer type. This inferred value is never written.',

      load_errors: Object.keys(loadErrors).length > 0 ? loadErrors : null,
      partial_loads: Object.keys(partialLoads).length > 0 ? partialLoads : null,
      records_inspected: {
        Entry: entriesResult.inspected,
        Driver: driversResult.inspected,
        PersonIdentity: identitiesResult.inspected,
        Event: eventsResult.inspected,
        Series: seriesResult.inspected
      },

      total_entries,
      entries_with_driver_id,
      entries_without_driver_id,
      entries_with_valid_driver,
      entries_with_missing_driver_record,
      entries_with_resolved_person_identity,
      entries_without_resolved_person_identity,
      entries_with_series_id,
      entries_without_series_id,
      entries_with_valid_series,
      entries_with_missing_series_record,
      entries_with_event_id,
      entries_without_event_id,
      entries_with_valid_event,
      entries_with_missing_event_record,
      entries_with_season_year,
      entries_without_season_year,
      entries_auto_mappable,
      entries_requiring_review,

      review_reasons,

      proposed_participation_group_count: participationGroups.size,
      groups_with_multiple_legacy_driver_ids,
      groups_with_multiple_team_ids,
      groups_with_multiple_car_numbers,
      groups_with_multiple_event_class_ids,
      groups_with_multiple_vehicle_ids,
    };

    return Response.json(report);

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}