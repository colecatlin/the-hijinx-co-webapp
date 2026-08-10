import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import {
  validateCommercialRelationship,
  validateAdvertisementCompatibility,
  validateAssignmentCompatibility,
} from '../../shared/sponsorshipCommercialHelpers.ts';

/**
 * Phase 17C — validateCommercialSponsorshipLink
 *
 * Single validation endpoint for RevenueEvent, Advertisement, and MediaAssignment
 * records that optionally link to a Sponsorship via linked_sponsorship_id.
 *
 * Rules:
 *   • If linked_sponsorship_id is not supplied → valid (no validation needed).
 *   • If linked_sponsorship_id is supplied → validate Sponsorship exists,
 *     is not archived, and has a valid Organization.
 *   • For MediaAssignment: compensation_type == 'sponsored' allows linked_sponsorship_id.
 *
 * This function does NOT write anything. It does NOT update Sponsorship lifecycle.
 * It does NOT create RevenueAgreements. It is a pre-write validation gate.
 *
 * Called by frontend code before creating/updating commercial records with
 * a linked_sponsorship_id.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      record_type,
      linked_sponsorship_id,
      compensation_type,
    } = body;

    if (!record_type) {
      return Response.json({ error: 'record_type is required (RevenueEvent | Advertisement | MediaAssignment)' }, { status: 400 });
    }

    let result;

    switch (record_type) {
      case 'RevenueEvent':
        result = await validateCommercialRelationship(base44, linked_sponsorship_id);
        break;

      case 'Advertisement':
        result = await validateAdvertisementCompatibility(base44, linked_sponsorship_id);
        break;

      case 'MediaAssignment':
        result = await validateAssignmentCompatibility(base44, compensation_type, linked_sponsorship_id);
        break;

      default:
        return Response.json({ error: `Unknown record_type: ${record_type}` }, { status: 400 });
    }

    if (!result.valid) {
      return Response.json({
        valid: false,
        errors: result.errors,
      }, { status: 400 });
    }

    return Response.json({
      valid: true,
      errors: [],
      sponsorship: result.sponsorship ? {
        id: result.sponsorship.id,
        status: result.sponsorship.status,
        target_entity_type: result.sponsorship.target_entity_type,
        target_entity_id: result.sponsorship.target_entity_id,
        relationship_type: result.sponsorship.relationship_type,
        tier: result.sponsorship.tier,
      } : null,
      organization: result.organization ? {
        id: result.organization.id,
        name: result.organization.name,
        type: result.organization.type,
      } : null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});