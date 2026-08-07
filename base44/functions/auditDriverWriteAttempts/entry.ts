/**
 * auditDriverWriteAttempts — Phase 8+
 *
 * Read-only admin audit of Driver write monitoring events.
 * Reports on blocked and approved Driver write attempts recorded in ActivityFeed.
 *
 * Also serves as the monitoring endpoint — other functions log events to ActivityFeed
 * with type='driver_write_monitor', and this function aggregates them.
 *
 * Payload: { limit?: number }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireAdmin } from '../../shared/identityClaimHelpers.ts';
import { DRIVER_WRITE_EVENTS } from '../../shared/driverWriteEnforcement.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    await requireAdmin(base44);

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(body?.limit || 200, 500);

    // Fetch recent ActivityFeed items of type 'driver_write_monitor'
    const allActivities = await base44.asServiceRole.entities.ActivityFeed.list('-created_date', limit);
    const monitorEvents = (Array.isArray(allActivities) ? allActivities : [])
      .filter(a => a.type === 'driver_write_monitor');

    // Aggregate by event type
    const byEventType = {};
    for (const event of Object.values(DRIVER_WRITE_EVENTS)) {
      byEventType[event] = monitorEvents.filter(e => e.description?.includes(event) || e.title?.includes(event)).length;
    }

    return Response.json({
      generated_at: new Date().toISOString(),
      summary: {
        total_monitor_events: monitorEvents.length,
        blocked_creates: byEventType[DRIVER_WRITE_EVENTS.BLOCKED_CREATE] || 0,
        blocked_updates: byEventType[DRIVER_WRITE_EVENTS.BLOCKED_UPDATE] || 0,
        approved_compat_creates: byEventType[DRIVER_WRITE_EVENTS.APPROVED_COMPAT_CREATE] || 0,
        approved_compat_updates: byEventType[DRIVER_WRITE_EVENTS.APPROVED_COMPAT_UPDATE] || 0,
        admin_repairs: byEventType[DRIVER_WRITE_EVENTS.ADMIN_REPAIR] || 0,
        blocked_collaborator_creates: byEventType[DRIVER_WRITE_EVENTS.BLOCKED_COLLABORATOR_CREATE] || 0,
        adapter_reads: byEventType[DRIVER_WRITE_EVENTS.ADAPTER_READ] || 0,
      },
      recent_events: monitorEvents.slice(0, 50).map(e => ({
        id: e.id,
        title: e.title,
        description: e.description,
        created_date: e.created_date,
        metadata: e.metadata,
      })),
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return Response.json({ error: error.message || 'Internal error' }, { status });
  }
}