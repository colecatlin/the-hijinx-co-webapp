import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { request_id } = await req.json();
    if (!request_id) return Response.json({ error: 'request_id required' }, { status: 400 });

    const credReq = await base44.entities.CredentialRequest.get(request_id);
    if (!credReq) return Response.json({ error: 'Request not found' }, { status: 404 });

    const allTemplates = await base44.entities.WaiverTemplate.filter({ active: true });
    const results = [];
    const seen = new Set();

    const addTemplate = (t, label) => {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        results.push({ ...t, _label: label });
      }
    };

    if (credReq.related_event_id) {
      const event = await base44.entities.Event.get(credReq.related_event_id);
      if (event) {
        allTemplates.forEach(t => {
          if (t.entity_id === event.id) addTemplate(t, 'Event');
          else if (event.track_id && t.entity_id === event.track_id) addTemplate(t, 'Track');
          else if (event.series_id && t.entity_id === event.series_id) addTemplate(t, 'Series');
        });
      }
    } else {
      allTemplates.forEach(t => {
        if (t.entity_id === credReq.target_entity_id) addTemplate(t, credReq.target_entity_type || 'Entity');
      });
    }

    return Response.json({ templates: results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});