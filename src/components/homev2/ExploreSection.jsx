import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

// ExploreSection — static directory links for ecosystem entry points
export default function ExploreSection() {
  const directories = [
    { label: 'Drivers',  page: 'DriverDirectory' },
    { label: 'Teams',    page: 'TeamDirectory' },
    { label: 'Tracks',   page: 'TrackDirectory' },
    { label: 'Series',   page: 'SeriesHome' },
    { label: 'Events',   page: 'EventDirectory' },
  ];

  return (
    <section data-section="explore">
      <div data-block="header">
        <span>Explore</span>
      </div>
      <div data-block="directory-links">
        {directories.map((dir) => (
          <Link key={dir.page} to={createPageUrl(dir.page)} data-item="directory-link">
            {dir.label}
          </Link>
        ))}
      </div>
    </section>
  );
}