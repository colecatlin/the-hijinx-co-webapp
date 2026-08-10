import React from 'react';
import { Tent, ParkingCircle, Hotel, Navigation, Utensils, Accessibility, Sparkles, Ticket, CloudRain } from 'lucide-react';

const SECTIONS = [
  { key: 'camping', icon: Tent, label: 'Camping' },
  { key: 'parking', icon: ParkingCircle, label: 'Parking' },
  { key: 'hotels', icon: Hotel, label: 'Hotels' },
  { key: 'directions', icon: Navigation, label: 'Directions' },
  { key: 'food', icon: Utensils, label: 'Food' },
  { key: 'accessibility', icon: Accessibility, label: 'Accessibility' },
  { key: 'amenities', icon: Sparkles, label: 'Amenities' },
  { key: 'weather', icon: CloudRain, label: 'Weather' },
];

export default function TrackVisitorGuide({ track = {} }) {
  const visitorInfo = track.visitor_info || {};
  const hasAny = SECTIONS.some(s => visitorInfo[s.key]) || track.tickets_url;

  if (!hasAny) {
    return (
      <div className="text-center py-12 border border-dashed border-divider rounded-lg">
        <Ticket className="w-8 h-8 mx-auto mb-2 text-foreground-quiet" />
        <p className="text-sm text-foreground-quiet">No visitor information available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {track.visitor_info?.tickets_url && (
        <a href={track.visitor_info.tickets_url} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold transition-all"
          style={{ background: 'hsl(var(--motion))', color: 'hsl(var(--canvas))' }}>
          <Ticket className="w-4 h-4" /> Buy Tickets
        </a>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SECTIONS.map(({ key, icon: Icon, label }) => {
          const value = visitorInfo[key];
          if (!value) return null;
          return (
            <div key={key} className="p-4 rounded-lg border border-divider" style={{ background: 'hsl(var(--surface-interactive) / 0.3)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-motion" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-foreground-secondary">{label}</h3>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}