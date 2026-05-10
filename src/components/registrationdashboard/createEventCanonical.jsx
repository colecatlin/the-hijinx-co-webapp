/**
 * createEventCanonical.js
 *
 * ADDITIVE HELPER — Phase 2 Part B1
 * This helper is NOT yet used by any existing creation path.
 * It is intended for migration in Phase 2 Part B2 and beyond.
 *
 * Provides the single canonical frontend path for creating Event records via
 * the syncSourceAndEntityRecord pipeline, ensuring:
 *   - Correct status enum values
 *   - Slug generation
 *   - series_name derivation
 *   - Canonical field defaults
 *   - OperationLog written (via syncSourceAndEntityRecord backend)
 *   - Entity layer record created (via syncSourceAndEntityRecord backend)
 *   - Event entity links synced (via syncSourceAndEntityRecord backend)
 *
 * Post-create collaborator setup and collaboration requests are NOT included
 * here — callers should invoke setupEventCollaborators and requestEventCollaboration
 * after receiving the returned event record, as EventBuilderForm currently does.
 */

import { base44 } from '@/api/base44Client';

// ── Canonical status values ────────────────────────────────────────────────────
const CANONICAL_STATUSES = new Set([
  'Draft',
  'PendingApproval',
  'Published',
  'Live',
  'Completed',
  'Cancelled',
]);

// Legacy or invalid statuses that should be coerced to Draft
const LEGACY_STATUS_MAP = {
  upcoming: 'Draft',
  in_progress: 'Live',
  completed: 'Completed',
  cancelled: 'Cancelled',
  draft: 'Draft',
};

/**
 * Normalize a status value to a canonical enum value.
 * Falls back to 'Draft' for any unknown or missing value.
 */
function normalizeStatus(status) {
  if (!status) return 'Draft';
  if (CANONICAL_STATUSES.has(status)) return status;
  return LEGACY_STATUS_MAP[status?.toLowerCase()] || 'Draft';
}

/**
 * Generate a URL-friendly slug from a name string.
 */
function generateSlug(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

/**
 * createEventCanonical
 *
 * Creates an Event record through the canonical syncSourceAndEntityRecord pipeline.
 *
 * @param {object} args
 * @param {object} args.payload               - Raw form/input data for the event
 * @param {object} [args.currentUser]         - The authenticated user (for triggered_from context)
 * @param {string} [args.triggeredFrom]       - Source identifier for OperationLog (e.g. 'add_event_form')
 * @param {Array}  [args.seriesList]          - Full series list for series_name derivation
 * @param {Array}  [args.trackList]           - Full track list (reserved for future use)
 * @param {string} [args.createdByEntityType] - 'admin' | 'track' | 'series'
 * @param {string} [args.createdByEntityId]   - ID of the creating entity (track or series ID)
 *
 * @returns {Promise<object>} The created Event source_record from syncSourceAndEntityRecord
 */
export async function createEventCanonical({
  payload = {},
  currentUser,
  triggeredFrom,
  seriesList = [],
  trackList = [],
  createdByEntityType,
  createdByEntityId,
}) {
  // ── Resolve series_name from series_id if not provided ────────────────────
  let resolvedSeriesName = payload.series_name || null;
  if (!resolvedSeriesName && payload.series_id && seriesList.length > 0) {
    const matchedSeries = seriesList.find((s) => s.id === payload.series_id);
    resolvedSeriesName = matchedSeries?.name || null;
  }

  // ── Resolve slug from name if not provided ────────────────────────────────
  const resolvedSlug = payload.slug || generateSlug(payload.name || '');

  // ── Normalize status to canonical enum value ──────────────────────────────
  const resolvedStatus = normalizeStatus(payload.status);

  // ── Determine created_by fields ───────────────────────────────────────────
  // Caller can pass explicit values; fall back to 'admin' if current user is admin,
  // otherwise leave as provided.
  const resolvedCreatedByType =
    createdByEntityType ||
    payload.created_by_entity_type ||
    (currentUser?.role === 'admin' ? 'admin' : undefined);

  const resolvedCreatedById =
    createdByEntityId ||
    payload.created_by_entity_id ||
    undefined;

  // ── Build the canonical payload ───────────────────────────────────────────
  const canonicalPayload = {
    // Core required fields
    name: payload.name || '',
    event_date: payload.event_date || '',
    end_date: payload.end_date || payload.event_date || '',

    // Track & Series links
    track_id: payload.track_id || null,
    series_id: payload.series_id || null,
    series_name: resolvedSeriesName,

    // Scheduling
    season: payload.season || String(new Date().getFullYear()),
    slug: resolvedSlug,
    status: resolvedStatus,
    round_number: payload.round_number ? Number(payload.round_number) : null,

    // Location / external
    location_note: payload.location_note || null,
    external_uid: payload.external_uid || null,

    // Media
    event_logo_url: payload.event_logo_url || null,
    event_cover_image_url: payload.event_cover_image_url || null,

    // Provenance
    ...(resolvedCreatedByType && { created_by_entity_type: resolvedCreatedByType }),
    ...(resolvedCreatedById   && { created_by_entity_id: resolvedCreatedById }),

    // Acceptance defaults — always start Pending unless caller explicitly passes Accepted
    track_acceptance_status:  payload.track_acceptance_status  || 'Pending',
    series_acceptance_status: payload.series_acceptance_status || 'Pending',
    track_publish_approved:   payload.track_publish_approved   ?? false,
    series_publish_approved:  payload.series_publish_approved  ?? false,
  };

  // Strip out null/undefined values for optional fields so the sync pipeline
  // does not overwrite existing data with nulls on partial updates.
  // Required fields (name, event_date) are kept even if empty so validation
  // errors surface correctly server-side.
  const REQUIRED_KEYS = new Set(['name', 'event_date', 'status', 'slug']);
  const cleanedPayload = Object.fromEntries(
    Object.entries(canonicalPayload).filter(
      ([key, value]) => REQUIRED_KEYS.has(key) || (value !== null && value !== undefined && value !== '')
    )
  );

  // ── Call syncSourceAndEntityRecord ────────────────────────────────────────
  const result = await base44.functions.invoke('syncSourceAndEntityRecord', {
    entity_type: 'event',
    payload: cleanedPayload,
    triggered_from: triggeredFrom || 'canonical_event_create',
  });

  // Surface any errors from the pipeline
  if (!result?.data?.source_record) {
    throw new Error(
      result?.data?.error ||
      'syncSourceAndEntityRecord did not return a source_record'
    );
  }

  return result.data.source_record;
}