import React from 'react';
import { Link } from 'react-router-dom';
import { Car } from 'lucide-react';

export default function TrackVehicleLeaders({ vehicles = {} }) {
  const { winning_vehicles = [], manufacturer_trends = [] } = vehicles;

  if (!winning_vehicles.length && !manufacturer_trends.length) {
    return (
      <div className="text-center py-12 border border-dashed border-divider rounded-lg">
        <Car className="w-8 h-8 mx-auto mb-2 text-foreground-quiet" />
        <p className="text-sm text-foreground-quiet">No vehicle data at this track yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {winning_vehicles.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-foreground-secondary mb-3">Winning Vehicles</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {winning_vehicles.map((v, idx) => {
              const content = (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-divider hover:border-motion transition-colors" style={{ background: 'hsl(var(--surface-interactive) / 0.3)' }}>
                  {v.vehicle?.profile_image_url ? (
                    <img src={v.vehicle.profile_image_url} alt={v.vehicle.nickname || ''} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0" style={{ background: 'hsl(var(--surface-interactive))' }}>
                      <Car className="w-3.5 h-3.5 text-foreground-quiet" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {v.vehicle?.nickname || `${v.vehicle?.manufacturer || ''} ${v.vehicle?.model || ''}`.trim() || 'Unknown'}
                    </p>
                    <p className="text-xs text-foreground-quiet">{v.manufacturer}</p>
                  </div>
                  <div className="flex gap-3 text-xs text-foreground-quiet flex-shrink-0">
                    <span className="text-motion font-bold">{v.wins}W</span>
                    <span>{v.podiums}P</span>
                    <span>{v.starts}S</span>
                  </div>
                </div>
              );
              return v.vehicle?.profile_url ? (
                <Link key={idx} to={v.vehicle.profile_url}>{content}</Link>
              ) : (
                <div key={idx}>{content}</div>
              );
            })}
          </div>
        </div>
      )}

      {manufacturer_trends.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-foreground-secondary mb-3">Manufacturer Trends</h3>
          <div className="flex flex-wrap gap-2">
            {manufacturer_trends.map((mfr, idx) => (
              <div key={idx} className="px-3 py-2 rounded-lg border border-divider" style={{ background: 'hsl(var(--surface-interactive) / 0.3)' }}>
                <span className="text-sm font-semibold text-foreground">{mfr.manufacturer}</span>
                <span className="text-xs text-foreground-quiet ml-2">{mfr.wins}W · {mfr.podiums}P · {mfr.starts}S</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}