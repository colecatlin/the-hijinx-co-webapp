/**
 * components/system/authGuard.js
 *
 * Shared auth guard helpers for protected and admin-only pages.
 * Use these in page-level useEffect or early-return patterns.
 */
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';

/**
 * Redirect to login if no user is present.
 * Returns true if the user is authenticated and may proceed.
 * Call this from a useEffect that watches user + loading state.
 *
 * @param {object|null} user
 * @param {string} [nextUrl] - where to return after login (defaults to MyDashboard)
 * @returns {boolean}
 */
export function requireAuth(user, nextUrl) {
  if (!user) {
    base44.auth.redirectToLogin(nextUrl || createPageUrl('MyDashboard'));
    return false;
  }
  return true;
}

/**
 * Returns true only if the user holds the admin role.
 *
 * @param {object|null} user
 * @returns {boolean}
 */
export function requireAdmin(user) {
  return user?.role === 'admin';
}

/**
 * Returns true if the user has collaborator access to the given entity,
 * or if the user is an admin.
 *
 * @param {{ user: object|null, entityType: string, entityId: string, collaborators: Array }} params
 * @returns {boolean}
 */
export function requireEntityAccess({ user, entityType, entityId, collaborators = [] }) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return collaborators.some(
    c => c.user_id === user.id &&
         c.entity_type === entityType &&
         c.entity_id === entityId
  );
}

/**
 * Generic restricted-page access check.
 * pageType values: 'racecore' | 'media' | 'editor'
 *
 * @param {{ user: object|null, pageType: string, context: object }} params
 * @returns {boolean}
 */
export function requireRestrictedPageAccess({ user, pageType, context = {} }) {
  if (!user) return false;
  if (user.role === 'admin') return true;

  const { collaborators = [], entityType, entityId } = context;

  if (pageType === 'racecore') {
    // Must manage a Track or Series
    return collaborators.some(
      c => c.user_id === user.id && ['Track', 'Series'].includes(c.entity_type)
    );
  }

  if (pageType === 'editor') {
    return requireEntityAccess({ user, entityType, entityId, collaborators });
  }

  if (pageType === 'media') {
    // Media portal: any logged-in user may apply; check is done inside the page
    return true;
  }

  return false;
}

/**
 * Shared "Access Denied" props for consistent page-level denied state.
 * Use with AccessDeniedState component or inline.
 */
export const ACCESS_DENIED_COPY = {
  title: 'Access denied',
  body: 'You do not currently have permission to access this area.',
  cta: 'Go to My Dashboard',
  ctaUrl: createPageUrl('MyDashboard'),
};