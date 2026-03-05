/**
 * Authority checks for Media Console actions.
 * Determines if a user has credential-issuing authority for a given event context.
 */

/**
 * Check if user has media authority for the event context.
 * Returns { hasAuthority, issuerOptions } where issuerOptions is an array of
 * { id, type, name } objects the user can issue credentials as.
 *
 * @param {object} params
 * @param {boolean} params.isAdmin
 * @param {string} params.userId
 * @param {object|null} params.selectedEvent
 * @param {object|null} params.selectedTrack
 * @param {object|null} params.selectedSeries
 * @param {Array} params.collaborators - EntityCollaborator records for the user
 */
export function resolveMediaAuthority({ isAdmin, userId, selectedEvent, selectedTrack, selectedSeries, collaborators = [] }) {
  if (isAdmin) {
    const options = [];
    if (selectedEvent) options.push({ id: selectedEvent.id, type: 'event', name: selectedEvent.name });
    if (selectedTrack) options.push({ id: selectedTrack.id, type: 'track', name: selectedTrack.name });
    if (selectedSeries) options.push({ id: selectedSeries.id, type: 'series', name: selectedSeries.name });
    return { hasAuthority: true, issuerOptions: options };
  }

  const authorizedEntityIds = new Set(
    collaborators
      .filter(c => c.user_id === userId && ['owner', 'editor'].includes(c.role))
      .map(c => c.entity_id)
  );

  const issuerOptions = [];
  if (selectedEvent && authorizedEntityIds.has(selectedEvent.id)) {
    issuerOptions.push({ id: selectedEvent.id, type: 'event', name: selectedEvent.name });
  }
  if (selectedTrack && authorizedEntityIds.has(selectedTrack.id)) {
    issuerOptions.push({ id: selectedTrack.id, type: 'track', name: selectedTrack.name });
  }
  if (selectedSeries && authorizedEntityIds.has(selectedSeries.id)) {
    issuerOptions.push({ id: selectedSeries.id, type: 'series', name: selectedSeries.name });
  }

  return { hasAuthority: issuerOptions.length > 0, issuerOptions };
}

/**
 * Compute default expires_at for an event-scoped credential.
 * Adds 24-hour buffer after event end_date or event_date.
 */
export function computeEventCredentialExpiry(selectedEvent) {
  if (!selectedEvent) return null;
  const base = selectedEvent.end_date || selectedEvent.event_date;
  if (!base) return null;
  const d = new Date(base + 'T23:59:00');
  d.setHours(d.getHours() + 24);
  return d.toISOString();
}

export const STATUS_COLORS = {
  draft: 'bg-gray-700 text-gray-300',
  applied: 'bg-blue-900/60 text-blue-300',
  change_requested: 'bg-orange-900/60 text-orange-300',
  under_review: 'bg-yellow-900/60 text-yellow-300',
  approved: 'bg-green-900/60 text-green-300',
  denied: 'bg-red-900/60 text-red-300',
  cancelled: 'bg-gray-800 text-gray-400',
};

export const CRED_STATUS_COLORS = {
  active: 'bg-green-900/60 text-green-300',
  revoked: 'bg-red-900/60 text-red-300',
  expired: 'bg-gray-700 text-gray-400',
  pending: 'bg-yellow-900/60 text-yellow-300',
};