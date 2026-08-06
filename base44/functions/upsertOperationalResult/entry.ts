/**
 * upsertOperationalResult — Phase 5 Authoritative Results Orchestrator.
 *
 * Permanent relationship: PersonIdentity → RacerProfile → SeasonParticipation → Entry → Result
 *
 * Resolution order (entry-first):
 *   1. Preferred: entry_id supplied → load Entry → validate → load Participation → resolve driver_id
 *   2. Fallback: driver_id + event_id → locate compatible Entry
 *      - Exactly one match → use it
 *      - None → blocked
 *      - Multiple → review (never silently choose)
 *
 * Validation:
 *   - Entry belongs to the Event
 *   - Participation season matches Event season
 *   - Participation series matches Event series
 *   - Session belongs to the Event (when session_id supplied)
 *   - Archived Entry / Participation → rejected
 *
 * Duplicate key (preferred): event_id + session_id + entry_id
 * Legacy fallback: event_id + session_id + driver_id
 *
 * RSLT RaceCore ID assigned on create, never overwritten, never decremented.
 *
 * Ownership: Result stores entry_id, driver_id (legacy), event_id, session_id,
 * event_class_id, series_id, participation_id. Does NOT store person_identity_id
 * or racer_profile_id (resolver-only).
 *
 * Input:
 *   { payload, source_path?, dry_run? }
 *
 * Output (Phase 5 partial-failure contract):
 *   { resolution_status, cleanup_required, failed_step, errors, warnings,
 *     resolved_ids, created_records, updated_records, reused_records,
 *     records_created_before_failure, records_modified_before_failure,
 *     action, record, normalized_key, match_method, racecore_id_assigned }
 *
 * Admin or event/series/track collaborator only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { ensureRaceCoreId } from '../../shared/racecoreId.ts';

const VALID_RESULT_SESSION_TYPES = new Set(['Practice', 'Qualifying', 'Heat', 'LCQ', 'Final']);

// ── Helpers ────────────────────────────────────────────────────────────────────

function normalizeResultSessionType(sessionType) {
  if (!sessionType) return undefined;
  if (sessionType === 'Feature') return 'Final';
  if (VALID_RESULT_SESSION_TYPES.has(sessionType)) return sessionType;
  return undefined;
}

function mergeSessionMetadata(payload, session) {
  const merged = { ...payload };
  const normalizedType = normalizeResultSessionType(session.session_type);
  if (normalizedType) merged.session_type = normalizedType;
  if (session.event_day_id != null) merged.event_day_id = session.event_day_id;
  merged.points_enabled = session.points_enabled === true;
  merged.points_type = session.points_type || 'none';
  if (session.points_rule != null) merged.points_rule = session.points_rule;
  if (merged.points_type === 'final') {
    merged.round_number = session.round_number ?? null;
  } else {
    merged.round_number = null;
  }
  return merged;
}

function extractSeasonYear(event) {
  if (!event?.season) return null;
  const m = String(event.season).match(/\d{4}/);
  return m ? m[0] : null;
}

async function isEventCollaborator(base44, userId, eventId, seriesId, trackId) {
  const collabs = await base44.asServiceRole.entities.EntityCollaborator.filter({ user_id: userId }).catch(() => []);
  const allowed = new Set(['owner', 'editor']);
  return collabs.some(c =>
    allowed.has(c.role) && (
      (c.entity_type === 'Event'  && c.entity_id === eventId) ||
      (c.entity_type === 'Series' && seriesId && c.entity_id === seriesId) ||
      (c.entity_type === 'Track'  && trackId  && c.entity_id === trackId)
    )
  );
}

function emptyContract() {
  return {
    resolution_status: 'pending',
    cleanup_required: false,
    failed_step: null,
    errors: [],
    warnings: [],
    resolved_ids: {
      entry_id: null,
      participation_id: null,
      driver_id: null,
      racer_profile_id: null,
      person_identity_id: null,
      event_id: null,
      session_id: null,
      event_class_id: null,
      series_id: null,
    },
    created_records: { result: false },
    updated_records: { result: false },
    reused_records: { result: false },
    records_created_before_failure: { result: null },
    records_modified_before_failure: { result: null },
  };
}

// ── Entry-First Resolution ─────────────────────────────────────────────────────

/**
 * Resolve Entry from entry_id (preferred path).
 * Validates Entry exists, belongs to the event, is not archived,
 * and has a valid participation_id.
 */
async function resolveByEntryId(sr, entryId, expectedEventId) {
  let entry = null;
  try {
    entry = await sr.entities.Entry.get(entryId);
  } catch (e) {
    return { status: 'error', error: 'Entry not found: ' + entryId, failed_step: 'entry_lookup' };
  }
  if (!entry) {
    return { status: 'blocked', error: 'Entry not found: ' + entryId, failed_step: 'entry_lookup' };
  }
  if (entry.is_archived) {
    return { status: 'blocked', error: 'Entry is archived: ' + entryId, failed_step: 'entry_archived' };
  }
  if (expectedEventId && entry.event_id !== expectedEventId) {
    return {
      status: 'blocked',
      error: 'Entry belongs to a different event: entry.event_id=' + entry.event_id + ' expected=' + expectedEventId,
      failed_step: 'entry_event_mismatch',
    };
  }
  return { status: 'resolved', entry };
}

/**
 * Resolve Entry from driver_id + event_id (fallback path).
 * Locates compatible Entries using driver_id, event_id, and optionally
 * event_class_id, session_id, series_id.
 * Exactly one → use it. None → blocked. Multiple → review.
 */
async function resolveByDriverEvent(sr, driverId, eventId, hints) {
  const filter = { event_id: eventId, driver_id: driverId, is_archived: false };
  let candidates = [];
  try {
    candidates = await sr.entities.Entry.filter(filter);
  } catch (e) {
    return { status: 'error', error: 'Entry lookup failed: ' + e.message, failed_step: 'entry_lookup' };
  }

  // Narrow by event_class_id if provided
  if (hints.event_class_id && candidates.length > 1) {
    const narrowed = candidates.filter(c => c.event_class_id === hints.event_class_id);
    if (narrowed.length > 0) candidates = narrowed;
  }

  // Narrow by series_class_id if provided
  if (hints.series_class_id && candidates.length > 1) {
    const narrowed = candidates.filter(c => c.series_class_id === hints.series_class_id);
    if (narrowed.length > 0) candidates = narrowed;
  }

  if (candidates.length === 0) {
    return {
      status: 'blocked',
      error: 'No Entry found for driver ' + driverId + ' in event ' + eventId,
      failed_step: 'entry_not_found',
    };
  }
  if (candidates.length === 1) {
    return { status: 'resolved', entry: candidates[0] };
  }
  return {
    status: 'review',
    error: 'Multiple Entries found for driver ' + driverId + ' in event ' + eventId + ' — ' + candidates.length + ' candidates',
    failed_step: 'entry_ambiguous',
    candidate_entry_ids: candidates.map(c => c.id),
  };
}

/**
 * Validate that Participation is compatible with the Event context.
 */
async function validateParticipation(sr, participationId, entry, event) {
  if (!participationId) {
    return { valid: false, error: 'Entry has no participation_id — backfill required', failed_step: 'participation_missing' };
  }

  let participation = null;
  try {
    participation = await sr.entities.SeasonParticipation.get(participationId);
  } catch (e) {
    return { valid: false, error: 'Participation not found: ' + participationId, failed_step: 'participation_lookup' };
  }
  if (!participation) {
    return { valid: false, error: 'Participation not found: ' + participationId, failed_step: 'participation_lookup' };
  }
  if (participation.is_archived) {
    return { valid: false, error: 'Participation is archived: ' + participationId, failed_step: 'participation_archived' };
  }

  // Series match
  if (event?.series_id && participation.series_id && participation.series_id !== event.series_id) {
    return {
      valid: false,
      error: 'Participation series mismatch: participation.series_id=' + participation.series_id + ' event.series_id=' + event.series_id,
      failed_step: 'participation_series_conflict',
    };
  }

  // Season match
  if (event?.season && participation.season_year) {
    const eventSeason = extractSeasonYear(event);
    if (eventSeason && String(participation.season_year) !== eventSeason) {
      return {
        valid: false,
        error: 'Participation season mismatch: participation.season_year=' + participation.season_year + ' event.season=' + eventSeason,
        failed_step: 'participation_season_conflict',
      };
    }
  }

  // Driver consistency: entry.driver_id should match participation.legacy_driver_id (if set)
  if (entry.driver_id && participation.legacy_driver_id && entry.driver_id !== participation.legacy_driver_id) {
    return {
      valid: false,
      error: 'Entry driver_id does not match Participation legacy_driver_id',
      failed_step: 'driver_participation_conflict',
    };
  }

  return { valid: true, participation };
}

/**
 * Validate Session belongs to the Event.
 */
async function validateSession(sr, sessionId, eventId) {
  if (!sessionId) return { valid: true, session: null };
  let session = null;
  try {
    const sessions = await sr.entities.Session.filter({ id: sessionId });
    session = sessions?.[0] || null;
  } catch (e) {
    return { valid: false, error: 'Session lookup failed: ' + e.message, failed_step: 'session_lookup' };
  }
  if (!session) {
    return { valid: false, error: 'Session not found: ' + sessionId, failed_step: 'session_lookup' };
  }
  if (session.event_id !== eventId) {
    return {
      valid: false,
      error: 'Session belongs to a different event: session.event_id=' + session.event_id + ' expected=' + eventId,
      failed_step: 'session_event_mismatch',
    };
  }
  return { valid: true, session };
}

// ── Duplicate Key ──────────────────────────────────────────────────────────────

function buildPreferredResultKey(eventId, sessionId, entryId) {
  if (!eventId || !sessionId || !entryId) return null;
  return 'result:' + eventId + ':' + sessionId + ':' + entryId;
}

function buildLegacyResultKey(eventId, sessionId, driverId) {
  if (!eventId || !sessionId || !driverId) return null;
  return 'result:' + eventId + ':' + sessionId + ':' + driverId;
}

// ── Main Handler ───────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { payload = {}, source_path = 'unknown', dry_run = false } = body;

    const contract = emptyContract();
    contract.resolved_ids.event_id = payload.event_id || null;
    contract.resolved_ids.session_id = payload.session_id || null;

    // ── Basic field validation ──────────────────────────────────────────────
    if (!payload.event_id) {
      contract.resolution_status = 'blocked';
      contract.failed_step = 'missing_event_id';
      contract.errors.push({ code: 'missing_event_id', message: 'payload.event_id is required' });
      return Response.json(contract, { status: 400 });
    }
    if (!payload.session_id) {
      contract.resolution_status = 'blocked';
      contract.failed_step = 'missing_session_id';
      contract.errors.push({ code: 'missing_session_id', message: 'payload.session_id is required — do not create results without a session' });
      return Response.json(contract, { status: 400 });
    }
    if (!payload.entry_id && !payload.driver_id) {
      contract.resolution_status = 'blocked';
      contract.failed_step = 'missing_competitor';
      contract.errors.push({ code: 'missing_competitor', message: 'Either entry_id or driver_id is required' });
      return Response.json(contract, { status: 400 });
    }

    // ── Authorization ────────────────────────────────────────────────────────
    if (user.role !== 'admin') {
      const event = await base44.asServiceRole.entities.Event.filter({ id: payload.event_id }).then(r => r?.[0]).catch(() => null);
      const allowed = await isEventCollaborator(base44, user.id, payload.event_id, event?.series_id || null, event?.track_id || null);
      if (!allowed) {
        contract.resolution_status = 'blocked';
        contract.failed_step = 'authorization';
        contract.errors.push({ code: 'forbidden', message: 'Forbidden: must be admin or event/series collaborator' });
        return Response.json(contract, { status: 403 });
      }
    }

    const sr = base44.asServiceRole;

    // ── Load Event ──────────────────────────────────────────────────────────
    let event = null;
    try {
      const events = await sr.entities.Event.filter({ id: payload.event_id });
      event = events?.[0] || null;
    } catch (e) {}
    if (!event) {
      contract.resolution_status = 'blocked';
      contract.failed_step = 'event_not_found';
      contract.errors.push({ code: 'event_not_found', message: 'Event not found: ' + payload.event_id });
      return Response.json(contract, { status: 400 });
    }

    // ── Validate Session ────────────────────────────────────────────────────
    const sessionResult = await validateSession(sr, payload.session_id, payload.event_id);
    if (!sessionResult.valid) {
      contract.resolution_status = 'blocked';
      contract.failed_step = sessionResult.failed_step;
      contract.errors.push({ code: sessionResult.failed_step, message: sessionResult.error });
      return Response.json(contract, { status: 400 });
    }
    const session = sessionResult.session;

    // ── Entry-First Resolution ──────────────────────────────────────────────
    let entry = null;
    let resolutionMethod = null;

    if (payload.entry_id) {
      // Preferred path: entry_id supplied
      const entryRes = await resolveByEntryId(sr, payload.entry_id, payload.event_id);
      if (entryRes.status !== 'resolved') {
        contract.resolution_status = entryRes.status;
        contract.failed_step = entryRes.failed_step;
        contract.errors.push({ code: entryRes.failed_step, message: entryRes.error });
        if (entryRes.candidate_entry_ids) contract.warnings.push({ candidate_entry_ids: entryRes.candidate_entry_ids });
        return Response.json(contract, { status: entryRes.status === 'review' ? 409 : 400 });
      }
      entry = entryRes.entry;
      resolutionMethod = 'entry_id';
    } else {
      // Fallback path: driver_id + event_id
      const entryRes = await resolveByDriverEvent(sr, payload.driver_id, payload.event_id, {
        event_class_id: payload.event_class_id || null,
        series_class_id: payload.series_class_id || null,
      });
      if (entryRes.status !== 'resolved') {
        contract.resolution_status = entryRes.status;
        contract.failed_step = entryRes.failed_step;
        contract.errors.push({ code: entryRes.failed_step, message: entryRes.error });
        if (entryRes.candidate_entry_ids) contract.warnings.push({ candidate_entry_ids: entryRes.candidate_entry_ids });
        return Response.json(contract, { status: entryRes.status === 'review' ? 409 : 400 });
      }
      entry = entryRes.entry;
      resolutionMethod = 'driver_event_lookup';
    }

    contract.resolved_ids.entry_id = entry.id;
    contract.resolved_ids.driver_id = entry.driver_id;
    contract.resolved_ids.event_class_id = entry.event_class_id || null;
    contract.resolved_ids.series_id = entry.series_id || event.series_id || null;

    // ── Validate Participation ──────────────────────────────────────────────
    const partValidation = await validateParticipation(sr, entry.participation_id, entry, event);
    if (!partValidation.valid) {
      contract.resolution_status = 'blocked';
      contract.failed_step = partValidation.failed_step;
      contract.errors.push({ code: partValidation.failed_step, message: partValidation.error });
      return Response.json(contract, { status: 400 });
    }
    const participation = partValidation.participation;
    contract.resolved_ids.participation_id = participation.id;
    contract.resolved_ids.racer_profile_id = participation.racer_profile_id || null;
    contract.resolved_ids.person_identity_id = participation.person_identity_id || null;

    // ── Build enriched payload ──────────────────────────────────────────────
    let enrichedPayload = { ...payload };
    enrichedPayload.entry_id = entry.id;
    enrichedPayload.participation_id = participation.id;
    enrichedPayload.driver_id = entry.driver_id; // authoritative from Entry
    if (entry.event_class_id) enrichedPayload.event_class_id = entry.event_class_id;
    if (entry.series_id || event.series_id) enrichedPayload.series_id = entry.series_id || event.series_id;

    // Merge session metadata
    if (session) {
      enrichedPayload = mergeSessionMetadata(enrichedPayload, session);
    }

    // Historical safety defaults
    const isHistoricalImport = source_path?.includes('historical') || source_path?.includes('csv_import') ||
      enrichedPayload.is_historical === true || enrichedPayload.source_type === 'historical_archive';
    if (isHistoricalImport) {
      if (enrichedPayload.is_historical === undefined) enrichedPayload.is_historical = true;
      if (!enrichedPayload.record_status) enrichedPayload.record_status = 'under_review';
      if (!enrichedPayload.source_type) enrichedPayload.source_type = 'historical_archive';
      if (enrichedPayload.published === undefined) enrichedPayload.published = false;
      if (enrichedPayload.is_public === undefined) enrichedPayload.is_public = false;
    }
    if (enrichedPayload.record_status === 'superseded') {
      enrichedPayload.published = false;
      enrichedPayload.is_public = false;
    }

    // ── Duplicate detection ─────────────────────────────────────────────────
    const preferredKey = buildPreferredResultKey(
      enrichedPayload.event_id, enrichedPayload.session_id, enrichedPayload.entry_id
    );
    const legacyKey = buildLegacyResultKey(
      enrichedPayload.event_id, enrichedPayload.session_id, enrichedPayload.driver_id
    );

    let existing = null;
    let matchMethod = 'none';

    // 1. Preferred key: event_id + session_id + entry_id
    if (preferredKey) {
      const byPreferred = await sr.entities.Results.filter({ normalized_result_key: preferredKey }).catch(() => []);
      if (byPreferred?.length) {
        existing = byPreferred[0];
        matchMethod = 'preferred_key_entry';
        if (byPreferred.length > 1) {
          contract.warnings.push({
            code: 'duplicate_preferred_key',
            message: 'Multiple Results share normalized_result_key ' + preferredKey + ' — count: ' + byPreferred.length,
          });
        }
      }
    }

    // 2. Fallback: session_id + entry_id (without event_id in key)
    if (!existing && enrichedPayload.session_id && enrichedPayload.entry_id) {
      const bySessionEntry = await sr.entities.Results.filter({
        session_id: enrichedPayload.session_id,
        entry_id: enrichedPayload.entry_id,
      }).catch(() => []);
      if (bySessionEntry?.length === 1) {
        existing = bySessionEntry[0];
        matchMethod = 'session_entry_id';
      } else if (bySessionEntry?.length > 1) {
        contract.warnings.push({
          code: 'ambiguous_session_entry',
          message: 'Multiple Results for session ' + enrichedPayload.session_id + ' entry ' + enrichedPayload.entry_id,
        });
        existing = bySessionEntry[0];
        matchMethod = 'session_entry_ambiguous';
      }
    }

    // 3. Legacy fallback: session_id + driver_id (when no entry match)
    if (!existing && enrichedPayload.driver_id) {
      const byLegacy = await sr.entities.Results.filter({
        session_id: enrichedPayload.session_id,
        driver_id: enrichedPayload.driver_id,
      }).catch(() => []);
      if (byLegacy?.length === 1) {
        existing = byLegacy[0];
        matchMethod = 'session_driver_id';
      } else if (byLegacy?.length > 1) {
        contract.warnings.push({
          code: 'ambiguous_session_driver',
          message: 'Multiple Results for session ' + enrichedPayload.session_id + ' driver ' + enrichedPayload.driver_id,
        });
        existing = byLegacy.sort((a, b) => {
          const score = r => (r.entry_id ? 2 : 0) + (r.normalized_result_key ? 1 : 0) + (r.position != null ? 1 : 0);
          return score(b) - score(a);
        })[0];
        matchMethod = 'session_driver_ambiguous';
      }
    }

    // ── Dry run: return projected Result without writing ─────────────────────
    if (dry_run) {
      const projectedResult = {
        event_id: enrichedPayload.event_id,
        session_id: enrichedPayload.session_id,
        entry_id: enrichedPayload.entry_id,
        participation_id: enrichedPayload.participation_id,
        driver_id: enrichedPayload.driver_id,
        event_class_id: enrichedPayload.event_class_id || null,
        series_id: enrichedPayload.series_id || null,
        position: enrichedPayload.position ?? null,
        status: enrichedPayload.status || 'Running',
        laps_completed: enrichedPayload.laps_completed ?? null,
        best_lap_time_ms: enrichedPayload.best_lap_time_ms ?? null,
        points: enrichedPayload.points ?? null,
        normalized_result_key: preferredKey || legacyKey,
        would_match_existing: !!existing,
        would_match_id: existing?.id || null,
        would_match_method: matchMethod,
        would_assign_rslt_id: !existing,
      };

      contract.resolution_status = 'resolved';
      contract.errors = [];
      return Response.json({
        ...contract,
        dry_run: true,
        action: existing ? 'would_update' : 'would_create',
        projected_result: projectedResult,
        resolution_method: resolutionMethod,
        match_method: matchMethod,
      });
    }

    // ── Commit ──────────────────────────────────────────────────────────────
    const { id: _id, ...cleanPayload } = enrichedPayload;
    const dataWithKey = { ...cleanPayload, normalized_result_key: preferredKey || legacyKey };

    let record, action;
    if (existing) {
      // Update existing — never overwrite racecore_id
      const { racecore_id: _existingRcId, ...updateData } = dataWithKey;
      record = await sr.entities.Results.update(existing.id, updateData);
      action = 'updated';
      contract.updated_records.result = true;
      contract.reused_records.result = true;
      contract.records_modified_before_failure.result = record.id;
    } else {
      // Create new — assign RSLT RaceCore ID
      const createData = { ...dataWithKey };
      record = await sr.entities.Results.create(createData);
      action = 'created';
      contract.created_records.result = true;
      contract.records_created_before_failure.result = record.id;

      // Assign RSLT RaceCore ID
      const rsltResult = await ensureRaceCoreId(base44, 'Results', record.id).catch(() => null);
      if (rsltResult?.success && rsltResult.racecore_id) {
        // Re-read to get the assigned ID
        try {
          const updated = await sr.entities.Results.get(record.id);
          record = updated;
        } catch (e) {}
      } else if (rsltResult && !rsltResult.success) {
        contract.warnings.push({
          code: 'rslt_assignment_failed',
          message: 'RSLT RaceCore ID assignment failed: ' + (rsltResult.error || 'unknown'),
        });
      }
    }

    contract.resolution_status = 'resolved';
    contract.resolved_ids.racecore_id = record.racecore_id || null;

    // ── Audit logs ───────────────────────────────────────────────────────────
    await sr.entities.OperationLog.create({
      operation_type: action === 'created' ? 'operational_result_created' : 'operational_result_updated',
      entity_name: 'Results',
      entity_id: record.id,
      status: 'success',
      metadata: {
        entity_type: 'results',
        source_path,
        normalized_result_key: preferredKey || legacyKey,
        matched_by: matchMethod,
        resolution_method: resolutionMethod,
        entry_id: entry.id,
        participation_id: participation.id,
        racecore_id: record.racecore_id || null,
      },
    }).catch(() => {});

    sr.entities.AuditLog.create({
      entity_type: 'Results',
      entity_id: record.id,
      entity_name: 'Result — session:' + record.session_id + ' entry:' + record.entry_id + ' driver:' + record.driver_id,
      action: action === 'created' ? 'created' : 'updated',
      performed_by: user.id,
      performed_by_name: user.full_name || user.email || user.id,
      timestamp: new Date().toISOString(),
      before_data: existing ? {
        position: existing.position,
        status: existing.status,
        points: existing.points,
        status_state: existing.status_state,
        session_id: existing.session_id,
        entry_id: existing.entry_id,
        participation_id: existing.participation_id,
      } : null,
      after_data: {
        position: record.position,
        status: record.status,
        points: record.points,
        status_state: record.status_state,
        session_id: record.session_id,
        entry_id: record.entry_id,
        participation_id: record.participation_id,
      },
      event_id: record.event_id || null,
      notes: 'source_path: ' + source_path + ' resolution: ' + resolutionMethod,
    }).catch(() => {});

    return Response.json({
      ...contract,
      action,
      record,
      normalized_key: preferredKey || legacyKey,
      match_method: matchMethod,
      resolution_method: resolutionMethod,
      racecore_id_assigned: action === 'created' && !!record.racecore_id,
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});