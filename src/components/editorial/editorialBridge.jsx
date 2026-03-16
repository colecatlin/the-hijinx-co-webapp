// ─── editorialBridge.js ───────────────────────────────────────────────────────
// Shared logic for the integration layer between contributor ecosystem
// and The Outlet editorial system.
// ─────────────────────────────────────────────────────────────────────────────

import { base44 } from '@/api/base44Client';

// ── Writer trust helpers ───────────────────────────────────────────────────────

export const WRITER_TRUST_LEVELS = {
  none:            { label: 'No Editorial Access', canPublishDirect: false, color: 'bg-gray-700 text-gray-400' },
  contributor:     { label: 'Contributor',          canPublishDirect: false, color: 'bg-blue-900/50 text-blue-300' },
  verified_writer: { label: 'Verified Writer',      canPublishDirect: true,  color: 'bg-teal-900/50 text-teal-300' },
  senior_writer:   { label: 'Senior Writer',        canPublishDirect: true,  color: 'bg-indigo-900/50 text-indigo-300' },
  editor:          { label: 'Editor',               canPublishDirect: true,  color: 'bg-purple-900/50 text-purple-300' },
};

export const EDITORIAL_STATUS_LABELS = {
  pending_review:     'Pending Review',
  needs_revision:     'Needs Revision',
  approved:           'Approved',
  rejected:           'Rejected',
  converted_to_draft: 'Draft Created',
  published_direct:   'Published Direct',
  archived:           'Archived',
};

export const EDITORIAL_STATUS_COLORS = {
  pending_review:     'bg-amber-900/60 text-amber-300',
  needs_revision:     'bg-orange-900/60 text-orange-300',
  approved:           'bg-green-900/60 text-green-300',
  rejected:           'bg-red-900/60 text-red-300',
  converted_to_draft: 'bg-blue-900/60 text-blue-300',
  published_direct:   'bg-teal-900/60 text-teal-300',
  archived:           'bg-gray-700 text-gray-400',
};

export const EDITORIAL_PRIORITY_COLORS = {
  low:    'bg-gray-700 text-gray-400',
  medium: 'bg-blue-900/50 text-blue-300',
  high:   'bg-orange-900/50 text-orange-300',
  urgent: 'bg-red-900/60 text-red-300',
};

export const SUBMISSION_TYPE_LABELS = {
  tip:        'Tip',
  pitch:      'Pitch',
  full_story: 'Full Story',
};

export const SUBMISSION_SOURCE_LABELS = {
  profile:              'Fan / Profile',
  mediaportal:          'MediaPortal',
  writer_workspace:     'Writer Workspace',
  editorial_assignment: 'Editorial Assignment',
};

// ── canPublishDirect: checks profile trust level and flag ─────────────────────

export function canPublishDirect(mediaProfile) {
  if (!mediaProfile) return false;
  if (!mediaProfile.can_publish_without_review) return false;
  const trusted = ['verified_writer', 'senior_writer', 'editor'];
  return trusted.includes(mediaProfile.writer_trust_level);
}

// ── Map submission category to OutletStory primary_category ───────────────────

const CATEGORY_MAP = {
  Racing:   'Racing',
  Culture:  'Culture',
  Business: 'Business',
  Gear:     'Marketplace',
  Travel:   'Culture',
  Opinion:  'Culture',
  Media:    'Media',
};

export function mapSubmissionCategory(category) {
  return CATEGORY_MAP[category] || 'Racing';
}

// ── Build an OutletStory payload from a StorySubmission ───────────────────────

export function buildStoryFromSubmission(submission, { mediaProfile, mediaOutlet, publishDirect } = {}) {
  const story_source = publishDirect
    ? 'verified_writer_direct'
    : (submission.submission_source === 'profile' ? 'fan_submission' : 'contributor_submission');

  return {
    title:                  submission.title,
    subtitle:               submission.pitch?.slice(0, 200) || '',
    body:                   submission.body || '',
    author:                 submission.name,
    author_title:           mediaProfile?.primary_role || '',
    photo_credit:           submission.photo_credit || '',
    primary_category:       mapSubmissionCategory(submission.category),
    sub_category:           'Fan Experience',
    tags:                   submission.tags || [],
    cover_image:            submission.cover_image || '',
    location_city:          submission.location_city || '',
    location_state:         submission.location_state || '',
    location_country:       submission.location_country || '',
    status:                 publishDirect ? 'draft' : 'draft', // stays draft — editorial promotes to published
    story_source,
    author_user_id:         submission.submitter_user_id || null,
    author_media_profile_id: mediaProfile?.id || null,
    author_outlet_id:       mediaOutlet?.id || null,
    source_submission_id:   submission.id,
  };
}

// ── Operation logging ─────────────────────────────────────────────────────────

export async function logSubmissionEvent(operation_type, {
  submissionId,
  outletStoryId,
  submitterUserId,
  mediaProfileId,
  mediaOutletId,
  actedByUserId,
  previousStatus,
  newStatus,
  previousTrustLevel,
  newTrustLevel,
} = {}) {
  try {
    await base44.entities.OperationLog.create({
      operation_type,
      entity_type: 'StorySubmission',
      entity_id: submissionId,
      user_email: actedByUserId || 'system',
      status: 'success',
      message: operation_type,
      metadata: {
        story_submission_id:  submissionId || null,
        outlet_story_id:      outletStoryId || null,
        submitter_user_id:    submitterUserId || null,
        media_profile_id:     mediaProfileId || null,
        media_outlet_id:      mediaOutletId || null,
        acted_by_user_id:     actedByUserId || null,
        previous_status:      previousStatus || null,
        new_status:           newStatus || null,
        previous_trust_level: previousTrustLevel || null,
        new_trust_level:      newTrustLevel || null,
      },
    });
  } catch (_) {
    // Never let logging break the main flow
  }
}