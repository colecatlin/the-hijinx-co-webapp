import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const PROFILE_ROUTES = {
  Driver: { basePath: 'DriverProfile', param: 'slug' },
  Team:   { basePath: 'TeamProfile',   param: 'slug' },
  Track:  { basePath: 'TrackProfile',  param: 'slug' },
  Series: { basePath: 'SeriesDetail',  param: 'slug' },
  Event:  { basePath: 'EventResults',  param: 'id'   },
};

const RACE_CORE_ORG_TYPES = { Track: 'track', Series: 'series' };

// ── Route builders ────────────────────────────────────────────────────────────

function buildPublicRoute(entityType, record) {
  const route = PROFILE_ROUTES[entityType];
  if (!route) return { ok: false, reason: `no route config for ${entityType}` };
  if (!record) return { ok: false, reason: 'record is null' };

  if (entityType === 'Event') {
    if (!record.id) return { ok: false, reason: 'event.id missing' };
    return { ok: true, href: `/${route.basePath}?id=${record.id}` };
  }

  const identifier = record.slug || record.canonical_slug || record.id;
  if (!identifier) return { ok: false, reason: `${entityType} has no slug or id` };

  const usingId = !record.slug && !record.canonical_slug;
  return {
    ok: true,
    href: `/${route.basePath}?${route.param}=${identifier}`,
    warn: usingId ? 'falling back to id — no slug present' : null,
  };
}

function buildRaceCoreRoute(entityType, entityId) {
  const orgType = RACE_CORE_ORG_TYPES[entityType];
  if (!orgType) return { ok: false, reason: `Race Core unsupported for ${entityType}` };
  if (!entityId) return { ok: false, reason: 'entityId missing' };
  return { ok: true, href: `/RegistrationDashboard?orgType=${orgType}&orgId=${entityId}` };
}

function buildEditorRoute(entityType, entityId) {
  const EDITOR_MAP = { Driver: 'DriverEditor', Team: 'EntityEditor', Track: 'EntityEditor', Series: 'EntityEditor' };
  const page = EDITOR_MAP[entityType];
  if (!page) return { ok: false, reason: `no editor for ${entityType}` };
  if (!entityId) return { ok: false, reason: 'entityId missing' };
  return { ok: true, href: `/${page}?id=${entityId}` };
}

// ── Payload verifier (server-side) ────────────────────────────────────────────

function verifyHomepageShape(data) {
  // Keys used by getHomepageData — use upcoming_events not featured_events
  const REQUIRED = ['featured_story', 'featured_drivers', 'upcoming_events', 'featured_series', 'featured_tracks'];
  const missing = REQUIRED.filter(k => !(k in data));
  const warnings = [];

  ['featured_drivers','upcoming_events','featured_series','featured_tracks'].forEach(k => {
    if (k in data && data[k] !== null && !Array.isArray(data[k])) warnings.push(`${k} is not array or null`);
    if (Array.isArray(data[k]) && data[k].length === 0) warnings.push(`${k} is empty`);
  });
  if (!data.featured_story) warnings.push('featured_story is null');

  return { ok: missing.length === 0, missing, warnings };
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const results = {
      homepage:       { ok: false, missing: [], warnings: [], error: null },
      public_routes:  { checked: 0, failures: [], warnings: [] },
      managed_routes: { checked: 0, failures: [], warnings: [] },
      linked_records: { checked: 0, failures: [], warnings: [] },
      summary:        { total_checked: 0, failures: 0, warnings: 0 },
    };

    // ── 1. Homepage payload ──────────────────────────────────────────────────
    try {
      // Use service role so this works regardless of caller's auth state
      const hpRes = await base44.asServiceRole.functions.invoke('getHomepageData', {});
      const hpData = hpRes?.data || hpRes || {};
      const hpVerify = verifyHomepageShape(hpData);
      results.homepage = { ...hpVerify, error: null };
    } catch (err) {
      results.homepage = { ok: false, missing: [], warnings: [], error: err.message };
    }

    // ── 2. Public routes — sample top 10 of each entity type ────────────────
    const SAMPLE_TYPES = ['Driver', 'Team', 'Track', 'Series', 'Event'];

    for (const entityType of SAMPLE_TYPES) {
      let records = [];
      try {
        records = await base44.entities[entityType].list('-created_date', 10);
      } catch {
        results.public_routes.failures.push({ entityType, reason: 'list() failed' });
        continue;
      }

      for (const rec of (records || [])) {
        results.public_routes.checked++;
        const check = buildPublicRoute(entityType, rec);
        if (!check.ok) {
          results.public_routes.failures.push({ entityType, id: rec.id, reason: check.reason });
        } else if (check.warn) {
          results.public_routes.warnings.push({ entityType, id: rec.id, warn: check.warn });
        }
      }
    }

    // ── 3. Managed entity routing — sample EntityCollaborator records ────────
    let collaborators = [];
    try {
      collaborators = await base44.entities.EntityCollaborator.list('-created_date', 50);
    } catch {
      results.managed_routes.failures.push({ reason: 'EntityCollaborator list() failed' });
    }

    for (const collab of (collaborators || [])) {
      results.managed_routes.checked++;
      const et = collab.entity_type;
      const eid = collab.entity_id;

      // Race Core for Track/Series
      if (et === 'Track' || et === 'Series') {
        const rc = buildRaceCoreRoute(et, eid);
        if (!rc.ok) results.managed_routes.failures.push({ entityType: et, entityId: eid, check: 'raceCore', reason: rc.reason });
      }

      // Editor route for Driver/Team/Track/Series
      if (['Driver','Team','Track','Series'].includes(et)) {
        const ed = buildEditorRoute(et, eid);
        if (!ed.ok) results.managed_routes.failures.push({ entityType: et, entityId: eid, check: 'editor', reason: ed.reason });
      }
    }

    // ── 4. Source linkage checks on sampled records ──────────────────────────
    // Drivers: team_id, primary_series_id
    let sampleDrivers = [];
    try { sampleDrivers = await base44.entities.Driver.list('-created_date', 10); } catch {}

    for (const driver of (sampleDrivers || [])) {
      if (driver.team_id) {
        results.linked_records.checked++;
        try {
          const team = await base44.entities.Team.get(driver.team_id);
          if (!team) results.linked_records.failures.push({ entityType: 'Driver', id: driver.id, field: 'team_id', value: driver.team_id, reason: 'Team not found' });
        } catch {
          results.linked_records.failures.push({ entityType: 'Driver', id: driver.id, field: 'team_id', value: driver.team_id, reason: 'fetch error' });
        }
      }
      if (driver.primary_series_id) {
        results.linked_records.checked++;
        try {
          const series = await base44.entities.Series.get(driver.primary_series_id);
          if (!series) results.linked_records.failures.push({ entityType: 'Driver', id: driver.id, field: 'primary_series_id', value: driver.primary_series_id, reason: 'Series not found' });
        } catch {
          results.linked_records.failures.push({ entityType: 'Driver', id: driver.id, field: 'primary_series_id', value: driver.primary_series_id, reason: 'fetch error' });
        }
      }
    }

    // Events: track_id, series_id
    let sampleEvents = [];
    try { sampleEvents = await base44.entities.Event.list('-created_date', 10); } catch {}

    for (const event of (sampleEvents || [])) {
      if (event.track_id) {
        results.linked_records.checked++;
        try {
          const track = await base44.entities.Track.get(event.track_id);
          if (!track) results.linked_records.failures.push({ entityType: 'Event', id: event.id, field: 'track_id', value: event.track_id, reason: 'Track not found' });
        } catch {
          results.linked_records.failures.push({ entityType: 'Event', id: event.id, field: 'track_id', value: event.track_id, reason: 'fetch error' });
        }
      }
      if (event.series_id) {
        results.linked_records.checked++;
        try {
          const series = await base44.entities.Series.get(event.series_id);
          if (!series) results.linked_records.failures.push({ entityType: 'Event', id: event.id, field: 'series_id', value: event.series_id, reason: 'Series not found' });
        } catch {
          results.linked_records.failures.push({ entityType: 'Event', id: event.id, field: 'series_id', value: event.series_id, reason: 'fetch error' });
        }
      }
    }

    // ── Summary ──────────────────────────────────────────────────────────────
    const totalFailures =
      (results.homepage.ok ? 0 : 1) +
      results.public_routes.failures.length +
      results.managed_routes.failures.length +
      results.linked_records.failures.length;

    const totalWarnings =
      (results.homepage.warnings?.length || 0) +
      results.public_routes.warnings.length +
      results.managed_routes.warnings?.length || 0 +
      results.linked_records.warnings?.length || 0;

    const totalChecked =
      1 +
      results.public_routes.checked +
      results.managed_routes.checked +
      results.linked_records.checked;

    results.summary = {
      total_checked: totalChecked,
      failures: totalFailures,
      warnings: totalWarnings,
      generated_at: new Date().toISOString(),
    };

    // ── OperationLog ─────────────────────────────────────────────────────────
    try {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'data_routing_verification_run',
        entity_name: 'Diagnostics',
        status: totalFailures === 0 ? 'success' : 'error',
        metadata: {
          total_checked: totalChecked,
          failures: totalFailures,
          warnings: totalWarnings,
          run_by: user?.email,
        },
        notes: `Data routing verification: ${totalChecked} checks, ${totalFailures} failures, ${totalWarnings} warnings`,
      });
    } catch {
      // non-fatal — do not fail the response
    }

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});