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
 * Publish an event (set published_flag = true)
 */
export async function publishEvent({ eventId, userId }) {
  try {
    const event = await base44.entities.Event.get(eventId);
    
    await base44.entities.Event.update(eventId, {
      published_flag: true,
    });

    // Write operation log
    await base44.entities.OperationLog.create({
      operation_type: 'event_published',
      source_type: 'race_core',
      entity_name: 'Event',
      entity_id: eventId,
      status: 'success',
      metadata: JSON.stringify({
        eventId,
        eventName: event.name,
        userId,
      }),
      notes: `Event ${event.name} published`,
    });

    return true;
  } catch (error) {
    console.error('publishEvent error:', error);
    throw error;
  }
}

/**
 * Unpublish an event (set published_flag = false)
 */
export async function unpublishEvent({ eventId, userId }) {
  try {
    const event = await base44.entities.Event.get(eventId);
    
    await base44.entities.Event.update(eventId, {
      published_flag: false,
    });

    // Write operation log
    await base44.entities.OperationLog.create({
      operation_type: 'event_unpublished',
      source_type: 'race_core',
      entity_name: 'Event',
      entity_id: eventId,
      status: 'success',
      metadata: JSON.stringify({
        eventId,
        eventName: event.name,
        userId,
      }),
      notes: `Event ${event.name} unpublished`,
    });

    return true;
  } catch (error) {
    console.error('unpublishEvent error:', error);
    throw error;
  }
}

/**
 * Set event to Live (status = in_progress)
 */
export async function setEventLive({ eventId, userId }) {
  try {
    const event = await base44.entities.Event.get(eventId);
    
    await base44.entities.Event.update(eventId, {
      status: 'in_progress',
    });

    // Write operation log
    await base44.entities.OperationLog.create({
      operation_type: 'event_status_changed',
      source_type: 'race_core',
      entity_name: 'Event',
      entity_id: eventId,
      status: 'success',
      metadata: JSON.stringify({
        eventId,
        eventName: event.name,
        newStatus: 'in_progress',
        userId,
      }),
      notes: `Event ${event.name} set to Live`,
    });

    return true;
  } catch (error) {
    console.error('setEventLive error:', error);
    throw error;
  }
}

/**
 * Set event to Completed (status = completed)
 */
export async function setEventCompleted({ eventId, userId }) {
  try {
    const event = await base44.entities.Event.get(eventId);
    
    await base44.entities.Event.update(eventId, {
      status: 'completed',
    });

    // Write operation log
    await base44.entities.OperationLog.create({
      operation_type: 'event_status_changed',
      source_type: 'race_core',
      entity_name: 'Event',
      entity_id: eventId,
      status: 'success',
      metadata: JSON.stringify({
        eventId,
        eventName: event.name,
        newStatus: 'completed',
        userId,
      }),
      notes: `Event ${event.name} set to Completed`,
    });

    return true;
  } catch (error) {
    console.error('setEventCompleted error:', error);
    throw error;
  }
}

/**
 * Publish a session as Official (status = Official)
 */
export async function publishSessionOfficial({ sessionId, eventId, userId }) {
  try {
    const session = await base44.entities.Session.get(sessionId);
    
    await base44.entities.Session.update(sessionId, {
      status: 'Official',
    });

    // Write operation log
    await base44.entities.OperationLog.create({
      operation_type: 'session_published_official',
      source_type: 'race_core',
      entity_name: 'Session',
      entity_id: sessionId,
      status: 'success',
      metadata: JSON.stringify({
        eventId,
        sessionId,
        sessionName: session.name,
        userId,
      }),
      notes: `Session ${session.name} published as Official`,
    });

    return true;
  } catch (error) {
    console.error('publishSessionOfficial error:', error);
    throw error;
  }
}

/**
 * Lock a session (status = Locked, locked = true)
 */
export async function lockSession({ sessionId, eventId, userId }) {
  try {
    const session = await base44.entities.Session.get(sessionId);
    
    await base44.entities.Session.update(sessionId, {
      status: 'Locked',
      locked: true,
    });

    // Write operation log
    await base44.entities.OperationLog.create({
      operation_type: 'session_locked',
      source_type: 'race_core',
      entity_name: 'Session',
      entity_id: sessionId,
      status: 'success',
      metadata: JSON.stringify({
        eventId,
        sessionId,
        sessionName: session.name,
        userId,
      }),
      notes: `Session ${session.name} locked`,
    });

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