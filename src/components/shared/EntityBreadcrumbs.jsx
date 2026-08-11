import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

/**
 * EntityBreadcrumbs — consistent breadcrumb navigation for all entity profile pages.
 * Shows: Home → Directory → Entity Type → Entity Name
 *
 * Props:
 * - entityType: 'Racer' | 'Team' | 'Vehicle' | 'Track' | 'Series' | 'Event' | 'Sponsor' | 'Organization'
 * - entityName: display name of the entity
 * - directoryCat: the Directory category key (e.g. 'drivers', 'teams', 'vehicles')
 */
const TYPE_LABELS = {
  Racer: 'Racers',
  Team: 'Teams',
  Vehicle: 'Vehicles',
  Track: 'Tracks',
  Series: 'Series',
  Event: 'Events',
  Sponsor: 'Sponsors',
  Organization: 'Organizations',
};

const TYPE_CAT_MAP = {
  Racer: 'drivers',
  Team: 'teams',
  Vehicle: 'vehicles',
  Track: 'tracks',
  Series: 'series',
  Event: 'events',
  Sponsor: 'sponsors',
  Organization: 'organizations',
};

export default function EntityBreadcrumbs({ entityType, entityName, directoryCat }) {
  const cat = directoryCat || TYPE_CAT_MAP[entityType] || 'drivers';
  const label = TYPE_LABELS[entityType] || entityType;

  return (
    <nav className="flex items-center gap-1.5 text-xs text-foreground-quiet flex-wrap" aria-label="Breadcrumb">
      <Link to="/Home" className="flex items-center gap-1 hover:text-motion transition-colors">
        <Home className="w-3 h-3" />
        <span className="hidden sm:inline">Home</span>
      </Link>
      <ChevronRight className="w-3 h-3 opacity-50" />
      <Link to="/Directory" className="hover:text-motion transition-colors">Directory</Link>
      <ChevronRight className="w-3 h-3 opacity-50" />
      <Link to={`/Directory?cat=${cat}`} className="hover:text-motion transition-colors">{label}</Link>
      {entityName && (
        <>
          <ChevronRight className="w-3 h-3 opacity-50" />
          <span className="text-foreground-secondary font-medium truncate max-w-[200px]">{entityName}</span>
        </>
      )}
    </nav>
  );
}