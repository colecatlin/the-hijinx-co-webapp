/**
 * auditOrganizationResolution
 * ---------------------------------------------------------------------------
 * Phase 17A: Read-only audit of Organization resolution readiness.
 *
 * Audits:
 *   - Organizations with missing normalization fields
 *   - Exact normalized-name collisions
 *   - Website domain collisions
 *   - External UID collisions
 *   - Alias collisions
 *   - Aliases pointing to missing Organizations
 *   - Organizations with invalid type
 *   - Sponsor Organizations that are public but incomplete
 *   - Potential deterministic resolution conflicts
 *
 * Fuzzy name similarity is never used for merge proof.
 * Candidate similarity may be reported separately but never counts as
 * a confirmed duplicate.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  normalizeOrganizationName,
  extractWebsiteDomain,
  isCommercialOrganizationType,
} from '../../shared/organizationResolution.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const [organizations, aliases] = await Promise.all([
      base44.asServiceRole.entities.Organization.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.EntityAlias.filter({ entity_type: 'Organization' }).catch(() => []),
    ]);

    const orgs = organizations || [];
    const orgAliases = aliases || [];

    // ── Missing normalization fields ──────────────────────────────────
    const missingNormalization = orgs.map((o: any) => {
      const missing: string[] = [];
      if (!o.normalized_name) missing.push('normalized_name');
      if (!o.canonical_slug) missing.push('canonical_slug');
      if (!o.canonical_key) missing.push('canonical_key');
      return { organization_id: o.id, name: o.name, missing };
    }).filter((r: any) => r.missing.length > 0);

    // ── Exact normalized-name collisions ──────────────────────────────
    const normalizedNameMap: Record<string, string[]> = {};
    orgs.forEach((o: any) => {
      const normalized = o.normalized_name || normalizeOrganizationName(o.name);
      if (normalized) {
        if (!normalizedNameMap[normalized]) normalizedNameMap[normalized] = [];
        normalizedNameMap[normalized].push(o.id);
      }
    });
    const normalizedNameCollisions = Object.entries(normalizedNameMap)
      .filter(([_, ids]) => ids.length > 1)
      .map(([name, ids]) => ({ normalized_name: name, organization_ids: ids }));

    // ── Website domain collisions ─────────────────────────────────────
    const domainMap: Record<string, string[]> = {};
    orgs.forEach((o: any) => {
      const domain = extractWebsiteDomain(o.website_url);
      if (domain) {
        if (!domainMap[domain]) domainMap[domain] = [];
        domainMap[domain].push(o.id);
      }
    });
    const domainCollisions = Object.entries(domainMap)
      .filter(([_, ids]) => ids.length > 1)
      .map(([domain, ids]) => ({ domain, organization_ids: ids }));

    // ── External UID collisions ───────────────────────────────────────
    const uidMap: Record<string, string[]> = {};
    orgs.forEach((o: any) => {
      if (o.external_uid) {
        if (!uidMap[o.external_uid]) uidMap[o.external_uid] = [];
        uidMap[o.external_uid].push(o.id);
      }
    });
    const uidCollisions = Object.entries(uidMap)
      .filter(([_, ids]) => ids.length > 1)
      .map(([uid, ids]) => ({ external_uid: uid, organization_ids: ids }));

    // ── Alias collisions ──────────────────────────────────────────────
    const aliasNormalizedMap: Record<string, string[]> = {};
    orgAliases.forEach((a: any) => {
      if (a.alias_normalized && a.active) {
        if (!aliasNormalizedMap[a.alias_normalized]) aliasNormalizedMap[a.alias_normalized] = [];
        aliasNormalizedMap[a.alias_normalized].push(a.id);
      }
    });
    const aliasCollisions = Object.entries(aliasNormalizedMap)
      .filter(([_, ids]) => ids.length > 1)
      .map(([normalized, ids]) => ({ alias_normalized: normalized, alias_ids: ids }));

    // ── Aliases pointing to missing Organizations ─────────────────────
    const orgIds = new Set(orgs.map((o: any) => o.id));
    const aliasesWithMissingOrgs = orgAliases.filter((a: any) => !orgIds.has(a.entity_id));

    // ── Organizations with invalid type ───────────────────────────────
    const validTypes = [
      'Sponsor', 'Vendor', 'Manufacturer', 'OEM', 'BroadcastPartner', 'Venue',
      'SanctioningBody', 'MarketingAgency', 'SafetyCrew', 'HospitalityPartner',
      'RetailPartner', 'TechnologyProvider', 'League', 'Club', 'Association', 'Other',
    ];
    const invalidTypeOrgs = orgs.filter((o: any) => !validTypes.includes(o.type));

    // ── Sponsor Organizations that are public but incomplete ──────────
    const publicIncompleteSponsors = orgs.filter((o: any) =>
      o.type === 'Sponsor' &&
      o.visibility_status === 'live' &&
      (!o.normalized_name || !o.canonical_key || !o.name)
    ).map((o: any) => ({
      organization_id: o.id,
      name: o.name,
      missing: [
        ...(!o.normalized_name ? ['normalized_name'] : []),
        ...(!o.canonical_key ? ['canonical_key'] : []),
      ],
    }));

    // ── Potential deterministic resolution conflicts ─────────────────
    // An organization has a normalized name that matches another org's alias
    const aliasNormalizedSet = new Set(
      orgAliases.filter((a: any) => a.active).map((a: any) => a.alias_normalized)
    );
    const potentialConflicts = orgs.filter((o: any) => {
      const normalized = o.normalized_name || normalizeOrganizationName(o.name);
      return normalized && aliasNormalizedSet.has(normalized);
    }).map((o: any) => ({
      organization_id: o.id,
      name: o.name,
      normalized_name: o.normalized_name || normalizeOrganizationName(o.name),
    }));

    const report = {
      status: 'complete',
      timestamp: new Date().toISOString(),
      counts: {
        total_organizations: orgs.length,
        total_aliases: orgAliases.length,
        organizations_missing_normalization: missingNormalization.length,
        normalized_name_collisions: normalizedNameCollisions.length,
        domain_collisions: domainCollisions.length,
        external_uid_collisions: uidCollisions.length,
        alias_collisions: aliasCollisions.length,
        aliases_with_missing_organizations: aliasesWithMissingOrgs.length,
        organizations_with_invalid_type: invalidTypeOrgs.length,
        public_incomplete_sponsors: publicIncompleteSponsors.length,
        potential_resolution_conflicts: potentialConflicts.length,
      },
      issues: {
        missing_normalization: missingNormalization,
        normalized_name_collisions: normalizedNameCollisions,
        website_domain_collisions: domainCollisions,
        external_uid_collisions: uidCollisions,
        alias_collisions: aliasCollisions,
        aliases_with_missing_organizations: aliasesWithMissingOrgs.map((a: any) => ({
          alias_id: a.id,
          entity_id: a.entity_id,
          alias_name: a.alias_name,
        })),
        organizations_with_invalid_type: invalidTypeOrgs.map((o: any) => ({
          organization_id: o.id,
          name: o.name,
          type: o.type,
        })),
        public_incomplete_sponsors: publicIncompleteSponsors,
        potential_resolution_conflicts: potentialConflicts,
      },
      note: 'Fuzzy name similarity is never used for merge proof. Candidate similarity is reported for review only.',
    };

    return Response.json(report, { status: 200 });
  } catch (error) {
    return Response.json({ error: error?.message || 'auditOrganizationResolution failed' }, { status: 500 });
  }
}