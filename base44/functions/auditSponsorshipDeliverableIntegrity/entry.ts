/**
 * auditSponsorshipDeliverableIntegrity
 * ---------------------------------------------------------------------------
 * Phase 17D: Read-only integrity audit for SponsorshipDeliverable records.
 *
 * Audits:
 *   - Total Deliverables
 *   - Missing Sponsorship
 *   - Missing Activation
 *   - Activation/Sponsorship mismatch
 *   - Invalid quantity_required
 *   - Invalid quantity_completed
 *   - Over-delivery count
 *   - Completed without completed_at
 *   - Completed quantity below required
 *   - Missing linked entities
 *   - Advertisement Sponsorship mismatch
 *   - MediaAssignment Sponsorship mismatch
 *   - Duplicate normalized_deliverable_key
 *   - Archived Deliverable with active workflow status
 *   - Public Deliverable under private Sponsorship
 *   - Public Deliverable under non-public Organization
 *
 * No writes. No repairs.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { loadOrganizationMap } from '../../shared/sponsorshipReadHelpers.ts';
import { isValidDeliverableType } from '../../shared/sponsorshipActivationHelpers.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const [
      allDeliverables,
      allSponsorships,
      allActivations,
      allEvents,
      allTracks,
      allMediaAssets,
      allAdvertisements,
      allAssignments,
    ] = await Promise.all([
      base44.asServiceRole.entities.SponsorshipDeliverable.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.Sponsorship.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.Activation.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.Event.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.Track.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.MediaAsset.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.Advertisement.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.MediaAssignment.list('-created_date', 500).catch(() => []),
    ]);

    const orgMap = await loadOrganizationMap(base44);

    const sponsorshipMap = new Map<string, any>();
    (allSponsorships as any[]).forEach((s: any) => sponsorshipMap.set(s.id, s));
    const activationMap = new Map<string, any>();
    (allActivations as any[]).forEach((a: any) => activationMap.set(a.id, a));
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

    const deliverables = allDeliverables as any[];

    // Issue collectors
    const missingSponsorship: any[] = [];
    const missingActivation: any[] = [];
    const activationSponsorshipMismatch: any[] = [];
    const invalidQuantityRequired: any[] = [];
    const invalidQuantityCompleted: any[] = [];
    const overDelivery: any[] = [];
    const completedWithoutCompletedAt: any[] = [];
    const completedQuantityBelowRequired: any[] = [];
    const missingEvent: any[] = [];
    const missingTrack: any[] = [];
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
    deliverables.forEach((d: any) => {
      if (d.normalized_deliverable_key) {
        if (!keyMap[d.normalized_deliverable_key]) keyMap[d.normalized_deliverable_key] = [];
        keyMap[d.normalized_deliverable_key].push(d.id);
      }
    });
    const duplicateKeys = Object.entries(keyMap)
      .filter(([, ids]) => ids.length > 1)
      .map(([key, ids]) => ({ normalized_deliverable_key: key, deliverable_ids: ids }));

    for (const d of deliverables) {
      // Missing Sponsorship
      let sponsorship: any = null;
      if (d.sponsorship_id) {
        sponsorship = sponsorshipMap.get(d.sponsorship_id);
        if (!sponsorship) {
          missingSponsorship.push({ deliverable_id: d.id, sponsorship_id: d.sponsorship_id });
        }
      } else {
        missingSponsorship.push({ deliverable_id: d.id, sponsorship_id: null });
      }

      // Missing Activation / mismatch
      if (d.activation_id) {
        const activation = activationMap.get(d.activation_id);
        if (!activation) {
          missingActivation.push({ deliverable_id: d.id, activation_id: d.activation_id });
        } else if (activation.sponsorship_id !== d.sponsorship_id) {
          activationSponsorshipMismatch.push({
            deliverable_id: d.id,
            activation_id: d.activation_id,
            activation_sponsorship_id: activation.sponsorship_id,
            deliverable_sponsorship_id: d.sponsorship_id,
          });
        }
      }

      // Invalid quantity_required
      if (d.quantity_required !== null && d.quantity_required !== undefined && d.quantity_required < 1) {
        invalidQuantityRequired.push({ deliverable_id: d.id, quantity_required: d.quantity_required });
      }

      // Invalid quantity_completed
      if (d.quantity_completed !== null && d.quantity_completed !== undefined && d.quantity_completed < 0) {
        invalidQuantityCompleted.push({ deliverable_id: d.id, quantity_completed: d.quantity_completed });
      }

      // Over-delivery
      const required = Math.max(1, Number(d.quantity_required ?? 1));
      const completed = Math.max(0, Number(d.quantity_completed ?? 0));
      if (completed > required) {
        overDelivery.push({
          deliverable_id: d.id,
          quantity_required: required,
          quantity_completed: completed,
        });
      }

      // Completed without completed_at
      if (d.status === 'completed' && !d.completed_at) {
        completedWithoutCompletedAt.push({ deliverable_id: d.id, status: d.status });
      }

      // Completed quantity below required
      if (d.status === 'completed' && completed < required) {
        completedQuantityBelowRequired.push({
          deliverable_id: d.id,
          quantity_required: required,
          quantity_completed: completed,
        });
      }

      // Missing linked entities
      if (d.linked_event_id && !eventMap.has(d.linked_event_id)) {
        missingEvent.push({ deliverable_id: d.id, linked_event_id: d.linked_event_id });
      }
      if (d.linked_track_id && !trackMap.has(d.linked_track_id)) {
        missingTrack.push({ deliverable_id: d.id, linked_track_id: d.linked_track_id });
      }
      if (d.linked_media_id && !mediaMap.has(d.linked_media_id)) {
        missingMedia.push({ deliverable_id: d.id, linked_media_id: d.linked_media_id });
      }

      // Advertisement
      if (d.linked_advertisement_id) {
        const ad = adMap.get(d.linked_advertisement_id);
        if (!ad) {
          missingAdvertisement.push({ deliverable_id: d.id, linked_advertisement_id: d.linked_advertisement_id });
        } else if (ad.linked_sponsorship_id && ad.linked_sponsorship_id !== d.sponsorship_id) {
          adSponsorshipMismatch.push({
            deliverable_id: d.id,
            linked_advertisement_id: d.linked_advertisement_id,
            ad_sponsorship_id: ad.linked_sponsorship_id,
            deliverable_sponsorship_id: d.sponsorship_id,
          });
        }
      }

      // MediaAssignment
      if (d.linked_media_assignment_id) {
        const assignment = assignmentMap.get(d.linked_media_assignment_id);
        if (!assignment) {
          missingAssignment.push({ deliverable_id: d.id, linked_media_assignment_id: d.linked_media_assignment_id });
        } else if (assignment.linked_sponsorship_id && assignment.linked_sponsorship_id !== d.sponsorship_id) {
          assignmentSponsorshipMismatch.push({
            deliverable_id: d.id,
            linked_media_assignment_id: d.linked_media_assignment_id,
            assignment_sponsorship_id: assignment.linked_sponsorship_id,
            deliverable_sponsorship_id: d.sponsorship_id,
          });
        }
      }

      // Archived with active status
      if (d.is_archived && d.status !== 'archived') {
        archivedWithActiveStatus.push({ deliverable_id: d.id, status: d.status });
      }

      // Public under private Sponsorship
      if (d.public_visibility === 'public' && sponsorship && sponsorship.public_visibility === 'private') {
        publicUnderPrivateSponsorship.push({
          deliverable_id: d.id,
          sponsorship_id: sponsorship.id,
        });
      }

      // Public under non-public Organization
      if (d.public_visibility === 'public' && sponsorship) {
        const org = orgMap.get(sponsorship.sponsor_organization_id);
        if (org && org.visibility_status === 'draft') {
          publicUnderNonPublicOrg.push({
            deliverable_id: d.id,
            organization_id: org.id,
            organization_name: org.name,
          });
        }
      }
    }

    const totalIssues =
      missingSponsorship.length +
      missingActivation.length +
      activationSponsorshipMismatch.length +
      invalidQuantityRequired.length +
      invalidQuantityCompleted.length +
      overDelivery.length +
      completedWithoutCompletedAt.length +
      completedQuantityBelowRequired.length +
      missingEvent.length +
      missingTrack.length +
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
        total_deliverables: deliverables.length,
        deliverables_with_activation: deliverables.filter((d: any) => d.activation_id).length,
        deliverables_with_event: deliverables.filter((d: any) => d.linked_event_id).length,
        deliverables_with_advertisement: deliverables.filter((d: any) => d.linked_advertisement_id).length,
        deliverables_with_assignment: deliverables.filter((d: any) => d.linked_media_assignment_id).length,
        completed_deliverables: deliverables.filter((d: any) => d.status === 'completed').length,
        public_deliverables: deliverables.filter((d: any) => d.public_visibility === 'public').length,
      },
      issues: {
        missing_sponsorship: missingSponsorship,
        missing_activation: missingActivation,
        activation_sponsorship_mismatch: activationSponsorshipMismatch,
        invalid_quantity_required: invalidQuantityRequired,
        invalid_quantity_completed: invalidQuantityCompleted,
        over_delivery: overDelivery,
        completed_without_completed_at: completedWithoutCompletedAt,
        completed_quantity_below_required: completedQuantityBelowRequired,
        missing_event: missingEvent,
        missing_track: missingTrack,
        missing_media: missingMedia,
        missing_advertisement: missingAdvertisement,
        advertisement_sponsorship_mismatch: adSponsorshipMismatch,
        missing_media_assignment: missingAssignment,
        media_assignment_sponsorship_mismatch: assignmentSponsorshipMismatch,
        duplicate_normalized_deliverable_key: duplicateKeys,
        archived_with_active_status: archivedWithActiveStatus,
        public_under_private_sponsorship: publicUnderPrivateSponsorship,
        public_under_non_public_organization: publicUnderNonPublicOrg,
      },
      summary: {
        total_issues: totalIssues,
        critical: missingSponsorship.length + activationSponsorshipMismatch.length +
                  adSponsorshipMismatch.length + assignmentSponsorshipMismatch.length,
        warnings: missingActivation.length + invalidQuantityRequired.length + invalidQuantityCompleted.length +
                  completedWithoutCompletedAt.length + completedQuantityBelowRequired.length +
                  missingEvent.length + missingTrack.length + missingMedia.length +
                  missingAdvertisement.length + missingAssignment.length +
                  duplicateKeys.length + archivedWithActiveStatus.length +
                  publicUnderPrivateSponsorship.length + publicUnderNonPublicOrg.length,
        informational: overDelivery.length,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}