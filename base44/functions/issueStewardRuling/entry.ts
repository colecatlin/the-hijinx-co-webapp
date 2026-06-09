/**
 * issueStewardRuling
 * R9BP Sprint 1 — Moves a StewardRuling from Draft to Issued.
 * Permission: admin OR canIssueRuling (Chief Steward, Race Director, Competition Director)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALLOWED_ROLES = ['Race Director', 'Competition Director', 'Chief Steward'];

async function nextEventNumber(base44, entityName, field, prefix, eventId) {
  const existing = await base44.asServiceRole.entities[entityName].filter({ event_id: eventId });
  const nums = existing
    .map((r) => { const m = (r[field] || '').match(/^[A-Z]+-(\d+)$/); return m ? parseInt(m[1], 10) : 0; })
    .filter((n) => n > 0);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}-${String(next).padStart(3, '0')}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      event_id, session_id, source_type, source_id,
      summary, full_ruling, rule_references,
      drivers_affected, penalties_applied, ruling_id,
    } = body;

    // If ruling_id provided — issue existing draft. Otherwise create new.
    let ruling;
    if (ruling_id) {
      const rulings = await base44.asServiceRole.entities.StewardRuling.filter({ id: ruling_id });
      if (!rulings || rulings.length === 0) return Response.json({ error: 'StewardRuling not found' }, { status: 404 });
      ruling = rulings[0];

      if (ruling.status !== 'Draft') {
        return Response.json({ error: `Cannot issue ruling: current status is ${ruling.status}` }, { status: 409 });
      }

      if (user.role !== 'admin') {
        const officials = await base44.asServiceRole.entities.EventOfficial.filter({
          event_id: ruling.event_id, user_id: user.id,
        });
        const permitted = officials.some(
          (o) => ALLOWED_ROLES.includes(o.role) && ['Invited', 'Confirmed', 'Active'].includes(o.status)
        );
        if (!permitted) return Response.json({ error: 'Forbidden: canIssueRuling required' }, { status: 403 });
      }

      ruling = await base44.asServiceRole.entities.StewardRuling.update(ruling_id, {
        status: 'Issued',
        issued_by_user_id: user.id,
        issued_at: new Date().toISOString(),
      });
    } else {
      // Create and immediately issue
      if (!event_id) return Response.json({ error: 'event_id is required' }, { status: 400 });
      if (!source_type) return Response.json({ error: 'source_type is required' }, { status: 400 });
      if (!summary) return Response.json({ error: 'summary is required' }, { status: 400 });
      if (!full_ruling) return Response.json({ error: 'full_ruling is required' }, { status: 400 });

      if (user.role !== 'admin') {
        const officials = await base44.asServiceRole.entities.EventOfficial.filter({
          event_id, user_id: user.id,
        });
        const permitted = officials.some(
          (o) => ALLOWED_ROLES.includes(o.role) && ['Invited', 'Confirmed', 'Active'].includes(o.status)
        );
        if (!permitted) return Response.json({ error: 'Forbidden: canIssueRuling required' }, { status: 403 });
      }

      const ruling_number = await nextEventNumber(base44, 'StewardRuling', 'ruling_number', 'RUL', event_id);
      ruling = await base44.asServiceRole.entities.StewardRuling.create({
        event_id,
        session_id: session_id || undefined,
        ruling_number,
        source_type,
        source_id: source_id || undefined,
        status: 'Issued',
        summary,
        full_ruling,
        rule_references: rule_references || [],
        drivers_affected: drivers_affected || [],
        penalties_applied: penalties_applied || [],
        issued_by_user_id: user.id,
        issued_at: new Date().toISOString(),
        is_public: false,
      });
    }

    base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'ruling_issued',
      status: 'success',
      entity_name: 'StewardRuling',
      entity_id: ruling.id,
      event_id: ruling.event_id,
      message: `${ruling.ruling_number} issued by ${user.id}`,
      metadata: { ruling_number: ruling.ruling_number, source_type: ruling.source_type, issued_by: user.id },
    }).catch(() => {});

    return Response.json({ ruling });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});