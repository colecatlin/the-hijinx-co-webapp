import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * useUsernameRequired — single source of truth for gating public-identity
 * features on the presence of a username.
 *
 * Returns:
 *   hasUsername   — boolean (true when user.username is a non-empty string)
 *   isAuthenticated — boolean
 *   user          — live user record from auth.me()
 *   isLoading     — true until either auth is checked or the user record lands
 *
 * The backend `checkUsernameUnique` function remains the authoritative
 * uniqueness gate; this hook only answers "does a username exist yet".
 */
export function useUsernameRequired() {
  const { data: isAuthenticated, isLoading: authLoading } = useQuery({
    queryKey: ['isAuthenticated'],
    queryFn: () => base44.auth.isAuthenticated(),
    staleTime: 60_000,
  });

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    enabled: !!isAuthenticated,
    staleTime: 60_000,
  });

  const hasUsername = !!(user && typeof user.username === 'string' && user.username.trim().length > 0);

  return {
    hasUsername,
    isAuthenticated,
    user,
    isLoading: authLoading || (!!isAuthenticated && userLoading),
  };
}

/**
 * Build the redirect target the user should return to after completing the
 * lightweight username flow. We preserve both pathname and search so a
 * feature with query-string context (e.g. an entity to claim) survives the
 * round-trip.
 */
export function buildUsernameReturnPath(location) {
  if (!location) return '/';
  const { pathname, search = '' } = location;
  return `${pathname}${search}`;
}

/**
 * Resolve the return path from the `?return_to=` query parameter, falling
 * back to a safe default. Used by the ClaimUsername page after a successful
 * save so the user lands back on the feature they originally attempted.
 *
 * Only same-origin absolute paths are honoured to prevent open-redirect
 * abuse — anything else is ignored.
 */
export function resolveReturnPath(search) {
  if (!search) return '/MyDashboard';
  const params = new URLSearchParams(
    typeof search === 'string' ? search : search.toString(),
  );
  const raw = params.get('return_to');
  if (!raw) return '/MyDashboard';
  if (!raw.startsWith('/')) return '/MyDashboard';
  return raw;
}