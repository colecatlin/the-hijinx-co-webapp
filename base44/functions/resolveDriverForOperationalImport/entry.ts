/**
 * resolveDriverForOperationalImport.js — R9EB.1
 *
 * Resolves a Driver source record for use in operational importers
 * (Entry, Results, Standings). Never creates a new Driver record.
 *
 * LOOKUP ORDER (enforced — never skip or reorder):
 *   1. exact driver_id
 *   2. exact external_uid
 *   3. EntityAlias lookup (alias_normalized match for Driver)
 *   4. normalized first_name + last_name + primary_number (car_number)
 *   5. normalized first_name + last_name only
 *   → If multiple matches at any step: return ambiguous (never guess)
 *
 * Input  { driver_id?, external_uid?, driver_first_name?, driver_last_name?, full_name?, car_number? }
 * Output { status: 'matched'|'ambiguous'|'unresolved', driver?, matches?, match_type? }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── Normalization (aligned with resolveEntityAlias) ────────────────────────────

function stripQuotedNicknames(name) {
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
  if (!name || typeof name !== 'string') return '';
  let n = name.trim();
  if (!n) return '';
  n = stripQuotedNicknames(n);
  if (detectSurnameFirst(n)) n = invertSurnameFirst(n);
  n = n.toLowerCase();
  n = n.replace(/\b(jr\.?|sr\.?|ii|iii|iv)\b/g, '').trim();
  n = n.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  let prev = '';
  while (prev !== n) {
    prev = n;
    n = n.replace(/\b([a-z])\s+(?=[a-z](\s|$))/g, '$1');
  }
  return n.replace(/\s+/g, ' ').trim();
}

function norm(str) {
  if (!str) return '';
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      driver_id,
      external_uid,
      driver_first_name,
      driver_last_name,
      full_name,
      car_number,
    } = body;

    const sr = base44.asServiceRole;

    // Load driver pool once — shared across all match steps
    const allDrivers = await sr.entities.Driver.list('-created_date', 2000);

    // ── Step 1: exact driver_id ───────────────────────────────────────────────
    if (driver_id) {
      const found = allDrivers.find(d => d.id === driver_id);
      if (found) return Response.json({ status: 'matched', driver: found, match_type: 'driver_id' });
    }

    // ── Step 2: external_uid ──────────────────────────────────────────────────
    if (external_uid) {
      const matches = allDrivers.filter(d => d.external_uid && d.external_uid === external_uid);
      if (matches.length === 1) return Response.json({ status: 'matched', driver: matches[0], match_type: 'external_uid' });
      if (matches.length > 1) return Response.json({ status: 'ambiguous', matches, match_type: 'external_uid' });
    }

    // ── Resolve first/last from full_name if needed ───────────────────────────
    let first = norm(driver_first_name);
    let last  = norm(driver_last_name);
    if (!first && !last && full_name) {
      const parts = full_name.trim().split(/\s+/);
      first = norm(parts[0] || '');
      last  = norm(parts.slice(1).join(' ') || '');
    }

    // Build full name for alias lookup
    const fullNameForAlias = full_name || `${driver_first_name || ''} ${driver_last_name || ''}`.trim();

    // ── Step 3: EntityAlias lookup ────────────────────────────────────────────
    if (fullNameForAlias) {
      const aliasNormalized = normalizeDriverName(fullNameForAlias);
      if (aliasNormalized) {
        const aliasRows = await sr.entities.EntityAlias.filter({
          entity_type: 'Driver',
          alias_normalized: aliasNormalized,
          active: true,
        }).catch(() => []);

        if (aliasRows.length === 1) {
          const found = allDrivers.find(d => d.id === aliasRows[0].entity_id);
          if (found) return Response.json({ status: 'matched', driver: found, match_type: 'entity_alias' });
        }
        if (aliasRows.length > 1) {
          const candidates = aliasRows.map(a => allDrivers.find(d => d.id === a.entity_id)).filter(Boolean);
          if (candidates.length > 1) return Response.json({ status: 'ambiguous', matches: candidates, match_type: 'entity_alias' });
        }
      }
    }

    if (!first && !last) {
      return Response.json({ status: 'unresolved', match_type: null });
    }

    // ── Step 4: normalized name + car_number ──────────────────────────────────
    const nameMatches = allDrivers.filter(d =>
      norm(d.first_name) === first && norm(d.last_name) === last
    );

    if (car_number && nameMatches.length > 1) {
      const normCar = norm(car_number);
      const byNumber = nameMatches.filter(d => norm(d.primary_number) === normCar);
      if (byNumber.length === 1) return Response.json({ status: 'matched', driver: byNumber[0], match_type: 'name_and_number' });
      if (byNumber.length > 1) return Response.json({ status: 'ambiguous', matches: byNumber, match_type: 'name_and_number' });
    }

    // ── Step 5: normalized name only ─────────────────────────────────────────
    if (nameMatches.length === 1) return Response.json({ status: 'matched', driver: nameMatches[0], match_type: 'name' });
    if (nameMatches.length > 1)  return Response.json({ status: 'ambiguous', matches: nameMatches, match_type: 'name' });

    return Response.json({ status: 'unresolved', match_type: null });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});