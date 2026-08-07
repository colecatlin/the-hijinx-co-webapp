import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, Trophy, ExternalLink, Ticket, Radio } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isValid } from 'date-fns';

function safeDate(dateStr, fmt = 'MMM d, yyyy') {
  if (!dateStr) return 'TBA';
  try { const d = parseISO(dateStr); return isValid(d) ? format(d, fmt) : 'TBA'; } catch { return 'TBA'; }
}

export default function EventOverview({ event, series, track, statistics, seo }) {
  if (!event) return null;
  return (
    <div className="space-y-6">
      {/* Description */}
      {event.description && (
        <section className="bg-surface border border-divider rounded-lg p-6">
          <p className="text-sm text-foreground-secondary leading-relaxed">{event.description}</p>
        </section>
      )}

      {/* Key Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {track && (
          <div className="bg-surface border border-divider rounded-lg p-6 hover:border-motion/40 transition-colors">
            <div className="text-xs text-foreground-quiet uppercase tracking-wide mb-3 font-medium">Venue</div>
            <Link to={track.profile_url || '#'} className="group">
              <div className="font-bold text-foreground text-lg mb-1 group-hover:text-motion transition-colors">{track.name}</div>
              {track.location_city && (
                <div className="flex items-center gap-1 text-sm text-foreground-secondary">
                  <MapPin className="w-3 h-3" />{[track.location_city, track.location_state].filter(Boolean).join(', ')}
                </div>
              )}
              {track.track_type && <div className="text-xs text-foreground-quiet mt-2">{track.track_type}</div>}
            </Link>
          </div>
        )}
        {series && (
          <div className="bg-surface border border-divider rounded-lg p-6 hover:border-motion/40 transition-colors">
            <div className="text-xs text-foreground-quiet uppercase tracking-wide mb-3 font-medium">Series</div>
            <Link to={series.profile_url || '#'} className="group">
              <div className="font-bold text-foreground text-lg mb-1 group-hover:text-motion transition-colors">{series.name}</div>
              {event.season && <div className="text-sm text-foreground-secondary">Season {event.season}</div>}
            </Link>
          </div>
        )}
        <div className="bg-surface border border-divider rounded-lg p-6">
          <div className="text-xs text-foreground-quiet uppercase tracking-wide mb-3 font-medium">Status</div>
          <Badge className={event.status === 'Live' ? 'bg-success/15 text-success' : event.status === 'Completed' ? 'bg-surface-interactive text-foreground-secondary' : 'bg-motion/15 text-motion'}>{event.status}</Badge>
          <div className="mt-3">
            <div className="text-xs text-foreground-quiet mb-1">Date</div>
            <div className="font-semibold text-foreground text-sm">{safeDate(event.event_date)}{event.end_date && event.end_date !== event.event_date ? ` – ${safeDate(event.end_date)}` : ''}</div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      {statistics && (
        <section className="bg-surface border border-divider rounded-lg p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">At a Glance</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              ['Entries', statistics.total_entries],
              ['Racers', statistics.total_racers],
              ['Teams', statistics.total_teams],
              ['Vehicles', statistics.total_vehicles],
              ['Classes', statistics.total_classes],
              ['Sessions', statistics.total_sessions],
            ].map(([label, val]) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-black text-foreground">{val}</div>
                <div className="text-xs text-foreground-quiet uppercase tracking-wide mt-1">{label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* External Links */}
      <div className="flex flex-wrap gap-3">
        {event.ticket_url && (
          <a href={event.ticket_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-motion text-canvas rounded-lg hover:bg-motion-hover transition-colors">
            <Ticket className="w-4 h-4" />Tickets
          </a>
        )}
        {event.broadcast_url && (
          <a href={event.broadcast_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-divider text-foreground rounded-lg hover:border-motion/40 transition-colors">
            <Radio className="w-4 h-4" />Watch
          </a>
        )}
        {event.registration_url && (
          <a href={event.registration_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-divider text-foreground rounded-lg hover:border-motion/40 transition-colors">
            <ExternalLink className="w-4 h-4" />Register
          </a>
        )}
        {track?.website_url && (
          <a href={track.website_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-divider text-foreground rounded-lg hover:border-motion/40 transition-colors">
            <ExternalLink className="w-4 h-4" />Venue Website
          </a>
        )}
      </div>

      {event.event_notes && (
        <section className="bg-surface border border-divider rounded-lg p-6">
          <h2 className="text-lg font-bold text-foreground mb-3">Notes</h2>
          <p className="text-sm text-foreground-secondary">{event.event_notes}</p>
        </section>
      )}
    </div>
  );
}