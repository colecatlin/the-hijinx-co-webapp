/**
 * auditSponsorExperience
 * Phase 17E — Read-only audit of the public Sponsor experience.
 * Validates Organization records of type=Sponsor for visibility, completeness,
 * reference integrity, and public exposure safety. Returns IDs only — no repairs.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  isSponsorPublic,
  isActivationPublic,
  isDeliverablePublic,
} from '../../shared/sponsorExperienceHelpers.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Load all Sponsor organizations
    const allOrgs = await base44.asServiceRole.entities.Organization.filter({
      type: 'Sponsor',
    }).catch(() => []);

    const allSettings = await base44.asServiceRole.entities.OrganizationSettings.filter({
      entity_type: 'Sponsor',
    }).catch(() => []);

    const settingsMap = new Map<string, any>();
    (allSettings as any[]).forEach((s: any) => {
      settingsMap.set(s.entity_id, s);
    });

    // Load all sponsorships, activations, deliverables, assets
    const [allSponsorships, allActivations, allDeliverables, allAssets] = await Promise.all([
      base44.asServiceRole.entities.Sponsorship.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.Activation.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.SponsorshipDeliverable.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.OrganizationAsset.filter({ entity_type: 'Sponsor' }).catch(() => []),
    ]);

    const sponsorshipByOrg = new Map<string, any[]>();
    (allSponsorships as any[]).forEach((s: any) => {
      const key = s.sponsor_organization_id;
      if (!sponsorshipByOrg.has(key)) sponsorshipByOrg.set(key, []);
      sponsorshipByOrg.get(key)!.push(s);
    });

    const sponsorshipIds = new Set<string>((allSponsorships as any[]).map((s: any) => s.id));
    const activationsBySponsorship = new Map<string, any[]>();
    (allActivations as any[]).forEach((a: any) => {
      if (!sponsorshipIds.has(a.sponsorship_id)) return;
      const key = a.sponsorship_id;
      if (!activationsBySponsorship.has(key)) activationsBySponsorship.set(key, []);
      activationsBySponsorship.get(key)!.push(a);
    });

    const deliverablesBySponsorship = new Map<string, any[]>();
    (allDeliverables as any[]).forEach((d: any) => {
      if (!sponsorshipIds.has(d.sponsorship_id)) return;
      const key = d.sponsorship_id;
      if (!deliverablesBySponsorship.has(key)) deliverablesBySponsorship.set(key, []);
      deliverablesBySponsorship.get(key)!.push(d);
    });

    const assetsByOrg = new Map<string, any[]>();
    (allAssets as any[]).forEach((a: any) => {
      const key = a.entity_id;
      if (!assetsByOrg.has(key)) assetsByOrg.set(key, []);
      assetsByOrg.get(key)!.push(a);
    });

    const issues = {
      not_sponsor_type: [] as any[],
      missing_slug: [] as any[],
      draft_visibility: [] as any[],
      archived_organization: [] as any[],
      missing_logo: [] as any[],
      missing_banner: [] as any[],
      missing_settings: [] as any[],
      missing_sponsorships: [] as any[],
      archived_sponsorship_visibility_leak: [] as any[],
      activation_visibility_leak: [] as any[],
      deliverable_visibility_leak: [] as any[],
      broken_target_references: [] as any[],
      broken_assets: [] as any[],
      duplicate_sponsorship_display: [] as any[],
      duplicate_activation_display: [] as any[],
      seo_incomplete: [] as any[],
      schema_incomplete: [] as any[],
      sharing_metadata_incomplete: [] as any[],
      search_not_ready: [] as any[],
      completeness_low: [] as any[],
    };

    const stats = {
      total_sponsors: 0,
      public_sponsors: 0,
      draft_sponsors: 0,
      archived_sponsors: 0,
      with_sponsorships: 0,
      with_activations: 0,
      with_deliverables: 0,
      with_assets: 0,
    };

    // Slug uniqueness check
    const slugMap = new Map<string, string[]>();

    (allOrgs as any[]).forEach((org: any) => {
      stats.total_sponsors++;
      const settings = settingsMap.get(org.id);
      const isPublic = isSponsorPublic(org, settings);

      if (isPublic) stats.public_sponsors++;
      else if (org.is_archived) stats.archived_sponsors++;
      else stats.draft_sponsors++;

      // Slug uniqueness
      const slug = org.slug || org.canonical_slug;
      if (slug) {
        if (!slugMap.has(slug)) slugMap.set(slug, []);
        slugMap.get(slug)!.push(org.id);
      } else {
        issues.missing_slug.push({ organization_id: org.id, name: org.name });
      }

      // Visibility issues
      if (org.visibility_status === 'draft' && !org.is_archived) {
        issues.draft_visibility.push({ organization_id: org.id, name: org.name });
      }
      if (org.is_archived) {
        issues.archived_organization.push({ organization_id: org.id, name: org.name });
      }

      // Missing branding
      if (!org.logo_url) issues.missing_logo.push({ organization_id: org.id, name: org.name });
      if (!settings?.banner_url && !org.banner_url) issues.missing_banner.push({ organization_id: org.id, name: org.name });
      if (!settings) issues.missing_settings.push({ organization_id: org.id, name: org.name });

      // Sponsorships
      const sponsorships = sponsorshipByOrg.get(org.id) || [];
      if (sponsorships.length > 0) stats.with_sponsorships++;
      else issues.missing_sponsorships.push({ organization_id: org.id, name: org.name });

      // Archived sponsorship visibility leaks (archived sponsorship with public_visibility=public)
      sponsorships.forEach((s: any) => {
        if (s.is_archived && s.public_visibility === 'public') {
          issues.archived_sponsorship_visibility_leak.push({
            organization_id: org.id,
            sponsorship_id: s.id,
          });
        }
      });

      // Activation visibility leaks (private activation on public sponsorship)
      const sponsorshipIdSet = new Set(sponsorships.filter((s: any) => !s.is_archived).map((s: any) => s.id));
      let hasActivations = false;
      let hasDeliverables = false;
      sponsorshipIdSet.forEach((sid: string) => {
        const acts = activationsBySponsorship.get(sid) || [];
        const dels = deliverablesBySponsorship.get(sid) || [];
        if (acts.length > 0) hasActivations = true;
        if (dels.length > 0) hasDeliverables = true;
        acts.forEach((a: any) => {
          if (!isActivationPublic(a) && a.status === 'active') {
            // Private activation that is active — potential leak if displayed
            issues.activation_visibility_leak.push({
              organization_id: org.id,
              activation_id: a.id,
              issue: 'private_active_activation',
            });
          }
        });
        dels.forEach((d: any) => {
          if (!isDeliverablePublic(d) && d.status === 'completed') {
            issues.deliverable_visibility_leak.push({
              organization_id: org.id,
              deliverable_id: d.id,
              issue: 'private_completed_deliverable',
            });
          }
        });
      });
      if (hasActivations) stats.with_activations++;
      if (hasDeliverables) stats.with_deliverables++;

      // Assets
      const assets = assetsByOrg.get(org.id) || [];
      if (assets.length > 0) stats.with_assets++;
      assets.forEach((a: any) => {
        if (a.is_public && (!a.name || a.name.trim() === '')) {
          issues.broken_assets.push({ asset_id: a.id, issue: 'public_asset_missing_name' });
        }
      });

      // SEO completeness
      if (isPublic) {
        if (!org.description && !settings?.tagline) {
          issues.seo_incomplete.push({ organization_id: org.id, issue: 'missing_description' });
        }
        if (!org.logo_url && !settings?.banner_url) {
          issues.seo_incomplete.push({ organization_id: org.id, issue: 'missing_image' });
        }

        // Schema completeness
        if (!org.name) issues.schema_incomplete.push({ organization_id: org.id, issue: 'missing_name' });
        if (!settings?.website_url && !org.website_url) {
          issues.schema_incomplete.push({ organization_id: org.id, issue: 'missing_website' });
        }

        // Sharing metadata
        if (!slug) issues.sharing_metadata_incomplete.push({ organization_id: org.id, issue: 'missing_slug' });

        // Search readiness
        if (!org.normalized_name && !org.name) {
          issues.search_not_ready.push({ organization_id: org.id, issue: 'missing_name' });
        }
      }

      // Completeness (simple check)
      const checks = [
        Boolean(org.logo_url),
        Boolean(settings?.banner_url || org.banner_url),
        Boolean(org.description),
        Boolean(settings?.website_url || org.website_url),
        Boolean(org.location_city || org.location_country),
        Boolean(sponsorships.length > 0),
        Boolean(org.industry),
      ];
      const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
      if (score < 50) {
        issues.completeness_low.push({ organization_id: org.id, name: org.name, score });
      }
    });

    // Duplicate slugs
    slugMap.forEach((ids, slug) => {
      if (ids.length > 1) {
        issues.duplicate_sponsorship_display.push({ slug, organization_ids: ids });
      }
    });

    // Duplicate sponsorship display (same target + same org + same relationship)
    const dedupMap = new Map<string, string[]>();
    (allSponsorships as any[]).forEach((s: any) => {
      if (s.is_archived) return;
      const key = `${s.sponsor_organization_id}:${s.target_entity_type}:${s.target_entity_id}:${s.relationship_type}`;
      if (!dedupMap.has(key)) dedupMap.set(key, []);
      dedupMap.get(key)!.push(s.id);
    });
    dedupMap.forEach((ids, key) => {
      if (ids.length > 1) {
        issues.duplicate_sponsorship_display.push({ key, sponsorship_ids: ids, issue: 'duplicate_relationship' });
      }
    });

    // Broken target references (sponsorship points to non-existent target)
    const targetEntityNames = ['RacerProfile', 'Team', 'Vehicle', 'Series', 'Event', 'Track', 'MediaAsset'];
    const targetIdsByType = new Map<string, Set<string>>();
    (allSponsorships as any[]).forEach((s: any) => {
      if (s.is_archived) return;
      if (!targetEntityNames.includes(s.target_entity_type)) return;
      if (!targetIdsByType.has(s.target_entity_type)) targetIdsByType.set(s.target_entity_type, new Set());
      targetIdsByType.get(s.target_entity_type)!.add(s.target_entity_id);
    });

    // Check broken references (batch)
    await Promise.all(
      Array.from(targetIdsByType.entries()).map(async ([type, ids]) => {
        try {
          const records = await base44.asServiceRole.entities[type].filter({
            id: { $in: Array.from(ids) },
          });
          const foundIds = new Set((records as any[]).map((r: any) => r.id));
          ids.forEach((id) => {
            if (!foundIds.has(id)) {
              issues.broken_target_references.push({ target_type: type, target_id: id });
            }
          });
        } catch {
          // Skip if entity type not accessible
        }
      })
    );

    const totalIssues = Object.values(issues).reduce((sum, arr) => sum + arr.length, 0);

    return Response.json({
      status: 'complete',
      timestamp: new Date().toISOString(),
      stats,
      issues,
      summary: {
        total_issues: totalIssues,
        critical: issues.archived_sponsorship_visibility_leak.length +
                  issues.activation_visibility_leak.length +
                  issues.deliverable_visibility_leak.length,
        warnings: issues.missing_logo.length + issues.missing_banner.length +
                  issues.missing_settings.length + issues.missing_slug.length +
                  issues.completeness_low.length,
        informational: issues.draft_visibility.length + issues.missing_sponsorships.length +
                       issues.seo_incomplete.length + issues.schema_incomplete.length,
      },
    });
  } catch (err) {
    console.error('[auditSponsorExperience] Error:', err);
    return Response.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}