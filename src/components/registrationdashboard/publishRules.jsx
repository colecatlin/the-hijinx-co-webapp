/**
 * Publish Rules
 * Defines publish states and helper functions for Race Core public pipeline
 */

export const PUBLISH_STATES = {
  DRAFT: 'draft',
  PROVISIONAL: 'provisional',
  OFFICIAL: 'official',
  LOCKED: 'locked',
};

/**
 * Get publish state for a session
 * Maps session.status directly to publish state
 */
export const getSessionPublishState = (session) => {
  if (!session) return PUBLISH_STATES.DRAFT;
  const status = session.status || 'draft';
  return status.toLowerCase() === 'locked' ? PUBLISH_STATES.LOCKED :
         status.toLowerCase() === 'official' ? PUBLISH_STATES.OFFICIAL :
         status.toLowerCase() === 'provisional' ? PUBLISH_STATES.PROVISIONAL :
         PUBLISH_STATES.DRAFT;
};

/**
 * Check if a session is publicly visible
 * Only Official and Locked sessions are public
 */
export const isSessionPublic = (session) => {
  const state = getSessionPublishState(session);
  return state === PUBLISH_STATES.OFFICIAL || state === PUBLISH_STATES.LOCKED;
};

/**
 * Get publish state for standings
 * Checks for a publish marker in OperationLog
 */
export const getStandingsPublishState = ({ hasPublishMarker, hasCalculation }) => {
  if (!hasCalculation) return 'NotCalculated';
  if (hasPublishMarker) return 'Published';
  return 'CalculatedUnpublished';
};

/**
 * Publish state badges for UI
 */
export const getPublishStateBadgeClass = (state) => {
  switch (state) {
    case PUBLISH_STATES.DRAFT:
      return 'bg-gray-500/20 text-gray-400';
    case PUBLISH_STATES.PROVISIONAL:
      return 'bg-blue-500/20 text-blue-400';
    case PUBLISH_STATES.OFFICIAL:
      return 'bg-green-500/20 text-green-400';
    case PUBLISH_STATES.LOCKED:
      return 'bg-purple-500/20 text-purple-400';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
};