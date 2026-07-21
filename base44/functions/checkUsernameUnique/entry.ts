/**
 * checkUsernameUnique
 * ---------------------------------------------------------------------------
 * Server-authoritative username availability check used by the Identity
 * stage of Profile Setup. The frontend validates format/reserved strings
 * client-side; this function is the authoritative uniqueness gate.
 *
 * Strategy: normalize to lowercase, query the User store for a matching
 * `username_slug` via the service role (admins only lists other users, so
 * the client cannot do this themselves). The caller's own username is never
 * a conflict — the current user may retain their existing handle.
 *
 * Race-condition note: this lookup is authoritative-but-not-atomic. The
 * platform has no DB unique constraint on User.username_slug today, so the
 * check-then-updateMe sequence has a TOCTOU window. For practical onboarding
 * this is acceptable; documented limitation. The wizard persists
 * `username_slug` and re-runs this check immediately before updateMe on final
 * save to shrink the window as much as possible.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const RESERVED = [
  'admin', 'api', 'u', 'racecore', 'profile', 'profiles', 'home',
  'login', 'auth', 'manage', 'race-core', 'race-control', 'www', 'root',
  'support', 'help', 'settings', 'store', 'shop', 'cart', 'checkout', 'app',
  'organization', 'creators', 'media-outlets', 'drivers', 'series', 'teams',
  'tracks', 'events', 'story', 'stories', 'outlet', 'index46', 'hijinx',
];

function bad(reason: string, available = false) {
  return Response.json({ available, reason });
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const body = await req.json().catch(() => ({}));
    const raw = (typeof body.username === 'string' ? body.username : '').trim().toLowerCase();
    if (!raw) return bad('Username is required.');

    // Strict format mirror of the onboarding client rules.
    if (raw.length < 3 || raw.length > 24) {
      return bad('Username must be 3–24 characters.');
    }
    if (!/^[a-z0-9_]+$/.test(raw)) {
      return bad('Use lowercase letters, numbers, and underscores only.');
    }
    if (RESERVED.includes(raw)) {
      return bad('That username is reserved.');
    }

    const currentUserId =
      typeof body.current_user_id === 'string' ? body.current_user_id : null;

    // Service-role read; clients (non-admins) cannot query other users.
    const matches = await base44.asServiceRole.entities.User.filter({
      username_slug: raw,
    });

    if (Array.isArray(matches) && matches.length > 0) {
      const takenByOther = matches.some((m: any) => m.id !== currentUserId);
      if (takenByOther) {
        return bad('That username is already taken.');
      }
    }

    return Response.json({ available: true, slug: raw });
  } catch (error) {
    return Response.json(
      { available: false, reason: error?.message || 'Could not verify username.' },
    );
  }
});