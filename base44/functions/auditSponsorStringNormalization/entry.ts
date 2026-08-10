/**
 * auditSponsorStringNormalization
 * ---------------------------------------------------------------------------
 * Phase 17B: Read-only audit of legacy sponsor-name string fields.
 *
 * Sources:
 *   - DriverSponsor.sponsor_name
 *   - EntrySponsor.sponsor_name
 *   - Series.title_sponsor_name
 *
 * For each source, clusters by exact normalized value and searches for
 * matching Organizations by:
 *   - normalized_name
 *   - EntityAlias.alias_normalized
 *   - website domain
 *
 * Returns resolution_status: resolved | not_found | ambiguous | candidate_only
 *
 * Does NOT create Organizations.
 * Does NOT create Sponsorships.
 * Does NOT write aliases.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  normalizeOrganizationName,
  extractWebsiteDomain,
} from '../../shared/organizationResolution.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    // ── Load all data ─────────────────────────────────────────────────
    const [
      driverSponsors,
      entrySponsors,
      allSeries,
      organizations,
      orgAliases,
    ] = await Promise.all([
      base44.asServiceRole.entities.DriverSponsor.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.EntrySponsor.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.Series.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.Organization.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.EntityAlias.filter({ entity_type: 'Organization', active: true }).catch(() => []),
    ]);

    const dsRecords = driverSponsors || [];
    const esRecords = entrySponsors || [];
    const seriesRecords = allSeries || [];
    const orgs = organizations || [];
    const aliases = orgAliases || [];

    // ── Build Organization lookup maps ───────────────────────────────
    const orgByNormalizedName = new Map<string, any[]>();
    orgs.forEach((o: any) => {
      const name = o.normalized_name || normalizeOrganizationName(o.name);
      if (name) {
        if (!orgByNormalizedName.has(name)) orgByNormalizedName.set(name, []);
        orgByNormalizedName.get(name)!.push(o);
      }
    });

    const orgByDomain = new Map<string, any[]>();
    orgs.forEach((o: any) => {
      const domain = extractWebsiteDomain(o.website_url);
      if (domain) {
        if (!orgByDomain.has(domain)) orgByDomain.set(domain, []);
        orgByDomain.get(domain)!.push(o);
      }
    });

    const aliasByNormalized = new Map<string, any[]>();
    aliases.forEach((a: any) => {
      if (!aliasByNormalized.has(a.alias_normalized)) aliasByNormalized.set(a.alias_normalized, []);
      aliasByNormalized.get(a.alias_normalized)!.push(a);
    });

    // ── Collect all legacy sponsor strings ───────────────────────────
    interface SponsorStringRecord {
      source: string;
      record_id: string;
      raw_string: string;
      normalized_value: string;
      website_url: string | null;
      logo_url: string | null;
      target_context: string;
    }

    const allStrings: SponsorStringRecord[] = [];

    // DriverSponsor
    dsRecords.forEach((ds: any) => {
      if (ds.sponsor_name) {
        allStrings.push({
          source: 'DriverSponsor',
          record_id: ds.id,
          raw_string: ds.sponsor_name,
          normalized_value: normalizeOrganizationName(ds.sponsor_name),
          website_url: ds.website_url || null,
          logo_url: ds.logo_url || null,
          target_context: `driver:${ds.driver_id}`,
        });
      }
    });

    // EntrySponsor
    esRecords.forEach((es: any) => {
      if (es.sponsor_name) {
        allStrings.push({
          source: 'EntrySponsor',
          record_id: es.id,
          raw_string: es.sponsor_name,
          normalized_value: normalizeOrganizationName(es.sponsor_name),
          website_url: es.sponsor_url || null,
          logo_url: es.sponsor_logo_url || null,
          target_context: `entry:${es.entry_id}`,
        });
      }
    });

    // Series title_sponsor_name
    seriesRecords.forEach((series: any) => {
      if (series.title_sponsor_name) {
        allStrings.push({
          source: 'Series.title_sponsor_name',
          record_id: series.id,
          raw_string: series.title_sponsor_name,
          normalized_value: normalizeOrganizationName(series.title_sponsor_name),
          website_url: series.title_sponsor_url || null,
          logo_url: series.title_sponsor_logo_url || null,
          target_context: `series:${series.id}`,
        });
      }
    });

    // ── Cluster by normalized value ──────────────────────────────────
    const clusters: Record<string, SponsorStringRecord[]> = {};
    allStrings.forEach(s => {
      if (!clusters[s.normalized_value]) clusters[s.normalized_value] = [];
      clusters[s.normalized_value].push(s);
    });

    // ── Resolve each cluster to Organization candidates ──────────────
    const clusterReports: any[] = [];
    Object.entries(clusters).forEach(([normalizedValue, records]) => {
      const matchingOrgIds = new Set<string>();
      const matchTypes: string[] = [];

      // 1. Exact normalized_name match
      const nameMatches = orgByNormalizedName.get(normalizedValue) || [];
      if (nameMatches.length > 0) {
        matchTypes.push('normalized_name');
        nameMatches.forEach(o => matchingOrgIds.add(o.id));
      }

      // 2. Exact alias match
      const aliasMatches = aliasByNormalized.get(normalizedValue) || [];
      if (aliasMatches.length > 0) {
        matchTypes.push('alias');
        aliasMatches.forEach(a => matchingOrgIds.add(a.entity_id));
      }

      // 3. Exact website domain match (from any record in the cluster)
      const websiteUrls = records.map(r => r.website_url).filter(Boolean);
      websiteUrls.forEach(url => {
        const domain = extractWebsiteDomain(url);
        if (domain) {
          const domainMatches = orgByDomain.get(domain) || [];
          if (domainMatches.length > 0) {
            matchTypes.push('website_domain');
            domainMatches.forEach(o => matchingOrgIds.add(o.id));
          }
        }
      });

      let resolutionStatus: string;
      if (matchingOrgIds.size === 0) {
        resolutionStatus = 'not_found';
      } else if (matchingOrgIds.size === 1) {
        resolutionStatus = 'resolved';
      } else {
        resolutionStatus = 'ambiguous';
      }

      clusterReports.push({
        normalized_value: normalizedValue,
        raw_strings: [...new Set(records.map(r => r.raw_string))],
        record_count: records.length,
        sources: [...new Set(records.map(r => r.source))],
        matching_organization_ids: Array.from(matchingOrgIds),
        match_types: matchTypes,
        resolution_status: resolutionStatus,
        records: records.map(r => ({
          source: r.source,
          record_id: r.record_id,
          target_context: r.target_context,
          website_url: r.website_url,
          logo_url: r.logo_url,
        })),
      });
    });

    // ── Summary ──────────────────────────────────────────────────────
    const summary = {
      total_strings: allStrings.length,
      total_clusters: clusterReports.length,
      resolved: clusterReports.filter(c => c.resolution_status === 'resolved').length,
      not_found: clusterReports.filter(c => c.resolution_status === 'not_found').length,
      ambiguous: clusterReports.filter(c => c.resolution_status === 'ambiguous').length,
      by_source: {
        DriverSponsor: dsRecords.filter((d: any) => d.sponsor_name).length,
        EntrySponsor: esRecords.filter((e: any) => e.sponsor_name).length,
        'Series.title_sponsor_name': seriesRecords.filter((s: any) => s.title_sponsor_name).length,
      },
    };

    return Response.json({
      status: 'complete',
      timestamp: new Date().toISOString(),
      summary,
      clusters: clusterReports.sort((a, b) => b.record_count - a.record_count),
      note: 'Fuzzy name similarity is never used for resolution. Similar-name-only matches are not reported as resolved.',
    }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error?.message || 'auditSponsorStringNormalization failed' }, { status: 500 });
  }
}