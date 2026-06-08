import { base44 } from '@/api/base44Client';

/**
 * Check if event can be published
 */
export function canPublishEvent(selectedEvent) {
  if (!selectedEvent) return false;
  // Can publish if event exists and has required fields
  return !!selectedEvent.name && !!selectedEvent.event_date;
}

/**
 * Check if results for a session can be published
 */
export function canPublishResults(selectedEvent, selectedSession) {
  if (!selectedEvent || !selectedSession) return false;
  // Can publish if session is in draft or provisional state
  return ['Draft', 'Provisional'].includes(selectedSession.status);
}

/**
 * Check if standings can be published
 */
export function canPublishStandings(selectedSeries, seasonYear) {
  if (!selectedSeries || !seasonYear) return false;
  return !!selectedSeries.id;
}

/**
 * Publish an event → routes through setEventLifecycleStatus for atomic field sync.
 */
export async function publishEvent({ eventId, userId }) {
  try {
    await base44.functions.invoke('setEventLifecycleStatus', {
      event_id: eventId,
      new_status: 'Published',
      reason: `Triggered by publishEvent (userId: ${userId})`,
    });
    return true;
  } catch (error) {
    console.error('publishEvent error:', error);
    throw error;
  }
}

/**
 * Unpublish an event → routes back to Draft via setEventLifecycleStatus.
 */
export async function unpublishEvent({ eventId, userId }) {
  try {
    await base44.functions.invoke('setEventLifecycleStatus', {
      event_id: eventId,
      new_status: 'Draft',
      reason: `Triggered by unpublishEvent (userId: ${userId})`,
    });
    return true;
  } catch (error) {
    console.error('unpublishEvent error:', error);
    throw error;
  }
}

/**
 * Set event to Live → routes through setEventLifecycleStatus.
 */
export async function setEventLive({ eventId, userId }) {
  try {
    await base44.functions.invoke('setEventLifecycleStatus', {
      event_id: eventId,
      new_status: 'Live',
      reason: `Triggered by setEventLive (userId: ${userId})`,
    });
    return true;
  } catch (error) {
    console.error('setEventLive error:', error);
    throw error;
  }
}

/**
 * Set event to Completed → routes through setEventLifecycleStatus.
 */
export async function setEventCompleted({ eventId, userId }) {
  try {
    await base44.functions.invoke('setEventLifecycleStatus', {
      event_id: eventId,
      new_status: 'Completed',
      reason: `Triggered by setEventCompleted (userId: ${userId})`,
    });
    return true;
  } catch (error) {
    console.error('setEventCompleted error:', error);
    throw error;
  }
}

/**
 * Publish a session as Official — routes through updateSessionStatus backend
 * state machine (validates transition, logs, auto-syncs result visibility).
 */
export async function publishSessionOfficial({ sessionId, eventId, userId }) {
  try {
    const res = await base44.functions.invoke('updateSessionStatus', {
      session_id: sessionId,
      new_status: 'Official',
    });
    if (res?.data?.error) throw new Error(res.data.error);
    return true;
  } catch (error) {
    console.error('publishSessionOfficial error:', error);
    throw error;
  }
}

/**
 * Lock a session — routes through updateSessionStatus backend state machine.
 * State machine keeps status and locked boolean in sync automatically.
 */
export async function lockSession({ sessionId, eventId, userId }) {
  try {
    const res = await base44.functions.invoke('updateSessionStatus', {
      session_id: sessionId,
      new_status: 'Locked',
    });
    if (res?.data?.error) throw new Error(res.data.error);
    return true;
  } catch (error) {
    console.error('lockSession error:', error);
    throw error;
  }
}

/**
 * Publish standings (set published_flag = true)
 */
export async function publishStandings({ seriesId, seasonYear, userId }) {
  try {
    // Update all standings records for this series and season
    const standings = await base44.entities.Standings.filter({
      series_id: seriesId,
      season_year: seasonYear,
    });

    if (standings.length === 0) return true;

    // Update each standing record
    await Promise.all(
      standings.map(s =>
        base44.entities.Standings.update(s.id, {
          published_flag: true,
        })
      )
    );

    // Write operation log
    await base44.entities.OperationLog.create({
      operation_type: 'standings_published',
      source_type: 'race_core',
      entity_name: 'Standings',
      entity_id: seriesId,
      status: 'success',
      metadata: JSON.stringify({
        seriesId,
        seasonYear,
        standingsCount: standings.length,
        userId,
      }),
      notes: `Standings published for ${seasonYear}`,
    });

    return true;
  } catch (error) {
    console.error('publishStandings error:', error);
    throw error;
  }
}