/**
 * runEntityLayerAudit.js  (admin only)
 *
 * Audits the common Entity layer:
 *  1. source_without_entity    — source records with no matching Entity row
 *  2. entity_without_source    — Entity rows whose source_entity_id is dangling
 *  3. broken_event_relationships — events missing EntityRelationship for track/series
 *  4. broken_confirmations     — events missing EntityConfirmation
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const sr = base44.asServiceRole;

    // Load all data in parallel
    const [
      entities, entityRelationships, entityConfirmations,
      drivers, teams, tracks, series, events,
    ] = await Promise.all([
      sr.entities.Entity.list('-created_date', 5000),
      sr.entities.EntityRelationship.list('-created_date', 2000),
      sr.entities.EntityConfirmation.list('-created_date', 2000),
      sr.entities.Driver.list('-created_date', 2000),
      sr.entities.Team.list('-created_date', 2000),
      sr.entities.Track.list('-created_date', 2000),
      sr.entities.Series.list('-created_date', 2000),
      sr.entities.Event.list('-created_date', 2000),
    ]);

    // Build lookup maps
    const entityById = new Map(entities.map(e => [e.id, e]));
    const entityBySource = new Map(entities.map(e => [e.source_entity_id, e]));

    const sourceById = {
      driver: new Map(drivers.map(d => [d.id, d])),
      team:   new Map(teams.map(t  => [t.id, t])),
      track:  new Map(tracks.map(t => [t.id, t])),
      series: new Map(series.map(s => [s.id, s])),
      event:  new Map(events.map(e => [e.id, e])),
    };

    function sourceName(et, id) {
      const r = sourceById[et]?.get(id);
      if (!r) return `(id: ${id})`;
      if (et === 'driver') return `${r.first_name || ''} ${r.last_name || ''}`.trim();
      return r.name || id;
    }

    // ── 1. source_without_entity ──────────────────────────────────────────────
    const source_without_entity = [];
    for (const [et, map] of Object.entries(sourceById)) {
      for (const [id, r] of map) {
        if (!entityBySource.has(id)) {
          source_without_entity.push({
            entity_type: et,
            source_id: id,
            name: sourceName(et, id),
          });
        }
      }
    }

    // ── 2. entity_without_source ──────────────────────────────────────────────
    const entity_without_source = [];
    for (const e of entities) {
      const sourceMap = sourceById[e.entity_type];
      if (!sourceMap) continue;
      if (!sourceMap.has(e.source_entity_id)) {
        entity_without_source.push({
          entity_id: e.id,
          entity_type: e.entity_type,
          source_entity_id: e.source_entity_id,
          name: e.name,
        });
      }
    }

    // ── 3. broken_event_relationships ─────────────────────────────────────────
    const broken_event_relationships = [];
    const eventEntityIds = new Set(
      entities.filter(e => e.entity_type === 'event').map(e => e.id)
    );
    // Build map: event_entity_id → relationships
    const relsByEventEntity = new Map();
    for (const rel of entityRelationships) {
      // find the "event" side
      const parent = entityById.get(rel.parent_entity_id);
      const child  = entityById.get(rel.child_entity_id);
      if (child?.entity_type === 'event') {
        const arr = relsByEventEntity.get(rel.child_entity_id) || [];
        arr.push(rel);
        relsByEventEntity.set(rel.child_entity_id, arr);
      }
      if (parent?.entity_type === 'event') {
        const arr = relsByEventEntity.get(rel.parent_entity_id) || [];
        arr.push(rel);
        relsByEventEntity.set(rel.parent_entity_id, arr);
      }
    }

    for (const eventEntity of entities.filter(e => e.entity_type === 'event')) {
      const eventSrc = sourceById.event.get(eventEntity.source_entity_id);
      if (!eventSrc) continue;
      const rels = relsByEventEntity.get(eventEntity.id) || [];
      const hasTrack  = rels.some(r => {
        const other = entityById.get(r.parent_entity_id === eventEntity.id ? r.child_entity_id : r.parent_entity_id);
        return other?.entity_type === 'track';
      });
      const hasSeries = !eventSrc.series_id ? true : rels.some(r => {
        const other = entityById.get(r.parent_entity_id === eventEntity.id ? r.child_entity_id : r.parent_entity_id);
        return other?.entity_type === 'series';
      });

      if (!hasTrack || !hasSeries) {
        broken_event_relationships.push({
          event_entity_id: eventEntity.id,
          event_source_id: eventEntity.source_entity_id,
          name: eventEntity.name || eventSrc.name,
          missing: [!hasTrack && 'track_hosts_relationship', !hasSeries && 'series_sanctions_relationship'].filter(Boolean),
        });
      }
    }

    // ── 4. broken_confirmations ───────────────────────────────────────────────
    const confirmationsByEvent = new Map(entityConfirmations.map(c => [c.event_entity_id, c]));
    const broken_confirmations = [];
    for (const eventEntity of entities.filter(e => e.entity_type === 'event')) {
      if (!confirmationsByEvent.has(eventEntity.id)) {
        broken_confirmations.push({
          event_entity_id: eventEntity.id,
          name: eventEntity.name,
          issue: 'no_entity_confirmation_record',
        });
      }
    }
    // Also check confirmations referencing missing entity rows
    for (const c of entityConfirmations) {
      if (!entityById.has(c.event_entity_id)) {
        broken_confirmations.push({
          confirmation_id: c.id,
          event_entity_id: c.event_entity_id,
          issue: 'event_entity_id_dangling',
        });
      }
      if (!entityById.has(c.track_entity_id)) {
        broken_confirmations.push({
          confirmation_id: c.id,
          track_entity_id: c.track_entity_id,
          issue: 'track_entity_id_dangling',
        });
      }
    }

    const summary = {
      source_without_entity_count:      source_without_entity.length,
      entity_without_source_count:      entity_without_source.length,
      broken_event_relationships_count: broken_event_relationships.length,
      broken_confirmations_count:       broken_confirmations.length,
    };

    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'diagnostics_run',
      entity_name: 'Diagnostics',
      status: 'success',
      metadata: { audit: 'entity_layer', ...summary, audited_by: user.email },
    }).catch(() => {});

    return Response.json({
      source_without_entity: source_without_entity.slice(0, 100),
      entity_without_source: entity_without_source.slice(0, 100),
      broken_event_relationships: broken_event_relationships.slice(0, 100),
      broken_confirmations: broken_confirmations.slice(0, 100),
      summary,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});