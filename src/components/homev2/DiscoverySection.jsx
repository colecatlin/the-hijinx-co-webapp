import React from 'react';

// DiscoverySection — surfaces featured drivers, stories, and upcoming events
// Props: featuredDrivers, featuredStories, upcomingEvents
export default function DiscoverySection({ featuredDrivers = [], featuredStories = [], upcomingEvents = [] }) {
  return (
    <section data-section="discovery">
      <div data-block="header">
        <span>Discover</span>
      </div>

      {featuredDrivers.length > 0 && (
        <div data-block="drivers">
          <div data-block-label="Featured Drivers" />
          {featuredDrivers.slice(0, 6).map((driver) => (
            <div key={driver.id} data-item="driver">
              <span data-field="name">{driver.first_name} {driver.last_name}</span>
              {driver.primary_discipline && <span data-field="discipline">{driver.primary_discipline}</span>}
            </div>
          ))}
        </div>
      )}

      {featuredStories.length > 0 && (
        <div data-block="stories">
          <div data-block-label="Stories" />
          {featuredStories.slice(0, 3).map((story) => (
            <div key={story.id} data-item="story">
              <span data-field="title">{story.title}</span>
              {story.primary_category && <span data-field="category">{story.primary_category}</span>}
            </div>
          ))}
        </div>
      )}

      {upcomingEvents.length > 0 && (
        <div data-block="events">
          <div data-block-label="Upcoming Events" />
          {upcomingEvents.slice(0, 4).map((event) => (
            <div key={event.id} data-item="event">
              <span data-field="name">{event.name}</span>
              {event.event_date && <span data-field="date">{event.event_date}</span>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}