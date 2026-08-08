import React from 'react';
import { Link } from 'react-router-dom';
import { Globe, Instagram, Twitter, Youtube, Facebook, Trophy, Calendar, Users, Flag, ExternalLink, Ticket } from 'lucide-react';
import CompetitionLevelBadge from '@/components/competition/CompetitionLevelBadge';
import GeographicScopeTag from '@/components/competition/GeographicScopeTag';
import { Badge } from '@/components/ui/badge';

export default function SeriesOverview({ series, statistics, currentSeason, schedule, champions }) {
  const displayLevel = series.override_competition_level || series.derived_competition_level;
  const isOverride = !!series.override_competition_level;
  const upcomingEvent = schedule.find(e => ['Published', 'Live'].includes(e.status));
  const previousEvent = [...schedule].reverse().find(e => e.status === 'Completed');
  const currentChampion = champions[0];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Badges */}
          {(displayLevel || series.geographic_scope) && (
            <div className="flex items-center gap-2 flex-wrap">
              {displayLevel && <CompetitionLevelBadge level={displayLevel} isOverride={isOverride} size="md" />}
              {series.geographic_scope && <GeographicScopeTag scope={series.geographic_scope} size="md" />}
              {isOverride && series.override_reason && <span className="text-xs text-foreground-quiet italic">Override: {series.override_reason}</span>}
            </div>
          )}

          {/* Core info card */}
          <div className="bg-surface-elevated border border-divider rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                {series.discipline && <div className="mb-3"><div className="text-xs text-foreground-quiet mb-1">Discipline</div><div className="font-semibold text-foreground">{series.discipline}</div></div>}
                {series.sanctioning_body && <div className="mb-3"><div className="text-xs text-foreground-quiet mb-1">Sanctioning Body</div><div className="font-semibold text-foreground">{series.sanctioning_body}</div></div>}
                {series.full_name && series.full_name !== series.name && <div className="mb-3"><div className="text-xs text-foreground-quiet mb-1">Official Name</div><div className="font-semibold text-foreground">{series.full_name}</div></div>}
              </div>
              <div>
                {currentSeason && <div className="mb-3"><div className="text-xs text-foreground-quiet mb-1">Current Season</div><div className="font-semibold text-foreground">{currentSeason}</div></div>}
                <div className="mb-3"><div className="text-xs text-foreground-quiet mb-1">Events</div><div className="font-semibold text-foreground">{statistics?.events_count ?? 0}</div></div>
                <div className="mb-3"><div className="text-xs text-foreground-quiet mb-1">Classes</div><div className="font-semibold text-foreground">{statistics?.classes_count ?? 0}</div></div>
              </div>
            </div>
            {(series.bio || series.description) && <p className="text-foreground-secondary leading-relaxed mt-4">{series.bio || series.description}</p>}
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge className={series.operational_status === 'Active' ? 'bg-motion/15 text-motion' : 'bg-surface-interactive text-foreground-secondary'}>{series.operational_status}</Badge>
            </div>
          </div>

          {/* Quick stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={Calendar} label="Events" value={statistics?.events_count ?? 0} />
            <StatCard icon={Flag} label="Classes" value={statistics?.classes_count ?? 0} />
            <StatCard icon={Users} label="Racers" value={statistics?.racers_count ?? 0} />
            <StatCard icon={Trophy} label="Champions" value={statistics?.championships_count ?? 0} />
          </div>

          {/* Links */}
          {(series.website_url || series.registration_url || series.rules_url || series.broadcast_url) && (
            <div className="bg-surface-elevated border border-divider rounded-lg p-4 flex flex-wrap gap-3">
              {series.website_url && <LinkBtn href={series.website_url} icon={Globe} label="Website" />}
              {series.registration_url && <LinkBtn href={series.registration_url} icon={Ticket} label="Registration" />}
              {series.rules_url && <LinkBtn href={series.rules_url} icon={ExternalLink} label="Rulebook" />}
              {series.broadcast_url && <LinkBtn href={series.broadcast_url} icon={Youtube} label="Broadcast" />}
            </div>
          )}

          {/* Title sponsor */}
          {series.title_sponsor_name && (
            <div className="bg-surface-elevated border border-divider rounded-lg p-4 flex items-center gap-3">
              <span className="text-xs text-foreground-quiet uppercase tracking-widest font-medium">Presented by</span>
              {series.title_sponsor_logo_url
                ? <img src={series.title_sponsor_logo_url} alt={series.title_sponsor_name} className="h-5 object-contain" />
                : <span className="text-sm font-bold text-foreground">{series.title_sponsor_name}</span>}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Logo */}
          {series.logo_url ? (
            <div className="bg-surface-elevated border border-divider rounded-lg flex items-center justify-center p-6">
              <img src={series.logo_url} alt={series.name} className="max-w-full max-h-40 object-contain" />
            </div>
          ) : (
            <div className="bg-surface-elevated border border-divider rounded-lg flex items-center justify-center p-8">
              <div className="text-center text-foreground-quiet">
                <div className="text-4xl font-black mb-1">{(series.name || '').substring(0, 3).toUpperCase()}</div>
                <div className="text-xs">No logo</div>
              </div>
            </div>
          )}

          {/* Social links */}
          {(series.social_instagram || series.social_x || series.social_youtube || series.social_facebook) && (
            <div className="bg-surface-elevated border border-divider rounded-lg p-4">
              <div className="text-xs text-foreground-quiet uppercase tracking-widest font-medium mb-3">Follow</div>
              <div className="flex gap-3">
                {series.social_instagram && <SocialLink href={`https://instagram.com/${series.social_instagram.replace('@', '')}`} icon={Instagram} />}
                {series.social_x && <SocialLink href={`https://x.com/${series.social_x.replace('@', '')}`} icon={Twitter} />}
                {series.social_youtube && <SocialLink href={series.social_youtube} icon={Youtube} />}
                {series.social_facebook && <SocialLink href={series.social_facebook} icon={Facebook} />}
              </div>
            </div>
          )}

          {/* Next event */}
          {upcomingEvent && (
            <div className="bg-surface-elevated border border-divider rounded-lg p-4">
              <div className="text-xs text-foreground-quiet uppercase tracking-widest font-medium mb-2">Next Event</div>
              <Link to={upcomingEvent.profile_url} className="block hover:text-motion transition-colors">
                <div className="font-semibold text-foreground">{upcomingEvent.name}</div>
                <div className="text-sm text-foreground-secondary mt-1">{upcomingEvent.track?.name || 'TBA'}</div>
                <div className="text-xs text-foreground-quiet mt-1">{upcomingEvent.event_date}</div>
              </Link>
            </div>
          )}

          {/* Last event */}
          {previousEvent && (
            <div className="bg-surface-elevated border border-divider rounded-lg p-4">
              <div className="text-xs text-foreground-quiet uppercase tracking-widest font-medium mb-2">Last Event</div>
              <Link to={previousEvent.profile_url} className="block hover:text-motion transition-colors">
                <div className="font-semibold text-foreground">{previousEvent.name}</div>
                <div className="text-sm text-foreground-secondary mt-1">{previousEvent.track?.name || 'TBA'}</div>
                {previousEvent.winner && <div className="text-xs text-motion mt-1">Winner: {previousEvent.winner.racer.display_name}</div>}
              </Link>
            </div>
          )}

          {/* Current champion */}
          {currentChampion && (
            <div className="bg-surface-elevated border border-divider rounded-lg p-4">
              <div className="text-xs text-foreground-quiet uppercase tracking-widest font-medium mb-2">Reigning Champion</div>
              {currentChampion.racer?.profile_url ? (
                <Link to={currentChampion.racer.profile_url} className="block hover:text-motion transition-colors">
                  <div className="font-semibold text-foreground">{currentChampion.racer.display_name}</div>
                </Link>
              ) : (
                <div className="font-semibold text-foreground">{currentChampion.racer?.display_name || 'N/A'}</div>
              )}
              <div className="text-xs text-foreground-quiet mt-1">{currentChampion.season_year} {currentChampion.class_name || 'Overall'}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-surface-elevated border border-divider rounded-lg p-4">
      <Icon className="w-4 h-4 text-motion mb-2" />
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-foreground-quiet">{label}</div>
    </div>
  );
}

function LinkBtn({ href, icon: Icon, label }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-medium text-motion hover:text-motion-hover transition-colors">
      <Icon className="w-3.5 h-3.5" />{label}
    </a>
  );
}

function SocialLink({ href, icon: Icon }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-foreground-quiet hover:text-motion transition-colors">
      <Icon className="w-4 h-4" />
    </a>
  );
}