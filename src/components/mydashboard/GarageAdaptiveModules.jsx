import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Compass, BookOpen, Calendar, Shirt, Camera, FileText, Flag, Users, Wrench, Image } from 'lucide-react';

const TEAL = '#1DA1A1';

function ModuleCard({ icon: Icon, label, sub, to, accentColor = TEAL }) {
  return (
    <Link to={to}>
      <div
        className="flex items-center gap-3 p-4 rounded-2xl transition-all duration-200 group"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(29,161,161,0.06)';
          e.currentTarget.style.border = '1px solid rgba(29,161,161,0.2)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
          e.currentTarget.style.border = '1px solid rgba(255,255,255,0.06)';
        }}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(29,161,161,0.12)', color: accentColor }}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white">{label}</p>
          <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{sub}</p>
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
  team: [
    { icon: Users, label: 'Team Directory', sub: 'Browse all teams', to: createPageUrl('TeamDirectory') },
    { icon: Flag, label: 'Drivers', sub: 'Driver grid', to: createPageUrl('DriverDirectory') },
    { icon: Calendar, label: 'Events', sub: 'Race schedule', to: createPageUrl('EventDirectory') },
    { icon: BookOpen, label: 'The Outlet', sub: 'Team coverage', to: createPageUrl('OutletHome') },
  ],
  builder: [
    { icon: Wrench, label: 'INDEX46', sub: 'Builders & crew', to: createPageUrl('MotorsportsHome') },
    { icon: Flag, label: 'Teams', sub: 'Team directory', to: createPageUrl('TeamDirectory') },
    { icon: Calendar, label: 'Events', sub: 'Upcoming races', to: createPageUrl('EventDirectory') },
    { icon: BookOpen, label: 'The Outlet', sub: 'Tech & builds', to: createPageUrl('OutletHome') },
  ],
  fan: [
    { icon: Compass, label: 'INDEX46', sub: 'Drivers, teams & tracks', to: createPageUrl('MotorsportsHome') },
    { icon: BookOpen, label: 'The Outlet', sub: 'Stories & coverage', to: createPageUrl('OutletHome') },
    { icon: Calendar, label: 'Events', sub: 'Races & schedules', to: createPageUrl('EventDirectory') },
    { icon: Shirt, label: 'Apparel', sub: 'Shop HIJINX CO.', to: createPageUrl('ApparelHome') },
  ],
};

export default function GarageAdaptiveModules({ primaryProfileType, mode }) {
  // For entity owners / editors / media users with permission — use mode-based key
  // Otherwise use primary_profile_type
  const key = (() => {
    if (mode === 'media_user') return 'media';
    if (['entity_owner', 'entity_editor'].includes(mode)) return primaryProfileType || 'driver';
    return primaryProfileType || 'fan';
  })();

  const modules = MODULE_SETS[key] || MODULE_SETS.fan;
  const sectionLabel = (() => {
    if (mode === 'media_user' || key === 'media' || key === 'photographer' || key === 'creator') return 'Media & Content';
    if (key === 'driver' || mode === 'entity_owner' || mode === 'entity_editor') return 'Racing World';
    if (key === 'team') return 'Your Scene';
    return 'Explore';
  })();

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: 'rgba(255,255,255,0.3)' }}>
        {sectionLabel}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {modules.map(m => <ModuleCard key={m.label} {...m} />)}
      </div>
    </div>
  );
}