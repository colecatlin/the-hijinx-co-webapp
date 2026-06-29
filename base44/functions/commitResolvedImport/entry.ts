/**
 * commitResolvedImport.js — R9EB.2
 *
 * Import Commit Engine.
 *
 * CONTRACT:
 *   - Only executes approved Resolution Plans
 *   - Makes ZERO business decisions
 *   - Will not commit if ANY row is BLOCKED
 *   - Dependency order: Series → Track → Event → Team → Driver → Session → Entry/Result/Standing
 *   - Every write produces AuditLog + OperationLog
 *
 * Input:
 *   {
 *     resolved_rows: ResolvedImportRow[]   — from resolveImportRow
 *     import_run_id: string
 *     source_name: string
 *     source_type: string
 *     dry_run?: boolean                    — if true, validates but does not write
 *     is_historical?: boolean
 *   }
 *
 * Output: ImportCommitResult
 *   {
 *     ok, dry_run, import_run_id, certification,
 *     committed, failed, skipped, blocked_count,
 *     created_ids, updated_ids, alias_ids,
 *     errors, audit_log_id, summary
 *   }
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── Normalization ──────────────────────────────────────────────────────────────
function normalizeEntityName(name, type) {
  if (!name) return null;
  let n = name.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (type === 'SeriesClass') n = n.replace(/([a-z])(\d)/g, '$1 $2').replace(/(\d)([a-z])/g, '$1 $2').replace(/\s+/g, ' ').trim();
  return n || null;
}
function normalizeDriverName(name) {
  if (!name) return null;
  let n = name.trim();
  n = n.replace(/"[^"]*"/g, '').replace(/'[^']*'/g, '').replace(/\s+/g, ' ').trim();
  if (/^[^,]+,\s*.+$/.test(n)) { const p = n.split(','); n = `${p.slice(1).join(',').trim()} ${p[0].trim()}`; }
  n = n.toLowerCase().replace(/\b(jr\.?|sr\.?|ii|iii|iv)\b/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  let prev = '';
  while (prev !== n) { prev = n; n = n.replace(/\b([a-z])\s+(?=[a-z](\s|$))/g, '$1'); }
  return n.trim() || null;
}
function buildCanonicalKey(type, name, externalUid, parentCtx) {
  const t = type.toLowerCase();
  if (externalUid) return `${t}:${externalUid}`;
  const norm = normalizeEntityName(name, type) || '';
  return parentCtx ? `${t}:${norm}:${parentCtx}` : `${t}:${norm}`;
}
function generateId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }

// ── ENTITY COMMIT FUNCTIONS ────────────────────────────────────────────────────
// These execute ONLY what the Resolution Plan specifies.

async function commitDriver(sr, resolvedRow, user, is_historical) {
  const { entity_resolution, normalized_data: r, identity_resolution } = resolvedRow;
  const dr = entity_resolution.driver;
  if (!dr || dr.action === 'NO_ACTION') return { skipped: true };

  if (dr.action === 'MATCH_EXISTING' || dr.action === 'MATCH_ALIAS') {
    // Existing — maybe update fields if richer data provided
    const updateData = {};
    if (r.contact_email && !dr.entity?.contact_email) updateData.contact_email = r.contact_email;
    if (r.primary_number && !dr.entity?.primary_number) updateData.primary_number = r.primary_number;
    if (Object.keys(updateData).length > 0) await sr.entities.Driver.update(dr.entity_id, updateData).catch(() => {});
    return { action: 'matched', driver_id: dr.entity_id };
  }

  if (dr.action === 'CREATE_NEW') {
    const slug = normalizeDriverName(`${r.first_name} ${r.last_name}`)?.replace(/\s+/g, '-') || 'driver';
    const normName = normalizeDriverName(`${r.first_name} ${r.last_name}`);
    const record = await sr.entities.Driver.create({
      first_name: r.first_name || '',
      last_name: r.last_name || '',
      primary_number: r.primary_number || r.car_number || '',
      primary_discipline: r.primary_discipline || '',
      date_of_birth: r.date_of_birth || null,
      hometown_city: r.hometown_city || '',
      hometown_state: r.hometown_state || '',
      hometown_country: r.hometown_country || r.country || '',
      contact_email: r.contact_email || r.email || '',
      external_uid: r.external_uid || null,
      data_source: resolvedRow.source_name || 'import',
      normalized_name: normName,
      canonical_slug: slug,
      canonical_key: buildCanonicalKey('Driver', `${r.first_name} ${r.last_name}`, r.external_uid, null),
    });
    // Register EntityAlias for the import name variant
    if (normName) {
      await sr.entities.EntityAlias.create({ entity_type: 'Driver', entity_id: record.id, alias_name: `${r.first_name} ${r.last_name}`, alias_normalized: normName, alias_type: 'canonical', confidence: 95, active: true, source: resolvedRow.source_name, source_type: resolvedRow.source_type, import_run_id: resolvedRow.import_run_id, created_by: user.id }).catch(() => {});
    }
    return { action: 'created', driver_id: record.id };
  }

  return { skipped: true, reason: dr.action };
}

async function commitSourceEntity(sr, modelName, resolvedRow, displayNameFn, createPayloadFn, user) {
  const resKey = modelName.toLowerCase().replace('class', '_class');
  const key = Object.keys(resolvedRow.entity_resolution).find(k => k === resKey || k === modelName.toLowerCase() || k === 'series_class' || k === 'team' || k === 'track' || k === 'series' || k === 'event');
  const res = key ? resolvedRow.entity_resolution[key] : null;
  if (!res || res.action === 'NO_ACTION' || res.action === 'MATCH_EXISTING' || res.action === 'MATCH_ALIAS') {
    return { skipped: true, entity_id: res?.entity_id || null };
  }
  if (res.action === 'CREATE_NEW') {
    const payload = createPayloadFn(resolvedRow.normalized_data);
    const record = await sr.entities[modelName].create(payload);
    // Auto-register EntityAlias
    const norm = normalizeEntityName(displayNameFn(resolvedRow.normalized_data), modelName);
    if (norm) {
      await sr.entities.EntityAlias.create({ entity_type: modelName, entity_id: record.id, alias_name: displayNameFn(resolvedRow.normalized_data), alias_normalized: norm, alias_type: 'canonical', confidence: 95, active: true, source: resolvedRow.source_name, source_type: resolvedRow.source_type, import_run_id: resolvedRow.import_run_id, created_by: user.id }).catch(() => {});
    }
    return { action: 'created', entity_id: record.id };
  }
  return { skipped: true };
}

async function commitOperational(sr, resolvedRow, resolvedIds, user, is_historical) {
  const { entity_type, normalized_data: r } = resolvedRow;
  const driverId = resolvedIds.driver_id || r.driver_id;
  const eventId = resolvedIds.event_id || r.event_id;
  const sessionId = resolvedIds.session_id || r.session_id;
  const seriesId = resolvedIds.series_id || r.series_id;
  const seriesClassId = resolvedIds.series_class_id || r.series_class_id;

  if (entity_type === 'Results') {
    if (!driverId || !eventId) return { error: 'driver_id and event_id required for Results' };
    const normKey = `result:${eventId}:${sessionId || 'none'}:${driverId}`;
    const existing = await sr.entities.Results.filter({ result_identity_key: normKey }).catch(() => []);
    const data = {
      driver_id: driverId, event_id: eventId, session_id: sessionId || null,
      series_id: seriesId || null, series_class_id: seriesClassId || null,
      position: r.position ? parseInt(r.position) : null,
      status: r.status || 'Running',
      laps_completed: r.laps_completed ? parseInt(r.laps_completed) : null,
      points: r.points ? parseFloat(r.points) : null,
      points_enabled: r.points_enabled === 'true',
      is_historical: is_historical || r.is_historical === 'true',
      record_status: r.record_status || (is_historical ? 'historical_verified' : 'official'),
      source_name: resolvedRow.source_name, source_type: resolvedRow.source_type,
      import_run_id: resolvedRow.import_run_id, result_identity_key: normKey,
    };
    if (existing.length > 0) { await sr.entities.Results.update(existing[0].id, data); return { action: 'updated', id: existing[0].id }; }
    const record = await sr.entities.Results.create(data);
    return { action: 'created', id: record.id };
  }

  if (entity_type === 'Standings') {
    const key = `standing:${seriesId}:${r.season_year}:${driverId}:${seriesClassId || 'overall'}`;
    const existing = await sr.entities.Standings.filter({ standing_identity_key: key }).catch(() => []);
    const data = {
      series_id: seriesId, series_class_id: seriesClassId || null, season_year: r.season_year,
      driver_id: driverId, position: r.position ? parseInt(r.position) : null,
      rank: r.rank ? parseInt(r.rank) : null, points_total: r.points_total ? parseFloat(r.points_total) : 0,
      wins: r.wins ? parseInt(r.wins) : 0, podiums: r.podiums ? parseInt(r.podiums) : 0,
      starts: r.starts ? parseInt(r.starts) : 0,
      calculation_source: r.calculation_source || (is_historical ? 'historical_import' : 'RaceCore'),
      record_status: r.record_status || 'under_review', standing_identity_key: key, normalized_standing_key: key,
    };
    if (existing.length > 0) { await sr.entities.Standings.update(existing[0].id, data); return { action: 'updated', id: existing[0].id }; }
    const record = await sr.entities.Standings.create(data);
    return { action: 'created', id: record.id };
  }

  if (entity_type === 'Entry') {
    const key = `entry:${eventId}:${driverId}:${r.car_number}`;
    const existing = await sr.entities.Entry.filter({ event_id: eventId, driver_id: driverId, car_number: r.car_number }).catch(() => []);
    const data = {
      event_id: eventId, driver_id: driverId, car_number: r.car_number,
      series_class_id: seriesClassId || null, team_id: resolvedIds.team_id || r.team_id || null,
      entry_status: r.entry_status || 'Registered',
      entry_identity_key: key, normalized_entry_key: key,
    };
    if (existing.length > 0) { await sr.entities.Entry.update(existing[0].id, data); return { action: 'updated', id: existing[0].id }; }
    const record = await sr.entities.Entry.create(data);
    return { action: 'created', id: record.id };
  }

  return { skipped: true, reason: `No commit handler for ${entity_type}` };
}

// ── Main handler ───────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const {
      resolved_rows = [],
      import_run_id = `commit_${Date.now()}`,
      source_name = 'import',
      source_type = 'csv_import',
      dry_run = false,
      is_historical = false,
    } = body;

    if (!resolved_rows.length) return Response.json({ error: 'resolved_rows is required and must be non-empty' }, { status: 400 });

    const sr = base44.asServiceRole;

    // ── GATE: No blocked rows allowed ──────────────────────────────────────────
    const blockedRows = resolved_rows.filter(r => !r.ready_to_commit);
    const hardBlocked = resolved_rows.filter(r => r.errors?.length > 0 || r.entity_resolution && Object.values(r.entity_resolution).some(e => e.action === 'BLOCK_IMPORT'));

    if (hardBlocked.length > 0) {
      return Response.json({
        ok: false, dry_run, import_run_id, certification: 'BLOCKED',
        committed: 0, failed: 0, skipped: resolved_rows.length, blocked_count: hardBlocked.length,
        errors: hardBlocked.map(r => ({ row: r.row_number, errors: r.errors })),
        summary: `Commit BLOCKED — ${hardBlocked.length} hard-blocked rows must be resolved`,
      });
    }

    if (dry_run) {
      const warnings = resolved_rows.filter(r => r.requires_review).length;
      return Response.json({
        ok: true, dry_run: true, import_run_id, certification: warnings > 0 ? 'PASS_WITH_WARNINGS' : 'PASS',
        would_commit: resolved_rows.filter(r => r.ready_to_commit).length,
        would_skip: blockedRows.length, warnings_count: warnings,
        summary: 'Dry run complete — no writes performed',
      });
    }

    // ── COMMIT ─────────────────────────────────────────────────────────────────
    let committed = 0, failed = 0, skipped = 0;
    const created_ids = [];
    const updated_ids = [];
    const alias_ids = [];
    const errors = [];

    for (const resolvedRow of resolved_rows) {
      if (!resolvedRow.ready_to_commit) { skipped++; continue; }
      const r = resolvedRow.normalized_data;
      const resolvedIds = {};

      try {
        // Process entity alias actions (register alias variants discovered during resolution)
        for (const aliasAction of (resolvedRow.alias_actions || [])) {
          if (aliasAction.alias && aliasAction.canonical_id) {
            const norm = resolvedRow.entity_type === 'Driver' ? normalizeDriverName(aliasAction.alias) : normalizeEntityName(aliasAction.alias, aliasAction.entity);
            if (norm) {
              const existing = await sr.entities.EntityAlias.filter({ entity_type: aliasAction.entity, entity_id: aliasAction.canonical_id, alias_normalized: norm }).catch(() => []);
              if (!existing.length) {
                const aliasRecord = await sr.entities.EntityAlias.create({ entity_type: aliasAction.entity, entity_id: aliasAction.canonical_id, alias_name: aliasAction.alias, alias_normalized: norm, alias_type: 'import_variant', confidence: 90, active: true, source: source_name, source_type, import_run_id, created_by: user.id }).catch(() => null);
                if (aliasRecord?.id) alias_ids.push(aliasRecord.id);
              }
            }
          }
        }

        // Commit Driver (source entity)
        if (resolvedRow.entity_type === 'Driver') {
          const driverResult = await commitDriver(sr, resolvedRow, user, is_historical);
          if (driverResult.driver_id) resolvedIds.driver_id = driverResult.driver_id;
          if (driverResult.action === 'created') created_ids.push({ type: 'Driver', id: driverResult.driver_id });
          if (driverResult.action === 'updated') updated_ids.push({ type: 'Driver', id: driverResult.driver_id });

          // Commit PersonIdentity via resolvePersonIdentity
          if (driverResult.driver_id) {
            const fullName = `${r.first_name || ''} ${r.last_name || ''}`.trim();
            if (fullName) {
              await base44.functions.invoke('resolvePersonIdentity', {
                raw_driver_name: fullName, raw_dob: r.date_of_birth || null,
                raw_external_uid: r.external_uid || null, raw_car_number: r.primary_number || r.car_number || null,
                source_type: source_type || 'csv_import', source_name, import_run_id,
              }).catch(() => null);
            }
          }
        }

        // Commit Team
        if (resolvedRow.entity_type === 'Team' || r.team_name) {
          const teamRes = resolvedRow.entity_resolution.team;
          if (teamRes?.action === 'CREATE_NEW') {
            const rec = await sr.entities.Team.create({ name: r.name || r.team_name, headquarters_city: r.headquarters_city || r.city || '', headquarters_state: r.headquarters_state || r.state || '', country: r.country || '', primary_discipline: r.primary_discipline || '', founded_year: r.founded_year ? parseInt(r.founded_year) : null, external_uid: r.external_uid || null, data_source: source_name, normalized_name: normalizeEntityName(r.name || r.team_name, 'Team'), canonical_key: buildCanonicalKey('Team', r.name || r.team_name, r.external_uid, null) });
            resolvedIds.team_id = rec.id;
            created_ids.push({ type: 'Team', id: rec.id });
          } else if (teamRes?.entity_id) { resolvedIds.team_id = teamRes.entity_id; }
        }

        // Commit Track
        if (resolvedRow.entity_type === 'Track') {
          const trackRes = resolvedRow.entity_resolution.track;
          if (trackRes?.action === 'CREATE_NEW') {
            const rec = await sr.entities.Track.create({ name: r.name || r.track_name, location_city: r.location_city || r.city || '', location_state: r.location_state || r.state || '', location_country: r.location_country || r.country || '', track_type: r.track_type || '', surface_type: r.surface_type || '', external_uid: r.external_uid || null, data_source: source_name, normalized_name: normalizeEntityName(r.name || r.track_name, 'Track'), canonical_key: buildCanonicalKey('Track', r.name || r.track_name, r.external_uid, null) });
            resolvedIds.track_id = rec.id;
            created_ids.push({ type: 'Track', id: rec.id });
          } else if (trackRes?.entity_id) { resolvedIds.track_id = trackRes.entity_id; }
        }

        // Commit Series
        if (resolvedRow.entity_type === 'Series') {
          const seriesRes = resolvedRow.entity_resolution.series;
          if (seriesRes?.action === 'CREATE_NEW') {
            const rec = await sr.entities.Series.create({ name: r.name || r.series_name, full_name: r.full_name || '', sanctioning_body: r.sanctioning_body || '', discipline: r.discipline || 'Off Road', geographic_scope: r.geographic_scope || '', season_year: r.season_year || '', external_uid: r.external_uid || null, data_source: source_name, normalized_name: normalizeEntityName(r.name || r.series_name, 'Series'), canonical_key: buildCanonicalKey('Series', r.name || r.series_name, r.external_uid, null) });
            resolvedIds.series_id = rec.id;
            created_ids.push({ type: 'Series', id: rec.id });
          } else if (seriesRes?.entity_id) { resolvedIds.series_id = seriesRes.entity_id; }
        }

        // Commit operational (Results, Entry, Standings)
        if (['Results', 'Entry', 'Standings'].includes(resolvedRow.entity_type)) {
          resolvedIds.driver_id = resolvedRow.entity_resolution.driver?.entity_id || r.driver_id;
          resolvedIds.event_id = resolvedRow.entity_resolution.event?.entity_id || r.event_id;
          resolvedIds.session_id = resolvedRow.entity_resolution.session?.entity_id || r.session_id;
          resolvedIds.series_id = resolvedRow.entity_resolution.series?.entity_id || r.series_id;
          resolvedIds.series_class_id = resolvedRow.entity_resolution.series_class?.entity_id || r.series_class_id;
          const opResult = await commitOperational(sr, resolvedRow, resolvedIds, user, is_historical);
          if (opResult.action === 'created') created_ids.push({ type: resolvedRow.entity_type, id: opResult.id });
          if (opResult.action === 'updated') updated_ids.push({ type: resolvedRow.entity_type, id: opResult.id });
        }

        // AuditLog per row
        await sr.entities.AuditLog.create({ entity_type: resolvedRow.entity_type, entity_id: resolvedIds[Object.keys(resolvedIds)[0]] || null, entity_name: resolvedRow.normalized_data.name || resolvedRow.normalized_data.first_name || 'import_row', action: 'import_committed', before_data: null, after_data: { row_number: resolvedRow.row_number, resolved_ids: resolvedIds, alias_actions: resolvedRow.alias_actions }, performed_by: user.id, performed_by_name: user.full_name || user.email, timestamp: new Date().toISOString(), notes: `Committed via commitResolvedImport — run ${import_run_id}` }).catch(() => {});

        committed++;
      } catch (err) {
        errors.push({ row: resolvedRow.row_number, error: err.message });
        failed++;
      }
    }

    // ── CERTIFICATION ──────────────────────────────────────────────────────────
    let certification = 'PASS';
    if (failed > 0 && committed === 0) certification = 'FAILED';
    else if (failed > 0 || skipped > 0) certification = 'PASS_WITH_WARNINGS';

    // ── OperationLog ───────────────────────────────────────────────────────────
    await sr.entities.OperationLog.create({ operation_type: 'import_committed', entity_name: 'Import', user_email: user.email, status: certification === 'FAILED' ? 'failed' : 'completed', metadata: { import_run_id, source_name, committed, failed, skipped, created: created_ids.length, updated: updated_ids.length, aliases: alias_ids.length, certification } }).catch(() => {});

    return Response.json({
      ok: committed > 0 || dry_run, dry_run: false, import_run_id, certification,
      committed, failed, skipped, blocked_count: blockedRows.length,
      created_ids, updated_ids, alias_ids, errors,
      summary: `Committed ${committed} rows — ${created_ids.length} created, ${updated_ids.length} updated, ${alias_ids.length} aliases registered`,
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});