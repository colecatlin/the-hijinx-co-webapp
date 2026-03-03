/**
 * Event Collaboration Rules
 * 
 * Determines publish readiness, acceptance status, and edit permissions
 * for Track and Series collaboration on Events.
 */

/**
 * Compute publish readiness based on collaboration rules
 * Returns: { isReady: boolean, reason: string }
 */
export function computePublishReady(event) {
  if (!event) {
    return { isReady: false, reason: 'Event not found' };
  }

  const planningRights = event.planning_rights || 'dual';
  const trackAccepted = event.track_accept_status === 'accepted';
  const seriesAccepted = event.series_accept_status === 'accepted';
  const trackPublished = event.track_publish_status === 'published';
  const seriesPublished = event.series_publish_status === 'published';

  if (planningRights === 'track_only') {
    if (!trackAccepted) {
      return { isReady: false, reason: 'Track has not accepted collaboration' };
    }
    if (!trackPublished) {
      return { isReady: false, reason: 'Track has not published' };
    }
    return { isReady: true, reason: 'Track published with full planning rights' };
  }

  if (planningRights === 'series_only') {
    if (!seriesAccepted) {
      return { isReady: false, reason: 'Series has not accepted collaboration' };
    }
    if (!seriesPublished) {
      return { isReady: false, reason: 'Series has not published' };
    }
    return { isReady: true, reason: 'Series published with full planning rights' };
  }

  // planningRights === 'dual'
  if (!trackAccepted) {
    return { isReady: false, reason: 'Track has not accepted collaboration' };
  }
  if (!seriesAccepted) {
    return { isReady: false, reason: 'Series has not accepted collaboration' };
  }
  if (!trackPublished) {
    return { isReady: false, reason: 'Track has not published' };
  }
  if (!seriesPublished) {
    return { isReady: false, reason: 'Series has not published' };
  }

  return { isReady: true, reason: 'Both sides accepted and published' };
}

/**
 * Check if current org can edit event
 */
export function canCurrentOrgEditEvent(currentOrgType, event) {
  if (!event) return false;

  const planningRights = event.planning_rights || 'dual';

  if (planningRights === 'dual') return true;
  if (planningRights === 'track_only') return currentOrgType === 'track';
  if (planningRights === 'series_only') return currentOrgType === 'series';

  return false;
}

/**
 * Get acceptance status for display
 */
export function getAcceptanceStatus(event) {
  if (!event) return {};

  return {
    trackStatus: event.track_accept_status || 'pending',
    seriesStatus: event.series_accept_status || 'pending',
    trackPublishStatus: event.track_publish_status || 'draft',
    seriesPublishStatus: event.series_publish_status || 'draft',
  };
}

/**
 * Get readable accept status label
 */
export function getAcceptStatusLabel(status) {
  const labels = {
    pending: 'Pending',
    accepted: 'Accepted',
    rejected: 'Rejected',
  };
  return labels[status] || status;
}

/**
 * Get accept status badge color
 */
export function getAcceptStatusColor(status) {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    accepted: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
  };
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
}

/**
 * Get readable publish status label
 */
export function getPublishStatusLabel(status) {
  const labels = {
    draft: 'Draft',
    published: 'Published',
  };
  return labels[status] || status;
}

/**
 * Get publish status badge color
 */
export function getPublishStatusColor(status) {
  const colors = {
    draft: 'bg-gray-100 text-gray-800 border-gray-200',
    published: 'bg-blue-100 text-blue-800 border-blue-200',
  };
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
}