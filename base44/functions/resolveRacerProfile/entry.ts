/**
 * resolveRacerProfile — HTTP handler.
 *
 * Resolves or creates a RacerProfile for a PersonIdentity.
 *
 * Input:
 *   {
 *     person_identity_id: "required-internal-id",
 *     creation_reason: "racer_import",
 *     allow_create: true,
 *     display_name: "Optional Name",
 *     legacy_driver_id: null
 *   }
 *
 * Allowed creation_reason values:
 *   racer_import, competition_registration, admin_create, profile_claim, backfill
 *
 * Output:
 *   {
 *     resolution_status: "resolved"|"created"|"not_found"|"review"|"blocked"|"error",
 *     review_required: false,
 *     created: false,
 *     person_identity_id: "string",
 *     racer_profile_id: "string|null",
 *     racecore_id: "RACR000000001|null",
 *     slug: "example-name|null",
 *     matching_profile_ids: []
 *   }
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { ensureRaceCoreId } from '../../shared/racecoreId.ts';

const APPROVED_CREATION_REASONS = [
  'racer_import',
  'competition_registration',
  'admin_create',
  'profile_claim',
  'backfill',
];

function slugify(text) {
  if (!text || typeof text !== 'string') return null;
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function generateUniqueSlug(sr, baseSlug) {
  if (!baseSlug) return null;
  let slug = baseSlug;
  let suffix = 1;
  // Cap at 100 attempts to avoid infinite loop
  while (suffix <= 100) {
    let existing = [];
    try {
      existing = await sr.entities.RacerProfile.filter({ slug: slug });
    } catch (e) {
      existing = [];
    }
    if (!existing || existing.length === 0) return slug;
    suffix++;
    slug = baseSlug + '-' + suffix;
  }
  // Fallback: append a timestamp-based suffix
  return baseSlug + '-' + Date.now().toString(36);
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const {
      person_identity_id,
      creation_reason,
      allow_create = false,
      display_name,
      legacy_driver_id,
    } = body;

    // ── Validate person_identity_id ─────────────────────────────────────
    if (!person_identity_id) {
      return Response.json({
        resolution_status: 'error',
        review_required: false,
        created: false,
        person_identity_id: null,
        racer_profile_id: null,
        racecore_id: null,
        slug: null,
        matching_profile_ids: [],
        error: 'person_identity_id is required',
      }, { status: 400 });
    }

    const sr = base44.asServiceRole;

    // ── Load PersonIdentity ─────────────────────────────────────────────
    let identity = null;
    try {
      identity = await sr.entities.PersonIdentity.get(person_identity_id);
    } catch (e) {
      identity = null;
    }

    if (!identity) {
      return Response.json({
        resolution_status: 'error',
        review_required: false,
        created: false,
        person_identity_id: person_identity_id,
        racer_profile_id: null,
        racecore_id: null,
        slug: null,
        matching_profile_ids: [],
        error: 'PersonIdentity not found: ' + person_identity_id,
      }, { status: 400 });
    }

    // ── Search for active, non-archived RacerProfiles ───────────────────
    let existingProfiles = [];
    try {
      existingProfiles = await sr.entities.RacerProfile.filter({
        person_identity_id: person_identity_id,
        is_archived: false,
      });
    } catch (e) {
      existingProfiles = [];
    }

    // ── If exactly one, reuse it ────────────────────────────────────────
    if (existingProfiles.length === 1) {
      const profile = existingProfiles[0];

      // Ensure it has a racecore_id (idempotent)
      const idResult = await ensureRaceCoreId(base44, 'RacerProfile', profile.id);
      const racecoreId = idResult.success ? idResult.racecore_id : (profile.racecore_id || null);

      return Response.json({
        resolution_status: 'resolved',
        review_required: false,
        created: false,
        person_identity_id: person_identity_id,
        racer_profile_id: profile.id,
        racecore_id: racecoreId,
        slug: profile.slug || null,
        matching_profile_ids: [],
      });
    }

    // ── If more than one, return review ─────────────────────────────────
    if (existingProfiles.length > 1) {
      return Response.json({
        resolution_status: 'review',
        review_required: true,
        created: false,
        person_identity_id: person_identity_id,
        racer_profile_id: null,
        racecore_id: null,
        slug: null,
        matching_profile_ids: existingProfiles.map(function(p) { return p.id; }),
      });
    }

    // ── No RacerProfile exists ──────────────────────────────────────────
    if (!allow_create) {
      return Response.json({
        resolution_status: 'not_found',
        review_required: false,
        created: false,
        person_identity_id: person_identity_id,
        racer_profile_id: null,
        racecore_id: null,
        slug: null,
        matching_profile_ids: [],
      });
    }

    // ── Validate creation_reason ────────────────────────────────────────
    if (!creation_reason || !APPROVED_CREATION_REASONS.includes(creation_reason)) {
      return Response.json({
        resolution_status: 'blocked',
        review_required: false,
        created: false,
        person_identity_id: person_identity_id,
        racer_profile_id: null,
        racecore_id: null,
        slug: null,
        matching_profile_ids: [],
        error: 'Invalid or missing creation_reason. Approved values: ' + APPROVED_CREATION_REASONS.join(', '),
      }, { status: 400 });
    }

    // ── Determine display_name ──────────────────────────────────────────
    const resolvedDisplayName =
      (display_name && typeof display_name === 'string' && display_name.trim()) ||
      (identity.canonical_name && identity.canonical_name.trim()) ||
      (identity.legal_name && identity.legal_name.trim()) ||
      null;

    if (!resolvedDisplayName) {
      return Response.json({
        resolution_status: 'blocked',
        review_required: false,
        created: false,
        person_identity_id: person_identity_id,
        racer_profile_id: null,
        racecore_id: null,
        slug: null,
        matching_profile_ids: [],
        error: 'Cannot determine display_name. No display_name supplied and PersonIdentity has no canonical_name or legal_name.',
      }, { status: 400 });
    }

    // ── Generate slug with collision detection ─────────────────────────
    const baseSlug = slugify(resolvedDisplayName);
    const uniqueSlug = await generateUniqueSlug(sr, baseSlug);

    // ── Create RacerProfile ─────────────────────────────────────────────
    const newProfileData = {
      person_identity_id: person_identity_id,
      display_name: resolvedDisplayName,
      slug: uniqueSlug,
      visibility: 'draft',
      is_claimed: false,
      is_archived: false,
    };

    // Set legacy_driver_id only when explicitly provided
    if (legacy_driver_id && typeof legacy_driver_id === 'string') {
      newProfileData.legacy_driver_id = legacy_driver_id;
    }

    let newProfile = null;
    try {
      newProfile = await sr.entities.RacerProfile.create(newProfileData);
    } catch (e) {
      return Response.json({
        resolution_status: 'error',
        review_required: false,
        created: false,
        person_identity_id: person_identity_id,
        racer_profile_id: null,
        racecore_id: null,
        slug: null,
        matching_profile_ids: [],
        error: 'Failed to create RacerProfile: ' + e.message,
      }, { status: 500 });
    }

    // ── Assign RaceCore ID via ensureRaceCoreId ─────────────────────────
    const idResult = await ensureRaceCoreId(base44, 'RacerProfile', newProfile.id);
    const racecoreId = idResult.success ? idResult.racecore_id : null;

    // ── Re-read to get final record ─────────────────────────────────────
    let finalProfile = newProfile;
    try {
      finalProfile = await sr.entities.RacerProfile.get(newProfile.id);
    } catch (e) {
      // Use the created record
    }

    return Response.json({
      resolution_status: 'created',
      review_required: false,
      created: true,
      person_identity_id: person_identity_id,
      racer_profile_id: newProfile.id,
      racecore_id: racecoreId,
      slug: finalProfile.slug || uniqueSlug,
      matching_profile_ids: [],
    });

  } catch (error) {
    return Response.json({
      resolution_status: 'error',
      review_required: false,
      created: false,
      person_identity_id: null,
      racer_profile_id: null,
      racecore_id: null,
      slug: null,
      matching_profile_ids: [],
      error: error.message,
    }, { status: 500 });
  }
}