import React from 'react';

// SpotlightSection — highlights a featured driver, event, and story
// Props: spotlightDriver, spotlightEvent, featuredStory
export default function SpotlightSection({ spotlightDriver, spotlightEvent, featuredStory }) {
  const hasContent = spotlightDriver || spotlightEvent || featuredStory;
  if (!hasContent) return null;

  return (
    <section data-section="spotlight">
      <div data-block="header">
        <span>Spotlight</span>
      </div>

      <div data-block="spotlight-grid">
        {spotlightDriver && (
          <div data-item="driver-spotlight">
            <span data-field="label">Driver Spotlight</span>
            <span data-field="name">{spotlightDriver.first_name} {spotlightDriver.last_name}</span>
            {spotlightDriver.tagline && <span data-field="tagline">{spotlightDriver.tagline}</span>}
            {(spotlightDriver.profile_image_url || spotlightDriver.hero_image_url) && (
              <img
                src={spotlightDriver.profile_image_url || spotlightDriver.hero_image_url}
                alt={`${spotlightDriver.first_name} ${spotlightDriver.last_name}`}
                data-field="image"
              />
            )}
          </div>
        )}

        {spotlightEvent && (
          <div data-item="event-spotlight">
            <span data-field="label">Event Spotlight</span>
            <span data-field="name">{spotlightEvent.name}</span>
            {spotlightEvent.event_date && <span data-field="date">{spotlightEvent.event_date}</span>}
          </div>
        )}

        {featuredStory && (
          <div data-item="story-spotlight">
            <span data-field="label">Featured Story</span>
            <span data-field="title">{featuredStory.title}</span>
            {featuredStory.subtitle && <span data-field="subtitle">{featuredStory.subtitle}</span>}
          </div>
        )}
      </div>
    </section>
  );
}