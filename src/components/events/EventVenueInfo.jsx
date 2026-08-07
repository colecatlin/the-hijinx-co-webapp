import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ExternalLink, Navigation, Car, Tent, Utensils, Accessibility, Ticket } from 'lucide-react';

const SPECTATOR_FIELDS = [
  { key: 'parking', label: 'Parking', icon: Car },
  { key: 'camping', label: 'Camping', icon: Tent },
  { key: 'gates', label: 'Gates', icon: Ticket },
  { key: 'paddock_access', label: 'Paddock Access', icon: Navigation },
  { key: 'food', label: 'Food & Beverage', icon: Utensils },
  { key: 'merchandise', label: 'Merchandise', icon: Utensils },
  { key: 'accessibility', label: 'Accessibility', icon: Accessibility },
  { key: 'pit_access', label: 'Pit Access', icon: Navigation },
  { key: 'fan_zones', label: 'Fan Zones', icon: MapPin },
  { key: 'concerts', label: 'Concerts', icon: Ticket },
  { key: 'special_events', label: 'Special Events', icon: Ticket },
];

export default function EventVenueInfo({ track, spectatorInfo, event }) {
  if (!track && !spectatorInfo) return null;
  return (
    <div className="space-y-6">
      {track && (
        <section className="bg-surface border border-divider rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">{track.name}</h2>
              <div className="flex items-center gap-1 text-sm text-foreground-secondary mt-1">
                <MapPin className="w-3 h-3" />
                {[track.location_city, track.location_state, track.location_country].filter(Boolean).join(', ')}
              </div>
            </div>
            <Link to={track.profile_url || '#'} className="text-xs text-motion hover:underline">View Track Profile →</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {track.track_type && <div><div className="text-xs text-foreground-quiet uppercase">Type</div><div className="text-foreground">{track.track_type}</div></div>}
            {track.surface_type && <div><div className="text-xs text-foreground-quiet uppercase">Surface</div><div className="text-foreground">{track.surface_type}</div></div>}
            {track.length && <div><div className="text-xs text-foreground-quiet uppercase">Length</div><div className="text-foreground">{track.length} mi</div></div>}
            {track.banking && <div><div className="text-xs text-foreground-quiet uppercase">Banking</div><div className="text-foreground">{track.banking}</div></div>}
          </div>
          {track.description && <p className="text-sm text-foreground-secondary mt-4">{track.description}</p>}
          {track.latitude && track.longitude && (
            <div className="mt-4">
              <a
                href={`https://www.google.com/maps?q=${track.latitude},${track.longitude}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs text-motion hover:underline"
              >
                <Navigation className="w-3 h-3" />Get Directions
              </a>
            </div>
          )}
          {track.website_url && (
            <a href={track.website_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs text-motion hover:underline mt-2 ml-4">
              <ExternalLink className="w-3 h-3" />Venue Website
            </a>
          )}
        </section>
      )}

      {spectatorInfo && (
        <section className="bg-surface border border-divider rounded-lg p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Spectator Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SPECTATOR_FIELDS.map(({ key, label, icon: Icon }) => {
              const value = spectatorInfo[key];
              if (!value) return null;
              return (
                <div key={key} className="flex items-start gap-3">
                  <Icon className="w-4 h-4 text-motion flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-foreground-quiet uppercase tracking-wide">{label}</div>
                    <div className="text-sm text-foreground-secondary mt-0.5">{value}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {event?.weather_info?.forecast && (
        <section className="bg-surface border border-divider rounded-lg p-6">
          <h2 className="text-lg font-bold text-foreground mb-2">Weather Forecast</h2>
          <p className="text-sm text-foreground-secondary">{event.weather_info.forecast}</p>
          {event.weather_info.temperature && <p className="text-xs text-foreground-quiet mt-1">{event.weather_info.temperature}</p>}
        </section>
      )}
    </div>
  );
}