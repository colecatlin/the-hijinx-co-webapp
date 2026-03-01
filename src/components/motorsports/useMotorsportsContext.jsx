import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useEffect, useState } from 'react';

/**
 * useMotorsportsContext
 * 
 * Reusable context resolver for public motorsports pages and RegistrationDashboard.
 * Resolves organizational and event context from parameters or URL.
 * 
 * @param {Object} params - Optional parameters
 * @param {string} params.orgType - Organization type (track, series, event)
 * @param {string} params.orgId - Organization ID
 * @param {string} params.seasonYear - Season year
 * @param {string} params.eventId - Event ID
 * 
 * @returns {Object} Resolved context object
 * @returns {string} orgType - Organization type
 * @returns {string} orgId - Organization ID
 * @returns {string} seasonYear - Season year
 * @returns {string} eventId - Event ID
 * @returns {Object} event - Event entity (if eventId provided)
 * @returns {Object} track - Track entity (if event.track_id exists)
 * @returns {Object} series - Series entity (if event.series_id exists)
 * @returns {boolean} isLoading - Loading state
 * @returns {Error} error - Error state
 */
export function useMotorsportsContext(params = {}) {
  const [urlParams, setUrlParams] = useState({
    orgType: null,
    orgId: null,
    seasonYear: null,
    eventId: null,
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    setUrlParams({
      orgType: searchParams.get('orgType'),
      orgId: searchParams.get('orgId'),
      seasonYear: searchParams.get('seasonYear'),
      eventId: searchParams.get('eventId'),
    });
  }, []);

  const orgType = params.orgType || urlParams.orgType;
  const orgId = params.orgId || urlParams.orgId;
  const seasonYear = params.seasonYear || urlParams.seasonYear;
  const eventId = params.eventId || urlParams.eventId;

  const { data: event, isLoading: eventLoading, error: eventError } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const events = await base44.entities.Event.list();
      return events.find(e => e.id === eventId);
    },
    enabled: !!eventId,
  });

  const { data: track, isLoading: trackLoading, error: trackError } = useQuery({
    queryKey: ['track', event?.track_id],
    queryFn: async () => {
      if (!event?.track_id) return null;
      const tracks = await base44.entities.Track.list();
      return tracks.find(t => t.id === event.track_id);
    },
    enabled: !!event?.track_id,
  });

  const { data: series, isLoading: seriesLoading, error: seriesError } = useQuery({
    queryKey: ['series', event?.series_id],
    queryFn: async () => {
      if (!event?.series_id) return null;
      const allSeries = await base44.entities.Series.list();
      return allSeries.find(s => s.id === event.series_id);
    },
    enabled: !!event?.series_id,
  });

  const isLoading = eventLoading || trackLoading || seriesLoading;
  const error = eventError || trackError || seriesError;

  return {
    orgType,
    orgId,
    seasonYear,
    eventId,
    event,
    track,
    series,
    isLoading,
    error,
  };
}