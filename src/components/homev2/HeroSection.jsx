import React from 'react';

// HeroSection — entry point of the homepage
// Props: stats (hero_stats from hp), featuredDrivers, featuredStory
export default function HeroSection({ stats, featuredDrivers, featuredStory }) {
  return (
    <section data-section="hero">
      <div>
        <h1>Motorsports, Culture, and Competition</h1>
        <p>HIJINX — the platform where motorsports, media, and culture collide.</p>
      </div>

      {stats && (
        <div data-block="stats">
          {stats.driver_count != null && <div data-stat="drivers">{stats.driver_count} Drivers</div>}
          {stats.series_count != null && <div data-stat="series">{stats.series_count} Series</div>}
          {stats.track_count  != null && <div data-stat="tracks">{stats.track_count} Tracks</div>}
          {stats.event_count  != null && <div data-stat="events">{stats.event_count} Events</div>}
        </div>
      )}

      {featuredStory && (
        <div data-block="featured-story-preview">
          <span>Featured Story</span>
          <div>{featuredStory.title}</div>
        </div>
      )}
    </section>
  );
}