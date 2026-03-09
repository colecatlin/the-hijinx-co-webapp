/**
 * components/data/EntityNotFoundState.jsx
 *
 * Shared not-found and unavailable states for public entity profile pages.
 * Keeps messaging consistent across Driver, Team, Track, Series, and Event pages.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertCircle, Lock } from 'lucide-react';
import PageShell from '@/components/shared/PageShell';
import { createPageUrl } from '@/components/utils';

const BACK_LINKS = {
  Driver: { label: '← Back to Drivers', page: 'DriverDirectory' },
  Team:   { label: '← Back to Teams',   page: 'TeamDirectory' },
  Track:  { label: '← Back to Tracks',  page: 'TrackDirectory' },
  Series: { label: '← Back to Series',  page: 'SeriesHome' },
  Event:  { label: '← Back to Events',  page: 'EventDirectory' },
};

/**
 * Render a consistent "not found" state for a public entity page.
 *
 * @param {{ entityType: string }} props
 */
export function EntityNotFound({ entityType = 'Entity' }) {
  const back = BACK_LINKS[entityType] || { label: '← Back', page: 'Home' };
  return (
    <PageShell className="bg-white">
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-800 mb-2">{entityType} not found</h1>
        <p className="text-gray-500 text-sm mb-6">
          This {entityType.toLowerCase()} does not exist or may have been removed.
        </p>
        <Link to={createPageUrl(back.page)}>
          <Button variant="outline">{back.label}</Button>
        </Link>
      </div>
    </PageShell>
  );
}

/**
 * Render a consistent "unavailable" state for a public entity page
 * (record exists but is not published/visible to the current user).
 *
 * @param {{ entityType: string }} props
 */
export function EntityUnavailable({ entityType = 'Entity' }) {
  const back = BACK_LINKS[entityType] || { label: '← Back', page: 'Home' };
  return (
    <PageShell className="bg-white">
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <Lock className="w-10 h-10 text-gray-300 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-800 mb-2">{entityType} not available</h1>
        <p className="text-gray-500 text-sm mb-6">
          This {entityType.toLowerCase()} is not publicly available at this time.
        </p>
        <Link to={createPageUrl(back.page)}>
          <Button variant="outline">{back.label}</Button>
        </Link>
      </div>
    </PageShell>
  );
}