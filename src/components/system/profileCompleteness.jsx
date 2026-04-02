/**
 * profileCompleteness.js
 * Pure completeness-check functions for shared entities.
 * Returns: { level, missingRequired, missingRecommended, badge, nextSteps }
 * level: 'operational' | 'incomplete' | 'public_ready'
 */

function evaluate(record, required, recommended) {
  if (!record) return { level: 'incomplete', missingRequired: [], missingRecommended: [], badge: 'Incomplete', nextSteps: [] };

  const missingRequired = required.filter(({ key }) => !record[key]);
  const missingRecommended = recommended.filter(({ key }) => !record[key]);

  let level;
  if (missingRequired.length > 0) {
    level = 'incomplete';
  } else if (record.visibility_status !== 'live') {
    level = 'operational'; // operationally usable, not yet public
  } else if (missingRecommended.length > 0) {
    level = 'operational'; // live but missing recommended media/copy
  } else {
    level = 'public_ready';
  }

  const badges = {
    incomplete: 'Incomplete',
    operational: record.visibility_status === 'live' ? 'Missing Media' : 'Needs Profile Setup',
    public_ready: 'Public Ready',
  };

  return {
    level,
    missingRequired: missingRequired.map(r => r.label),
    missingRecommended: missingRecommended.map(r => r.label),
    badge: badges[level],
  };
}

export function checkDriverCompleteness(driver) {
  return evaluate(
    driver,
    [
      { key: 'first_name', label: 'First name' },
      { key: 'last_name', label: 'Last name' },
      { key: 'primary_discipline', label: 'Primary discipline' },
      { key: 'racing_status', label: 'Racing status' },
      { key: 'visibility_status', label: 'Visibility status' },
    ],
    [
      { key: 'profile_image_url', label: 'Profile image' },
      { key: 'bio', label: 'Bio' },
    ]
  );
}

export function checkTeamCompleteness(team) {
  return evaluate(
    team,
    [
      { key: 'name', label: 'Name' },
      { key: 'primary_discipline', label: 'Primary discipline' },
      { key: 'racing_status', label: 'Racing status' },
      { key: 'visibility_status', label: 'Visibility status' },
    ],
    [
      { key: 'logo_url', label: 'Logo' },
      { key: 'description_summary', label: 'Description' },
    ]
  );
}

export function checkTrackCompleteness(track) {
  return evaluate(
    track,
    [
      { key: 'name', label: 'Name' },
      { key: 'track_type', label: 'Track type' },
      { key: 'surface_type', label: 'Surface type' },
      { key: 'operational_status', label: 'Operational status' },
      { key: 'visibility_status', label: 'Visibility status' },
    ],
    [
      { key: 'image_url', label: 'Track image' },
      { key: 'description', label: 'Description' },
    ]
  );
}

export function checkSeriesCompleteness(series) {
  return evaluate(
    series,
    [
      { key: 'name', label: 'Name' },
      { key: 'discipline', label: 'Discipline' },
      { key: 'operational_status', label: 'Operational status' },
      { key: 'visibility_status', label: 'Visibility status' },
    ],
    [
      { key: 'logo_url', label: 'Logo' },
      { key: 'description', label: 'Description' },
    ]
  );
}

export function checkEventCompleteness(event) {
  return evaluate(
    event,
    [
      { key: 'name', label: 'Name' },
      { key: 'event_date', label: 'Event date' },
      { key: 'status', label: 'Status' },
      { key: 'public_status', label: 'Public status' },
    ],
    [
      { key: 'track_id', label: 'Track' },
      { key: 'series_id', label: 'Series' },
      { key: 'event_cover_image_url', label: 'Cover image' },
    ]
  );
}