import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * getDeliverableRequirementsForRequest
 * Resolves active DeliverableRequirements scoped to a CredentialRequest.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { request_id } = await req.json();
    if (!request_id) return Response.json({ error: 'request_id required' }, { status: 400 });

    const credReq = await base44.entities.CredentialRequest.get(request_id);
    if (!credReq) return Response.json({ error: 'Request not found' }, { status: 404 });

    const allRequirements = await base44.entities.DeliverableRequirement.list();
    const active = allRequirements.filter(r => r.active);

    let requirements = [];

    if (credReq.related_event_id) {
      // Try to get event for track/series context
      let event = null;
      try {
        event = await base44.entities.Event.get(credReq.related_event_id);
      } catch (_) {}

      const scopeIds = new Set([credReq.related_event_id]);
      if (event?.track_id) scopeIds.add(event.track_id);
      if (event?.series_id) scopeIds.add(event.series_id);

      requirements = active.filter(r =>
        (r.event_id && r.event_id === credReq.related_event_id) ||
        scopeIds.has(r.entity_id)
      );
    } else {
      requirements = active.filter(r => r.entity_id === credReq.target_entity_id);
    }

    // Deduplicate by id
    const seen = new Set();
    const unique = requirements.filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    return Response.json({ requirements: unique });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});