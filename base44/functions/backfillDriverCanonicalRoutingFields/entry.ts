/**
 * backfillDriverCanonicalRoutingFields.js
 *
 * Scans all Driver records and ensures:
 *   - normalized_name is present
 *   - canonical_slug is present (public route identity)
 *   - canonical_key is present (internal dedup identity)
 *
 * Rules:
 *   - Never overwrites valid existing values
 *   - Resolves duplicate canonical_slugs safely by appending -2, -3, etc.
 *   - Does NOT touch Driver.slug (internal unique slug)
 *
 * Input:  { dry_run?: boolean }
 * Output: {
 *   drivers_checked, missing_normalized_name, missing_canonical_slug,
 *   missing_canonical_key, duplicates_found, records_backfilled,
 *   warnings, errors
 * }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// ── Slug/normalization utilities (inlined — no local imports) ──
function normalizeName(value) {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function generateEntitySlug(text) {
  if (!text) return '';
  return text.trim().toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildDriverCanonicalKey(normalized, driver) {
  if (driver.external_uid) return `driver:${driver.external_uid}`;
  if (driver.date_of_birth) return `driver:${normalized}:${driver.date_of_birth}`;
  if (driver.primary_number) return `driver:${normalized}:${driver.primary_number}`;
  return `driver:${normalized}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const dry_run = body.dry_run === true;

    const allDrivers = await base44.asServiceRole.entities.Driver.list('-created_date', 5000);

    const stats = {
      drivers_checked: allDrivers.length,
      missing_normalized_name: 0,
      missing_canonical_slug: 0,
      missing_canonical_key: 0,
      duplicates_found: 0,
      records_backfilled: 0,
      warnings: [],
      errors: [],
    };

    // Build a working map of canonical_slug → driver id for duplicate detection
    // Start with slugs that already exist on records we won't touch
    const slugClaims = new Map(); // slug → driver_id
    for (const d of allDrivers) {
      if (d.canonical_slug && !slugClaims.has(d.canonical_slug)) {
        slugClaims.set(d.canonical_slug, d.id);
      }
    }

    for (const d of allDrivers) {
      // Skip obvious duplicates
      if ((d.canonical_key || '').includes('DUPLICATE_OF')) {
        stats.warnings.push(`Skipped duplicate record id=${d.id}`);
        continue;
      }

      const rawName = `${d.first_name || ''} ${d.last_name || ''}`.trim();
      if (!rawName) {
        stats.warnings.push(`Driver id=${d.id} has no usable name — skipped`);
        continue;
      }

      const needsNorm = !d.normalized_name;
      const needsSlug = !d.canonical_slug;
      const needsKey  = !d.canonical_key;

      if (!needsNorm && !needsSlug && !needsKey) continue;

      if (needsNorm) stats.missing_normalized_name++;
      if (needsSlug) stats.missing_canonical_slug++;
      if (needsKey)  stats.missing_canonical_key++;

      const normalized = d.normalized_name || normalizeName(rawName);
      if (!normalized) {
        stats.warnings.push(`Driver id=${d.id} produced empty normalized_name — skipped`);
        continue;
      }

      const patch = {};

      if (needsNorm) {
        patch.normalized_name = normalized;
      }

      if (needsKey) {
        patch.canonical_key = buildDriverCanonicalKey(normalized, d);
      }

      if (needsSlug) {
        // Generate a unique canonical_slug, resolving collisions safely
        let baseSlug = generateEntitySlug(normalized);
        if (!baseSlug) {
          stats.warnings.push(`Driver id=${d.id} produced empty canonical_slug base — skipped`);
          continue;
        }

        let candidate = baseSlug;
        let counter = 1;
        // Resolve collision against our working map (excludes this driver's own slot)
        while (slugClaims.has(candidate) && slugClaims.get(candidate) !== d.id) {
          stats.duplicates_found++;
          counter++;
          candidate = `${baseSlug}-${counter}`;
        }

        patch.canonical_slug = candidate;
        // Claim this slug for subsequent iterations
        slugClaims.set(candidate, d.id);
      }

      if (Object.keys(patch).length === 0) continue;

      if (!dry_run) {
        try {
          await base44.asServiceRole.entities.Driver.update(d.id, patch);

          await base44.asServiceRole.entities.OperationLog.create({
            operation_type: 'driver_canonical_slug_backfilled',
            entity_name: 'Driver',
            entity_id: d.id,
            status: 'success',
            metadata: {
              driver_id: d.id,
              previous_canonical_slug: d.canonical_slug || null,
              new_canonical_slug: patch.canonical_slug || d.canonical_slug || null,
              backfilled_fields: Object.keys(patch),
              dry_run: false,
            },
          }).catch(() => {});

          stats.records_backfilled++;
        } catch (e) {
          stats.errors.push(`update_failed id=${d.id}: ${e.message}`);
        }
      } else {
        stats.records_backfilled++; // count as "would backfill"
      }
    }

    if (!dry_run) {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'driver_route_audit_run',
        entity_name: 'Driver',
        status: 'success',
        metadata: {
          source_path: 'backfillDriverCanonicalRoutingFields',
          dry_run,
          ...stats,
        },
      }).catch(() => {});
    }

    return Response.json({ success: true, dry_run, ...stats });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});