/**
 * upsertSponsorship
 * ---------------------------------------------------------------------------
 * Phase 17A: The single authoritative write function for Sponsorship records.
 *
 * This function is the ONLY intended write path for Sponsorship in Phase 17A.
 * Frontend direct Sponsorship.create() is not the intended path.
 *
 * Supports:
 *   - create (new Organization + new Sponsorship)
 *   - resolve/reuse (existing Organization + existing Sponsorship)
 *   - update (existing Sponsorship field changes)
 *   - archive (soft-delete via is_archived + status)
 *   - dry_run (project outcome without writes)
 *
 * Permission: admin-only for Phase 17A (conservative).
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  resolveSponsorOrganization,
  isCommercialOrganizationType,
  normalizeOrganizationName,
  slugifyOrganizationName,
} from '../../shared/organizationResolution.ts';
import {
  validateSponsorshipTarget,
  isValidRelationshipType,
  isValidTier,
  isValidStatus,
  isValidStatusTransition,
  validateDateRange,
  normalizeSeasonYear,
  buildNormalizedSponsorshipKey,
} from '../../shared/sponsorshipHelpers.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    // 1 — Authenticate caller
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2 — Confirm caller permission (admin-only for Phase 17A)
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden — admin only for Phase 17A' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      operation = 'upsert',
      organization: orgInput = {},
      sponsorship: sponsorInput = {},
      dry_run = false,
    } = body;

    // ── Archive operation ───────────────────────────────────────────────
    if (operation === 'archive') {
      return await handleArchive(base44, user, sponsorInput, dry_run);
    }

    // ── Upsert operation ───────────────────────────────────────────────
    return await handleUpsert(base44, user, orgInput, sponsorInput, dry_run);
  } catch (error) {
    return Response.json({ error: error?.message || 'upsertSponsorship failed' }, { status: 500 });
  }
}

// ─── Upsert Handler ──────────────────────────────────────────────────────────

async function handleUpsert(
  base44: any,
  user: any,
  orgInput: any,
  sponsorInput: any,
  dryRun: boolean,
): Promise<Response> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 3 — Validate request
  if (!sponsorInput.target_entity_type || !sponsorInput.target_entity_id) {
    errors.push('sponsorship.target_entity_type and sponsorship.target_entity_id are required');
  }
  if (!sponsorInput.relationship_type) {
    errors.push('sponsorship.relationship_type is required');
  }
  if (errors.length > 0) {
    return Response.json({
      success: false,
      dry_run: dryRun,
      resolution_status: 'error',
      review_required: false,
      errors,
      warnings,
      organization: { organization_id: null, created: false, reused: false, name: null, slug: null },
      sponsorship: { sponsorship_id: null, created: false, updated: false, reused: false, normalized_sponsorship_key: null },
      target: { entity_type: sponsorInput.target_entity_type || null, entity_id: sponsorInput.target_entity_id || null, valid: false },
    }, { status: 400 });
  }

  // 8 — Validate relationship_type
  if (!isValidRelationshipType(sponsorInput.relationship_type)) {
    return Response.json({
      success: false,
      dry_run: dryRun,
      resolution_status: 'error',
      review_required: false,
      errors: [`Invalid relationship_type: "${sponsorInput.relationship_type}"`],
      warnings,
      organization: { organization_id: null, created: false, reused: false, name: null, slug: null },
      sponsorship: { sponsorship_id: null, created: false, updated: false, reused: false, normalized_sponsorship_key: null },
      target: { entity_type: sponsorInput.target_entity_type, entity_id: sponsorInput.target_entity_id, valid: false },
    }, { status: 400 });
  }

  // 9 — Validate tier
  if (!isValidTier(sponsorInput.tier)) {
    return Response.json({
      success: false,
      dry_run: dryRun,
      resolution_status: 'error',
      review_required: false,
      errors: [`Invalid tier: "${sponsorInput.tier}"`],
      warnings,
      organization: { organization_id: null, created: false, reused: false, name: null, slug: null },
      sponsorship: { sponsorship_id: null, created: false, updated: false, reused: false, normalized_sponsorship_key: null },
      target: { entity_type: sponsorInput.target_entity_type, entity_id: sponsorInput.target_entity_id, valid: false },
    }, { status: 400 });
  }

  // 12 — Validate date range
  const dateValidation = validateDateRange(sponsorInput.start_date, sponsorInput.end_date);
  if (!dateValidation.valid) {
    return Response.json({
      success: false,
      dry_run: dryRun,
      resolution_status: 'error',
      review_required: false,
      errors: [dateValidation.error!],
      warnings,
      organization: { organization_id: null, created: false, reused: false, name: null, slug: null },
      sponsorship: { sponsorship_id: null, created: false, updated: false, reused: false, normalized_sponsorship_key: null },
      target: { entity_type: sponsorInput.target_entity_type, entity_id: sponsorInput.target_entity_id, valid: false },
    }, { status: 400 });
  }

  // 13 — Validate season_year
  const seasonValidation = normalizeSeasonYear(sponsorInput.season_year);
  if (!seasonValidation.valid) {
    return Response.json({
      success: false,
      dry_run: dryRun,
      resolution_status: 'error',
      review_required: false,
      errors: [seasonValidation.error!],
      warnings,
      organization: { organization_id: null, created: false, reused: false, name: null, slug: null },
      sponsorship: { sponsorship_id: null, created: false, updated: false, reused: false, normalized_sponsorship_key: null },
      target: { entity_type: sponsorInput.target_entity_type, entity_id: sponsorInput.target_entity_id, valid: false },
    }, { status: 400 });
  }

  // 4 — Resolve or create Organization
  // In dry-run, never create — only resolve read-only. If no match found,
  // project the creation outcome without writing.
  const orgResolution = await resolveSponsorOrganization(base44, {
    organization_id: orgInput.organization_id,
    name: orgInput.name,
    website_url: orgInput.website_url,
    external_uid: orgInput.external_uid,
    organization_type: orgInput.organization_type,
    allow_create: dryRun ? false : (orgInput.allow_create !== false),
  });

  // In dry-run, "blocked" means no existing match — project creation if allowed
  if (dryRun && orgResolution.status === 'blocked') {
    const normalizedName = normalizeOrganizationName(orgInput.name);
    if (!normalizedName || normalizedName.length < 2) {
      return Response.json({
        success: false,
        dry_run: true,
        resolution_status: 'error',
        review_required: false,
        errors: ['Organization name is too short or empty for creation'],
        warnings: orgResolution.warnings,
        organization: { organization_id: null, created: false, reused: false, name: orgInput.name || null, slug: null },
        sponsorship: { sponsorship_id: null, created: false, updated: false, reused: false, normalized_sponsorship_key: null },
        target: { entity_type: sponsorInput.target_entity_type, entity_id: sponsorInput.target_entity_id, valid: false },
      }, { status: 400 });
    }
    // Project creation — set org to null and mark created=true in the projected response
    // The target validation and key building will use a projected organization_id
  } else if (orgResolution.status === 'error' || orgResolution.status === 'blocked') {
    return Response.json({
      success: false,
      dry_run: dryRun,
      resolution_status: orgResolution.status,
      review_required: false,
      errors: orgResolution.errors,
      warnings: orgResolution.warnings,
      organization: {
        organization_id: null,
        created: false,
        reused: false,
        name: orgInput.name || null,
        slug: null,
      },
      sponsorship: { sponsorship_id: null, created: false, updated: false, reused: false, normalized_sponsorship_key: null },
      target: { entity_type: sponsorInput.target_entity_type, entity_id: sponsorInput.target_entity_id, valid: false },
    }, { status: 400 });
  }

  if (orgResolution.status === 'review') {
    return Response.json({
      success: false,
      dry_run: dryRun,
      resolution_status: 'review',
      review_required: true,
      errors: [],
      warnings: orgResolution.warnings,
      organization: {
        organization_id: null,
        created: false,
        reused: false,
        name: orgInput.name || null,
        slug: null,
      },
      sponsorship: { sponsorship_id: null, created: false, updated: false, reused: false, normalized_sponsorship_key: null },
      target: { entity_type: sponsorInput.target_entity_type, entity_id: sponsorInput.target_entity_id, valid: false },
    }, { status: 200 });
  }

  // 5 — Validate Organization is a commercial-compatible type
  const org = orgResolution.organization;
  const isProjectedCreate = dryRun && orgResolution.status === 'blocked';
  if (isProjectedCreate) {
    // Projected creation — validate the requested type is commercial
    const projectedType = orgInput.organization_type && isCommercialOrganizationType(orgInput.organization_type)
      ? orgInput.organization_type
      : 'Sponsor';
    if (!isCommercialOrganizationType(projectedType)) {
      return Response.json({
        success: false,
        dry_run: true,
        resolution_status: 'blocked',
        review_required: false,
        errors: [`Projected organization type "${projectedType}" is not a commercial-compatible type`],
        warnings,
        organization: { organization_id: null, created: false, reused: false, name: orgInput.name || null, slug: null },
        sponsorship: { sponsorship_id: null, created: false, updated: false, reused: false, normalized_sponsorship_key: null },
        target: { entity_type: sponsorInput.target_entity_type, entity_id: sponsorInput.target_entity_id, valid: false },
      }, { status: 400 });
    }
  } else if (org && !isCommercialOrganizationType(org.type)) {
    return Response.json({
      success: false,
      dry_run: dryRun,
      resolution_status: 'blocked',
      review_required: false,
      errors: [`Organization type "${org.type}" is not a commercial-compatible type. Allowed: Sponsor, Vendor, Manufacturer, OEM, BroadcastPartner, HospitalityPartner, RetailPartner, TechnologyProvider, MarketingAgency, Other`],
      warnings,
      organization: {
        organization_id: org.id,
        created: orgResolution.created,
        reused: orgResolution.reused,
        name: org.name,
        slug: org.slug,
      },
      sponsorship: { sponsorship_id: null, created: false, updated: false, reused: false, normalized_sponsorship_key: null },
      target: { entity_type: sponsorInput.target_entity_type, entity_id: sponsorInput.target_entity_id, valid: false },
    }, { status: 400 });
  }

  // 6 — Validate target entity (skip actual lookup in dry-run for Platform target)
  const targetValidation = await validateSponsorshipTarget(
    base44,
    sponsorInput.target_entity_type,
    sponsorInput.target_entity_id,
  );
  if (!targetValidation.valid) {
    return Response.json({
      success: false,
      dry_run: dryRun,
      resolution_status: 'error',
      review_required: false,
      errors: [targetValidation.error!],
      warnings,
      organization: {
        organization_id: orgResolution.organization_id,
        created: orgResolution.created,
        reused: orgResolution.reused,
        name: org?.name || null,
        slug: org?.slug || null,
      },
      sponsorship: { sponsorship_id: null, created: false, updated: false, reused: false, normalized_sponsorship_key: null },
      target: { entity_type: sponsorInput.target_entity_type, entity_id: sponsorInput.target_entity_id, valid: false },
    }, { status: 400 });
  }

  // 11 — Build normalized_sponsorship_key
  // For projected creation, use a placeholder organization_id in the key
  const keyOrgId = orgResolution.organization_id || (isProjectedCreate ? 'projected_org_id' : '');
  const normalizedKey = buildNormalizedSponsorshipKey({
    sponsor_organization_id: keyOrgId,
    target_entity_type: sponsorInput.target_entity_type,
    target_entity_id: sponsorInput.target_entity_id,
    relationship_type: sponsorInput.relationship_type,
    start_date: sponsorInput.start_date,
  });

  // 12 — Search existing active/non-archived Sponsorship by normalized key
  let existingSponsorships: any[] = [];
  try {
    existingSponsorships = await base44.asServiceRole.entities.Sponsorship.filter({
      normalized_sponsorship_key: normalizedKey,
      is_archived: false,
    });
  } catch {
    // Entity might not have records yet — that's fine
  }

  const activeExisting = (existingSponsorships || []).filter((s: any) => s.status !== 'archived');

  // 14 — If multiple exist, return review
  if (activeExisting.length > 1) {
    return Response.json({
      success: false,
      dry_run: dryRun,
      resolution_status: 'review',
      review_required: true,
      errors: [],
      warnings: [`Multiple Sponsorships found with normalized_sponsorship_key "${normalizedKey}" — manual review required`],
      organization: {
        organization_id: orgResolution.organization_id,
        created: orgResolution.created,
        reused: orgResolution.reused,
        name: org?.name || null,
        slug: org?.slug || null,
      },
      sponsorship: {
        sponsorship_id: null,
        created: false,
        updated: false,
        reused: false,
        normalized_sponsorship_key: normalizedKey,
      },
      target: { entity_type: sponsorInput.target_entity_type, entity_id: sponsorInput.target_entity_id, valid: true },
    }, { status: 200 });
  }

  // ── Dry-run: project outcome without writes ─────────────────────────
  if (dryRun) {
    const willReuse = activeExisting.length === 1;
    const projectedOrgName = org?.name || orgInput.name || null;
    const projectedSlug = org?.slug || (isProjectedCreate ? slugifyOrganizationName(orgInput.name) : null);
    return Response.json({
      success: true,
      dry_run: true,
      resolution_status: 'projected',
      review_required: false,
      errors: [],
      warnings: [...warnings, ...orgResolution.warnings, 'DRY RUN: no writes performed — outcome projected only'],
      organization: {
        organization_id: orgResolution.organization_id,
        created: isProjectedCreate,
        reused: orgResolution.reused,
        name: projectedOrgName,
        slug: projectedSlug,
      },
      sponsorship: {
        sponsorship_id: willReuse ? activeExisting[0].id : null,
        created: !willReuse,
        updated: willReuse,
        reused: willReuse,
        normalized_sponsorship_key: normalizedKey,
      },
      target: { entity_type: sponsorInput.target_entity_type, entity_id: sponsorInput.target_entity_id, valid: true },
    }, { status: 200 });
  }

  // 13 — If exactly one exists, reuse/update it
  if (activeExisting.length === 1) {
    const existing = activeExisting[0];

    // 14 — Validate status transition if status is being changed
    const newStatus = sponsorInput.status || existing.status;
    if (newStatus !== existing.status) {
      if (!isValidStatus(newStatus)) {
        return Response.json({
          success: false,
          dry_run: false,
          resolution_status: 'error',
          review_required: false,
          errors: [`Invalid status: "${newStatus}"`],
          warnings,
          organization: {
            organization_id: orgResolution.organization_id,
            created: false,
            reused: true,
            name: org?.name || null,
            slug: org?.slug || null,
          },
          sponsorship: { sponsorship_id: existing.id, created: false, updated: false, reused: true, normalized_sponsorship_key: normalizedKey },
          target: { entity_type: sponsorInput.target_entity_type, entity_id: sponsorInput.target_entity_id, valid: true },
        }, { status: 400 });
      }
      if (!isValidStatusTransition(existing.status, newStatus)) {
        return Response.json({
          success: false,
          dry_run: false,
          resolution_status: 'error',
          review_required: false,
          errors: [`Invalid status transition: "${existing.status}" → "${newStatus}"`],
          warnings,
          organization: {
            organization_id: orgResolution.organization_id,
            created: false,
            reused: true,
            name: org?.name || null,
            slug: org?.slug || null,
          },
          sponsorship: { sponsorship_id: existing.id, created: false, updated: false, reused: true, normalized_sponsorship_key: normalizedKey },
          target: { entity_type: sponsorInput.target_entity_type, entity_id: sponsorInput.target_entity_id, valid: true },
        }, { status: 400 });
      }
    }

    // Update existing sponsorship
    const updateData: any = {
      updated_by_user_id: user.id,
    };
    if (sponsorInput.tier !== undefined) updateData.tier = sponsorInput.tier || null;
    if (sponsorInput.category !== undefined) updateData.category = sponsorInput.category || null;
    if (sponsorInput.status !== undefined) updateData.status = newStatus;
    if (sponsorInput.start_date !== undefined) updateData.start_date = sponsorInput.start_date || null;
    if (sponsorInput.end_date !== undefined) updateData.end_date = sponsorInput.end_date || null;
    if (sponsorInput.season_year !== undefined) updateData.season_year = seasonValidation.normalized || null;
    if (sponsorInput.display_order !== undefined) updateData.display_order = sponsorInput.display_order;
    if (sponsorInput.public_visibility !== undefined) updateData.public_visibility = sponsorInput.public_visibility;
    if (sponsorInput.logo_override !== undefined) updateData.logo_override = sponsorInput.logo_override || null;
    if (sponsorInput.website_override !== undefined) updateData.website_override = sponsorInput.website_override || null;
    if (sponsorInput.campaign_name !== undefined) updateData.campaign_name = sponsorInput.campaign_name || null;
    if (sponsorInput.notes !== undefined) updateData.notes = sponsorInput.notes || null;

    const updated = await base44.asServiceRole.entities.Sponsorship.update(existing.id, updateData);

    return Response.json({
      success: true,
      dry_run: false,
      resolution_status: 'updated',
      review_required: false,
      errors: [],
      warnings: [...warnings, ...orgResolution.warnings],
      organization: {
        organization_id: orgResolution.organization_id,
        created: orgResolution.created,
        reused: orgResolution.reused,
        name: org?.name || null,
        slug: org?.slug || null,
      },
      sponsorship: {
        sponsorship_id: updated.id,
        created: false,
        updated: true,
        reused: true,
        normalized_sponsorship_key: normalizedKey,
      },
      target: { entity_type: sponsorInput.target_entity_type, entity_id: sponsorInput.target_entity_id, valid: true },
    }, { status: 200 });
  }

  // 15 — If none exists, create Sponsorship
  const newSponsorship = await base44.asServiceRole.entities.Sponsorship.create({
    sponsor_organization_id: orgResolution.organization_id,
    target_entity_type: sponsorInput.target_entity_type,
    target_entity_id: sponsorInput.target_entity_id,
    relationship_type: sponsorInput.relationship_type,
    tier: sponsorInput.tier || null,
    category: sponsorInput.category || null,
    status: sponsorInput.status || 'draft',
    start_date: sponsorInput.start_date || null,
    end_date: sponsorInput.end_date || null,
    season_year: seasonValidation.normalized || null,
    display_order: sponsorInput.display_order || 0,
    public_visibility: sponsorInput.public_visibility || 'public',
    logo_override: sponsorInput.logo_override || null,
    website_override: sponsorInput.website_override || null,
    campaign_name: sponsorInput.campaign_name || null,
    notes: sponsorInput.notes || null,
    revenue_agreement_id: null,
    source: sponsorInput.source || 'phase_17a',
    legacy_driver_sponsor_id: null,
    legacy_entry_sponsor_id: null,
    deliverables: [],
    is_archived: false,
    normalized_sponsorship_key: normalizedKey,
    created_by_user_id: user.id,
    updated_by_user_id: user.id,
  });

  // 16 — Return complete response
  return Response.json({
    success: true,
    dry_run: false,
    resolution_status: 'created',
    review_required: false,
    errors: [],
    warnings: [...warnings, ...orgResolution.warnings],
    organization: {
      organization_id: orgResolution.organization_id,
      created: orgResolution.created,
      reused: orgResolution.reused,
      name: org?.name || null,
      slug: org?.slug || null,
    },
    sponsorship: {
      sponsorship_id: newSponsorship.id,
      created: true,
      updated: false,
      reused: false,
      normalized_sponsorship_key: normalizedKey,
    },
    target: { entity_type: sponsorInput.target_entity_type, entity_id: sponsorInput.target_entity_id, valid: true },
  }, { status: 200 });
}

// ─── Archive Handler ─────────────────────────────────────────────────────────

async function handleArchive(
  base44: any,
  user: any,
  sponsorInput: any,
  dryRun: boolean,
): Promise<Response> {
  if (!sponsorInput.sponsorship_id) {
    return Response.json({
      success: false,
      dry_run: dryRun,
      resolution_status: 'error',
      review_required: false,
      errors: ['sponsorship.sponsorship_id is required for archive operation'],
      warnings: [],
      organization: { organization_id: null, created: false, reused: false, name: null, slug: null },
      sponsorship: { sponsorship_id: null, created: false, updated: false, reused: false, normalized_sponsorship_key: null },
      target: { entity_type: null, entity_id: null, valid: false },
    }, { status: 400 });
  }

  let sponsorship: any = null;
  try {
    sponsorship = await base44.asServiceRole.entities.Sponsorship.get(sponsorInput.sponsorship_id);
  } catch {
    return Response.json({
      success: false,
      dry_run: dryRun,
      resolution_status: 'error',
      review_required: false,
      errors: [`Sponsorship ${sponsorInput.sponsorship_id} not found`],
      warnings: [],
      organization: { organization_id: null, created: false, reused: false, name: null, slug: null },
      sponsorship: { sponsorship_id: null, created: false, updated: false, reused: false, normalized_sponsorship_key: null },
      target: { entity_type: null, entity_id: null, valid: false },
    }, { status: 404 });
  }

  if (dryRun) {
    return Response.json({
      success: true,
      dry_run: true,
      resolution_status: 'projected',
      review_required: false,
      errors: [],
      warnings: ['DRY RUN: no writes performed — archive projected only'],
      organization: { organization_id: null, created: false, reused: false, name: null, slug: null },
      sponsorship: {
        sponsorship_id: sponsorship.id,
        created: false,
        updated: false,
        reused: false,
        normalized_sponsorship_key: sponsorship.normalized_sponsorship_key,
      },
      target: { entity_type: sponsorship.target_entity_type, entity_id: sponsorship.target_entity_id, valid: true },
    }, { status: 200 });
  }

  const now = new Date().toISOString();
  const updated = await base44.asServiceRole.entities.Sponsorship.update(sponsorInput.sponsorship_id, {
    status: 'archived',
    is_archived: true,
    archived_at: now,
    updated_by_user_id: user.id,
  });

  return Response.json({
    success: true,
    dry_run: false,
    resolution_status: 'updated',
    review_required: false,
    errors: [],
    warnings: [],
    organization: { organization_id: null, created: false, reused: false, name: null, slug: null },
    sponsorship: {
      sponsorship_id: updated.id,
      created: false,
      updated: true,
      reused: false,
      normalized_sponsorship_key: sponsorship.normalized_sponsorship_key,
    },
    target: { entity_type: sponsorship.target_entity_type, entity_id: sponsorship.target_entity_id, valid: true },
  }, { status: 200 });
}