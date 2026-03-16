// ─── credentialHelpers.jsx ───────────────────────────────────────────────────
// Shared helpers for credential eligibility signals, display labels,
// and operation logging across the media ecosystem.
// ─────────────────────────────────────────────────────────────────────────────

// ── Status display maps ───────────────────────────────────────────────────────

export const CREDENTIAL_STATUS_COLORS = {
  active:   'bg-green-900/60 text-green-300',
  pending:  'bg-yellow-900/60 text-yellow-300',
  revoked:  'bg-red-900/60 text-red-300',
  expired:  'bg-gray-700 text-gray-400',
};

export const REQUEST_STATUS_COLORS = {
  draft:            'bg-gray-700 text-gray-400',
  applied:          'bg-blue-900/60 text-blue-300',
  change_requested: 'bg-orange-900/60 text-orange-300',
  under_review:     'bg-amber-900/60 text-amber-300',
  approved:         'bg-green-900/60 text-green-300',
  denied:           'bg-red-900/60 text-red-300',
  cancelled:        'bg-gray-700 text-gray-500',
};

export const REQUEST_STATUS_LABELS = {
  draft:            'Draft',
  applied:          'Submitted',
  change_requested: 'Changes Requested',
  under_review:     'Under Review',
  approved:         'Approved',
  denied:           'Denied',
  cancelled:        'Cancelled',
};

export const ACCESS_LEVEL_LABELS = {
  general:    'General Access',
  pit:        'Pit Access',
  hot_pit:    'Hot Pit Access',
  restricted: 'Restricted Area',
  drone:      'Drone Operation',
  all_access: 'All Access',
};

export const CREDENTIAL_LEVEL_LABELS = {
  limited:      'Limited',
  standard:     'Standard',
  full_access:  'Full Access',
  pit_lane:     'Pit Lane',
  media_center: 'Media Center',
  broadcast:    'Broadcast',
};

// ── Effective status (accounts for expiry) ────────────────────────────────────

export function getEffectiveCredentialStatus(cred) {
  if (cred.status === 'active' && cred.expires_at && new Date(cred.expires_at) < new Date()) {
    return 'expired';
  }
  return cred.status;
}

// ── Eligibility signals derived from credential history ───────────────────────
// Non-gating signals only — they do not grant access automatically.

const EXPERIENCED_THRESHOLD = 3;

export function deriveCredentialSignals(credentials = []) {
  const currentYear = new Date().getFullYear();
  const active = credentials.filter(c => getEffectiveCredentialStatus(c) === 'active');
  const total  = credentials.length;
  const recentSeasonCutoff = new Date(`${currentYear - 1}-01-01`);
  const recentCredentials  = credentials.filter(c => c.issued_at && new Date(c.issued_at) >= recentSeasonCutoff);

  return {
    credentialed_media:      active.length > 0,
    experienced_media:       total >= EXPERIENCED_THRESHOLD,
    verified_event_media:    recentCredentials.length > 0,
    active_credential_count: active.length,
    total_credential_count:  total,
  };
}

// ── Operation logging ─────────────────────────────────────────────────────────

export async function logCredentialEvent(base44Client, {
  operation_type,
  credentialId,
  requestId,
  mediaProfileId,
  mediaOutletId,
  eventId,
  actedByUserId,
  message,
} = {}) {
  try {
    await base44Client.entities.OperationLog.create({
      operation_type,
      entity_type: 'MediaCredential',
      entity_id: credentialId || requestId,
      user_email: actedByUserId || 'system',
      status: 'success',
      message: message || operation_type,
      metadata: {
        credential_id: credentialId || null,
        credential_request_id: requestId || null,
        media_profile_id: mediaProfileId || null,
        media_outlet_id: mediaOutletId || null,
        event_id: eventId || null,
        acted_by_user_id: actedByUserId || null,
      },
    });
  } catch (_) {
    // Never let logging break the main flow
  }
}