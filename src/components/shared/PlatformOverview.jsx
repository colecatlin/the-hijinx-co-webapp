import React from 'react';
import { Compass, Gauge, Newspaper, Layers } from 'lucide-react';

/**
 * PlatformOverview — reusable component explaining how Hijinx, INDEX46,
 * RaceCore, and The Outlet fit together as one ecosystem.
 *
 * Props:
 *   variant: 'full' | 'compact'  (default: 'full')
 */
const PLATFORM_PARTS = [
  {
    name: 'Hijinx',
    icon: Layers,
    description: 'The platform company. We build at the intersection of media, motorsports, and culture — connecting drivers, teams, tracks, series, media creators, and fans in one place.',
  },
  {
    name: 'INDEX46',
    icon: Compass,
    description: 'Our public directory — the searchable home for every racer, team, track, and series on the platform. Browse profiles, check results, and follow the entities you care about.',
  },
  {
    name: 'RaceCore',
    icon: Gauge,
    description: 'Our operational management system for race events. The toolset that tracks, series, and event organizers use to manage entries, sessions, results, and standings. Most users see RaceCore data through public profile pages.',
  },
  {
    name: 'The Outlet',
    icon: Newspaper,
    description: 'Our editorial and media surface — where stories, features, and media coverage from the motorsports world are published. Home to our journalism, creator content, and editorial features.',
  },
];

export default function PlatformOverview({ variant = 'full' }) {
  if (variant === 'compact') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PLATFORM_PARTS.map(part => {
          const Icon = part.icon;
          return (
            <div key={part.name} className="p-4 rounded-xl" style={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--divider))' }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" style={{ color: 'hsl(var(--motion))' }} />
                <h4 className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>{part.name}</h4>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'hsl(var(--foreground-secondary))' }}>{part.description}</p>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--foreground-secondary))' }}>
        Hijinx is one platform with three connected surfaces. Here's how they fit together:
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PLATFORM_PARTS.map(part => {
          const Icon = part.icon;
          return (
            <div key={part.name} className="p-5 rounded-xl" style={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--divider))' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'hsl(var(--motion) / 0.12)' }}>
                  <Icon className="w-4 h-4" style={{ color: 'hsl(var(--motion))' }} />
                </div>
                <h4 className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>{part.name}</h4>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'hsl(var(--foreground-secondary))' }}>{part.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}