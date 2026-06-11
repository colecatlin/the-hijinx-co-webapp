/**
 * R9CX Phase 4 — syncEventStatus
 * Single authority layer for event status.
 * Ensures status, public_status, and published_flag are always synchronized.
 *
 * Rules:
 *   Draft      → status=Draft,     public_status=draft,     published_flag=false
 *   Published  → status=Published, public_status=published, published_flag=true
 *   Live       → status=Live,      public_status=published, published_flag=true
 *   Completed  → status=Completed, public_status=published, published_flag=true
 *   Archived   → status=Archived,  public_status=archived,  published_flag=false
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const STATUS_MAP = {
  Draft:      { status: 'Draft',      public_status: 'draft',     published_flag: false },
  PendingApproval: { status: 'PendingApproval', public_status: 'draft', published_flag: false },
  Published:  { status: 'Published',  public_status: 'published', published_flag: true  },
  Live:       { status: 'Live',       public_status: 'published', published_flag: true  },
  Completed:  { status: 'Completed',  public_status: 'completed', published_flag: true  },
  Archived:   { status: 'Archived',   public_status: 'archived',  published_flag: false },
  Cancelled:  { status: 'Cancelled',  public_status: 'archived',  published_flag: false },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const { event_id, status } = await req.json();
    if (!event_id) return Response.json({ error: 'event_id required' }, { status: 400 });
    if (!status) return Response.json({ error: 'status required' }, { status: 400 });

    const statusFields = STATUS_MAP[status];
    if (!statusFields) {
      return Response.json({
        error: `Invalid status: ${status}. Valid values: ${Object.keys(STATUS_MAP).join(', ')}`
      }, { status: 400 });
    }

    const event = await base44.asServiceRole.entities.Event.get(event_id);
    if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

    const previousStatus = event.status;

    // Apply synchronized update
    await base44.asServiceRole.entities.Event.update(event_id, statusFields);

    // Write audit log
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'Event',
      entity_id: event_id,
      entity_name: event.name,
      action: 'status_changed',
      performed_by: user.id,
      performed_by_name: user.full_name,
      timestamp: new Date().toISOString(),
      event_id,
      before_data: { status: previousStatus },
      after_data: statusFields,
      notes: `Event status: ${previousStatus} → ${status}`,
    }).catch(() => null);

    return Response.json({
      success: true,
      event_id,
      previous_status: previousStatus,
      new_status: status,
      fields_updated: statusFields,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});