/**
 * setEventLifecycleStatus.js
 *
 * Canonical single-function event lifecycle writer.
 * Atomically updates Event.status, Event.public_status, and Event.published_flag
 * together so they can never drift independently.
 *
 * Valid transitions and their field mappings:
 *   Draft         → status: Draft,         public_status: draft,      published_flag: false
 *   PendingApproval → status: PendingApproval, public_status: pending, published_flag: false
 *   Published     → status: Published,     public_status: published,  published_flag: true
 *   Live          → status: Live,          public_status: live,       published_flag: true
 *   Completed     → status: Completed,     public_status: completed,  published_flag: true
 *   Cancelled     → status: Cancelled,     public_status: cancelled,  published_flag: false
 *   Archived      → status: Archived,      public_status: archived,   published_flag: false
 *
 * Input:  { event_id, new_status, reason? }
 * Output: { ok, event, transition }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const STATUS_MAP = {
  'Draft':           { status: 'Draft',          public_status: 'draft',      published_flag: false },
  'PendingApproval': { status: 'PendingApproval', public_status: 'pending',    published_flag: false },
  'Published':       { status: 'Published',       public_status: 'published',  published_flag: true  },
  'Live':            { status: 'Live',            public_status: 'live',       published_flag: true  },
  'Completed':       { status: 'Completed',       public_status: 'completed',  published_flag: true  },
  'Cancelled':       { status: 'Cancelled',       public_status: 'cancelled',  published_flag: false },
  'Archived':        { status: 'Archived',        public_status: 'archived',   published_flag: false },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const { event_id, new_status, reason } = await req.json();

    if (!event_id) return Response.json({ error: 'event_id is required' }, { status: 400 });
    if (!new_status) return Response.json({ error: 'new_status is required' }, { status: 400 });

    const fields = STATUS_MAP[new_status];
    if (!fields) {
      return Response.json({
        error: `Invalid status "${new_status}". Valid: ${Object.keys(STATUS_MAP).join(', ')}`,
      }, { status: 400 });
    }

    const db = base44.asServiceRole;

    // Load current event
    const events = await db.entities.Event.filter({ id: event_id }).catch(() => []);
    const event = events?.[0];
    if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

    const previousStatus = event.status || 'Draft';
    const transition = `${previousStatus}→${new_status}`;

    // No-op guard
    if (previousStatus === new_status) {
      return Response.json({ ok: true, event, transition, note: 'no_change' });
    }

    // Atomic write: all three fields together
    const updatePayload = {
      ...fields,
      ...(new_status === 'Published' && {
        published_by_user_id: user.id,
        published_date: new Date().toISOString(),
      }),
    };

    const updated = await db.entities.Event.update(event_id, updatePayload);

    // Log
    await db.entities.OperationLog.create({
      operation_type: 'event_lifecycle_changed',
      entity_name: 'Event',
      entity_id: event_id,
      status: 'success',
      message: `Event "${event.name}" transitioned ${transition}`,
      initiated_by: user.email,
      metadata: {
        event_id,
        event_name: event.name,
        previous_status: previousStatus,
        new_status,
        public_status: fields.public_status,
        published_flag: fields.published_flag,
        transition,
        reason: reason || null,
        changed_by: user.email,
        changed_by_user_id: user.id,
      },
    }).catch(() => {});

    return Response.json({ ok: true, event: updated, transition });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});