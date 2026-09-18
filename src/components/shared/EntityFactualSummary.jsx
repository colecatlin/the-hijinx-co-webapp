import React from 'react';

/**
 * EntityFactualSummary — renders concise, machine-readable factual summary
 * sentences for public entity pages. Sentences are composed CONDITIONALLY
 * from authoritative relationships — no "undefined" or "null" leaks into
 * visible text.
 *
 * Props:
 *   type — 'racer' | 'event' | 'series' | 'track' | 'team'
 *   data — the entity payload from the experience function
 *
 * The summary is rendered as visible, semantic HTML (<p> with prose) so
 * crawlers and answer engines can extract the facts directly from the DOM.
 * If insufficient data exists to compose a meaningful sentence, nothing is
 * rendered (graceful degradation).
 *
 * IMPORTANT: This component does NOT fabricate data. If a relationship is
 * missing, that clause is omitted. If no meaningful sentence can be
 * composed, the component renders null.
 */

function buildRacerSummary(data) {
  const name = data?.display_name || data?.racerProfile?.display_name;
  if (!name) return null;
  const discipline = data?.primary_discipline || data?.racerProfile?.primary_discipline;
  const team = data?.team_history?.find((t) => t.is_current) || data?.team_history?.[0];
  const teamName = team?.team_name;
  const series = data?.statistics?.by_series?.[0]?.series_name;
  const hometown = [data?.hometown_city || data?.racerProfile?.hometown_city, data?.hometown_state || data?.racerProfile?.hometown_state]
    .filter(Boolean).join(', ');

  const parts = [name];
  let sentence;

  if (discipline && teamName && series) {
    sentence = `${name} competes in ${discipline} for ${teamName} in ${series}.`;
  } else if (discipline && series) {
    sentence = `${name} competes in ${discipline} in ${series}.`;
  } else if (discipline && teamName) {
    sentence = `${name} competes in ${discipline} for ${teamName}.`;
  } else if (discipline) {
    sentence = `${name} is a ${discipline} racer.`;
  } else {
    sentence = `${name} is a racing competitor.`;
  }

  if (hometown) {
    sentence += ` Hometown: ${hometown}.`;
  }

  return sentence;
}

function buildEventSummary(data) {
  const name = data?.event?.name || data?.name;
  if (!name) return null;
  const seriesName = data?.series?.name;
  const trackName = data?.track?.name;
  const eventDate = data?.event?.event_date || data?.event_date;
  const locationParts = [data?.track?.location_city, data?.track?.location_state].filter(Boolean);
  const locationStr = locationParts.length > 0 ? locationParts.join(', ') : null;

  const parts = [];
  if (seriesName) parts.push(`a ${seriesName} event`);
  else parts.push('a motorsports event');

  let sentence = `${name} is ${parts[0]}`;
  if (trackName) sentence += ` held at ${trackName}`;
  if (locationStr && trackName) sentence += ` in ${locationStr}`;
  if (eventDate) sentence += ` on ${eventDate}`;
  sentence += '.';

  return sentence;
}

function buildSeriesSummary(data) {
  const name = data?.series?.name || data?.name;
  if (!name) return null;
  const discipline = data?.series?.discipline;
  const season = data?.selected_season || data?.current_season;
  const sanctioningBody = data?.series?.sanctioning_body;
  const eventCount = data?.statistics?.events_count;
  const classCount = data?.statistics?.classes_count;

  let sentence = `${name}`;
  if (discipline) sentence += ` is a ${discipline} racing series`;
  else sentence += ` is a racing series`;
  if (sanctioningBody) sentence += ` sanctioned by ${sanctioningBody}`;
  sentence += '.';
  if (season) sentence += ` ${season} season.`;
  if (eventCount && classCount) {
    sentence += ` ${eventCount} events across ${classCount} classes.`;
  }

  return sentence;
}

function buildTrackSummary(data) {
  const name = data?.track?.name || data?.name;
  if (!name) return null;
  const trackType = data?.track?.track_type;
  const surface = data?.track?.surface_type;
  const locationParts = [data?.track?.location_city, data?.track?.location_state, data?.track?.location_country].filter(Boolean);
  const eventCount = data?.statistics?.total_events;

  let sentence = `${name}`;
  if (trackType) sentence += ` is a ${trackType} track`;
  else sentence += ` is a racing track`;
  if (surface) sentence += ` with a ${surface} surface`;
  if (locationParts.length > 0) sentence += ` located in ${locationParts.join(', ')}`;
  sentence += '.';
  if (eventCount) sentence += ` ${eventCount} events hosted.`;

  return sentence;
}

function buildTeamSummary(data) {
  const name = data?.team?.name || data?.name;
  if (!name) return null;
  const discipline = data?.team?.primary_discipline;
  const racerCount = data?.statistics?.racers_count || data?.team?.racer_count;
  const foundedYear = data?.team?.founded_year;

  let sentence = `${name}`;
  if (discipline) sentence += ` is a ${discipline} racing team`;
  else sentence += ` is a racing team`;
  sentence += '.';
  if (foundedYear) sentence += ` Founded in ${foundedYear}.`;
  if (racerCount) sentence += ` ${racerCount} racer${racerCount === 1 ? '' : 's'}.`;

  return sentence;
}

export default function EntityFactualSummary({ type, data }) {
  if (!data) return null;
  let sentence = null;
  try {
    switch (type) {
      case 'racer': sentence = buildRacerSummary(data); break;
      case 'event': sentence = buildEventSummary(data); break;
      case 'series': sentence = buildSeriesSummary(data); break;
      case 'track': sentence = buildTrackSummary(data); break;
      case 'team': sentence = buildTeamSummary(data); break;
      default: return null;
    }
  } catch {
    return null;
  }
  if (!sentence) return null;
  return (
    <p
      className="text-sm leading-relaxed text-foreground/70 px-6 max-w-4xl mx-auto mt-3"
      style={{ userSelect: 'text' }}
    >
      {sentence}
    </p>
  );
}