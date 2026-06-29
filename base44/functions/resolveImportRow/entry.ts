/**
 * resolveImportRow.js — R9EB.2
 *
 * Canonical Import Resolution Engine.
 *
 * This function is the SOLE decision-maker for all imports.
 * It produces a deterministic Resolution Plan for a single raw CSV row.
 *
 * CONTRACT:
 *   - NO database mutations occur here
 *   - NO entity creation happens here
 *   - ONLY returns a validated ResolvedImportRow object
 *   - commitResolvedImport is responsible for all writes
 *
 * Execution order:
 *   1. Normalize row
 *   2. Detect entity type from row fields
 *   3. Resolve PersonIdentity (Driver rows only — read-only probe)
 *   4. Resolve Driver
 *   5. Resolve Team
 *   6. Resolve Track
 *   7. Resolve Series
 *   8. Resolve SeriesClass
 *   9. Resolve Event
 *   10. Resolve Session
 *   11. Resolve Entry / Result / Standing (operational)
 *   12. Validate resolution plan
 *   13. Build decision trace
 *   14. Return ResolvedImportRow
 *
 * Input:
 *   {
 *     row_number, raw_row, entity_type, import_run_id, source_name,
 *     source_type, is_historical?, context?
 *   }
 *
 * Output: ResolvedImportRow
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── Normalization ──────────────────────────────────────────────────────────────

function stripNicknames(name) {
  return name.replace(/"[^"]*"/g, '').replace(/'[^']*'/g, '').replace(/\s+/g, ' ').trim();
}
function detectSurnameFirst(name) {
  return /^[^,]+,\s*.+$/.test(name.trim());
}
function invertSurnameFirst(name) {
  const parts = name.split(',');
  if (parts.length < 2) return name;
  return `${parts.slice(1).join(',').trim()} ${parts[0].trim()}`;
}
function normalizeDriverName(name) {
  if (!name) return null;
  let n = name.trim();
  if (!n) return null;
  n = stripNicknames(n);
  if (detectSurnameFirst(n)) n = invertSurnameFirst(n);
  n = n.toLowerCase();
  n = n.replace(/\b(jr\.?|sr\.?|ii|iii|iv)\b/g, '').trim();
  n = n.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  let prev = '';
  while (prev !== n) { prev = n; n = n.replace(/\b([a-z])\s+(?=[a-z](\s|$))/g, '$1'); }
  return n.replace(/\s+/g, ' ').trim() || null;
}
function normalizeEntityName(name, type) {
  if (!name) return null;
  let n = name.trim().toLowerCase();
  n = n.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (type === 'SeriesClass') {
    n = n.replace(/([a-z])(\d)/g, '$1 $2').replace(/(\d)([a-z])/g, '$1 $2').replace(/\s+/g, ' ').trim();
  }
  return n || null;
}
function buildCanonicalKey(type, name, externalUid, parentCtx) {
  const t = type.toLowerCase();
  if (externalUid) return `${t}:${externalUid}`;
  const norm = normalizeEntityName(name, type) || '';
  return parentCtx ? `${t}:${norm}:${parentCtx}` : `${t}:${norm}`;
}

// ── Resolution actions ─────────────────────────────────────────────────────────
const MATCH_EXISTING  = 'MATCH_EXISTING';
const MATCH_ALIAS     = 'MATCH_ALIAS';
const CREATE_NEW      = 'CREATE_NEW';
const UPDATE_EXISTING = 'UPDATE_EXISTING';
const REVIEW_REQUIRED = 'REVIEW_REQUIRED';
const BLOCK_IMPORT    = 'BLOCK_IMPORT';
const NO_ACTION       = 'NO_ACTION';

// ── Entity resolver: generic (Team, Track, Series, Event) ─────────────────────
async function resolveEntity(sr, modelName, name, externalUid, context = {}) {
  if (!name && !externalUid) return { action: NO_ACTION, entity: null, match_type: null, confidence: 0, trace: [] };

  const trace = [];
  let entity = null;
  let match_type = null;
  let action = null;
  let alias_name = null;

  const norm = modelName === 'Driver' ? normalizeDriverName(name) : normalizeEntityName(name, modelName);

  // Step 1: external_uid
  if (!entity && externalUid) {
    const rows = await sr.entities[modelName].filter({ external_uid: externalUid }).catch(() => []);
    if (rows.length > 0) { entity = rows[0]; match_type = 'external_uid'; trace.push(`external_uid match → ${entity.id}`); }
  }

  // Step 2: canonical_key
  if (!entity && name) {
    let parentCtx = null;
    if (modelName === 'SeriesClass' && context.series_id) parentCtx = context.series_id;
    const ck = buildCanonicalKey(modelName, name, externalUid, parentCtx);
    const rows = await sr.entities[modelName].filter({ canonical_key: ck }).catch(() => []);
    if (rows.length > 0) { entity = rows[0]; match_type = 'canonical_key'; trace.push(`canonical_key match → ${entity.id}`); }
  }

  // Step 3: EntityAlias lookup
  if (!entity && norm) {
    const aliasRows = await sr.entities.EntityAlias.filter({ entity_type: modelName, alias_normalized: norm, active: true }).catch(() => []);
    if (aliasRows.length === 1) {
      const candidates = await sr.entities[modelName].filter({ id: aliasRows[0].entity_id }).catch(() => []);
      if (candidates.length > 0) {
        entity = candidates[0];
        match_type = 'entity_alias';
        alias_name = aliasRows[0].alias_name;
        trace.push(`EntityAlias match: "${aliasRows[0].alias_name}" → ${entity.id}`);
      }
    } else if (aliasRows.length > 1) {
      trace.push(`EntityAlias ambiguous: ${aliasRows.length} candidates for "${norm}"`);
      return { action: REVIEW_REQUIRED, entity: null, match_type: 'entity_alias_ambiguous', confidence: 50, trace, alias_name: norm };
    }
  }

  // Step 4: normalized_name
  if (!entity && norm) {
    const rows = await sr.entities[modelName].filter({ normalized_name: norm }).catch(() => []);
    if (rows.length === 1) { entity = rows[0]; match_type = 'normalized_name'; trace.push(`normalized_name match → ${entity.id}`); }
    else if (rows.length > 1) { trace.push(`normalized_name ambiguous: ${rows.length} matches`); }
  }

  if (entity) {
    action = match_type === 'entity_alias' ? MATCH_ALIAS : MATCH_EXISTING;
    return { action, entity, match_type, confidence: match_type === 'external_uid' ? 100 : match_type === 'canonical_key' ? 95 : match_type === 'entity_alias' ? 100 : 80, trace, alias_name };
  }

  // No match → new entity candidate
  trace.push(`No match found for "${name}" (normalized: "${norm}")`);
  return { action: CREATE_NEW, entity: null, match_type: null, confidence: 0, trace };
}

// ── Validation checks ──────────────────────────────────────────────────────────
function buildValidation(resolutions, rawRow, entityType, isHistorical) {
  const checks = [];
  const push = (name, status, msg) => checks.push({ check: name, status, message: msg });

  // Required fields per entity type
  const requiredMap = {
    Driver:      [['first_name','last_name'], 'Driver requires first_name or last_name'],
    Team:        [['name'], 'Team requires name'],
    Track:       [['name','location_city'], 'Track requires name and location_city'],
    Series:      [['name','discipline'], 'Series requires name and discipline'],
    Event:       [['name','event_date'], 'Event requires name and event_date'],
    Results:     [['driver_id','event_id','session_id'], 'Result requires driver_id, event_id, session_id'],
    Entry:       [['event_id','driver_id','car_number'], 'Entry requires event_id, driver_id, car_number'],
    Standings:   [['series_id','season_year','driver_id'], 'Standings requires series_id, season_year, driver_id'],
    Session:     [['event_id','session_type','name'], 'Session requires event_id, session_type, name'],
    SeriesClass: [['series_id','class_name'], 'SeriesClass requires series_id and class_name'],
    EventClass:  [['event_id','class_name'], 'EventClass requires event_id and class_name'],
  };
  const req = requiredMap[entityType];
  if (req) {
    const [fields, msg] = req;
    const ok = fields.some(f => rawRow[f] && rawRow[f] !== '');
    push('required_fields', ok ? 'PASS' : 'FAIL', ok ? 'Required fields present' : msg);
  }

  // Driver resolved?
  if (resolutions.driver) {
    const d = resolutions.driver;
    if (d.action === BLOCK_IMPORT) push('driver_resolution', 'BLOCKED', d.block_reason || 'Driver blocked');
    else if (d.action === REVIEW_REQUIRED) push('driver_resolution', 'WARNING', 'Driver needs review');
    else if (d.action === CREATE_NEW) push('driver_resolution', 'WARNING', 'New driver will be created');
    else push('driver_resolution', 'PASS', `Driver resolved: ${d.entity?.id}`);
  }

  // Identity resolved?
  if (resolutions.identity) {
    const id = resolutions.identity;
    if (id.action === 'BLOCKED') push('identity_resolution', 'BLOCKED', id.reason || 'Identity blocked');
    else if (id.action === 'REVIEW') push('identity_resolution', 'WARNING', 'Identity needs human review');
    else push('identity_resolution', 'PASS', `Identity: ${id.action}`);
  }

  // Session round check (Results/Standings)
  if ((entityType === 'Results' || entityType === 'Standings') && resolutions.session?.entity) {
    const sess = resolutions.session.entity;
    const isPointsSession = sess.session_type === 'Final' || sess.points_enabled;
    if (isPointsSession && !sess.round_number && !rawRow.round_number) {
      push('round_assignment', 'WARNING', 'Points session missing round_number');
    } else {
      push('round_assignment', 'PASS', 'Round assignment OK');
    }
  }

  // Historical safety
  if (isHistorical) {
    push('historical_safety', 'PASS', 'is_historical=true, standings_hold=true will be enforced');
  }

  // Duplicate detection (basic key check)
  if (entityType === 'Results' && rawRow.driver_id && rawRow.session_id) {
    push('duplicate_check', 'WARNING', 'Duplicate check will run at commit time');
  }

  const hasFail = checks.some(c => c.status === 'FAIL');
  const hasBlocked = checks.some(c => c.status === 'BLOCKED');
  const hasWarn = checks.some(c => c.status === 'WARNING');
  const overall = hasBlocked ? 'BLOCKED' : hasFail ? 'FAIL' : hasWarn ? 'WARNING' : 'PASS';

  return { checks, overall };
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
      row_number = 0,
      raw_row = {},
      entity_type,
      import_run_id = null,
      source_name = 'manual',
      source_type = 'csv_import',
      is_historical = false,
      context = {},
    } = body;

    if (!entity_type) return Response.json({ error: 'entity_type is required' }, { status: 400 });
    if (!raw_row || Object.keys(raw_row).length === 0) return Response.json({ error: 'raw_row is required' }, { status: 400 });

    const sr = base44.asServiceRole;
    const trace = [`Row ${row_number}: resolving as ${entity_type}`];
    const resolutions = {};
    const warnings = [];
    const errors = [];

    // ── NORMALIZE ROW ──────────────────────────────────────────────────────────
    const normalized_data = {};
    for (const [k, v] of Object.entries(raw_row)) {
      normalized_data[k] = typeof v === 'string' ? v.trim() : v;
    }

    // Build display name
    let displayName = '';
    if (entity_type === 'Driver') {
      displayName = `${normalized_data.first_name || ''} ${normalized_data.last_name || ''}`.trim();
    } else {
      displayName = normalized_data.name || normalized_data.full_name || normalized_data.series_name || normalized_data.team_name || normalized_data.track_name || '';
    }

    // ── RESOLVE ENTITIES (read-only) ───────────────────────────────────────────

    // PersonIdentity (Driver rows only) — lightweight probe, no DB writes
    if (entity_type === 'Driver' && displayName) {
      trace.push(`Probing PersonIdentity for "${displayName}"`);
      const norm = normalizeDriverName(displayName);

      // Check external_uid first
      let identity = null;
      let identityAction = 'NEW_IDENTITY';
      let identitySignals = [];
      let identityConfidence = 0;

      if (normalized_data.external_uid) {
        const rows = await sr.entities.PersonIdentity.filter({ external_uid: normalized_data.external_uid }).catch(() => []);
        if (rows.length > 0) { identity = rows[0]; identityAction = 'ATTACHED'; identityConfidence = 100; identitySignals = ['external_uid_exact:100']; }
      }
      if (!identity && norm) {
        const allIdentities = await sr.entities.PersonIdentity.filter({ status: 'active' }).catch(() => []);
        const allAliases = await sr.entities.IdentityAlias.filter({ active: true }).catch(() => []);
        const aliasMap = new Map();
        for (const a of allAliases) {
          const k = a.alias_normalized || normalizeDriverName(a.alias_name);
          if (k) { if (!aliasMap.has(k)) aliasMap.set(k, []); aliasMap.get(k).push(a); }
        }
        let best = 0, bestId = null, bestSigs = [];
        for (const id of allIdentities) {
          if (id.status === 'merged') continue;
          let s = 0; const sigs = [];
          if (normalized_data.date_of_birth && id.date_of_birth && normalized_data.date_of_birth !== id.date_of_birth) continue;
          if (normalized_data.date_of_birth && id.date_of_birth && normalized_data.date_of_birth === id.date_of_birth) { s += 90; sigs.push('dob_exact:90'); }
          const idNorm = normalizeDriverName(id.canonical_name);
          if (idNorm && norm === idNorm) { s += 55; sigs.push('canonical_name_match:55'); }
          if (id.legal_name) { const ln = normalizeDriverName(id.legal_name); if (ln && norm === ln) { s += 85; sigs.push('legal_name_exact:85'); } }
          const ams = aliasMap.get(norm) || [];
          for (const a of ams) {
            if (a.identity_id !== id.id) continue;
            const w = { legal: 85, abbreviation: 75, informal: 70, nickname: 60, surname_first: 55 }[a.alias_type] || 50;
            s += w; sigs.push(`alias_${a.alias_type}:${w}`); break;
          }
          if (s > best) { best = s; bestId = id; bestSigs = sigs; }
        }
        if (bestId && best > 0) {
          identityConfidence = Math.min(best, 100);
          identitySignals = bestSigs;
          identity = bestId;
          if (identityConfidence >= 95) identityAction = 'ATTACHED';
          else if (identityConfidence >= 80) identityAction = 'REVIEW';
          else identityAction = 'NEW_IDENTITY';
          // DOB/License hard gates
          if (identity && normalized_data.date_of_birth && identity.date_of_birth && normalized_data.date_of_birth !== identity.date_of_birth) {
            identityAction = 'BLOCKED'; identityConfidence = 0; identitySignals.push('HARD_GATE:DOB_CONFLICT');
          }
        }
      }
      resolutions.identity = { action: identityAction, identity_id: identity?.id || null, identity_name: identity?.canonical_name || null, confidence: identityConfidence, signals: identitySignals, reason: identityAction === 'BLOCKED' ? 'DOB_CONFLICT' : identityAction === 'REVIEW' ? 'score_below_threshold' : 'ok' };
      trace.push(`PersonIdentity: ${identityAction} (confidence ${identityConfidence})`);
      if (identityAction === 'BLOCKED') errors.push(`Identity BLOCKED: DOB conflict for "${displayName}"`);
      if (identityAction === 'REVIEW') warnings.push(`Identity REVIEW required for "${displayName}" (confidence ${identityConfidence})`);
    }

    // Driver
    if (entity_type === 'Driver' || normalized_data.driver_name || (normalized_data.first_name && normalized_data.last_name)) {
      const driverName = entity_type === 'Driver' ? displayName : (normalized_data.driver_name || `${normalized_data.first_name || ''} ${normalized_data.last_name || ''}`.trim());
      if (driverName) {
        const norm = normalizeDriverName(driverName);
        let driverRes = { action: NO_ACTION, entity: null, match_type: null, confidence: 0, trace: [] };

        // exact driver_id
        if (normalized_data.driver_id) {
          const dr = await sr.entities.Driver.filter({ id: normalized_data.driver_id }).catch(() => []);
          if (dr.length > 0) { driverRes = { action: MATCH_EXISTING, entity: dr[0], match_type: 'driver_id', confidence: 100, trace: [`driver_id exact match → ${dr[0].id}`] }; }
        }
        if (!driverRes.entity) {
          // EntityAlias lookup
          if (norm) {
            const aliasRows = await sr.entities.EntityAlias.filter({ entity_type: 'Driver', alias_normalized: norm, active: true }).catch(() => []);
            if (aliasRows.length === 1) {
              const dr = await sr.entities.Driver.filter({ id: aliasRows[0].entity_id }).catch(() => []);
              if (dr.length > 0) { driverRes = { action: MATCH_ALIAS, entity: dr[0], match_type: 'entity_alias', confidence: 100, trace: [`EntityAlias → ${dr[0].id}`], alias_name: aliasRows[0].alias_name }; }
            }
          }
        }
        if (!driverRes.entity && norm) {
          const nameMatches = await sr.entities.Driver.filter({ normalized_name: norm }).catch(() => []);
          if (nameMatches.length === 1) driverRes = { action: MATCH_EXISTING, entity: nameMatches[0], match_type: 'normalized_name', confidence: 80, trace: [`normalized_name match → ${nameMatches[0].id}`] };
          else if (nameMatches.length === 0) driverRes = { action: entity_type === 'Driver' ? CREATE_NEW : REVIEW_REQUIRED, entity: null, match_type: null, confidence: 0, trace: [`No driver match for "${driverName}"`] };
          else driverRes = { action: REVIEW_REQUIRED, entity: null, match_type: 'ambiguous', confidence: 30, trace: [`${nameMatches.length} ambiguous driver matches for "${driverName}"`] };
        }
        resolutions.driver = driverRes;
        trace.push(`Driver: ${driverRes.action} (${driverRes.match_type || 'no match'})`);
      }
    }

    // Team
    const teamName = normalized_data.team_name || (entity_type === 'Team' ? displayName : null);
    if (teamName) {
      resolutions.team = await resolveEntity(sr, 'Team', teamName, normalized_data.team_external_uid || null, context);
      trace.push(`Team: ${resolutions.team.action} (${resolutions.team.match_type || 'none'})`);
    }

    // Track
    const trackName = normalized_data.track_name || (entity_type === 'Track' ? displayName : null);
    if (trackName) {
      resolutions.track = await resolveEntity(sr, 'Track', trackName, normalized_data.track_external_uid || null, context);
      trace.push(`Track: ${resolutions.track.action} (${resolutions.track.match_type || 'none'})`);
    }

    // Series
    const seriesName = normalized_data.series_name || (entity_type === 'Series' ? displayName : null);
    if (seriesName) {
      resolutions.series = await resolveEntity(sr, 'Series', seriesName, normalized_data.series_external_uid || null, context);
      trace.push(`Series: ${resolutions.series.action} (${resolutions.series.match_type || 'none'})`);
    }

    // SeriesClass
    const className = normalized_data.class_name || normalized_data.series_class_name || (entity_type === 'SeriesClass' ? displayName : null);
    if (className) {
      const classCtx = { series_id: normalized_data.series_id || resolutions.series?.entity?.id || null };
      resolutions.series_class = await resolveEntity(sr, 'SeriesClass', className, null, classCtx);
      trace.push(`SeriesClass: ${resolutions.series_class.action}`);
    }

    // Event
    const eventName = normalized_data.event_name || normalized_data.name && entity_type === 'Event' ? normalized_data.name : null;
    if (eventName || normalized_data.event_id) {
      if (normalized_data.event_id) {
        const ev = await sr.entities.Event.filter({ id: normalized_data.event_id }).catch(() => []);
        resolutions.event = ev.length > 0 ? { action: MATCH_EXISTING, entity: ev[0], match_type: 'event_id', confidence: 100, trace: [`event_id match`] } : { action: REVIEW_REQUIRED, entity: null, match_type: null, confidence: 0, trace: [`event_id not found: ${normalized_data.event_id}`] };
      } else if (eventName) {
        resolutions.event = await resolveEntity(sr, 'Event', eventName, normalized_data.event_external_uid || null, context);
      }
      trace.push(`Event: ${resolutions.event?.action || NO_ACTION}`);
    }

    // Session
    if (normalized_data.session_id || (normalized_data.session_type && normalized_data.event_id)) {
      if (normalized_data.session_id) {
        const sess = await sr.entities.Session.filter({ id: normalized_data.session_id }).catch(() => []);
        resolutions.session = sess.length > 0 ? { action: MATCH_EXISTING, entity: sess[0], match_type: 'session_id', confidence: 100, trace: [`session_id match`] } : { action: REVIEW_REQUIRED, entity: null, match_type: null, confidence: 0, trace: [`session_id not found`] };
      } else {
        const sessKey = `session:${normalized_data.event_id}:${normalizeEntityName(normalized_data.name || normalized_data.session_name || '', 'Session')}`;
        const sess = await sr.entities.Session.filter({ canonical_key: sessKey }).catch(() => []);
        resolutions.session = sess.length > 0 ? { action: MATCH_EXISTING, entity: sess[0], match_type: 'canonical_key', confidence: 95, trace: [`session canonical_key match`] } : { action: entity_type === 'Session' ? CREATE_NEW : REVIEW_REQUIRED, entity: null, match_type: null, confidence: 0, trace: [`No session match`] };
      }
      trace.push(`Session: ${resolutions.session.action}`);
    }

    // ── BUILD RESOLUTION PLAN ───────────────────────────────────────────────────
    const entity_resolution = {};
    for (const [key, res] of Object.entries(resolutions)) {
      if (key === 'identity') continue;
      entity_resolution[key] = {
        action: res.action,
        entity_id: res.entity?.id || null,
        entity_name: res.entity?.name || res.entity?.canonical_name || (res.entity?.first_name ? `${res.entity.first_name} ${res.entity.last_name}` : null) || null,
        match_type: res.match_type || null,
        confidence: res.confidence || 0,
        alias_name: res.alias_name || null,
        trace: res.trace || [],
      };
    }

    // ── VALIDATION ──────────────────────────────────────────────────────────────
    const validation = buildValidation(resolutions, normalized_data, entity_type, is_historical);

    // ── CONFIDENCE SCORE ────────────────────────────────────────────────────────
    const resolvedCount = Object.values(entity_resolution).filter(r => r.action === MATCH_EXISTING || r.action === MATCH_ALIAS).length;
    const totalResolvable = Object.keys(entity_resolution).length;
    const avgConfidence = totalResolvable > 0
      ? Object.values(entity_resolution).reduce((sum, r) => sum + (r.confidence || 0), 0) / totalResolvable
      : 80;
    const confidence_score = Math.round(avgConfidence);

    // ── OVERALL STATUS ──────────────────────────────────────────────────────────
    const hasBlock = validation.overall === 'BLOCKED' || Object.values(entity_resolution).some(r => r.action === BLOCK_IMPORT) || resolutions.identity?.action === 'BLOCKED';
    const hasReview = validation.overall === 'WARNING' || Object.values(entity_resolution).some(r => r.action === REVIEW_REQUIRED) || resolutions.identity?.action === 'REVIEW';
    const requires_review = hasReview && !hasBlock;
    const ready_to_commit = !hasBlock && !hasReview && validation.overall !== 'FAIL';

    // ── COMMIT PLAN ─────────────────────────────────────────────────────────────
    const created_entities = Object.entries(entity_resolution).filter(([, r]) => r.action === CREATE_NEW).map(([k]) => k);
    const updated_entities = Object.entries(entity_resolution).filter(([, r]) => r.action === UPDATE_EXISTING).map(([k]) => k);
    const alias_actions = Object.entries(entity_resolution).filter(([, r]) => r.action === MATCH_ALIAS).map(([k, r]) => ({ entity: k, alias: r.alias_name, canonical_id: r.entity_id }));

    // ── BUILD ResolvedImportRow ─────────────────────────────────────────────────
    const resolved_row = {
      row_number,
      source_name,
      source_type,
      import_run_id,
      raw_data: raw_row,
      normalized_data,
      entity_type,
      entity_resolution,
      identity_resolution: resolutions.identity || null,
      validation,
      diagnostics: { trace },
      warnings,
      errors,
      confidence_score,
      requires_review,
      ready_to_commit,
      created_entities,
      updated_entities,
      alias_actions,
      reference_repairs: [],
      commit_summary: {
        will_create: created_entities,
        will_update: updated_entities,
        will_alias: alias_actions.map(a => a.entity),
        blocked: hasBlock,
        needs_review: requires_review,
      },
    };

    return Response.json(resolved_row);

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});