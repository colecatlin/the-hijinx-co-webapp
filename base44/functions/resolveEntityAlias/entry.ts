/**
 * resolveEntityAlias.js — R9EB.1
 *
 * Universal alias resolution engine for ALL RaceCore entities.
 *
 * LOOKUP ORDER (enforced — never skip):
 *   1. external_uid
 *   2. canonical_key
 *   3. EntityAlias exact match (alias_normalized)
 *   4. normalized entity name
 *   5. unresolved (→ caller decides: new entity or review queue)
 *
 * NORMALIZATION:
 *   - Handles punctuation, dots, hyphens, whitespace
 *   - Collapses space-separated initials: "C J" → "cj"
 *   - Inverts surname-first: "Greaves, CJ" → "cj greaves" (candidate only)
 *   - Class normalization: "PRO4" → "pro 4", "Pro-4" → "pro 4"
 *
 * Input:
 *   entity_type  — Driver | Team | Track | Series | SeriesClass | Manufacturer | Vehicle | Event
 *   name         — raw name string from import source
 *   external_uid — optional strong identifier
 *   context      — optional context object for scoped lookups (e.g. { series_id } for SeriesClass)
 *   source_type  — optional: import | manual_admin | official_roster | inferred
 *   source_name  — optional: human-readable source name
 *   import_run_id — optional: import batch id
 *   auto_create_alias — boolean (default true): auto-register new alias variant if entity matched
 *   skip_alias_lookup — boolean (default false): skip EntityAlias step (use for canonical name setup only)
 *
 * Output:
 *   {
 *     status:     'matched' | 'unresolved'
 *     match_type: 'external_uid' | 'canonical_key' | 'entity_alias' | 'normalized_name' | null
 *     entity:     <record> | null
 *     alias_normalized: <string>
 *     alias_registered: boolean  — true if a new alias was registered this call
 *   }
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── Normalization ──────────────────────────────────────────────────────────────

function stripQuotedNicknames(name) {
  return name.replace(/"[^"]*"/g, '').replace(/'[^']*'/g, '').replace(/\s+/g, ' ').trim();
}

function detectSurnameFirst(name) {
  return /^[^,]+,\s*.+$/.test(name.trim());
}

function invertSurnameFirst(name) {
  const parts = name.split(',');
  if (parts.length < 2) return name;
  const surname = parts[0].trim();
  const given = parts.slice(1).join(',').trim();
  return `${given} ${surname}`;
}

/**
 * normalizeForEntityType — the single normalization function used everywhere.
 * Returns a canonical lowercase, punctuation-free, whitespace-collapsed string.
 *
 * For Drivers/PersonIdentity: also handles initial collapsing and surname inversion.
 * For SeriesClass: also handles class number/word normalization.
 */
export function normalizeEntityName(name, entityType) {
  if (!name || typeof name !== 'string') return null;
  let n = name.trim();
  if (!n) return null;

  const isPerson = entityType === 'Driver' || entityType === 'PersonIdentity';
  const isClass = entityType === 'SeriesClass';

  // Step 1: Strip quoted nicknames
  n = stripQuotedNicknames(n);

  // Step 2: For persons — detect and invert surname-first
  if (isPerson && detectSurnameFirst(n)) {
    n = invertSurnameFirst(n);
  }

  // Step 3: Lowercase
  n = n.toLowerCase();

  // Step 4: For persons — strip common suffixes
  if (isPerson) {
    n = n.replace(/\b(jr\.?|sr\.?|ii|iii|iv)\b/g, '').trim();
  }

  // Step 5: Remove all non-alphanumeric (punctuation, dots, hyphens, apostrophes)
  n = n.replace(/[^a-z0-9\s]/g, ' ');

  // Step 6: Collapse whitespace
  n = n.replace(/\s+/g, ' ').trim();

  // Step 7: For persons — collapse space-separated single-letter initials
  // "c j greaves" → "cj greaves"
  if (isPerson) {
    let prev = '';
    while (prev !== n) {
      prev = n;
      n = n.replace(/\b([a-z])\s+(?=[a-z](\s|$))/g, '$1');
    }
    n = n.replace(/\s+/g, ' ').trim();
  }

  // Step 8: For SeriesClass — normalize class number formatting
  // "PRO4" → "pro 4", "Pro-Lite" → "pro lite", "Pro-4" → "pro 4"
  if (isClass) {
    n = n.replace(/([a-z])(\d)/g, '$1 $2');  // pro4 → pro 4
    n = n.replace(/(\d)([a-z])/g, '$1 $2');  // 4x → 4 x
    n = n.replace(/\s+/g, ' ').trim();
  }

  return n || null;
}

// ── Entity model map ───────────────────────────────────────────────────────────

const ENTITY_MODEL = {
  Driver: 'Driver',
  PersonIdentity: 'PersonIdentity',
  Team: 'Team',
  Track: 'Track',
  Series: 'Series',
  SeriesClass: 'SeriesClass',
  Manufacturer: null,  // future-ready — no entity model yet
  Vehicle: 'Vehicle',
  Event: 'Event',
};

// ── Main handler ───────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const {
      entity_type,
      name,
      external_uid,
      context = {},
      source_type = 'import',
      source_name = null,
      import_run_id = null,
      auto_create_alias = true,
      skip_alias_lookup = false,
    } = body;

    if (!entity_type) return Response.json({ error: 'entity_type is required' }, { status: 400 });
    if (!name && !external_uid) return Response.json({ error: 'name or external_uid is required' }, { status: 400 });

    const modelName = ENTITY_MODEL[entity_type];
    const sr = base44.asServiceRole;

    // Compute normalized form
    const alias_normalized = normalizeEntityName(name || '', entity_type);

    let entity = null;
    let match_type = null;
    let alias_registered = false;

    // ── Step 1: external_uid ──────────────────────────────────────────────────
    if (!entity && external_uid && modelName) {
      const rows = await sr.entities[modelName].filter({ external_uid }).catch(() => []);
      if (rows.length === 1) { entity = rows[0]; match_type = 'external_uid'; }
    }

    // ── Step 2: canonical_key ─────────────────────────────────────────────────
    if (!entity && modelName) {
      const normalizedForKey = alias_normalized || '';
      let canonicalKey = `${entity_type.toLowerCase()}:${normalizedForKey}`;
      if (context.series_id) canonicalKey += `:${context.series_id}`;

      const rows = await sr.entities[modelName].filter({ canonical_key: canonicalKey }).catch(() => []);
      if (rows.length === 1) { entity = rows[0]; match_type = 'canonical_key'; }
    }

    // ── Step 3: EntityAlias lookup ────────────────────────────────────────────
    if (!entity && !skip_alias_lookup && alias_normalized) {
      const aliasRows = await sr.entities.EntityAlias.filter({
        entity_type,
        alias_normalized,
        active: true,
      }).catch(() => []);

      if (aliasRows.length === 1) {
        match_type = 'entity_alias';
        // Resolve the canonical entity
        if (modelName) {
          const canonical = await sr.entities[modelName].filter({ id: aliasRows[0].entity_id }).catch(() => []);
          entity = canonical?.[0] || null;
        }
        if (!entity) {
          // entity_id on alias points to a valid record — trust the alias
          entity = { id: aliasRows[0].entity_id, _alias_resolved: true };
        }
      } else if (aliasRows.length > 1) {
        // Ambiguous — multiple entities claim this alias
        return Response.json({
          status: 'ambiguous',
          match_type: 'entity_alias',
          entity: null,
          alias_normalized,
          alias_registered: false,
          candidates: aliasRows.map(a => ({ entity_id: a.entity_id, alias_name: a.alias_name })),
          message: `Multiple entities claim alias "${alias_normalized}" — manual resolution required`,
        });
      }
    }

    // ── Step 4: normalized entity name ────────────────────────────────────────
    if (!entity && alias_normalized && modelName) {
      // Try normalized_name field (all source entities have this)
      let rows = await sr.entities[modelName].filter({ normalized_name: alias_normalized }).catch(() => []);

      // Scoped fallback for SeriesClass
      if (!rows.length && entity_type === 'SeriesClass' && context.series_id) {
        rows = await sr.entities.SeriesClass.filter({
          series_id: context.series_id,
          normalized_series_class_key: `series_class:${context.series_id}:${alias_normalized}`,
        }).catch(() => []);
      }

      if (rows.length === 1) { entity = rows[0]; match_type = 'normalized_name'; }
    }

    // ── Auto-register alias if entity found and alias doesn't exist yet ───────
    if (entity && auto_create_alias && alias_normalized && name && !skip_alias_lookup) {
      const alreadyExists = await sr.entities.EntityAlias.filter({
        entity_type,
        entity_id: entity.id,
        alias_normalized,
      }).catch(() => []);

      if (!alreadyExists.length) {
        // Determine alias type
        let alias_type = 'import_variant';
        const isPerson = entity_type === 'Driver' || entity_type === 'PersonIdentity';
        if (isPerson && detectSurnameFirst(name)) alias_type = 'surname_first';

        await sr.entities.EntityAlias.create({
          entity_type,
          entity_id: entity.id,
          alias_name: name,
          alias_normalized,
          alias_type,
          confidence: match_type === 'external_uid' ? 100 : match_type === 'canonical_key' ? 95 : 80,
          active: true,
          source: source_name || 'resolveEntityAlias',
          source_type,
          import_run_id: import_run_id || null,
          created_by: user.id,
        }).catch(() => {});

        // Write AuditLog
        await sr.entities.AuditLog.create({
          entity_type: 'EntityAlias',
          entity_id: entity.id,
          entity_name: name,
          action: 'created',
          before_data: null,
          after_data: { entity_type, entity_id: entity.id, alias_name: name, alias_normalized, alias_type },
          performed_by: user.id,
          performed_by_name: user.full_name || user.email,
          timestamp: new Date().toISOString(),
          notes: `EntityAlias auto-registered via resolveEntityAlias (match_type: ${match_type})`,
        }).catch(() => {});

        alias_registered = true;
      }
    }

    if (entity) {
      return Response.json({
        status: 'matched',
        match_type,
        entity,
        alias_normalized,
        alias_registered,
      });
    }

    return Response.json({
      status: 'unresolved',
      match_type: null,
      entity: null,
      alias_normalized,
      alias_registered: false,
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});