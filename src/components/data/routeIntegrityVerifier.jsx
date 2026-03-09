/**
 * components/data/routeIntegrityVerifier.js
 *
 * Lightweight route integrity verifiers for public, editor, and Race Core URLs.
 * All functions return { ok, href, reason } — never throw.
 */

import { buildProfileUrl, PROFILE_ROUTES } from '@/components/utils/routingContract';
import { createPageUrl } from '@/components/utils';

// ── Public entity route ───────────────────────────────────────────────────────

/**
 * Verify that a public profile URL can be safely built for a source record.
 *
 * @param {{ entityType: string, record: object|null }} params
 * @returns {{ ok: boolean, href: string|null, reason: string|null }}
 */
export function verifyPublicEntityRoute({ entityType, record }) {
  if (!entityType) return { ok: false, href: null, reason: 'entityType missing' };
  if (!record)     return { ok: false, href: null, reason: 'record is null' };

  const route = PROFILE_ROUTES[entityType];
  if (!route) return { ok: false, href: null, reason: `no route config for entityType "${entityType}"` };

  // Events use id; everything else prefers slug with id fallback
  if (entityType === 'Event') {
    if (!record.id) return { ok: false, href: null, reason: 'event.id missing' };
    const href = buildProfileUrl('Event', record.id);
    return { ok: href !== '#', href: href !== '#' ? href : null, reason: href === '#' ? 'buildProfileUrl returned #' : null };
  }

  // Driver, Team, Track, Series — try slug first, then id
  const identifier = record.slug || record.canonical_slug || record.id;
  if (!identifier) {
    return { ok: false, href: null, reason: `${entityType} has no slug or id` };
  }

  const href = buildProfileUrl(entityType, identifier);
  if (href === '#') {
    return { ok: false, href: null, reason: 'buildProfileUrl returned # — missing identifier' };
  }

  // Warn if falling back to id (no slug)
  if (!record.slug && !record.canonical_slug && record.id) {
    console.warn(
      `[routeIntegrityVerifier] verifyPublicEntityRoute: ${entityType} id=${record.id} ` +
      `has no slug — routing via id fallback. Add a slug for clean URLs.`
    );
  }

  return { ok: true, href, reason: null };
}

// ── Editor route ──────────────────────────────────────────────────────────────

/**
 * Verify that an editor URL can be built for a given entity type + id.
 *
 * @param {{ entityType: string, entityId: string, accessCode?: string }} params
 * @returns {{ ok: boolean, href: string|null, reason: string|null }}
 */
export function verifyEditorRoute({ entityType, entityId }) {
  if (!entityType) return { ok: false, href: null, reason: 'entityType missing' };
  if (!entityId)   return { ok: false, href: null, reason: 'entityId missing' };

  const EDITOR_MAP = {
    Driver: 'DriverEditor',
    Team:   'EntityEditor',
    Track:  'EntityEditor',
    Series: 'EntityEditor',
    Event:  null,
  };

  const page = EDITOR_MAP[entityType];
  if (!page) {
    return { ok: false, href: null, reason: `no editor page configured for entityType "${entityType}"` };
  }

  const href = `${createPageUrl(page)}?id=${encodeURIComponent(entityId)}`;
  return { ok: true, href, reason: null };
}

// ── Race Core route ───────────────────────────────────────────────────────────

const RACE_CORE_ORG_TYPES = {
  Track:  'track',
  Series: 'series',
};

/**
 * Verify that a Race Core URL can be built for a Track or Series entity.
 *
 * @param {{ entityType: string, entityId: string }} params
 * @returns {{ ok: boolean, href: string|null, reason: string|null }}
 */
export function verifyRaceCoreRoute({ entityType, entityId }) {
  if (!entityType) return { ok: false, href: null, reason: 'entityType missing' };
  if (!entityId)   return { ok: false, href: null, reason: 'entityId missing' };

  const orgType = RACE_CORE_ORG_TYPES[entityType];
  if (!orgType) {
    return {
      ok: false, href: null,
      reason: `Race Core only supports Track and Series — got "${entityType}"`,
    };
  }

  const href = `${createPageUrl('RegistrationDashboard')}?orgType=${orgType}&orgId=${encodeURIComponent(entityId)}`;
  return { ok: true, href, reason: null };
}