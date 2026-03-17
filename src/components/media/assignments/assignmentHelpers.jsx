// assignmentHelpers.js — shared logic for the MediaAssignment workflow layer

import { base44 } from '@/api/base44Client';

// ── Assignment type config ─────────────────────────────────────────────────────

export const ASSIGNMENT_TYPES = {
  story:              { label: 'Story',              credentialGated: false },
  event_coverage:     { label: 'Event Coverage',     credentialGated: true  },
  photo_capture:      { label: 'Photo Capture',      credentialGated: true  },
  video_capture:      { label: 'Video Capture',      credentialGated: true  },
  editorial_research: { label: 'Editorial Research', credentialGated: false },
  interview:          { label: 'Interview',          credentialGated: false },
  social_content:     { label: 'Social Content',     credentialGated: false },
  recap_package:      { label: 'Recap Package',      credentialGated: true  },
  feature_package:    { label: 'Feature Package',    credentialGated: false },
  mixed_media:        { label: 'Mixed Media',        credentialGated: true  },
};

// ── Status config ──────────────────────────────────────────────────────────────

export const ASSIGNMENT_STATUSES = {
  draft:         { label: 'Draft',          color: 'bg-gray-100 text-gray-600' },
  assigned:      { label: 'Assigned',       color: 'bg-blue-100 text-blue-700' },
  accepted:      { label: 'Accepted',       color: 'bg-indigo-100 text-indigo-700' },
  declined:      { label: 'Declined',       color: 'bg-red-100 text-red-700' },
  in_progress:   { label: 'In Progress',    color: 'bg-yellow-100 text-yellow-700' },
  submitted:     { label: 'Submitted',      color: 'bg-purple-100 text-purple-700' },
  needs_revision:{ label: 'Needs Revision', color: 'bg-orange-100 text-orange-700' },
  approved:      { label: 'Approved',       color: 'bg-green-100 text-green-700' },
  completed:     { label: 'Completed',      color: 'bg-teal-100 text-teal-700' },
  cancelled:     { label: 'Cancelled',      color: 'bg-gray-200 text-gray-500' },
};

// Dark variants for MediaPortal (dark bg)
export const ASSIGNMENT_STATUS_COLORS_DARK = {
  draft:         'bg-gray-700 text-gray-400',
  assigned:      'bg-blue-900/60 text-blue-300',
  accepted:      'bg-indigo-900/60 text-indigo-300',
  declined:      'bg-red-900/60 text-red-300',
  in_progress:   'bg-yellow-900/60 text-yellow-300',
  submitted:     'bg-purple-900/60 text-purple-300',
  needs_revision:'bg-orange-900/60 text-orange-300',
  approved:      'bg-green-900/60 text-green-300',
  completed:     'bg-teal-900/60 text-teal-300',
  cancelled:     'bg-gray-800 text-gray-500',
};

export const PRIORITY_COLORS = {
  low:    'bg-gray-100 text-gray-500',
  medium: 'bg-blue-100 text-blue-600',
  high:   'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export const PRIORITY_COLORS_DARK = {
  low:    'bg-gray-700 text-gray-400',
  medium: 'bg-blue-900/50 text-blue-300',
  high:   'bg-orange-900/50 text-orange-300',
  urgent: 'bg-red-900/60 text-red-300',
};

// ── Credential gate check ─────────────────────────────────────────────────────

/**
 * Checks if a contributor has a valid credential for a credentialed assignment.
 * Returns { eligible: boolean, reason: string }
 */
export async function checkCredentialEligibility(assignment, contributorMediaUserId) {
  const typeConfig = ASSIGNMENT_TYPES[assignment.assignment_type];
  if (!typeConfig?.credentialGated || !assignment.credential_required) {
    return { eligible: true, reason: 'No credential required' };
  }
  if (!contributorMediaUserId) {
    return { eligible: false, reason: 'No media user ID — contributor not found in RaceCore' };
  }

  try {
    const creds = await base44.entities.MediaCredential.filter({
      holder_media_user_id: contributorMediaUserId,
      status: 'active',
    });

    const scopeId = assignment.linked_event_id || assignment.linked_series_id || assignment.linked_track_id;
    if (!scopeId) {
      return { eligible: true, reason: 'No scope entity set — credential check skipped' };
    }

    const hasMatch = creds.some(c => c.scope_entity_id === scopeId);
    if (hasMatch) return { eligible: true, reason: 'Active credential found' };
    return { eligible: false, reason: 'No active credential for this event/series/track' };
  } catch {
    return { eligible: false, reason: 'Could not verify credentials' };
  }
}

// ── Operation logging ─────────────────────────────────────────────────────────

export async function logAssignmentEvent(operation_type, {
  assignmentId,
  assignedToUserId,
  assignedToProfileId,
  assignedToOutletId,
  linkedEventId,
  linkedStoryId,
  linkedRecommendationId,
  actedByUserId,
  previousStatus,
  newStatus,
} = {}) {
  try {
    await base44.entities.OperationLog.create({
      operation_type,
      entity_type: 'MediaAssignment',
      entity_id: assignmentId,
      user_email: actedByUserId || 'system',
      status: 'success',
      message: operation_type,
      metadata: {
        media_assignment_id:    assignmentId || null,
        assigned_to_user_id:    assignedToUserId || null,
        assigned_to_profile_id: assignedToProfileId || null,
        assigned_to_outlet_id:  assignedToOutletId || null,
        linked_event_id:        linkedEventId || null,
        linked_story_id:        linkedStoryId || null,
        linked_recommendation_id: linkedRecommendationId || null,
        acted_by_user_id:       actedByUserId || null,
        previous_status:        previousStatus || null,
        new_status:             newStatus || null,
      },
    });
  } catch (_) {
    // Never let logging break the main flow
  }
}

// ── Deliverable helpers ───────────────────────────────────────────────────────

export function formatDeliverable(d) {
  const qty = d.quantity > 1 ? `${d.quantity}x ` : '';
  const fmt = d.required_format ? ` (${d.required_format})` : '';
  const due = d.due_at ? ` — due ${new Date(d.due_at).toLocaleDateString()}` : '';
  return `${qty}${d.type}${fmt}${due}`;
}

export function isOverdue(assignment) {
  if (!assignment.due_date) return false;
  if (['completed', 'cancelled', 'approved'].includes(assignment.status)) return false;
  return new Date(assignment.due_date) < new Date();
}