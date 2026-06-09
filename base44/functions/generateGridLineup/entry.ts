/**
 * generateGridLineup
 * R9BP Sprint 1 — Generates a GridLineup from qualifying results, random draw, or manual.
 * Does NOT modify Results or Sessions — GridLineup records only.
 * Permission: admin OR canGenerateLineup
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALLOWED_ROLES = ['Race Director', 'Competition Director', 'Timing and Scoring'];

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildRows(orderedEntries, inversionCount = 0) {
  // Apply inversion: swap positions 1..inversionCount
  let rows = orderedEntries.map((e, idx) => ({
    position: idx + 1,
    driver_id: e.driver_id || '',
    entry_id: e.entry_id || e.id || '',
    car_number: e.car_number || '',
    source_position: idx + 1,
    status: 'Active',
    status_reason: '',
  }));

  // Inversion: reverse top N positions
  if (inversionCount > 1 && inversionCount <= rows.length) {
    const topSlice = rows.slice(0, inversionCount).reverse();
    rows = [...topSlice, ...rows.slice(inversionCount)];
    rows = rows.map((r, idx) => ({ ...r, position: idx + 1 }));
  }

  // Assign row and lane (2-wide grid: odd = inside, even = outside)
  rows = rows.map((r) => ({
    ...r,
    row: Math.ceil(r.position / 2),
    lane: r.position % 2 === 1 ? 'Inside' : 'Outside',
  }));

  return rows;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      event_id, session_id, event_class_id, series_class_id,
      generation_method, source_session_id, inversion_count, notes,
    } = body;

    if (!event_id) return Response.json({ error: 'event_id is required' }, { status: 400 });
    if (!session_id) return Response.json({ error: 'session_id is required' }, { status: 400 });
    if (!generation_method) return Response.json({ error: 'generation_method is required' }, { status: 400 });

    // Permission check
    if (user.role !== 'admin') {
      const officials = await base44.asServiceRole.entities.EventOfficial.filter({
        event_id, user_id: user.id,
      });
      const permitted = officials.some(
        (o) => ALLOWED_ROLES.includes(o.role) && ['Invited', 'Confirmed', 'Active'].includes(o.status)
      );
      if (!permitted) return Response.json({ error: 'Forbidden: canGenerateLineup required' }, { status: 403 });
    }

    let rows = [];

    if (generation_method === 'Manual') {
      rows = [];
    } else if (generation_method === 'Random Draw') {
      // Fetch entries for the class
      const filterObj = { event_id };
      if (event_class_id) filterObj.event_class_id = event_class_id;
      else if (series_class_id) filterObj.series_class_id = series_class_id;
      const entries = await base44.asServiceRole.entities.Entry.filter(filterObj);
      const active = entries.filter((e) => e.entry_status !== 'Withdrawn');
      if (active.length === 0) return Response.json({ error: 'No active entries found for this class' }, { status: 400 });
      const shuffled = shuffleArray(active);
      rows = buildRows(shuffled, inversion_count || 0);
    } else if (generation_method === 'Qualifying Order' || generation_method === 'Inverted Qualifying') {
      if (!source_session_id) return Response.json({ error: 'source_session_id required for Qualifying Order' }, { status: 400 });
      const results = await base44.asServiceRole.entities.Results.filter({ session_id: source_session_id });
      if (results.length === 0) return Response.json({ error: 'No results found in source session' }, { status: 400 });
      // Sort by best_lap_time_ms ascending (fastest first), nulls last
      const sorted = [...results].sort((a, b) => {
        if (!a.best_lap_time_ms) return 1;
        if (!b.best_lap_time_ms) return -1;
        return a.best_lap_time_ms - b.best_lap_time_ms;
      });
      const entryLike = sorted.map((r) => ({ driver_id: r.driver_id, entry_id: r.program_id || '', car_number: '' }));
      rows = buildRows(entryLike, inversion_count || 0);
    } else if (generation_method === 'Advancement from Heat') {
      // Fetch all heat session results for this class and event
      const allSessions = await base44.asServiceRole.entities.Session.filter({ event_id });
      const heatSessions = allSessions.filter((s) => s.session_type === 'Heat');
      const allResults = [];
      for (const hs of heatSessions) {
        const heatResults = await base44.asServiceRole.entities.Results.filter({ session_id: hs.id });
        allResults.push(...heatResults);
      }
      if (allResults.length === 0) return Response.json({ error: 'No heat results found' }, { status: 400 });
      // Sort by position ascending within each heat, then aggregate
      const sorted = [...allResults]
        .filter((r) => r.status !== 'DSQ' && r.position != null)
        .sort((a, b) => (a.position || 99) - (b.position || 99));
      const seen = new Set();
      const unique = sorted.filter((r) => {
        if (seen.has(r.driver_id)) return false;
        seen.add(r.driver_id);
        return true;
      });
      const entryLike = unique.map((r) => ({ driver_id: r.driver_id, entry_id: r.program_id || '', car_number: '' }));
      rows = buildRows(entryLike, inversion_count || 0);
    } else {
      return Response.json({ error: `Unsupported generation_method: ${generation_method}` }, { status: 400 });
    }

    // Supersede existing Draft lineup for same session + class
    const existingFilter = { event_id, session_id };
    if (event_class_id) existingFilter.event_class_id = event_class_id;
    const existing = await base44.asServiceRole.entities.GridLineup.filter(existingFilter);
    for (const old of existing) {
      if (old.status === 'Draft' || old.status === 'Pending Approval') {
        await base44.asServiceRole.entities.GridLineup.update(old.id, { status: 'Superseded' });
      }
    }

    const lineup = await base44.asServiceRole.entities.GridLineup.create({
      event_id,
      session_id,
      source_session_id: source_session_id || undefined,
      event_class_id: event_class_id || undefined,
      series_class_id: series_class_id || undefined,
      generation_method,
      inversion_count: inversion_count || 0,
      status: 'Draft',
      rows,
      notes: notes || '',
    });

    base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'lineup_generated',
      status: 'success',
      entity_name: 'GridLineup',
      entity_id: lineup.id,
      event_id,
      message: `Lineup generated for session ${session_id}: ${generation_method} (${rows.length} positions)`,
      metadata: { session_id, generation_method, row_count: rows.length, inversion_count },
    }).catch(() => {});

    return Response.json({ lineup });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});