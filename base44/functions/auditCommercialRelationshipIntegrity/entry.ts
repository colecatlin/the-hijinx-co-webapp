import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { loadOrganizationMap } from '../../shared/sponsorshipReadHelpers.ts';

/**
 * Phase 17C — auditCommercialRelationshipIntegrity
 *
 * Read-only audit of commercial records (RevenueAgreement, RevenueEvent,
 * Advertisement, MediaAssignment) that link to Sponsorship via linked_sponsorship_id.
 *
 * Checks:
 *   • RevenueAgreement with agreement_type=sponsorship missing linked_sponsorship_id
 *   • RevenueAgreement orphaned Sponsorship (linked_sponsorship_id points to missing Sponsorship)
 *   • RevenueAgreement wrong agreement_type (has linked_sponsorship_id but agreement_type != sponsorship)
 *   • RevenueEvent orphaned Sponsorship
 *   • Advertisement orphaned Sponsorship
 *   • MediaAssignment orphaned Sponsorship
 *   • Archived Sponsorship linked to active commercial records
 *   • Commercial records pointing to archived Organization
 *   • Commercial records pointing to missing Organization
 *
 * No repairs. Read-only.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    // Load all commercial records
    const [
      allAgreements,
      allRevenueEvents,
      allAdvertisements,
      allAssignments,
      allSponsorships,
    ] = await Promise.all([
      base44.asServiceRole.entities.RevenueAgreement.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.RevenueEvent.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.Advertisement.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.MediaAssignment.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.Sponsorship.list('-created_date', 500).catch(() => []),
    ]);

    const orgMap = await loadOrganizationMap(base44);

    // Build Sponsorship lookup
    const sponsorshipMap = new Map<string, any>();
    (allSponsorships as any[]).forEach((s: any) => sponsorshipMap.set(s.id, s));

    // ── RevenueAgreement issues ──
    const agreementMissingSponsorship: any[] = [];
    const agreementOrphanedSponsorship: any[] = [];
    const agreementWrongType: any[] = [];
    const agreementArchivedSponsorship: any[] = [];
    const agreementMissingOrganization: any[] = [];
    const agreementArchivedOrganization: any[] = [];

    for (const a of allAgreements as any[]) {
      // sponsorship agreement_type without linked_sponsorship_id
      if (a.agreement_type === 'sponsorship' && !a.linked_sponsorship_id) {
        agreementMissingSponsorship.push({
          agreement_id: a.id,
          agreement_type: a.agreement_type,
          status: a.status,
        });
      }

      // linked_sponsorship_id points to missing Sponsorship
      if (a.linked_sponsorship_id) {
        const sponsorship = sponsorshipMap.get(a.linked_sponsorship_id);
        if (!sponsorship) {
          agreementOrphanedSponsorship.push({
            agreement_id: a.id,
            linked_sponsorship_id: a.linked_sponsorship_id,
            agreement_type: a.agreement_type,
          });
        } else {
          // Archived Sponsorship linked to active agreement
          if (sponsorship.is_archived && a.status === 'active') {
            agreementArchivedSponsorship.push({
              agreement_id: a.id,
              sponsorship_id: sponsorship.id,
              sponsorship_archived: true,
              agreement_status: a.status,
            });
          }

          // Check Organization
          const org = orgMap.get(sponsorship.sponsor_organization_id);
          if (!org) {
            agreementMissingOrganization.push({
              agreement_id: a.id,
              sponsorship_id: sponsorship.id,
              sponsor_organization_id: sponsorship.sponsor_organization_id,
            });
          } else if (org.is_archived) {
            agreementArchivedOrganization.push({
              agreement_id: a.id,
              sponsorship_id: sponsorship.id,
              organization_id: org.id,
              organization_name: org.name,
            });
          }
        }

        // linked_sponsorship_id present but agreement_type != sponsorship
        if (a.agreement_type !== 'sponsorship') {
          agreementWrongType.push({
            agreement_id: a.id,
            agreement_type: a.agreement_type,
            linked_sponsorship_id: a.linked_sponsorship_id,
          });
        }
      }
    }

    // ── RevenueEvent issues ──
    const eventOrphanedSponsorship: any[] = [];
    const eventArchivedSponsorship: any[] = [];
    const eventMissingOrganization: any[] = [];
    const eventArchivedOrganization: any[] = [];

    for (const e of allRevenueEvents as any[]) {
      if (e.linked_sponsorship_id) {
        const sponsorship = sponsorshipMap.get(e.linked_sponsorship_id);
        if (!sponsorship) {
          eventOrphanedSponsorship.push({
            event_id: e.id,
            linked_sponsorship_id: e.linked_sponsorship_id,
            revenue_type: e.revenue_type,
          });
        } else {
          if (sponsorship.is_archived && e.status !== 'cancelled' && e.status !== 'refunded') {
            eventArchivedSponsorship.push({
              event_id: e.id,
              sponsorship_id: sponsorship.id,
              event_status: e.status,
            });
          }

          const org = orgMap.get(sponsorship.sponsor_organization_id);
          if (!org) {
            eventMissingOrganization.push({
              event_id: e.id,
              sponsorship_id: sponsorship.id,
              sponsor_organization_id: sponsorship.sponsor_organization_id,
            });
          } else if (org.is_archived) {
            eventArchivedOrganization.push({
              event_id: e.id,
              organization_id: org.id,
              organization_name: org.name,
            });
          }
        }
      }
    }

    // ── Advertisement issues ──
    const adOrphanedSponsorship: any[] = [];
    const adArchivedSponsorship: any[] = [];
    const adMissingOrganization: any[] = [];
    const adArchivedOrganization: any[] = [];

    for (const ad of allAdvertisements as any[]) {
      if (ad.linked_sponsorship_id) {
        const sponsorship = sponsorshipMap.get(ad.linked_sponsorship_id);
        if (!sponsorship) {
          adOrphanedSponsorship.push({
            advertisement_id: ad.id,
            linked_sponsorship_id: ad.linked_sponsorship_id,
            title: ad.title,
          });
        } else {
          if (sponsorship.is_archived && ad.status === 'published') {
            adArchivedSponsorship.push({
              advertisement_id: ad.id,
              sponsorship_id: sponsorship.id,
              ad_status: ad.status,
            });
          }

          const org = orgMap.get(sponsorship.sponsor_organization_id);
          if (!org) {
            adMissingOrganization.push({
              advertisement_id: ad.id,
              sponsorship_id: sponsorship.id,
              sponsor_organization_id: sponsorship.sponsor_organization_id,
            });
          } else if (org.is_archived) {
            adArchivedOrganization.push({
              advertisement_id: ad.id,
              organization_id: org.id,
              organization_name: org.name,
            });
          }
        }
      }
    }

    // ── MediaAssignment issues ──
    const assignmentOrphanedSponsorship: any[] = [];
    const assignmentArchivedSponsorship: any[] = [];
    const assignmentMissingOrganization: any[] = [];
    const assignmentArchivedOrganization: any[] = [];
    const assignmentSponsoredWithoutLink: any[] = [];

    for (const a of allAssignments as any[]) {
      // Sponsored assignment without linked_sponsorship_id (informational, not an error)
      if (a.compensation_type === 'sponsored' && !a.linked_sponsorship_id) {
        assignmentSponsoredWithoutLink.push({
          assignment_id: a.id,
          assignment_title: a.assignment_title,
          compensation_type: a.compensation_type,
        });
      }

      if (a.linked_sponsorship_id) {
        const sponsorship = sponsorshipMap.get(a.linked_sponsorship_id);
        if (!sponsorship) {
          assignmentOrphanedSponsorship.push({
            assignment_id: a.id,
            linked_sponsorship_id: a.linked_sponsorship_id,
            assignment_title: a.assignment_title,
          });
        } else {
          if (sponsorship.is_archived && a.status !== 'cancelled' && a.status !== 'completed') {
            assignmentArchivedSponsorship.push({
              assignment_id: a.id,
              sponsorship_id: sponsorship.id,
              assignment_status: a.status,
            });
          }

          const org = orgMap.get(sponsorship.sponsor_organization_id);
          if (!org) {
            assignmentMissingOrganization.push({
              assignment_id: a.id,
              sponsorship_id: sponsorship.id,
              sponsor_organization_id: sponsorship.sponsor_organization_id,
            });
          } else if (org.is_archived) {
            assignmentArchivedOrganization.push({
              assignment_id: a.id,
              organization_id: org.id,
              organization_name: org.name,
            });
          }
        }
      }
    }

    // ── Summary ──
    const totalIssues =
      agreementMissingSponsorship.length +
      agreementOrphanedSponsorship.length +
      agreementWrongType.length +
      agreementArchivedSponsorship.length +
      agreementMissingOrganization.length +
      agreementArchivedOrganization.length +
      eventOrphanedSponsorship.length +
      eventArchivedSponsorship.length +
      eventMissingOrganization.length +
      eventArchivedOrganization.length +
      adOrphanedSponsorship.length +
      adArchivedSponsorship.length +
      adMissingOrganization.length +
      adArchivedOrganization.length +
      assignmentOrphanedSponsorship.length +
      assignmentArchivedSponsorship.length +
      assignmentMissingOrganization.length +
      assignmentArchivedOrganization.length;

    return Response.json({
      status: 'complete',
      timestamp: new Date().toISOString(),
      counts: {
        total_agreements: (allAgreements as any[]).length,
        total_revenue_events: (allRevenueEvents as any[]).length,
        total_advertisements: (allAdvertisements as any[]).length,
        total_assignments: (allAssignments as any[]).length,
        total_sponsorships: (allSponsorships as any[]).length,
        agreements_with_sponsorship: (allAgreements as any[]).filter((a: any) => a.linked_sponsorship_id).length,
        events_with_sponsorship: (allRevenueEvents as any[]).filter((e: any) => e.linked_sponsorship_id).length,
        ads_with_sponsorship: (allAdvertisements as any[]).filter((a: any) => a.linked_sponsorship_id).length,
        assignments_with_sponsorship: (allAssignments as any[]).filter((a: any) => a.linked_sponsorship_id).length,
      },
      issues: {
        revenue_agreement: {
          missing_sponsorship: agreementMissingSponsorship,
          orphaned_sponsorship: agreementOrphanedSponsorship,
          wrong_agreement_type: agreementWrongType,
          archived_sponsorship_active: agreementArchivedSponsorship,
          missing_organization: agreementMissingOrganization,
          archived_organization: agreementArchivedOrganization,
        },
        revenue_event: {
          orphaned_sponsorship: eventOrphanedSponsorship,
          archived_sponsorship_active: eventArchivedSponsorship,
          missing_organization: eventMissingOrganization,
          archived_organization: eventArchivedOrganization,
        },
        advertisement: {
          orphaned_sponsorship: adOrphanedSponsorship,
          archived_sponsorship_active: adArchivedSponsorship,
          missing_organization: adMissingOrganization,
          archived_organization: adArchivedOrganization,
        },
        media_assignment: {
          orphaned_sponsorship: assignmentOrphanedSponsorship,
          archived_sponsorship_active: assignmentArchivedSponsorship,
          missing_organization: assignmentMissingOrganization,
          archived_organization: assignmentArchivedOrganization,
          sponsored_without_link: assignmentSponsoredWithoutLink,
        },
      },
      summary: {
        total_issues: totalIssues,
        critical: agreementMissingSponsorship.length + agreementOrphanedSponsorship.length +
                  eventOrphanedSponsorship.length + adOrphanedSponsorship.length +
                  assignmentOrphanedSponsorship.length,
        warnings: agreementWrongType.length + agreementArchivedSponsorship.length +
                  agreementMissingOrganization.length + agreementArchivedOrganization.length +
                  eventArchivedSponsorship.length + eventMissingOrganization.length +
                  eventArchivedOrganization.length +
                  adArchivedSponsorship.length + adMissingOrganization.length + adArchivedOrganization.length +
                  assignmentArchivedSponsorship.length + assignmentMissingOrganization.length +
                  assignmentArchivedOrganization.length,
        informational: assignmentSponsoredWithoutLink.length,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});