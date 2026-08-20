import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Shared search-results grid used by both the desktop inline search panel
 * and the mobile full-screen search overlay. Renders categorized result
 * links (stories, racers, events, tracks, series, teams, vehicles, media,
 * sponsors) from the cached filter output computed in Layout.
 */
export default function SearchResultsGrid({ results, onNavigate }) {
  const hasResults = results && Object.values(results).some((arr) => arr.length > 0);
  if (!hasResults) return null;

  const section = (label, items, renderTo, renderLabel) => (
    <div>
      <p className="font-mono text-[9px] tracking-[0.35em] mb-2" style={{ color: 'hsl(var(--motion))' }}>{label}</p>
      <div className="space-y-0.5">
        {items.map((item) => (
          <Link
            key={item.id}
            to={renderTo(item)}
            onClick={onNavigate}
            className="block px-2 py-1.5 rounded-lg text-xs transition-all truncate"
            style={{ color: 'hsl(var(--foreground-secondary) / 0.75)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'hsl(var(--foreground))'; e.currentTarget.style.background = 'hsl(var(--surface-interactive) / 0.5)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'hsl(var(--foreground-secondary) / 0.75)'; e.currentTarget.style.background = 'transparent'; }}
          >
            {renderLabel(item)}
          </Link>
        ))}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
      {results.stories?.length > 0 && section('STORIES', results.stories,
        (s) => (s.slug ? `/story/${s.slug}` : `/OutletStoryPage?id=${s.id}`),
        (s) => s.title)}
      {results.drivers?.length > 0 && section('RACERS', results.drivers,
        (rp) => (rp.slug ? `/racers/${rp.slug}` : `/Directory?cat=racers`),
        (rp) => rp.display_name)}
      {results.events?.length > 0 && section('EVENTS', results.events,
        (e) => (e.slug || e.canonical_slug ? `/events/${e.slug || e.canonical_slug}` : `/EventProfile?id=${e.id}`),
        (e) => e.name)}
      {results.tracks?.length > 0 && section('TRACKS', results.tracks,
        (t) => (t.slug || t.canonical_slug ? `/tracks/${t.slug || t.canonical_slug}` : `/TrackProfile?id=${t.id}`),
        (t) => t.name)}
      {results.series?.length > 0 && section('SERIES', results.series,
        (s) => (s.slug ? `/series/${s.slug}` : `/SeriesDetail?id=${s.id}`),
        (s) => s.name)}
      {results.teams?.length > 0 && section('TEAMS', results.teams,
        (t) => `/TeamProfile?id=${t.id}`,
        (t) => t.name)}
      {results.vehicles?.length > 0 && section('VEHICLES', results.vehicles,
        (v) => (v.slug ? `/vehicles/${v.slug}` : `/VehicleProfile?id=${v.id}`),
        (v) => v.nickname || `${v.manufacturer || ''} ${v.model || ''}`.trim() || 'Vehicle')}
      {results.media?.length > 0 && section('MEDIA', results.media,
        (a) => `/media/${a.id}`,
        (a) => <>{a.title || a.file_name || 'Untitled'} <span className="text-[9px] uppercase opacity-50">· {a.asset_type}</span></>)}
      {results.sponsors?.length > 0 && section('SPONSORS', results.sponsors,
        (o) => `/organization/Sponsor/${o.id}`,
        (o) => <>{o.name} {o.industry ? <span className="text-[9px] uppercase opacity-50">· {o.industry}</span> : null}</>)}
    </div>
  );
}