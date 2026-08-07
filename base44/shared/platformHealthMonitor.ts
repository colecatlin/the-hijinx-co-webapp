/**
 * platformHealthMonitor.ts
 *
 * Production Hardening Phase — Centralized observability hooks for the
 * person-centered identity architecture.
 *
 * Provides lightweight monitoring functions that log operational events
 * to ActivityFeed without exposing sensitive data. Existing backend
 * functions can import these hooks to add observability without
 * changing their core logic.
 *
 * Monitoring categories:
 *   - identity_resolution_failure
 *   - participation_failure
 *   - entry_failure
 *   - result_failure
 *   - standings_failure
 *   - career_stats_failure
 *   - ownership_failure
 *   - claim_failure
 *   - driver_compat_write
 *   - driver_adapter_read
 *   - driver_redirect_usage
 */

export const MONITOR_EVENT_TYPES = {
  IDENTITY_RESOLUTION_FAILURE: 'identity_resolution_failure',
  PARTICIPATION_FAILURE: 'participation_failure',
  ENTRY_FAILURE: 'entry_failure',
  RESULT_FAILURE: 'result_failure',
  STANDINGS_FAILURE: 'standings_failure',
  CAREER_STATS_FAILURE: 'career_stats_failure',
  OWNERSHIP_FAILURE: 'ownership_failure',
  CLAIM_FAILURE: 'claim_failure',
  DRIVER_COMPAT_WRITE: 'driver_compat_write',
  DRIVER_ADAPTER_READ: 'driver_adapter_read',
  DRIVER_REDIRECT_USAGE: 'driver_redirect_usage',
} as const;

export type MonitorEventType = typeof MONITOR_EVENT_TYPES[keyof typeof MONITOR_EVENT_TYPES];

export interface MonitorEvent {
  event_type: MonitorEventType;
  entity_type?: string;
  entity_id?: string;
  description: string;
  metadata?: Record<string, string | number | boolean | null>;
}

/**
 * Log a monitoring event to ActivityFeed.
 * Non-blocking — swallows errors so monitoring never breaks core logic.
 */
export async function logMonitorEvent(base44: any, event: MonitorEvent): Promise<void> {
  try {
    await base44.asServiceRole.entities.ActivityFeed.create({
      type: 'platform_health_monitor',
      title: event.event_type,
      description: event.description,
      entity_type: event.entity_type || null,
      entity_id: event.entity_id || null,
      metadata: {
        monitor_event: event.event_type,
        ...event.metadata,
      },
    });
  } catch {
    // Non-critical — monitoring must never break core logic
  }
}

/**
 * Wrap an async operation with failure monitoring.
 * If the operation throws, logs a monitoring event and re-throws.
 */
export async function withMonitoring<T>(
  base44: any,
  event_type: MonitorEventType,
  operation: () => Promise<T>,
  context?: { entity_type?: string; entity_id?: string; description?: string }
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    await logMonitorEvent(base44, {
      event_type,
      entity_type: context?.entity_type,
      entity_id: context?.entity_id,
      description: context?.description || error?.message || 'Operation failed',
      metadata: {
        error: String(error?.message || error).substring(0, 500),
      },
    });
    throw error;
  }
}

/**
 * Log a Driver adapter read event.
 * Use when the compatibility adapter reads from legacy Driver.
 */
export async function logAdapterRead(
  base44: any,
  context: { racer_profile_id?: string; legacy_driver_id?: string; field?: string; source?: string }
): Promise<void> {
  return logMonitorEvent(base44, {
    event_type: MONITOR_EVENT_TYPES.DRIVER_ADAPTER_READ,
    entity_type: 'Driver',
    entity_id: context.legacy_driver_id || null,
    description: `Adapter read: ${context.field || 'general'} from ${context.source || 'unknown'}`,
    metadata: {
      racer_profile_id: context.racer_profile_id || null,
      legacy_driver_id: context.legacy_driver_id || null,
      field: context.field || null,
      source: context.source || null,
    },
  });
}

/**
 * Log a Driver redirect usage event.
 * Use when /drivers/:slug redirects to /racers/:slug.
 */
export async function logRedirectUsage(
  base44: any,
  context: { slug?: string; driver_id?: string; racer_profile_slug?: string; resolved: boolean }
): Promise<void> {
  return logMonitorEvent(base44, {
    event_type: MONITOR_EVENT_TYPES.DRIVER_REDIRECT_USAGE,
    entity_type: 'Driver',
    entity_id: context.driver_id || null,
    description: context.resolved
      ? `Redirect /drivers/${context.slug} → /racers/${context.racer_profile_slug}`
      : `Redirect /drivers/${context.slug} → legacy fallback (no RacerProfile)`,
    metadata: {
      slug: context.slug || null,
      driver_id: context.driver_id || null,
      racer_profile_slug: context.racer_profile_slug || null,
      resolved: context.resolved,
    },
  });
}