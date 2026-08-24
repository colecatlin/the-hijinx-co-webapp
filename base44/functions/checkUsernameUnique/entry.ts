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
    // ── AUTHENTICATION GATE (mandatory, before any service-role access) ──
    // Username availability is an authenticated-only operation. An
    // unauthenticated caller must never reach the service-role User query —
    // doing so would enable account enumeration. The caller's identity is
    // resolved exclusively from the trusted server-side auth context, never
    // from the request body.
    let user;
    try {
      user = await base44.auth.me();
    } catch {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const raw = (typeof body.username === 'string' ? body.username : '').trim().toLowerCase();
    if (!raw) return bad('Username is required.');

    // Strict format mirror of the onboarding client rules. These are input
    // validation checks that run BEFORE any service-role query and disclose
    // no account information.
    if (raw.length < 3 || raw.length > 24) {
      return bad('Username must be 3–24 characters.');
    }
    if (!/^[a-z0-9_]+$/.test(raw)) {
      return bad('Use lowercase letters, numbers, and underscores only.');
    }
    if (RESERVED.includes(raw)) {
      return bad('That username is reserved.');
    }

    // Ownership: the authenticated user may retain their own current username.
    // The current user id comes exclusively from the trusted auth context —
    // never from a client-supplied body value, which would let a caller spoof
    // another account's id to bypass the uniqueness check.
    const currentUserId = user.id;

    // Service-role read occurs ONLY after authentication succeeds. Clients
    // (non-admins) cannot query other users directly.
    const matches = await base44.asServiceRole.entities.User.filter({
      username_slug: raw,
    });

    if (Array.isArray(matches) && matches.length > 0) {
      const takenByOther = matches.some((m: any) => m.id !== currentUserId);
      if (takenByOther) {
        // Minimum disclosure: do not reveal why the username is unavailable
        // or which account owns it. Return only the availability result.
        return Response.json({ available: false });
      }
    }

    return Response.json({ available: true, slug: raw });
  } catch (error) {
    // Do not leak internal error details. Return a generic unavailable result.
    return Response.json({ available: false, reason: 'Could not verify username.' });
  }
});