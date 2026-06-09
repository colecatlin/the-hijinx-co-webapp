/**
 * officialPermissions.js
 * R9BP Sprint 1 — Official Permission Foundation
 *
 * Defines role-based permissions for EventOfficial records.
 * NOT yet wired into RaceControlProvider — this is the foundation file only.
 *
 * Usage (Sprint 2+):
 *   import { deriveOfficialPermissions, mergeOfficialPermissions } from './officialPermissions';
 */

// ── All permission keys used across competition operations ───────────────────
export const ALL_PERMISSION_KEYS = [
  'canCreateIncident',
  'canInvestigateIncident',
  'canCloseIncident',
  'canProposePenalty',
  'canApprovePenalty',
  'canApplyPenalty', // R9BS Sprint 4: separate from approve
  'canReviewProtest',
  'canIssueRuling',
  'canPublishRuling',
  'canApproveGrid',
  'canGenerateLineup',
  'canApproveResults',
  'canHoldResults',
  'canPerformTechInspection',
  'canApproveTechResults',
  'canPostRaceTech',
  'canManageEntries',
  'canManageCheckIn',
  'canViewRaceControl',
  'canCreateSessionNote',
  'canManageOfficials',
  'canManageMedia',
  'canViewMedicalNotes',
];

// ── Empty permissions baseline ────────────────────────────────────────────────
export const NO_PERMISSIONS = Object.fromEntries(
  ALL_PERMISSION_KEYS.map((k) => [k, false])
);

// ── Full permissions (admin / Race Director) ──────────────────────────────────
export const ALL_PERMISSIONS = Object.fromEntries(
  ALL_PERMISSION_KEYS.map((k) => [k, true])
);

// ── Role → permission map ─────────────────────────────────────────────────────
export const ROLE_PERMISSIONS = {
  'Race Director': {
    canCreateIncident:      true,
    canInvestigateIncident: true,
    canCloseIncident:       true,
    canProposePenalty:      true,
    canApprovePenalty:      true,
    canApplyPenalty:        true, // R9BS Sprint 4: Race Director can apply
    canReviewProtest:       true,
    canIssueRuling:         true,
    canPublishRuling:       true,
    canApproveGrid:         true,
    canGenerateLineup:      true,
    canApproveResults:      true,
    canHoldResults:         true,
    canPerformTechInspection: false,
    canApproveTechResults:  true,
    canPostRaceTech:        true,
    canManageEntries:       true,
    canManageCheckIn:       true,
    canViewRaceControl:     true,
    canCreateSessionNote:   true,
    canManageOfficials:     true,
    canManageMedia:         false,
    canViewMedicalNotes:    true,
  },

  'Competition Director': {
    canCreateIncident:      true,
    canInvestigateIncident: true,
    canCloseIncident:       true,
    canProposePenalty:      true,
    canApprovePenalty:      true,
    canApplyPenalty:        true,
    canReviewProtest:       true,
    canIssueRuling:         true,
    canPublishRuling:       true,
    canApproveGrid:         true,
    canGenerateLineup:      true,
    canApproveResults:      true,
    canHoldResults:         true,
    canPerformTechInspection: false,
    canApproveTechResults:  true,
    canPostRaceTech:        true,
    canManageEntries:       true,
    canManageCheckIn:       true,
    canViewRaceControl:     true,
    canCreateSessionNote:   true,
    canManageOfficials:     true,
    canManageMedia:         false,
    canViewMedicalNotes:    true,
  },

  'Chief Steward': {
    canCreateIncident:      true,
    canInvestigateIncident: true,
    canCloseIncident:       true,
    canProposePenalty:      true,
    canApprovePenalty:      true,
    canApplyPenalty:        false,
    canReviewProtest:       true,
    canIssueRuling:         true,
    canPublishRuling:       false,
    canApproveGrid:         false,
    canGenerateLineup:      false,
    canApproveResults:      false,
    canHoldResults:         true,
    canPerformTechInspection: false,
    canApproveTechResults:  false,
    canPostRaceTech:        true,
    canManageEntries:       false,
    canManageCheckIn:       false,
    canViewRaceControl:     true,
    canCreateSessionNote:   true,
    canManageOfficials:     false,
    canManageMedia:         false,
    canViewMedicalNotes:    true,
  },

  'Steward': {
    canCreateIncident:      true,
    canInvestigateIncident: true,
    canCloseIncident:       false,
    canProposePenalty:      true,
    canApprovePenalty:      false,
    canApplyPenalty:        false,
    canReviewProtest:       true,
    canIssueRuling:         false,
    canPublishRuling:       false,
    canApproveGrid:         false,
    canGenerateLineup:      false,
    canApproveResults:      false,
    canHoldResults:         false,
    canPerformTechInspection: false,
    canApproveTechResults:  false,
    canPostRaceTech:        false,
    canManageEntries:       false,
    canManageCheckIn:       false,
    canViewRaceControl:     true,
    canCreateSessionNote:   true,
    canManageOfficials:     false,
    canManageMedia:         false,
    canViewMedicalNotes:    false,
  },

  'Technical Director': {
    canCreateIncident:      true,
    canInvestigateIncident: false,
    canCloseIncident:       false,
    canProposePenalty:      true,
    canApprovePenalty:      false,
    canApplyPenalty:        false,
    canReviewProtest:       false,
    canIssueRuling:         false,
    canPublishRuling:       false,
    canApproveGrid:         false,
    canGenerateLineup:      false,
    canApproveResults:      false,
    canHoldResults:         false,
    canPerformTechInspection: true,
    canApproveTechResults:  true,
    canPostRaceTech:        true,
    canManageEntries:       false,
    canManageCheckIn:       false,
    canViewRaceControl:     true,
    canCreateSessionNote:   false,
    canManageOfficials:     false,
    canManageMedia:         false,
    canViewMedicalNotes:    false,
  },

  'Technical Inspector': {
    canCreateIncident:      false,
    canInvestigateIncident: false,
    canCloseIncident:       false,
    canProposePenalty:      false,
    canApprovePenalty:      false,
    canApplyPenalty:        false,
    canReviewProtest:       false,
    canIssueRuling:         false,
    canPublishRuling:       false,
    canApproveGrid:         false,
    canGenerateLineup:      false,
    canApproveResults:      false,
    canHoldResults:         false,
    canPerformTechInspection: true,
    canApproveTechResults:  false,
    canPostRaceTech:        true,
    canManageEntries:       false,
    canManageCheckIn:       false,
    canViewRaceControl:     false,
    canCreateSessionNote:   false,
    canManageOfficials:     false,
    canManageMedia:         false,
    canViewMedicalNotes:    false,
  },

  'Registration Manager': {
    canCreateIncident:      false,
    canInvestigateIncident: false,
    canCloseIncident:       false,
    canProposePenalty:      false,
    canApprovePenalty:      false,
    canApplyPenalty:        false,
    canReviewProtest:       false,
    canIssueRuling:         false,
    canPublishRuling:       false,
    canApproveGrid:         false,
    canGenerateLineup:      false,
    canApproveResults:      false,
    canHoldResults:         false,
    canPerformTechInspection: false,
    canApproveTechResults:  false,
    canPostRaceTech:        false,
    canManageEntries:       true,
    canManageCheckIn:       true,
    canViewRaceControl:     false,
    canCreateSessionNote:   false,
    canManageOfficials:     false,
    canManageMedia:         false,
    canViewMedicalNotes:    false,
  },

  'Timing and Scoring': {
    canCreateIncident:      false,
    canInvestigateIncident: false,
    canCloseIncident:       false,
    canProposePenalty:      false,
    canApprovePenalty:      false,
    canApplyPenalty:        false,
    canReviewProtest:       false,
    canIssueRuling:         false,
    canPublishRuling:       false,
    canApproveGrid:         false,
    canGenerateLineup:      true,
    canApproveResults:      false,
    canHoldResults:         false,
    canPerformTechInspection: false,
    canApproveTechResults:  false,
    canPostRaceTech:        false,
    canManageEntries:       false,
    canManageCheckIn:       false,
    canViewRaceControl:     true,
    canCreateSessionNote:   true,
    canManageOfficials:     false,
    canManageMedia:         false,
    canViewMedicalNotes:    false,
  },

  'Announcer': {
    canCreateIncident:      false,
    canInvestigateIncident: false,
    canCloseIncident:       false,
    canProposePenalty:      false,
    canApprovePenalty:      false,
    canApplyPenalty:        false,
    canReviewProtest:       false,
    canIssueRuling:         false,
    canPublishRuling:       false,
    canApproveGrid:         false,
    canGenerateLineup:      false,
    canApproveResults:      false,
    canHoldResults:         false,
    canPerformTechInspection: false,
    canApproveTechResults:  false,
    canPostRaceTech:        false,
    canManageEntries:       false,
    canManageCheckIn:       false,
    canViewRaceControl:     true,
    canCreateSessionNote:   true,
    canManageOfficials:     false,
    canManageMedia:         false,
    canViewMedicalNotes:    false,
  },

  'Media Director': {
    canCreateIncident:      false,
    canInvestigateIncident: false,
    canCloseIncident:       false,
    canProposePenalty:      false,
    canApprovePenalty:      false,
    canApplyPenalty:        false,
    canReviewProtest:       false,
    canIssueRuling:         false,
    canPublishRuling:       false,
    canApproveGrid:         false,
    canGenerateLineup:      false,
    canApproveResults:      false,
    canHoldResults:         false,
    canPerformTechInspection: false,
    canApproveTechResults:  false,
    canPostRaceTech:        false,
    canManageEntries:       false,
    canManageCheckIn:       false,
    canViewRaceControl:     false,
    canCreateSessionNote:   false,
    canManageOfficials:     false,
    canManageMedia:         true,
    canViewMedicalNotes:    false,
  },

  'Safety Director': {
    canCreateIncident:      true,
    canInvestigateIncident: true,
    canCloseIncident:       false,
    canProposePenalty:      false,
    canApprovePenalty:      false,
    canApplyPenalty:        false,
    canReviewProtest:       false,
    canIssueRuling:         false,
    canPublishRuling:       false,
    canApproveGrid:         false,
    canGenerateLineup:      false,
    canApproveResults:      false,
    canHoldResults:         false,
    canPerformTechInspection: false,
    canApproveTechResults:  false,
    canPostRaceTech:        false,
    canManageEntries:       false,
    canManageCheckIn:       false,
    canViewRaceControl:     true,
    canCreateSessionNote:   true,
    canManageOfficials:     false,
    canManageMedia:         false,
    canViewMedicalNotes:    true,
  },

  'Gate Staff': {
    canCreateIncident:      false,
    canInvestigateIncident: false,
    canCloseIncident:       false,
    canProposePenalty:      false,
    canApprovePenalty:      false,
    canApplyPenalty:        false,
    canReviewProtest:       false,
    canIssueRuling:         false,
    canPublishRuling:       false,
    canApproveGrid:         false,
    canGenerateLineup:      false,
    canApproveResults:      false,
    canHoldResults:         false,
    canPerformTechInspection: false,
    canApproveTechResults:  false,
    canPostRaceTech:        false,
    canManageEntries:       false,
    canManageCheckIn:       false,
    canViewRaceControl:     false,
    canCreateSessionNote:   false,
    canManageOfficials:     false,
    canManageMedia:         false,
    canViewMedicalNotes:    false,
  },
};

// ── deriveOfficialPermissions ─────────────────────────────────────────────────
/**
 * Derives a merged permissions object for a user at a specific event.
 *
 * @param {Array} officialRecords - Array of EventOfficial records for this event/user
 * @param {Object} user - Current user object from base44.auth.me()
 * @param {Object} [eventContext] - Optional { event, series, track } for ownership checks
 * @returns {Object} Merged permission object with all permission keys
 */
export function deriveOfficialPermissions(officialRecords = [], user = null, eventContext = {}) {
  // Platform admin → all permissions
  if (user?.role === 'admin') {
    return { ...ALL_PERMISSIONS };
  }

  // No records → no permissions
  if (!officialRecords || officialRecords.length === 0) {
    return { ...NO_PERMISSIONS };
  }

  // Filter to active or confirmed records for this user
  const activeRecords = officialRecords.filter(
    (r) => r.user_id === user?.id && ['Invited', 'Confirmed', 'Active'].includes(r.status)
  );

  if (activeRecords.length === 0) {
    return { ...NO_PERMISSIONS };
  }

  // Merge all roles with OR logic — any true wins
  const merged = { ...NO_PERMISSIONS };
  for (const record of activeRecords) {
    const rolePerms = ROLE_PERMISSIONS[record.role];
    if (!rolePerms) continue;
    for (const key of ALL_PERMISSION_KEYS) {
      if (rolePerms[key] === true) merged[key] = true;
    }
  }

  return merged;
}

// ── mergeOfficialPermissions ──────────────────────────────────────────────────
/**
 * Merges official permissions into an existing permissions object.
 * Used to extend existing RaceControlProvider permissions with official-derived ones.
 * OR logic — any true from either source wins.
 *
 * @param {Object} existingPermissions - Current permissions from RaceControlProvider
 * @param {Object} officialPermissions - Permissions derived from deriveOfficialPermissions
 * @returns {Object} Merged permissions
 */
export function mergeOfficialPermissions(existingPermissions = {}, officialPermissions = {}) {
  const merged = { ...existingPermissions };
  for (const key of ALL_PERMISSION_KEYS) {
    if (officialPermissions[key] === true) merged[key] = true;
  }
  return merged;
}

// ── hasPermission ─────────────────────────────────────────────────────────────
/**
 * Convenience helper for backend functions to check a single permission.
 * Works with either a user object + eventOfficials array, or a pre-derived permissions object.
 *
 * @param {string} permissionKey - e.g. 'canCreateIncident'
 * @param {Object} user - Current user
 * @param {Array} officialRecords - EventOfficial records for this event/user
 * @returns {boolean}
 */
export function hasPermission(permissionKey, user, officialRecords = []) {
  if (user?.role === 'admin') return true;
  const perms = deriveOfficialPermissions(officialRecords, user);
  return perms[permissionKey] === true;
}