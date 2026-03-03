/**
 * Event Planning Rights Helper
 * Enforces planning_rights rules across RegistrationDashboard
 *
 * Definitions:
 * - userTrackAccess: EntityCollaborator with entity_type="Track", entity_id=selectedEvent.track_id, role in ["owner","editor"], user_id=current user
 * - userSeriesAccess: EntityCollaborator with entity_type="Series", entity_id=selectedEvent.series_id, role in ["owner","editor"], user_id=current user
 *
 * Rules:
 * - Admin always can edit and approve
 * - If planning_rights = "both", allow edit if userTrackAccess or userSeriesAccess
 * - If planning_rights = "track_only", allow edit only if userTrackAccess
 * - If planning_rights = "series_only", allow edit only if userSeriesAccess
 * - If selectedEvent.series_id is empty, treat series approval as not required, and series access is not needed to edit
 * - Track is required; if track_id missing, editing still allowed for admin only, but publishing blocked by earlier rules
 */

export function canEditEventCore({ isAdmin, userId, selectedEvent, userTrackAccess, userSeriesAccess }) {
  if (!selectedEvent) return false;
  if (isAdmin) return true;

  const planningRights = selectedEvent.planning_rights || 'both';
  const hasSeries = !!selectedEvent.series_id;

  // If track is missing, only admin can edit
  if (!selectedEvent.track_id) {
    return false;
  }

  // Apply planning_rights rules
  if (planningRights === 'track_only') {
    return userTrackAccess;
  }

  if (planningRights === 'series_only') {
    // If no series_id, series approval not required
    if (!hasSeries) {
      return true;
    }
    return userSeriesAccess;
  }

  // planningRights === 'both' or undefined
  return userTrackAccess || (hasSeries ? userSeriesAccess : true);
}

export function canApproveAsTrack({ isAdmin, selectedEvent, userTrackAccess }) {
  if (!selectedEvent) return false;
  if (isAdmin) return true;
  return userTrackAccess;
}

export function canApproveAsSeries({ isAdmin, selectedEvent, userSeriesAccess }) {
  if (!selectedEvent) return false;
  if (isAdmin) return true;
  // If no series_id, series approval not applicable
  if (!selectedEvent.series_id) {
    return false;
  }
  return userSeriesAccess;
}