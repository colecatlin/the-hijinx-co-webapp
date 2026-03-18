/**
 * storyRadarClusterRefresh
 * ─────────────────────────────────────────────────────────────────
 * Hourly maintenance job for StoryTrendCluster records:
 *  1. Applies momentum decay based on days since last activity
 *  2. Demotes stale clusters: active/peaking → cooling → closed
 *
 * Safe for repeated/scheduled execution — read-modify-write only.
 * Never creates new clusters or signals.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const ACTIVE_STATUSES   = ['forming', 'active', 'peaking'];
const COOLING_AFTER_DAYS = 3;   // demote to cooling if no activity
const CLOSE_AFTER_DAYS   = 7;   // demote to closed if still no activity
const DECAY_RATE         = 0.85; // momentum multiplied by this per day of inactivity

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled execution (no user) OR admin user
    const user = await base44.auth.me().catch(() => null);
    if (user !== null && user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const now = new Date();
    const clusters = await base44.asServiceRole.entities.StoryTrendCluster.list('-last_activity_date', 200);
    const active = clusters.filter(c => ACTIVE_STATUSES.includes(c.status));

    const stats = { checked: active.length, updated: 0, cooled: 0, closed: 0, errors: [] };

    for (const cluster of active) {
      try {
        const lastTs = cluster.last_activity_date ?? cluster.start_date ?? now.toISOString();
        const daysSince = (now.getTime() - new Date(lastTs).getTime()) / (1000 * 60 * 60 * 24);

        // Decay momentum
        const decayed = Math.max(0, Math.round((cluster.momentum_score ?? 50) * Math.pow(DECAY_RATE, daysSince)));

        // Determine new status
        let newStatus = cluster.status;
        if (daysSince >= CLOSE_AFTER_DAYS) {
          newStatus = 'closed';
          stats.closed++;
        } else if (daysSince >= COOLING_AFTER_DAYS && cluster.status !== 'cooling') {
          newStatus = 'cooling';
          stats.cooled++;
        }

        // Only write if something actually changed
        if (decayed !== cluster.momentum_score || newStatus !== cluster.status) {
          await base44.asServiceRole.entities.StoryTrendCluster.update(cluster.id, {
            momentum_score: decayed,
            status: newStatus,
          });
          stats.updated++;
        }
      } catch (err) {
        stats.errors.push(`Cluster ${cluster.id}: ${err.message}`);
      }
    }

    // Log the run
    try {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'story_radar_cluster_refresh_run',
        entity_name: 'StoryTrendCluster',
        entity_id: '',
        metadata: stats,
      });
    } catch (_) { /* fire-and-forget */ }

    return Response.json({ success: true, ...stats });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});