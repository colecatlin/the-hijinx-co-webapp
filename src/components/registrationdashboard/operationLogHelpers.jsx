/**
 * Operation Log Helpers
 * Helper functions for logging publish and other race core operations
 */
import { base44 } from '@/api/base44Client';

/**
 * Log a publish action to OperationLog
 */
export const logPublishAction = async ({
  event_id,
  publish_type,
  target,
  target_id,
  status = 'success',
  metadata = {},
}) => {
  try {
    await base44.entities.OperationLog.create({
      operation_type: 'publish',
      source_type: 'manual',
      entity_name: target || 'RaceCore',
      entity_id: target_id,
      event_id,
      status,
      message: `Published: ${publish_type}`,
      metadata: JSON.stringify({
        publish_type,
        target,
        target_id,
        timestamp_client: new Date().toISOString(),
        ...metadata,
      }),
    });
  } catch (err) {
    console.error('Failed to log publish action:', err);
    // Silently fail—don't break the publish if logging fails
  }
};