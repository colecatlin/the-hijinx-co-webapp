/**
 * racerSlugService.ts — the only place a canonical racer slug is generated.
 *
 * Server-side only. No slug is ever built in a browser. Uniqueness is a direct
 * candidate check (`john-smith`, `john-smith-2`, `john-smith-3`, …) — never a
 * scan of the newest N records.
 *
 * Retired slugs live in the existing EntityAlias system (entity_type
 * 'RacerProfile', alias_type 'historical_name'), so an old address keeps
 * resolving to the same racer and can never later be handed to another racer.
 */

const MAX_SUFFIX = 60;

export function slugify(text: any): string | null {
  if (!text || typeof text !== 'string') return null;
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || null;
}

async function slugTaken(sr: any, candidate: string, excludeProfileId?: string | null): Promise<boolean> {
  const profiles = await sr.entities.RacerProfile.filter({ slug: candidate }).catch(() => []);
  for (const p of (profiles || [])) {
    if (!p) continue;
    if (excludeProfileId && p.id === excludeProfileId) continue;
    return true;
  }
  // A retired slug stays reserved forever — it is never reassigned.
  const retired = await sr.entities.EntityAlias
    .filter({ entity_type: 'RacerProfile', alias_normalized: candidate, active: true }).catch(() => []);
  if ((retired || []).length > 0) return true;
  return false;
}

/**
 * Deterministic, collision-safe slug for a racer profile.
 */
export async function generateUniqueRacerSlug(
  sr: any,
  displayName: string,
  options: { exclude_profile_id?: string | null; reserved?: string[] } = {},
): Promise<string | null> {
  const base = slugify(displayName);
  if (!base) return null;
  const reserved = new Set((options.reserved || []).filter(Boolean));

  for (let suffix = 1; suffix <= MAX_SUFFIX; suffix++) {
    const candidate = suffix === 1 ? base : base + '-' + suffix;
    if (reserved.has(candidate)) continue;
    const taken = await slugTaken(sr, candidate, options.exclude_profile_id || null);
    if (!taken) return candidate;
  }
  return base + '-' + Date.now().toString(36);
}

/**
 * Retire a previous slug so it keeps resolving to this racer.
 * Idempotent: a slug already recorded for this racer is left alone.
 */
export async function recordRacerSlugHistory(
  sr: any,
  args: { racer_profile_id: string; previous_slug?: string | null; created_by?: string | null; notes?: string | null },
): Promise<{ recorded: boolean; reason?: string }> {
  const previous = (args.previous_slug || '').trim().toLowerCase();
  if (!previous || !args.racer_profile_id) return { recorded: false, reason: 'nothing_to_record' };

  const existing = await sr.entities.EntityAlias
    .filter({ entity_type: 'RacerProfile', alias_normalized: previous }).catch(() => []);
  for (const alias of (existing || [])) {
    if (alias && alias.entity_id === args.racer_profile_id) {
      return { recorded: false, reason: 'already_recorded' };
    }
    if (alias && alias.entity_id && alias.entity_id !== args.racer_profile_id) {
      return { recorded: false, reason: 'slug_belongs_to_another_racer' };
    }
  }

  await sr.entities.EntityAlias.create({
    entity_type: 'RacerProfile',
    entity_id: args.racer_profile_id,
    alias_name: previous,
    alias_normalized: previous,
    alias_type: 'historical_name',
    confidence: 100,
    active: true,
    source: 'slug_change',
    source_type: 'manual_admin',
    created_by: args.created_by || null,
    notes: args.notes || 'Previous public racer slug — kept resolving after a slug change.',
  }).catch(() => null);

  return { recorded: true };
}

/**
 * Resolve a retired slug to the racer it still belongs to.
 */
export async function resolveRacerSlugHistory(sr: any, slug: string): Promise<{ entity_id: string; racer_profile: any } | null> {
  const normalized = (slug || '').trim().toLowerCase();
  if (!normalized) return null;
  const aliases = await sr.entities.EntityAlias
    .filter({ entity_type: 'RacerProfile', alias_normalized: normalized, active: true }).catch(() => []);
  for (const alias of (aliases || [])) {
    if (!alias || !alias.entity_id) continue;
    const profile = await sr.entities.RacerProfile.get(alias.entity_id).catch(() => null);
    if (profile && !profile.is_archived) return { entity_id: profile.id, racer_profile: profile };
  }
  return null;
}