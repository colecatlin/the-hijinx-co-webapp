/**
 * Publish Actions
 * Core publish workflow functions for sessions, results, and standings
 */
import { base44 } from '@/api/base44Client';
import { logPublishAction } from './operationLogHelpers';

/**
 * Publish all sessions as Official
 * Updates Draft and Provisional sessions to Official status
 */
export const publishAllSessionsOfficial = async (eventId) => {
  const sessions = await base44.entities.Session.filter({ event_id: eventId });
  
  const toPublish = sessions.filter(
    (s) => s.status === 'Draft' || s.status === 'Provisional' || !s.status
  );

  const updates = toPublish.map((session) =>
    base44.entities.Session.update(session.id, {
      status: 'Official',
      locked: false,
    })
  );

  await Promise.all(updates);

  // Log publish action
  await logPublishAction({
    event_id: eventId,
    publish_type: 'publish_sessions_official',
    target: 'Session',
    status: 'success',
    metadata: {
      sessions_published: toPublish.length,
    },
  });

  return toPublish.length;
};

/**
 * Publish all results as Official
 * Updates sessions with results to Official status if they are Draft or Provisional
 */
export const publishAllResultsOfficial = async (eventId) => {
  const sessions = await base44.entities.Session.filter({ event_id: eventId });
  const results = await base44.entities.Results.filter({ event_id: eventId });

  // Find sessions that have results
  const sessionsWithResults = new Set(results.map((r) => r.session_id));

  const toPublish = sessions.filter(
    (s) => sessionsWithResults.has(s.id) &&
           (s.status === 'Draft' || s.status === 'Provisional' || !s.status)
  );

  const updates = toPublish.map((session) =>
    base44.entities.Session.update(session.id, {
      status: 'Official',
      locked: false,
    })
  );

  await Promise.all(updates);

  // Log publish action
  await logPublishAction({
    event_id: eventId,
    publish_type: 'publish_results_official',
    target: 'Results',
    status: 'success',
    metadata: {
      sessions_published: toPublish.length,
      results_count: results.length,
    },
  });

  return toPublish.length;
};

/**
 * Publish standings
 * Creates a publish marker in OperationLog (does not calculate)
 */
export const publishStandings = async (seriesId, seasonYear, eventId) => {
  // Verify standings exist
  const standings = await base44.entities.Standings.filter({
    series_id: seriesId,
    season_year: seasonYear,
  }).catch(() => []);

  if (standings.length === 0) {
    throw new Error('No standings calculated. Calculate standings first.');
  }

  // Log publish marker
  await logPublishAction({
    event_id: eventId,
    publish_type: 'publish_standings',
    target: 'Standings',
    status: 'success',
    metadata: {
      series_id: seriesId,
      season: seasonYear,
      standings_count: standings.length,
    },
  });

  return standings.length;
};