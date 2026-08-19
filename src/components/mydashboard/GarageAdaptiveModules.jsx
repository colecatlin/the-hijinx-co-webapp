import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import {
  Compass, BookOpen, Calendar, Shirt, Camera, FileText,
  Flag, Users, Wrench, Image, MapPin, Trophy, Handshake, Star,
} from 'lucide-react';

const MOTION = 'hsl(var(--motion))';

function ModuleCard({ icon: Icon, label, sub, to }) {
  return (
    <Link to={to}>
      <div
        className="flex items-center gap-3 p-4 rounded-2xl transition-all duration-200"
        style={{ background: 'hsl(var(--surface-interactive) / 0.3)', border: '1px solid hsl(var(--divider) / 0.6)' }}
        onMouseEnter={e => { e.currentTarget.style.background = `hsl(var(--motion) / 0.08)`; e.currentTarget.style.border = `1px solid ${MOTION} / 0.25)`; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'hsl(var(--surface-interactive) / 0.3)'; e.currentTarget.style.border = '1px solid hsl(var(--divider) / 0.6)'; }}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `hsl(var(--motion) / 0.12)`, color: MOTION }}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>{label}</p>
          <p className="text-xs truncate" style={{ color: 'hsl(var(--foreground-quiet))' }}>{sub}</p>
        </div>
      </div>
    </Link>
  );
}

const MODULE_SETS = {
  driver: [
    { icon: Flag, label: 'Driver Directory', sub: 'Browse all drivers', to: createPageUrl('DriverDirectory') },
    { icon: Calendar, label: 'Events', sub: 'Races & schedules', to: createPageUrl('EventDirectory') },
    { icon: BookOpen, label: 'The Outlet', sub: 'Racing stories', to: createPageUrl('OutletHome') },
    { icon: Compass, label: 'INDEX46', sub: 'Teams, tracks & series', to: createPageUrl('MotorsportsHome') },
  ],
  team: [
    { icon: Users, label: 'Team Directory', sub: 'Browse all teams', to: createPageUrl('TeamDirectory') },
    { icon: Flag, label: 'Drivers', sub: 'Driver grid', to: createPageUrl('DriverDirectory') },
    { icon: Calendar, label: 'Events', sub: 'Race schedule', to: createPageUrl('EventDirectory') },
    { icon: BookOpen, label: 'The Outlet', sub: 'Team coverage', to: createPageUrl('OutletHome') },
  ],
  track: [
    { icon: MapPin, label: 'Track Directory', sub: 'All venues', to: createPageUrl('TrackDirectory') },
    { icon: Calendar, label: 'Events', sub: 'Upcoming races at your venue', to: createPageUrl('EventDirectory') },
    { icon: BookOpen, label: 'Venue Coverage', sub: 'Stories & media', to: createPageUrl('OutletHome') },
    { icon: Compass, label: 'INDEX46', sub: 'Series & racing partners', to: createPageUrl('MotorsportsHome') },
  ],
  series: [
    { icon: Trophy, label: 'Series Home', sub: 'Your series hub', to: createPageUrl('SeriesHome') },
    { icon: Calendar, label: 'Events', sub: 'Season schedule', to: createPageUrl('EventDirectory') },
    { icon: Flag, label: 'Drivers & Teams', sub: 'Series participants', to: createPageUrl('DriverDirectory') },
    { icon: BookOpen, label: 'The Outlet', sub: 'Series coverage', to: createPageUrl('OutletHome') },
  ],
  media: [
    { icon: Camera, label: 'Media Portal', sub: 'Credentials & assets', to: createPageUrl('MediaPortal') },
    { icon: FileText, label: 'Submit a Story', sub: 'Pitch to The Outlet', to: createPageUrl('OutletSubmit') },
    { icon: BookOpen, label: 'The Outlet', sub: 'Browse coverage', to: createPageUrl('OutletHome') },
    { icon: Compass, label: 'INDEX46', sub: 'Explore the grid', to: createPageUrl('MotorsportsHome') },
  ],
  photographer: [
    { icon: Image, label: 'Media Portal', sub: 'Credentials & assets', to: createPageUrl('MediaPortal') },
    { icon: Camera, label: 'Submit a Story', sub: 'Photo essays & content', to: createPageUrl('OutletSubmit') },
    { icon: Calendar, label: 'Events', sub: 'Shoot schedule', to: createPageUrl('EventDirectory') },
    { icon: Compass, label: 'INDEX46', sub: 'Explore the grid', to: createPageUrl('MotorsportsHome') },
  ],
  creator: [
    { icon: Camera, label: 'Media Portal', sub: 'Credentials & content', to: createPageUrl('MediaPortal') },
    { icon: FileText, label: 'Submit a Story', sub: 'Pitch your content', to: createPageUrl('OutletSubmit') },
    { icon: BookOpen, label: 'The Outlet', sub: 'Browse coverage', to: createPageUrl('OutletHome') },
    { icon: Compass, label: 'INDEX46', sub: 'Explore the grid', to: createPageUrl('MotorsportsHome') },
  ],
  builder: [
    { icon: Wrench, label: 'INDEX46', sub: 'Builders & crew', to: createPageUrl('MotorsportsHome') },
    { icon: Flag, label: 'Teams', sub: 'Team directory', to: createPageUrl('TeamDirectory') },
    { icon: Calendar, label: 'Events', sub: 'Upcoming races', to: createPageUrl('EventDirectory') },
    { icon: BookOpen, label: 'The Outlet', sub: 'Tech & builds', to: createPageUrl('OutletHome') },
  ],
  crew: [
    { icon: Users, label: 'Teams', sub: 'Find team connections', to: createPageUrl('TeamDirectory') },
    { icon: Flag, label: 'Drivers', sub: 'Driver grid', to: createPageUrl('DriverDirectory') },
    { icon: Calendar, label: 'Events', sub: 'Event prep & schedule', to: createPageUrl('EventDirectory') },
    { icon: Compass, label: 'INDEX46', sub: 'Find opportunities', to: createPageUrl('MotorsportsHome') },
  ],
  sponsor: [
    { icon: Star, label: 'Driver Directory', sub: 'Partnership opportunities', to: createPageUrl('DriverDirectory') },
    { icon: Users, label: 'Teams', sub: 'Team sponsorship', to: createPageUrl('TeamDirectory') },
    { icon: Compass, label: 'INDEX46', sub: 'Explore the grid', to: createPageUrl('MotorsportsHome') },
    { icon: BookOpen, label: 'The Outlet', sub: 'Brand & culture', to: createPageUrl('OutletHome') },
  ],
  fan: [
    { icon: Compass, label: 'INDEX46', sub: 'Drivers, teams & tracks', to: createPageUrl('MotorsportsHome') },
    { icon: BookOpen, label: 'The Outlet', sub: 'Stories & coverage', to: createPageUrl('OutletHome') },
    { icon: Calendar, label: 'Events', sub: 'Races & schedules', to: createPageUrl('EventDirectory') },
    { icon: Shirt, label: 'Apparel', sub: 'Shop HIJINX CO.', to: createPageUrl('ApparelHome') },
  ],
};

const SECTION_LABELS = {
  media: 'Media & Content',
  photographer: 'Media & Content',
  creator: 'Media & Content',
  driver: 'Racing World',
  team: 'Your Scene',
  track: 'Venue & Events',
  series: 'Series Hub',
  crew: 'Crew & Connections',
  sponsor: 'Brand & Partnerships',
  builder: 'Builds & Garage',
  fan: 'Explore',
};

export default function GarageAdaptiveModules({ primaryProfileType, mode }) {
  const key = (() => {
    if (mode === 'media_user') return 'media';
    if (['entity_owner', 'entity_editor'].includes(mode)) return primaryProfileType || 'driver';
    return primaryProfileType || 'fan';
  })();

  const modules = MODULE_SETS[key] || MODULE_SETS.fan;
  const sectionLabel = SECTION_LABELS[key] || 'Explore';

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: 'hsl(var(--foreground-quiet))' }}>
        {sectionLabel}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {modules.map(m => <ModuleCard key={m.label} {...m} />)}
      </div>
    </div>
  );
}