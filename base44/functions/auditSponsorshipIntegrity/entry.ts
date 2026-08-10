/**
 * auditSponsorshipIntegrity
 * ---------------------------------------------------------------------------
 * Phase 17A: Read-only integrity audit for the Sponsorship foundation.
 *
 * Audits:
 *   - Organizations by commercial type
 *   - Organizations without normalization fields
 *   - Duplicate normalized organization names
 *   - Duplicate canonical keys
 *   - Duplicate organization website domains
 *   - Organization aliases with missing Organizations
 *   - Total Sponsorships
 *   - Sponsorships with missing Organizations
 *   - Sponsorships with unsupported Organization types
 *   - Sponsorships with missing targets
 *   - Sponsorships with unsupported target types
 *   - Sponsorships with invalid date ranges
 *   - Sponsorships with invalid season_year
 *   - Duplicate normalized_sponsorship_key values
 *   - Archived Sponsorships with active status
 *   - Private Sponsorship visibility inconsistencies
 *   - Legacy IDs pointing to nonexistent DriverSponsor
 *   - Legacy IDs pointing to nonexistent EntrySponsor
 *   - RevenueAgreement IDs pointing to nonexistent agreements
 *
 * No writes. No repairs.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  normalizeOrganizationName,
  extractWebsiteDomain,
  isCommercialOrganizationType,
} from '../../shared/organizationResolution.ts';
import {
  SPONSORSHIP_TARGET_TYPES,
  validateDateRange,
  normalizeSeasonYear,
} from '../../shared/sponsorshipHelpers.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    // ── Load all data ─────────────────────────────────────────────────
    const [
      organizations,
      sponsorships,
      orgAliases,
      driverSponsors,
      entrySponsors,
      revenueAgreements,
      allSeries,
    ] = await Promise.all([
      base44.asServiceRole.entities.Organization.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.Sponsorship.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.EntityAlias.filter({ entity_type: 'Organization' }).catch(() => []),
      base44.asServiceRole.entities.DriverSponsor.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.EntrySponsor.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.RevenueAgreement.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.Series.list('-created_date', 500).catch(() => []),
    ]);

    const orgs = organizations || [];
    const spons = sponsorships || [];
    const aliases = orgAliases || [];
    const dsRecords = driverSponsors || [];
    const esRecords = entrySponsors || [];
    const raRecords = revenueAgreements || [];
    const seriesRecords = allSeries || [];

    // ── Organization audits ──────────────────────────────────────────
    const orgsByType: Record<string, number> = {};
    orgs.forEach((o: any) => { orgsByType[o.type] = (orgsByType[o.type] || 0) + 1; });

    const sponsorOrgs = orgs.filter((o: any) => o.type === 'Sponsor');

    const orgsWithoutNormalizedName = orgs.filter((o: any) => !o.normalized_name);
    const orgsWithoutCanonicalSlug = orgs.filter((o: any) => !o.canonical_slug);
    const orgsWithoutCanonicalKey = orgs.filter((o: any) => !o.canonical_key);

    // Duplicate normalized names
    const normalizedNameMap: Record<string, string[]> = {};
    orgs.forEach((o: any) => {
      if (o.normalized_name) {
        if (!normalizedNameMap[o.normalized_name]) normalizedNameMap[o.normalized_name] = [];
        normalizedNameMap[o.normalized_name].push(o.id);
      }
    });
    const duplicateNormalizedNames = Object.entries(normalizedNameMap)
      .filter(([_, ids]) => ids.length > 1)
      .map(([name, ids]) => ({ normalized_name: name, organization_ids: ids }));

    // Duplicate canonical keys
    const canonicalKeyMap: Record<string, string[]> = {};
    orgs.forEach((o: any) => {
      if (o.canonical_key) {
        if (!canonicalKeyMap[o.canonical_key]) canonicalKeyMap[o.canonical_key] = [];
        canonicalKeyMap[o.canonical_key].push(o.id);
      }
    });
    const duplicateCanonicalKeys = Object.entries(canonicalKeyMap)
      .filter(([_, ids]) => ids.length > 1)
      .map(([key, ids]) => ({ canonical_key: key, organization_ids: ids }));

    // Duplicate website domains
    const domainMap: Record<string, string[]> = {};
    orgs.forEach((o: any) => {
      const domain = extractWebsiteDomain(o.website_url);
      if (domain) {
        if (!domainMap[domain]) domainMap[domain] = [];
        domainMap[domain].push(o.id);
      }
    });
    const duplicateDomains = Object.entries(domainMap)
      .filter(([_, ids]) => ids.length > 1)
      .map(([domain, ids]) => ({ domain, organization_ids: ids }));

    // Aliases with missing Organizations
    const orgIds = new Set(orgs.map((o: any) => o.id));
    const aliasesWithMissingOrgs = aliases.filter((a: any) => !orgIds.has(a.entity_id));

    // ── Sponsorship audits ────────────────────────────────────────────
    const totalSponsorships = spons.length;

    // Sponsorships with missing Organizations
    const sponsorshipsWithMissingOrgs = spons.filter((s: any) => !orgIds.has(s.sponsor_organization_id));

    // Sponsorships with unsupported Organization types
    const orgTypeMap: Record<string, string> = {};
    orgs.forEach((o: any) => { orgTypeMap[o.id] = o.type; });
    const sponsorshipsWithUnsupportedOrgTypes = spons.filter((s: any) => {
      const type = orgTypeMap[s.sponsor_organization_id];
      return type && !isCommercialOrganizationType(type);
    });

    // Sponsorships with missing targets (validate each target)
    const sponsorshipsWithMissingTargets: any[] = [];
    const sponsorshipsWithUnsupportedTargetTypes: any[] = [];
    for (const s of spons) {
      if (!(SPONSORSHIP_TARGET_TYPES as readonly string[]).includes(s.target_entity_type)) {
        sponsorshipsWithUnsupportedTargetTypes.push({
          sponsorship_id: s.id,
          target_entity_type: s.target_entity_type,
        });
        continue;
      }
      if (s.target_entity_type === 'Platform') continue; // sentinel, no lookup
      try {
        let exists = false;
        switch (s.target_entity_type) {
          case 'RacerProfile': exists = !!(await base44.asServiceRole.entities.RacerProfile.get(s.target_entity_id).catch(() => null)); break;
          case 'Team': exists = !!(await base44.asServiceRole.entities.Team.get(s.target_entity_id).catch(() => null)); break;
          case 'Vehicle': exists = !!(await base44.asServiceRole.entities.Vehicle.get(s.target_entity_id).catch(() => null)); break;
          case 'Event': exists = !!(await base44.asServiceRole.entities.Event.get(s.target_entity_id).catch(() => null)); break;
          case 'Series': exists = !!(await base44.asServiceRole.entities.Series.get(s.target_entity_id).catch(() => null)); break;
          case 'Track': exists = !!(await base44.asServiceRole.entities.Track.get(s.target_entity_id).catch(() => null)); break;
          case 'MediaAsset': exists = !!(await base44.asServiceRole.entities.MediaAsset.get(s.target_entity_id).catch(() => null)); break;
        }
        if (!exists) {
          sponsorshipsWithMissingTargets.push({
            sponsorship_id: s.id,
            target_entity_type: s.target_entity_type,
            target_entity_id: s.target_entity_id,
          });
        }
      } catch {
        sponsorshipsWithMissingTargets.push({
          sponsorship_id: s.id,
          target_entity_type: s.target_entity_type,
          target_entity_id: s.target_entity_id,
        });
      }
    }

    // Invalid date ranges
    const sponsorshipsWithInvalidDateRanges = spons.filter((s: any) => {
      const v = validateDateRange(s.start_date, s.end_date);
      return !v.valid;
    }).map((s: any) => ({
      sponsorship_id: s.id,
      start_date: s.start_date,
      end_date: s.end_date,
      error: validateDateRange(s.start_date, s.end_date).error,
    }));

    // Invalid season_year
    const sponsorshipsWithInvalidSeasonYear = spons.filter((s: any) => {
      const v = normalizeSeasonYear(s.season_year);
      return !v.valid;
    }).map((s: any) => ({
      sponsorship_id: s.id,
      season_year: s.season_year,
    }));

    // Duplicate normalized_sponsorship_key
    const keyMap: Record<string, string[]> = {};
    spons.forEach((s: any) => {
      if (s.normalized_sponsorship_key) {
        if (!keyMap[s.normalized_sponsorship_key]) keyMap[s.normalized_sponsorship_key] = [];
        keyMap[s.normalized_sponsorship_key].push(s.id);
      }
    });
    const duplicateSponsorshipKeys = Object.entries(keyMap)
      .filter(([_, ids]) => ids.length > 1)
      .map(([key, ids]) => ({ normalized_sponsorship_key: key, sponsorship_ids: ids }));

    // Archived with active status
    const archivedWithActiveStatus = spons.filter((s: any) =>
      s.is_archived && s.status !== 'archived'
    ).map((s: any) => ({
      sponsorship_id: s.id,
      is_archived: s.is_archived,
      status: s.status,
    }));

    // Legacy IDs pointing to nonexistent records
    const dsIds = new Set(dsRecords.map((d: any) => d.id));
    const esIds = new Set(esRecords.map((e: any) => e.id));
    const raIds = new Set(raRecords.map((r: any) => r.id));

    const legacyDriverSponsorMissing = spons.filter((s: any) =>
      s.legacy_driver_sponsor_id && !dsIds.has(s.legacy_driver_sponsor_id)
    ).map((s: any) => ({
      sponsorship_id: s.id,
      legacy_driver_sponsor_id: s.legacy_driver_sponsor_id,
    }));

    const legacyEntrySponsorMissing = spons.filter((s: any) =>
      s.legacy_entry_sponsor_id && !esIds.has(s.legacy_entry_sponsor_id)
    ).map((s: any) => ({
      sponsorship_id: s.id,
      legacy_entry_sponsor_id: s.legacy_entry_sponsor_id,
    }));

    const revenueAgreementMissing = spons.filter((s: any) =>
      s.revenue_agreement_id && !raIds.has(s.revenue_agreement_id)
    ).map((s: any) => ({
      sponsorship_id: s.id,
      revenue_agreement_id: s.revenue_agreement_id,
    }));

    // ── Title Sponsor consistency (Phase 17B) ───────────────────────────
    const titleSponsorshipIssues: any[] = [];

    // Group active Title sponsorships by Series
    const activeTitleBySeries: Record<string, any[]> = {};
    spons.forEach((s: any) => {
      if (s.tier === 'Title' && s.status === 'active' && !s.is_archived && s.target_entity_type === 'Series') {
        if (!activeTitleBySeries[s.target_entity_id]) activeTitleBySeries[s.target_entity_id] = [];
        activeTitleBySeries[s.target_entity_id].push(s);
      }
    });

    // Check for multiple active Title sponsorships on the same Series
    Object.entries(activeTitleBySeries).forEach(([seriesId, titleSponsorships]) => {
      if (titleSponsorships.length > 1) {
        // Check for date overlap
        const hasOverlap = checkDateOverlap(titleSponsorships);
        titleSponsorshipIssues.push({
          type: 'multiple_active_title_sponsorships',
          series_id: seriesId,
          sponsorship_ids: titleSponsorships.map(s => s.id),
          count: titleSponsorships.length,
          has_date_overlap: hasOverlap,
        });
      }
    });

    // Check for Series with modern Title Sponsorship AND legacy title_sponsor_name
    seriesRecords.forEach((series: any) => {
      const modernTitles = activeTitleBySeries[series.id] || [];
      if (modernTitles.length > 0 && series.title_sponsor_name) {
        titleSponsorshipIssues.push({
          type: 'modern_title_conflicts_with_legacy',
          series_id: series.id,
          series_name: series.name,
          modern_sponsorship_ids: modernTitles.map(s => s.id),
          legacy_title_sponsor_name: series.title_sponsor_name,
        });
      }
    });

    // Check for missing Organization on title Sponsorship
    spons.forEach((s: any) => {
      if (s.tier === 'Title' && s.status === 'active' && !s.is_archived) {
        if (!orgIds.has(s.sponsor_organization_id)) {
          titleSponsorshipIssues.push({
            type: 'title_sponsorship_missing_organization',
            sponsorship_id: s.id,
            sponsor_organization_id: s.sponsor_organization_id,
          });
        }
      }
    });

    // Check for private title Sponsorship being used publicly (should not appear in public reads)
    spons.forEach((s: any) => {
      if (s.tier === 'Title' && s.status === 'active' && !s.is_archived && s.public_visibility === 'private') {
        titleSponsorshipIssues.push({
          type: 'private_title_sponsorship_not_publicly_visible',
          sponsorship_id: s.id,
          public_visibility: s.public_visibility,
        });
      }
    });

    // Check for archived title Sponsorship that might still be exposed
    spons.forEach((s: any) => {
      if (s.tier === 'Title' && s.is_archived && s.status !== 'archived') {
        titleSponsorshipIssues.push({
          type: 'archived_title_sponsorship_with_active_status',
          sponsorship_id: s.id,
          is_archived: s.is_archived,
          status: s.status,
        });
      }
    });

    // ── Build report ──────────────────────────────────────────────────
    const report = {
      status: 'complete',
      timestamp: new Date().toISOString(),
      counts: {
        total_organizations: orgs.length,
        organizations_by_type: orgsByType,
        total_sponsor_organizations: sponsorOrgs.length,
        total_sponsorships: totalSponsorships,
        total_organization_aliases: aliases.length,
        total_driver_sponsors: dsRecords.length,
        total_entry_sponsors: esRecords.length,
        total_revenue_agreements: raRecords.length,
      },
      organization_issues: {
        without_normalized_name: orgsWithoutNormalizedName.map((o: any) => o.id),
        without_canonical_slug: orgsWithoutCanonicalSlug.map((o: any) => o.id),
        without_canonical_key: orgsWithoutCanonicalKey.map((o: any) => o.id),
        duplicate_normalized_names: duplicateNormalizedNames,
        duplicate_canonical_keys: duplicateCanonicalKeys,
        duplicate_website_domains: duplicateDomains,
        aliases_with_missing_organizations: aliasesWithMissingOrgs.map((a: any) => ({
          alias_id: a.id,
          entity_id: a.entity_id,
          alias_name: a.alias_name,
        })),
      },
      sponsorship_issues: {
        with_missing_organizations: sponsorshipsWithMissingOrgs.map((s: any) => ({
          sponsorship_id: s.id,
          sponsor_organization_id: s.sponsor_organization_id,
        })),
        with_unsupported_organization_types: sponsorshipsWithUnsupportedOrgTypes.map((s: any) => ({
          sponsorship_id: s.id,
          organization_type: orgTypeMap[s.sponsor_organization_id],
        })),
        with_missing_targets: sponsorshipsWithMissingTargets,
        with_unsupported_target_types: sponsorshipsWithUnsupportedTargetTypes,
        with_invalid_date_ranges: sponsorshipsWithInvalidDateRanges,
        with_invalid_season_year: sponsorshipsWithInvalidSeasonYear,
        duplicate_normalized_sponsorship_keys: duplicateSponsorshipKeys,
        archived_with_active_status: archivedWithActiveStatus,
        legacy_driver_sponsor_missing: legacyDriverSponsorMissing,
        legacy_entry_sponsor_missing: legacyEntrySponsorMissing,
        revenue_agreement_missing: revenueAgreementMissing,
      },
      title_sponsor_issues: titleSponsorshipIssues,
    };

    return Response.json(report, { status: 200 });
  } catch (error) {
    return Response.json({ error: error?.message || 'auditSponsorshipIntegrity failed' }, { status: 500 });
  }
}

/**
 * Check if any sponsorships in a list have overlapping date ranges.
 */
function checkDateOverlap(sponsorships: any[]): boolean {
  const ranges = sponsorships
    .filter(s => s.start_date)
    .map(s => ({
      start: new Date(s.start_date).getTime(),
      end: s.end_date ? new Date(s.end_date).getTime() : Date.now() + 365 * 24 * 60 * 60 * 1000,
    }));
  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      if (ranges[i].start <= ranges[j].end && ranges[j].start <= ranges[i].end) {
        return true;
      }
    }
  }
  return false;
}