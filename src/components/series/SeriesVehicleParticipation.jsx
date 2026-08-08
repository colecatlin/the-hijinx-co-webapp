import React from 'react';
import { Link } from 'react-router-dom';
import { Car } from 'lucide-react';

export default function SeriesVehicleParticipation({ vehicles }) {
  if (!vehicles || vehicles.length === 0) {
    return (
      <div className="bg-surface-elevated border border-divider rounded-lg p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Vehicle Participation</h2>
        <p className="text-foreground-quiet text-sm">No vehicles registered for this season yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-elevated border border-divider rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Car className="w-4 h-4 text-motion" />
        <h2 className="text-xl font-bold text-foreground">Vehicle Participation</h2>
        <span className="text-sm text-foreground-quiet">({vehicles.length})</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {vehicles.map(v => (
          <div key={v.vehicle_id} className="border border-divider rounded-lg p-3 hover:border-motion/40 transition-colors">
            <div className="flex items-center gap-3">
              {v.profile_image_url ? (
                <img src={v.profile_image_url} alt={v.nickname || v.manufacturer || 'Vehicle'} className="w-10 h-10 rounded object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded bg-surface-interactive flex items-center justify-center flex-shrink-0">
                  <Car className="w-4 h-4 text-foreground-quiet" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                {v.profile_url ? (
                  <Link to={v.profile_url} className="font-semibold text-foreground hover:text-motion transition-colors truncate block">
                    {v.nickname || `${v.manufacturer || ''} ${v.model || ''}`.trim() || 'Vehicle'}
                  </Link>
                ) : (
                  <div className="font-semibold text-foreground truncate">{v.nickname || `${v.manufacturer || ''} ${v.model || ''}`.trim() || 'Vehicle'}</div>
                )}
                <div className="text-xs text-foreground-quiet">
                  {v.manufacturer} {v.model}{v.year ? ` ${v.year}` : ''}
                </div>
              </div>
            </div>
            {v.racer?.display_name && (
              <div className="text-xs text-foreground-quiet mt-2">Driver: {v.racer.display_name}</div>
            )}
            {v.team?.name && (
              <div className="text-xs text-foreground-quiet">Team: {v.team.name}</div>
            )}
            <div className="flex gap-3 mt-2 text-xs">
              <span className="text-foreground-quiet">{v.starts} starts</span>
              {v.wins > 0 && <span className="text-motion">{v.wins}W</span>}
              {v.podiums > 0 && <span className="text-foreground-quiet">{v.podiums} podiums</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}