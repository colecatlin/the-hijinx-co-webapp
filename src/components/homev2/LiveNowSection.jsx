import React from 'react';

// LiveNowSection — shows recent activity feed items in a compact rail
// Props: feedItems (formatted activity_feed)
export default function LiveNowSection({ feedItems = [] }) {
  if (!feedItems.length) return null;

  return (
    <section data-section="live-now">
      <div data-block="header">
        <span>Live Now</span>
      </div>
      <div data-block="feed-items">
        {feedItems.map((item, i) => (
          <div key={item.id || i} data-block="feed-item">
            <span data-field="label">{item.label || item.title || 'Activity'}</span>
            {item.subtitle && <span data-field="subtitle">{item.subtitle}</span>}
            {item.time && <span data-field="time">{item.time}</span>}
          </div>
        ))}
      </div>
    </section>
  );
}