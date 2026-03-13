import { base44 } from '@/api/base44Client';

/**
 * Fire-and-forget logger for Story Radar editorial actions.
 * Writes to OperationLog. Never throws — will not break calling flows.
 */
export async function logStoryRadarEvent({
  event_type,
  signal_id,
  recommendation_id,
  cluster_id,
  previous_status,
  new_status,
  acted_by_user_id,
}) {
  try {
    let userId = acted_by_user_id;
    if (!userId) {
      const user = await base44.auth.me().catch(() => null);
      userId = user?.email ?? user?.id;
    }

    const entity_id = recommendation_id ?? signal_id ?? cluster_id;
    const entity_name = recommendation_id
      ? 'StoryRecommendation'
      : signal_id
      ? 'ContentSignal'
      : cluster_id
      ? 'StoryTrendCluster'
      : 'StoryRadar';

    await base44.entities.OperationLog.create({
      operation_type: event_type,
      source_type: 'manual',
      entity_name,
      entity_id,
      status: 'completed',
      initiated_by: userId,
      metadata: {
        signal_id: signal_id ?? null,
        recommendation_id: recommendation_id ?? null,
        cluster_id: cluster_id ?? null,
        acted_by_user_id: userId ?? null,
        previous_status: previous_status ?? null,
        new_status: new_status ?? null,
      },
    });
  } catch (e) {
    // intentionally swallowed — logging must never break editorial actions
    console.warn('[StoryRadar] Failed to log event:', event_type, e?.message);
  }
}