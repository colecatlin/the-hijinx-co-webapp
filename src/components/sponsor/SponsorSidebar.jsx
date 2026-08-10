import React from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Handshake, Users, Car, Trophy, Calendar,
  MapPin, Image, Zap, Clock, BarChart3, Package, Info,
} from 'lucide-react';

const SECTIONS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'partnerships', label: 'Partnerships', icon: Handshake },
  { key: 'racers', label: 'Racers', icon: Users },
  { key: 'teams', label: 'Teams', icon: Users },
  { key: 'vehicles', label: 'Vehicles', icon: Car },
  { key: 'series', label: 'Series', icon: Trophy },
  { key: 'events', label: 'Events', icon: Calendar },
  { key: 'tracks', label: 'Tracks', icon: MapPin },
  { key: 'media', label: 'Media', icon: Image },
  { key: 'activations', label: 'Activations', icon: Zap },
  { key: 'timeline', label: 'Timeline', icon: Clock },
  { key: 'statistics', label: 'Statistics', icon: BarChart3 },
  { key: 'assets', label: 'Assets', icon: Package },
  { key: 'about', label: 'About', icon: Info },
];

export default function SponsorSidebar({ entityId, activeSection, statistics }) {
  const buildPath = (key) => key === 'overview'
    ? `/organization/Sponsor/${entityId}`
    : `/organization/Sponsor/${entityId}/${key}`;

  return (
    <aside className="w-full lg:w-56 flex-shrink-0">
      <nav className="space-y-0.5 p-2 rounded-xl sticky top-20" style={{ background: 'hsl(var(--surface) / 0.6)', border: '1px solid hsl(var(--divider))' }}>
        {SECTIONS.map(s => {
          const Icon = s.icon;
          const isActive = activeSection === s.key;
          const count = getSectionCount(s.key, statistics);
          return (
            <Link
              key={s.key}
              to={buildPath(s.key)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all"
              style={{
                background: isActive ? 'hsl(var(--motion) / 0.12)' : 'transparent',
                color: isActive ? 'hsl(var(--motion))' : 'hsl(var(--foreground-secondary))',
                fontWeight: isActive ? 700 : 500,
              }}
            >
              <Icon className="w-4 h-4 flex-shrink-0" style={{ color: isActive ? 'hsl(var(--motion))' : 'hsl(var(--foreground-quiet))' }} />
              <span className="flex-1">{s.label}</span>
              {count > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'hsl(var(--surface-interactive))', color: 'hsl(var(--foreground-quiet))' }}>
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function getSectionCount(key, stats) {
  if (!stats) return 0;
  const map = {
    partnerships: stats.active_sponsorships,
    racers: stats.current_racers,
    teams: stats.current_teams,
    vehicles: stats.current_vehicles,
    series: stats.current_series,
    events: stats.current_events,
    tracks: stats.current_tracks,
    media: stats.public_media_count,
    activations: stats.total_activations,
    assets: stats.asset_count,
  };
  return map[key] || 0;
}