/**
 * runPublicRouteAudit.js  (admin only)
 *
 * Audits public-facing entity routes for:
 *  1. missing_slug       — no slug field on entity
 *  2. duplicate_slug     — same slug on multiple records of same type
 *  3. invisible_public   — record has slug but status/profile blocks public display
 *  4. missing_display    — record exists in lists but missing a required display field (name)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function auditEntityRoutes(records, entity_type) {
  const missing_slug = [];
  const duplicate_slug_map = new Map();
  const invisible_public = [];
  const missing_display = [];

  for (const r of records) {
    const name = r.name || (entity_type === 'driver' ? `${r.first_name || ''} ${r.last_name || ''}`.trim() : '');

    if (!name) {
      missing_display.push({ id: r.id, issue: 'missing_name' });
    }

    if (!r.slug) {
      missing_slug.push({ id: r.id, name });
    } else {
      const arr = duplicate_slug_map.get(r.slug) || [];
      arr.push({ id: r.id, name });
      duplicate_slug_map.set(r.slug, arr);
    }

    // Visibility check: slug exists but entity is hidden
    if (r.slug) {
      // Use the renamed canonical fields per entity type
      const isHidden =
        r.racing_status === 'Inactive' ||
        r.operational_status === 'Inactive' ||
        r.visibility_status === 'draft' ||
        (r.public_status || '').toLowerCase() === 'draft' ||
        (r.public_status || '').toLowerCase() === 'archived';
      if (isHidden) {
        invisible_public.push({
          id: r.id, name, slug: r.slug,
          racing_status: r.racing_status,
          operational_status: r.operational_status,
          visibility_status: r.visibility_status,
          public_status: r.public_status,
        });
      }
    }
  }

  const duplicate_slug = [];
  for (const [slug, group] of duplicate_slug_map) {
    if (group.length > 1) {
      duplicate_slug.push({ slug, count: group.length, records: group });
    }
  }

  return {
    total: records.length,
    missing_slug: missing_slug.slice(0, 50),
    duplicate_slug,
    invisible_public: invisible_public.slice(0, 50),
    missing_display: missing_display.slice(0, 50),
    counts: {
      missing_slug: missing_slug.length,
      duplicate_slug: duplicate_slug.length,
      invisible_public: invisible_public.length,
      missing_display: missing_display.length,
    },
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const sr = base44.asServiceRole;

    const [drivers, teams, tracks, series, events] = await Promise.all([
      sr.entities.Driver.list('-created_date', 2000),
      sr.entities.Team.list('-created_date', 2000),
      sr.entities.Track.list('-created_date', 2000),
      sr.entities.Series.list('-created_date', 2000),
      sr.entities.Event.list('-created_date', 2000),
    ]);

    const result = {
      drivers: auditEntityRoutes(drivers, 'driver'),
      teams:   auditEntityRoutes(teams,   'team'),
      tracks:  auditEntityRoutes(tracks,  'track'),
      series:  auditEntityRoutes(series,  'series'),
      events:  auditEntityRoutes(events,  'event'),
    };

    const summary = {
      missing_slug_count:    Object.values(result).reduce((s, r) => s + r.counts.missing_slug,    0),
      duplicate_slug_count:  Object.values(result).reduce((s, r) => s + r.counts.duplicate_slug,  0),
      invisible_public_count:Object.values(result).reduce((s, r) => s + r.counts.invisible_public, 0),
      missing_display_count: Object.values(result).reduce((s, r) => s + r.counts.missing_display,  0),
    };
    result.summary = summary;

    await sr.entities.OperationLog.create({
      operation_type: 'diagnostics_run',
      entity_name: 'Diagnostics',
      status: 'success',
      metadata: { audit: 'public_routes', ...summary, audited_by: user.email },
    }).catch(() => {});

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});