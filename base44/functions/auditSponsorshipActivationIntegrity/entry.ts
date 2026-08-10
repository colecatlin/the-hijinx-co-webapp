/**
 * auditSponsorshipActivationIntegrity
 * ---------------------------------------------------------------------------
 * Phase 17D: Read-only integrity audit for Activation records.
 *
 * Audits:
 *   - Total Activations
 *   - Missing Sponsorship
 *   - Archived Sponsorship linked to active Activation
 *   - Missing Organization through Sponsorship
 *   - Unsupported activation_type
 *   - Invalid date ranges
 *   - Invalid budget
 *   - Invalid reach values
 *   - Missing Event references
 *   - Missing Track references
 *   - Event/Track mismatches
 *   - Missing Media references
 *   - Missing Advertisement references
 *   - Advertisement Sponsorship mismatch
 *   - Missing MediaAssignment references
 *   - MediaAssignment Sponsorship mismatch
 *   - Duplicate normalized_activation_key
 *   - Archived Activation with active status
 *   - Public Activation under private Sponsorship
 *   - Public Activation under non-public Organization
 *
 * No writes. No repairs.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { loadOrganizationMap } from '../../shared/sponsorshipReadHelpers.ts';
import { isValidActivationType } from '../../shared/sponsorshipActivationHelpers.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const [
      allActivations,
      allSponsorships,
      allEvents,
      allTracks,
      allMediaAssets,
      allAdvertisements,
      allAssignments,
    ] = await Promise.all([
      base44.asServiceRole.entities.Activation.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.Sponsorship.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.Event.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.Track.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.MediaAsset.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.Advertisement.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.MediaAssignment.list('-created_date', 500).catch(() => []),
    ]);

    const orgMap = await loadOrganizationMap(base44);

    const sponsorshipMap = new Map<string, any>();
    (allSponsorships as any[]).forEach((s: any) => sponsorshipMap.set(s.id, s));
    const eventMap = new Map<string, any>();
    (allEvents as any[]).forEach((e: any) => eventMap.set(e.id, e));
    const trackMap = new Map<string, any>();
    (allTracks as any[]).forEach((t: any) => trackMap.set(t.id, t));
    const mediaMap = new Map<string, any>();
    (allMediaAssets as any[]).forEach((m: any) => mediaMap.set(m.id, m));
    const adMap = new Map<string, any>();
    (allAdvertisements as any[]).forEach((a: any) => adMap.set(a.id, a));
    const assignmentMap = new Map<string, any>();
    (allAssignments as any[]).forEach((a: any) => assignmentMap.set(a.id, a));

    const activations = allActivations as any[];

    // Issue collectors
    const missingSponsorship: any[] = [];
    const archivedSponsorshipActive: any[] = [];
    const missingOrganization: any[] = [];
    const unsupportedType: any[] = [];
    const invalidDateRange: any[] = [];
    const invalidBudget: any[] = [];
    const invalidReach: any[] = [];
    const missingEvent: any[] = [];
    const missingTrack: any[] = [];
    const eventTrackMismatch: any[] = [];
    const missingMedia: any[] = [];
    const missingAdvertisement: any[] = [];
    const adSponsorshipMismatch: any[] = [];
    const missingAssignment: any[] = [];
    const assignmentSponsorshipMismatch: any[] = [];
    const archivedWithActiveStatus: any[] = [];
    const publicUnderPrivateSponsorship: any[] = [];
    const publicUnderNonPublicOrg: any[] = [];

    // Duplicate key detection
    const keyMap: Record<string, string[]> = {};
    activations.forEach((a: any) => {
      if (a.normalized_activation_key) {
        if (!keyMap[a.normalized_activation_key]) keyMap[a.normalized_activation_key] = [];
        keyMap[a.normalized_activation_key].push(a.id);
      }
    });
    const duplicateKeys = Object.entries(keyMap)
      .filter(([, ids]) => ids.length > 1)
      .map(([key, ids]) => ({ normalized_activation_key: key, activation_ids: ids }));

    for (const a of activations) {
      // Missing Sponsorship
      let sponsorship: any = null;
      if (a.sponsorship_id) {
        sponsorship = sponsorshipMap.get(a.sponsorship_id);
        if (!sponsorship) {
          missingSponsorship.push({ activation_id: a.id, sponsorship_id: a.sponsorship_id });
        }
      } else {
        missingSponsorship.push({ activation_id: a.id, sponsorship_id: null });
      }

      // Archived Sponsorship linked to active Activation
      if (sponsorship?.is_archived && a.status !== 'archived' && a.status !== 'cancelled') {
        archivedSponsorshipActive.push({
          activation_id: a.id,
          sponsorship_id: sponsorship.id,
          activation_status: a.status,
        });
      }

      // Missing Organization
      if (sponsorship) {
        const org = orgMap.get(sponsorship.sponsor_organization_id);
        if (!org) {
          missingOrganization.push({
            activation_id: a.id,
            sponsorship_id: sponsorship.id,
            sponsor_organization_id: sponsorship.sponsor_organization_id,
          });
        }
      }

      // Unsupported activation_type
      if (!isValidActivationType(a.activation_type)) {
        unsupportedType.push({ activation_id: a.id, activation_type: a.activation_type });
      }

      // Invalid date range
      if (a.start_date && a.end_date) {
        if (new Date(a.end_date) < new Date(a.start_date)) {
          invalidDateRange.push({ activation_id: a.id, start_date: a.start_date, end_date: a.end_date });
        }
      }

      // Invalid budget
      if (a.budget_amount !== null && a.budget_amount !== undefined && a.budget_amount < 0) {
        invalidBudget.push({ activation_id: a.id, budget_amount: a.budget_amount });
      }

      // Invalid reach
      if (a.estimated_reach !== null && a.estimated_reach !== undefined && a.estimated_reach < 0) {
        invalidReach.push({ activation_id: a.id, field: 'estimated_reach', value: a.estimated_reach });
      }
      if (a.actual_reach !== null && a.actual_reach !== undefined && a.actual_reach < 0) {
        invalidReach.push({ activation_id: a.id, field: 'actual_reach', value: a.actual_reach });
      }

      // Missing Event
      if (a.linked_event_id) {
        if (!eventMap.has(a.linked_event_id)) {
          missingEvent.push({ activation_id: a.id, linked_event_id: a.linked_event_id });
        }
      }

      // Missing Track
      if (a.linked_track_id) {
        if (!trackMap.has(a.linked_track_id)) {
          missingTrack.push({ activation_id: a.id, linked_track_id: a.linked_track_id });
        }
      }

      // Event/Track mismatch
      if (a.linked_event_id && a.linked_track_id) {
        const event = eventMap.get(a.linked_event_id);
        if (event && event.track_id && event.track_id !== a.linked_track_id) {
          eventTrackMismatch.push({
            activation_id: a.id,
            linked_event_id: a.linked_event_id,
            linked_track_id: a.linked_track_id,
            event_track_id: event.track_id,
          });
        }
      }

      // Missing Media
      if (a.linked_media_id) {
        if (!mediaMap.has(a.linked_media_id)) {
          missingMedia.push({ activation_id: a.id, linked_media_id: a.linked_media_id });
        }
      }

      // Missing Advertisement
      if (a.linked_advertisement_id) {
        const ad = adMap.get(a.linked_advertisement_id);
        if (!ad) {
          missingAdvertisement.push({ activation_id: a.id, linked_advertisement_id: a.linked_advertisement_id });
        } else if (ad.linked_sponsorship_id && ad.linked_sponsorship_id !== a.sponsorship_id) {
          adSponsorshipMismatch.push({
            activation_id: a.id,
            linked_advertisement_id: a.linked_advertisement_id,
            ad_sponsorship_id: ad.linked_sponsorship_id,
            activation_sponsorship_id: a.sponsorship_id,
          });
        }
      }

      // Missing MediaAssignment
      if (a.linked_media_assignment_id) {
        const assignment = assignmentMap.get(a.linked_media_assignment_id);
        if (!assignment) {
          missingAssignment.push({ activation_id: a.id, linked_media_assignment_id: a.linked_media_assignment_id });
        } else if (assignment.linked_sponsorship_id && assignment.linked_sponsorship_id !== a.sponsorship_id) {
          assignmentSponsorshipMismatch.push({
            activation_id: a.id,
            linked_media_assignment_id: a.linked_media_assignment_id,
            assignment_sponsorship_id: assignment.linked_sponsorship_id,
            activation_sponsorship_id: a.sponsorship_id,
          });
        }
      }

      // Archived with active status
      if (a.is_archived && a.status !== 'archived') {
        archivedWithActiveStatus.push({ activation_id: a.id, status: a.status });
      }

      // Public under private Sponsorship
      if (a.public_visibility === 'public' && sponsorship && sponsorship.public_visibility === 'private') {
        publicUnderPrivateSponsorship.push({
          activation_id: a.id,
          sponsorship_id: sponsorship.id,
        });
      }

      // Public under non-public Organization
      if (a.public_visibility === 'public' && sponsorship) {
        const org = orgMap.get(sponsorship.sponsor_organization_id);
        if (org && org.visibility_status === 'draft') {
          publicUnderNonPublicOrg.push({
            activation_id: a.id,
            organization_id: org.id,
            organization_name: org.name,
          });
        }
      }
    }

    const totalIssues =
      missingSponsorship.length +
      archivedSponsorshipActive.length +
      missingOrganization.length +
      unsupportedType.length +
      invalidDateRange.length +
      invalidBudget.length +
      invalidReach.length +
      missingEvent.length +
      missingTrack.length +
      eventTrackMismatch.length +
      missingMedia.length +
      missingAdvertisement.length +
      adSponsorshipMismatch.length +
      missingAssignment.length +
      assignmentSponsorshipMismatch.length +
      duplicateKeys.length +
      archivedWithActiveStatus.length +
      publicUnderPrivateSponsorship.length +
      publicUnderNonPublicOrg.length;

    return Response.json({
      status: 'complete',
      timestamp: new Date().toISOString(),
      counts: {
        total_activations: activations.length,
        activations_with_sponsorship: activations.filter((a: any) => a.sponsorship_id).length,
        activations_with_event: activations.filter((a: any) => a.linked_event_id).length,
        activations_with_track: activations.filter((a: any) => a.linked_track_id).length,
        activations_with_media: activations.filter((a: any) => a.linked_media_id).length,
        activations_with_advertisement: activations.filter((a: any) => a.linked_advertisement_id).length,
        activations_with_assignment: activations.filter((a: any) => a.linked_media_assignment_id).length,
        public_activations: activations.filter((a: any) => a.public_visibility === 'public').length,
      },
      issues: {
        missing_sponsorship: missingSponsorship,
        archived_sponsorship_active: archivedSponsorshipActive,
        missing_organization: missingOrganization,
        unsupported_activation_type: unsupportedType,
        invalid_date_range: invalidDateRange,
        invalid_budget: invalidBudget,
        invalid_reach: invalidReach,
        missing_event: missingEvent,
        missing_track: missingTrack,
        event_track_mismatch: eventTrackMismatch,
        missing_media: missingMedia,
        missing_advertisement: missingAdvertisement,
        advertisement_sponsorship_mismatch: adSponsorshipMismatch,
        missing_media_assignment: missingAssignment,
        media_assignment_sponsorship_mismatch: assignmentSponsorshipMismatch,
        duplicate_normalized_activation_key: duplicateKeys,
        archived_with_active_status: archivedWithActiveStatus,
        public_under_private_sponsorship: publicUnderPrivateSponsorship,
        public_under_non_public_organization: publicUnderNonPublicOrg,
      },
      summary: {
        total_issues: totalIssues,
        critical: missingSponsorship.length + missingOrganization.length + eventTrackMismatch.length +
                  adSponsorshipMismatch.length + assignmentSponsorshipMismatch.length,
        warnings: archivedSponsorshipActive.length + unsupportedType.length + invalidDateRange.length +
                  invalidBudget.length + invalidReach.length + missingEvent.length + missingTrack.length +
                  missingMedia.length + missingAdvertisement.length + missingAssignment.length +
                  duplicateKeys.length + archivedWithActiveStatus.length +
                  publicUnderPrivateSponsorship.length + publicUnderNonPublicOrg.length,
        informational: 0,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}