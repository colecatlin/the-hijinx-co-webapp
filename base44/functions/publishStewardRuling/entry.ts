/**
 * publishStewardRuling
 * R9BP Sprint 1 — Sets StewardRuling.is_public = true and status = Published.
 * Permission: admin OR canPublishRuling (Race Director, Competition Director)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALLOWED_ROLES = ['Race Director', 'Competition Director'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { ruling_id } = await req.json();
    if (!ruling_id) return Response.json({ error: 'ruling_id is required' }, { status: 400 });

    const rulings = await base44.asServiceRole.entities.StewardRuling.filter({ id: ruling_id });
    if (!rulings || rulings.length === 0) return Response.json({ error: 'StewardRuling not found' }, { status: 404 });
    const ruling = rulings[0];

    if (ruling.status !== 'Issued') {
      return Response.json({ error: `Cannot publish: ruling status is ${ruling.status} — must be Issued first` }, { status: 409 });
    }

    if (user.role !== 'admin') {
      const officials = await base44.asServiceRole.entities.EventOfficial.filter({
        event_id: ruling.event_id, user_id: user.id,
      });
      const permitted = officials.some(
        (o) => ALLOWED_ROLES.includes(o.role) && ['Invited', 'Confirmed', 'Active'].includes(o.status)
      );
      if (!permitted) return Response.json({ error: 'Forbidden: canPublishRuling required' }, { status: 403 });
    }

    const updated = await base44.asServiceRole.entities.StewardRuling.update(ruling_id, {
      status: 'Published',
      is_public: true,
      published_at: new Date().toISOString(),
    });

    base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'ruling_published',
      status: 'success',
      entity_name: 'StewardRuling',
      entity_id: ruling_id,
      event_id: ruling.event_id,
      message: `${ruling.ruling_number} published by ${user.id}`,
      metadata: { ruling_number: ruling.ruling_number, published_by: user.id },
    }).catch(() => {});

    return Response.json({ ruling: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});