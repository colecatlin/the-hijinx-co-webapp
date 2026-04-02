import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { ExternalLink } from 'lucide-react';

export default function FavoritesTab({ formData }) {
  const counts = {
    drivers: (formData?.favorite_drivers || []).length,
    teams: (formData?.favorite_teams || []).length,
    series: (formData?.favorite_series || []).length,
    tracks: (formData?.favorite_tracks || []).length,
  };
  const total = counts.drivers + counts.teams + counts.series + counts.tracks;

  return (
    <div className="space-y-4">
      {total === 0 ? (
        <p className="text-sm text-gray-500">
          You haven't followed any drivers, teams, tracks, or series yet. Visit their pages to follow them.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {counts.drivers > 0 && (
            <span className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-medium">
              {counts.drivers} Driver{counts.drivers !== 1 ? 's' : ''}
            </span>
          )}
          {counts.teams > 0 && (
            <span className="px-3 py-1.5 text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-lg font-medium">
              {counts.teams} Team{counts.teams !== 1 ? 's' : ''}
            </span>
          )}
          {counts.series > 0 && (
            <span className="px-3 py-1.5 text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-lg font-medium">
              {counts.series} Series
            </span>
          )}
          {counts.tracks > 0 && (
            <span className="px-3 py-1.5 text-xs bg-green-50 text-green-700 border border-green-200 rounded-lg font-medium">
              {counts.tracks} Track{counts.tracks !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        {[
          { label: 'Browse Drivers', page: 'DriverDirectory' },
          { label: 'Browse Teams', page: 'TeamDirectory' },
          { label: 'Browse Series', page: 'SeriesHome' },
          { label: 'Browse Tracks', page: 'TrackDirectory' },
        ].map(({ label, page }) => (
          <Link key={page} to={createPageUrl(page)}>
            <span className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors">
              <ExternalLink className="w-3 h-3" /> {label}
            </span>
          </Link>
        ))}
      </div>

      <p className="text-xs text-gray-400">
        Personalized content based on your follows is coming soon.
      </p>
    </div>
  );
}