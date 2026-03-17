// requestHelpers.js — shared constants and logic for the MediaRequest workflow

import { base44 } from '@/api/base44Client';

// ── Request type config ───────────────────────────────────────────────────────

export const REQUEST_TYPES = {
  event_coverage:       { label: 'Event Coverage',       credentialGated: true  },
  photography:          { label: 'Photography',          credentialGated: false },
  videography:          { label: 'Videography',          credentialGated: false },
  writing:              { label: 'Writing',              credentialGated: false },
  social_content:       { label: 'Social Content',       credentialGated: false },
  mixed_media:          { label: 'Mixed Media',          credentialGated: true  },
  editorial_assignment: { label: 'Editorial Assignment', credentialGated: false },
  brand_collaboration:  { label: 'Brand Collaboration',  credentialGated: false },
};

// Map request_type → MediaAssignment assignment_type
export const REQUEST_TYPE_TO_ASSIGNMENT_TYPE = {
  event_coverage:       'event_coverage',
  photography:          'photo_capture',
  videography:          'video_capture',
  writing:              'story',
  social_content:       'social_content',
  mixed_media:          'mixed_media',
  editorial_assignment: 'story',
  brand_collaboration:  'feature_package',
};

// ── Status config ─────────────────────────────────────────────────────────────

export const REQUEST_STATUSES = {
  draft:                    { label: 'Draft',                 color: 'bg-gray-100 text-gray-600',       dark: 'bg-gray-700 text-gray-400' },
  open:                     { label: 'Open',                  color: 'bg-blue-100 text-blue-700',        dark: 'bg-blue-900/50 text-blue-300' },
  matched:                  { label: 'Matched',               color: 'bg-cyan-100 text-cyan-700',        dark: 'bg-cyan-900/50 text-cyan-300' },
  sent_to_creator:          { label: 'Sent to Creator',       color: 'bg-indigo-100 text-indigo-700',    dark: 'bg-indigo-900/50 text-indigo-300' },
  accepted:                 { label: 'Accepted',              color: 'bg-green-100 text-green-700',      dark: 'bg-green-900/50 text-green-300' },
  declined:                 { label: 'Declined',              color: 'bg-red-100 text-red-700',          dark: 'bg-red-900/50 text-red-300' },
  expired:                  { label: 'Expired',               color: 'bg-gray-200 text-gray-500',        dark: 'bg-gray-800 text-gray-500' },
  converted_to_assignment:  { label: 'Converted',             color: 'bg-teal-100 text-teal-700',        dark: 'bg-teal-900/50 text-teal-300' },
  cancelled:                { label: 'Cancelled',             color: 'bg-gray-200 text-gray-500',        dark: 'bg-gray-800 text-gray-500' },
};

export const REQUESTER_ENTITY_TYPES = [
  { value: 'team',   label: 'Team'   },
  { value: 'track',  label: 'Track'  },
  { value: 'series', label: 'Series' },
  { value: 'outlet', label: 'Outlet' },
  { value: 'brand',  label: 'Brand'  },
  { value: 'admin',  label: 'Admin/Editorial' },
];

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

// ── Matching helpers ──────────────────────────────────────────────────────────

/**
 * Filter a list of MediaProfile records against a request for basic matching.
 * Uses signals (availability, specialties, credentialed_media) — not hard gates.
 */
export function matchCreatorsToRequest(request, profiles) {
  if (!profiles?.length) return [];
  return profiles.filter(p => {
    // Must be active profile
    if (p.profile_status !== 'active') return false;
    // If credential required, prefer credentialed creators
    if (request.credential_required && !p.credentialed_media) return false;
    return true;
  }).sort((a, b) => {
    // Sort by availability then trust level
    const avail = { available: 0, limited: 1, unavailable: 2 };
    const trust = { editor: 0, senior_writer: 1, verified_writer: 2, contributor: 3, none: 4 };
    const ad = avail[a.availability_status] ?? 2;
    const bd = avail[b.availability_status] ?? 2;
    if (ad !== bd) return ad - bd;
    return (trust[a.writer_trust_level] ?? 4) - (trust[b.writer_trust_level] ?? 4);
  });
}

// ── Credential gate check for requests ───────────────────────────────────────

export async function checkRequestCredentialEligibility(request, creatorMediaUserId) {
  if (!request.credential_required) return { eligible: true, reason: 'No credential required' };
  if (!creatorMediaUserId) return { eligible: false, reason: 'No media user ID found' };

  try {
    const creds = await base44.entities.MediaCredential.filter({
      holder_media_user_id: creatorMediaUserId,
      status: 'active',
    });
    const scopeId = request.linked_event_id || request.linked_series_id || request.linked_track_id;
    if (!scopeId) return { eligible: true, reason: 'No scope entity — credential check skipped' };
    const hasMatch = creds.some(c => c.scope_entity_id === scopeId);
    return hasMatch
      ? { eligible: true, reason: 'Active credential found' }
      : { eligible: false, reason: 'No active credential for this event/series/track' };
  } catch {
    return { eligible: false, reason: 'Could not verify credentials' };
  }
}

// ── Convert request → assignment ──────────────────────────────────────────────

export async function convertRequestToAssignment(request, currentUser) {
  const now = new Date().toISOString();

  const assignmentPayload = {
    assignment_title:      request.request_title,
    assignment_type:       REQUEST_TYPE_TO_ASSIGNMENT_TYPE[request.request_type] || 'story',
    status:                'assigned',
    assigned_to_user_id:   request.target_creator_user_id || null,
    assigned_to_profile_id: request.target_creator_profile_id || null,
    assigned_to_outlet_id: request.target_outlet_id || null,
    assigned_by_user_id:   currentUser?.id || null,
    due_date:              request.deadline || null,
    priority:              request.priority || 'medium',
    linked_event_id:       request.linked_event_id || null,
    linked_series_id:      request.linked_series_id || null,
    linked_track_id:       request.linked_track_id || null,
    deliverables:          request.deliverables || [],
    assignment_notes:      request.request_description || null,
    credential_required:   request.credential_required || false,
    credential_verified:   request.credential_verified || false,
  };

  const assignment = await base44.entities.MediaAssignment.create(assignmentPayload);

  await base44.entities.MediaRequest.update(request.id, {
    request_status: 'converted_to_assignment',
    converted_assignment_id: assignment.id,
  });

  return assignment;
}

// ── Operation logging ─────────────────────────────────────────────────────────

export async function logRequestEvent(operation_type, {
  requestId,
  targetCreatorProfileId,
  targetOutletId,
  linkedEventId,
  requestedByEntityType,
  requestedByEntityId,
  actedByUserId,
  previousStatus,
  newStatus,
} = {}) {
  try {
    await base44.entities.OperationLog.create({
      operation_type,
      entity_type: 'MediaRequest',
      entity_id: requestId,
      user_email: actedByUserId || 'system',
      status: 'success',
      message: operation_type,
      metadata: {
        media_request_id:            requestId || null,
        target_creator_profile_id:   targetCreatorProfileId || null,
        target_outlet_id:            targetOutletId || null,
        linked_event_id:             linkedEventId || null,
        requested_by_entity_type:    requestedByEntityType || null,
        requested_by_entity_id:      requestedByEntityId || null,
        acted_by_user_id:            actedByUserId || null,
        previous_status:             previousStatus || null,
        new_status:                  newStatus || null,
      },
    });
  } catch (_) {}
}