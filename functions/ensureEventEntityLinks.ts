import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Compute effective_status for an EntityConfirmation record.
 * Rules:
 * - confirmed: track = accepted AND (no series OR series = accepted)
 * - rejected: track = rejected OR series = rejected
 * - pending_confirmation: otherwise
 */
function computeEffectiveStatus(trackStatus, seriesStatus, hasSeriesId) {
  if (trackStatus === 'rejected' || (hasSeriesId && seriesStatus === 'rejected')) {
    return 'rejected';
  }
  if (trackStatus === 'accepted' && (!hasSeriesId || seriesStatus === 'accepted')) {
    return 'confirmed';
  }
  return 'pending_confirmation';
}

async function ensureEntity(serviceRole, params) {
  const { entity_type, source_entity_id, name, slug, owner_user_id } = params;
  const existing = await serviceRole.entities.Entity.filter({ entity_type, source_entity_id });
  if (existing && existing.length > 0) return existing[0];
  const now = new Date().toISOString();
  return serviceRole.entities.Entity.create({
    entity_type,
    source_entity_id,
    name,
    ...(slug && { slug }),
    ...(owner_user_id && { owner_user_id }),
    created_at: now,
    updated_at: now,
  });
}

async function ensureRelationship(serviceRole, { parent_entity_id, child_entity_id, relationship_type }) {
  const existing = await serviceRole.entities.EntityRelationship.filter({
    parent_entity_id,
    child_entity_id,
    relationship_type,
  });
  if (existing && existing.length > 0) return { relationship: existing[0], created: false };
  const now = new Date().toISOString();
  const relationship = await serviceRole.entities.EntityRelationship.create({
    parent_entity_id,
    child_entity_id,
    relationship_type,
    status: 'proposed',
    created_at: now,
    updated_at: now,
  });
  return { relationship, created: true };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event_id } = await req.json();
    if (!event_id) {
      return Response.json({ error: 'event_id is required' }, { status: 400 });
    }

    const sr = base44.asServiceRole;

    // 1) Load the Event record
    const event = await sr.entities.Event.get(event_id);
    if (!event) {
      return Response.json({ error: `Event not found: ${event_id}` }, { status: 404 });
    }

    // 2) Ensure Entity records exist for Event, Track, Series
    const eventEntity = await ensureEntity(sr, {
      entity_type: 'event',
      source_entity_id: event.id,
      name: event.name,
    });

    let trackEntity = null;
    if (event.track_id) {
      // Try to get track name from Track entity
      let trackName = event.track_id;
      try {
        const track = await sr.entities.Track.get(event.track_id);
        if (track?.name) trackName = track.name;
      } catch (_) { /* non-fatal */ }

      trackEntity = await ensureEntity(sr, {
        entity_type: 'track',
        source_entity_id: event.track_id,
        name: trackName,
      });
    }

    let seriesEntity = null;
    if (event.series_id) {
      let seriesName = event.series_id;
      try {
        const series = await sr.entities.Series.get(event.series_id);
        if (series?.name) seriesName = series.name;
      } catch (_) { /* non-fatal */ }

      seriesEntity = await ensureEntity(sr, {
        entity_type: 'series',
        source_entity_id: event.series_id,
        name: seriesName,
      });
    }

    // 3) Create or confirm EntityRelationship records
    const relationships = [];
    if (trackEntity) {
      const rel = await ensureRelationship(sr, {
        parent_entity_id: trackEntity.id,
        child_entity_id: eventEntity.id,
        relationship_type: 'hosts',
      });
      relationships.push({ type: 'track_hosts_event', ...rel });
    }
    if (seriesEntity) {
      const rel = await ensureRelationship(sr, {
        parent_entity_id: seriesEntity.id,
        child_entity_id: eventEntity.id,
        relationship_type: 'sanctions',
      });
      relationships.push({ type: 'series_sanctions_event', ...rel });
    }

    // 4) Create or update EntityConfirmation
    if (!trackEntity) {
      // No track — cannot form a confirmation
      return Response.json({
        event_entity: eventEntity,
        track_entity: null,
        series_entity: seriesEntity,
        relationships,
        confirmation: null,
        warning: 'No track_id on event — EntityConfirmation not created',
      });
    }

    const hasSeriesId = !!seriesEntity;
    const defaultTrackStatus = 'pending';
    const defaultSeriesStatus = 'pending';
    const effectiveStatus = computeEffectiveStatus(defaultTrackStatus, defaultSeriesStatus, hasSeriesId);
    const now = new Date().toISOString();

    const existingConf = await sr.entities.EntityConfirmation.filter({ event_entity_id: eventEntity.id });
    let confirmation;

    if (existingConf && existingConf.length > 0) {
      // Update to set series_entity_id if it was added since last run
      confirmation = existingConf[0];
      const updates = { updated_at: now };
      if (hasSeriesId && !confirmation.series_entity_id) {
        updates.series_entity_id = seriesEntity.id;
        // Recompute effective status
        updates.effective_status = computeEffectiveStatus(
          confirmation.track_status,
          confirmation.series_status,
          true
        );
        updates.last_computed_at = now;
      }
      await sr.entities.EntityConfirmation.update(confirmation.id, updates);
      confirmation = { ...confirmation, ...updates };
    } else {
      confirmation = await sr.entities.EntityConfirmation.create({
        event_entity_id: eventEntity.id,
        track_entity_id: trackEntity.id,
        ...(hasSeriesId && { series_entity_id: seriesEntity.id }),
        track_status: defaultTrackStatus,
        series_status: defaultSeriesStatus,
        effective_status: effectiveStatus,
        last_computed_at: now,
        created_at: now,
        updated_at: now,
      });
    }

    return Response.json({
      event_entity: eventEntity,
      track_entity: trackEntity,
      series_entity: seriesEntity,
      relationships,
      confirmation,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});