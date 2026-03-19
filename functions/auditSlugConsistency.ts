import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * auditSlugConsistency
 *
 * Read-only audit. Finds missing, duplicate, and invalid slugs
 * across MediaProfile, MediaOutlet, Driver, OutletStory, Event, Track, Series.
 *
 * Does NOT modify any data.
 *
 * Returns:
 * {
 *   missing_slugs:   [ { entity, id, name } ]
 *   duplicate_slugs: [ { entity, slug, ids: [] } ]
 *   invalid_slugs:   [ { entity, id, current_slug, expected_slug } ]
 *   entities_affected: string[]
 *   summary: { total_checked, total_missing, total_duplicates, total_invalid }
 * }
 */

// ── Same slug logic as all other functions ──────────────────────────────────
function generateEntitySlug(text) {
  if (!text) return '';
  return text.trim().toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const VALID_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isValidSlug(slug) {
  return typeof slug === 'string' && VALID_SLUG_RE.test(slug);
}

// Config: entity name → how to get the "source text" for the expected slug
const ENTITY_CONFIG = [
  { entity: 'MediaProfile',  nameField: 'display_name', slugField: 'slug',          limit: 500 },
  { entity: 'MediaOutlet',   nameField: 'name',          slugField: 'slug',          limit: 500 },
  { entity: 'Driver',        nameField: null,            slugField: 'slug',          limit: 2000 },  // name = first+last
  { entity: 'OutletStory',   nameField: 'title',         slugField: 'slug',          limit: 500 },
  { entity: 'Event',         nameField: 'name',          slugField: 'slug',          limit: 2000 },
  { entity: 'Track',         nameField: 'name',          slugField: 'canonical_slug', limit: 1000 },
  { entity: 'Series',        nameField: 'name',          slugField: 'canonical_slug', limit: 500  },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const missing_slugs   = [];
    const duplicate_slugs = [];
    const invalid_slugs   = [];
    const entities_affected = new Set();

    let total_checked = 0;

    for (const cfg of ENTITY_CONFIG) {
      const records = await base44.asServiceRole.entities[cfg.entity]
        .list('-created_date', cfg.limit).catch(() => []);

      total_checked += records.length;

      // ── 1. Missing slugs ────────────────────────────────────────────────
      const missing = records.filter(r => !r[cfg.slugField]);
      for (const r of missing) {
        const name = cfg.entity === 'Driver'
          ? `${r.first_name || ''} ${r.last_name || ''}`.trim()
          : r[cfg.nameField] || '';
        missing_slugs.push({ entity: cfg.entity, id: r.id, name });
        entities_affected.add(cfg.entity);
      }

      // ── 2. Duplicate slugs ──────────────────────────────────────────────
      const slugMap = {};
      for (const r of records) {
        const s = r[cfg.slugField];
        if (!s) continue;
        if (!slugMap[s]) slugMap[s] = [];
        slugMap[s].push(r.id);
      }
      for (const [slug, ids] of Object.entries(slugMap)) {
        if (ids.length > 1) {
          duplicate_slugs.push({ entity: cfg.entity, slug, ids });
          entities_affected.add(cfg.entity);
        }
      }

      // ── 3. Invalid slugs (format check only — do not compare to expected) ──
      for (const r of records) {
        const s = r[cfg.slugField];
        if (!s) continue; // already caught above
        if (!isValidSlug(s)) {
          const name = cfg.entity === 'Driver'
            ? `${r.first_name || ''} ${r.last_name || ''}`.trim()
            : r[cfg.nameField] || '';
          invalid_slugs.push({
            entity: cfg.entity,
            id: r.id,
            current_slug: s,
            issue: 'fails URL-safe format check (must be lowercase alphanumeric with hyphens)',
            name,
          });
          entities_affected.add(cfg.entity);
        }
      }
    }

    const summary = {
      total_checked,
      total_missing:    missing_slugs.length,
      total_duplicates: duplicate_slugs.length,
      total_invalid:    invalid_slugs.length,
    };

    return Response.json({
      success: true,
      summary,
      missing_slugs,
      duplicate_slugs,
      invalid_slugs,
      entities_affected: [...entities_affected],
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});