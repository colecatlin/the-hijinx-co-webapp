import React from 'react';

// RaceCoreSection — teaser for the Race Core event management system
// Props: upcomingEvents, recentResults
export default function RaceCoreSection({ upcomingEvents = [], recentResults = [] }) {
  return (
    <section data-section="race-core">
      <div data-block="header">
        <span>Race Core</span>
        <p>The event management and results platform built for motorsports.</p>
      </div>

      {upcomingEvents.length > 0 && (
        <div data-block="upcoming-events">
          <div data-block-label="Upcoming Events" />
          {upcomingEvents.slice(0, 3).map((event) => (
            <div key={event.id} data-item="event">
              <span data-field="name">{event.name}</span>
              {event.event_date && <span data-field="date">{event.event_date}</span>}
              {event.series_name && <span data-field="series">{event.series_name}</span>}
            </div>
          ))}
        </div>
      )}

      {recentResults.length > 0 && (
        <div data-block="recent-results">
          <div data-block-label="Recent Results" />
          {recentResults.slice(0, 3).map((result, i) => (
            <div key={result.id || i} data-item="result">
              {result.driver_id && <span data-field="driver">{result.driver_id}</span>}
              {result.position  && <span data-field="position">P{result.position}</span>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}