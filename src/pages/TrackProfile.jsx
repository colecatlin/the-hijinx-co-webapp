import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { applyExperienceQueryOptions } from '@/components/utils/queryDefaults';
import PageShell from '@/components/shared/PageShell';
import MobileBackHeader from '@/components/shared/MobileBackHeader';
import { EntityNotFound, EntityUnavailable } from '@/components/data/EntityNotFoundState';
import { Skeleton } from '@/components/ui/skeleton';
import SeoMeta, { buildEntityTitle, SITE_FALLBACK_IMAGE } from '@/components/system/seoMeta';
import SocialShareButtons from '@/components/shared/SocialShareButtons';
import ProfileClaimFooter from '@/components/onboarding/ProfileClaimFooter';
import { MapPin, Calendar, Trophy, Flag, BarChart3, Users, Car, Clock, History, Award, Image as ImageIcon, Info, Globe, Phone, Mail, Ruler, Navigation, Handshake } from 'lucide-react';
import EntitySponsorsTab from '@/components/shared/EntitySponsorsTab';
import EntityBreadcrumbs from '@/components/shared/EntityBreadcrumbs';

import TrackTimeline from '@/components/tracks/TrackTimeline';
import TrackRecordsGrid from '@/components/tracks/TrackRecordsGrid';
import TrackStatisticsBreakdown from '@/components/tracks/TrackStatisticsBreakdown';
import TrackChampionsPanel from '@/components/tracks/TrackChampionsPanel';
import TrackRacerLeaders from '@/components/tracks/TrackRacerLeaders';
import TrackTeamLeaders from '@/components/tracks/TrackTeamLeaders';
import TrackVehicleLeaders from '@/components/tracks/TrackVehicleLeaders';
import TrackGallery from '@/components/tracks/TrackGallery';
import TrackVisitorGuide from '@/components/tracks/TrackVisitorGuide';
import TrackCompletenessIndicator from '@/components/tracks/TrackCompletenessIndicator';
import TrackMapPanel from '@/components/tracks/TrackMapPanel';

const TABS = [
  { id: 'overview', label: 'Overview', icon: MapPin },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'history', label: 'History', icon: History },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'records', label: 'Records', icon: Award },
  { id: 'champions', label: 'Champions', icon: Trophy },
  { id: 'racers', label: 'Racers', icon: Users },
  { id: 'teams', label: 'Teams', icon: Flag },
  { id: 'vehicles', label: 'Vehicles', icon: Car },
  { id: 'media', label: 'Gallery', icon: ImageIcon },
  { id: 'visitor', label: 'Visitor Info', icon: Info },
  { id: 'statistics', label: 'Statistics', icon: BarChart3 },
  { id: 'sponsors', label: 'Sponsors', icon: Handshake },
];

export function TrackProfileRouteWrapper() {
  const { slug } = useParams();
  return <TrackProfile overrideSlug={slug} />;
}

export default function TrackProfile({ overrideSlug } = {}) {
  const [searchParams] = useSearchParams();
  const trackSlug = overrideSlug || (searchParams.get('slug') || searchParams.get('id') || '').trim() || null;
  const [activeTab, setActiveTab] = useState('overview');

  const { data: experienceData, isLoading } = useQuery(applyExperienceQueryOptions({
    queryKey: ['trackExperience', trackSlug],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke('getTrackExperience', { slug: trackSlug });
        return res.data;
      } catch {
        return null;
      }
    },
    enabled: !!trackSlug,
  }));

  useEffect(() => {
    if (experienceData?.track) {
      base44.analytics.track({ eventName: 'track_profile_view', properties: { trackId: experienceData.track.id, trackName: experienceData.track.name } });
    }
  }, [experienceData?.track?.id]);

  if (isLoading) {
    return (
      <PageShell>
        <div className="max-w-7xl mx-auto px-6 py-12 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </PageShell>
    );
  }

  if (!experienceData?.track) return <EntityNotFound entityType="Track" />;

  const track = experienceData.track;
  const location = [track.location_city, track.location_state, track.location_country].filter(Boolean).join(', ');
  const heroImage = track.hero_image_url || track.image_url;

  return (
    <PageShell>
      <SeoMeta
        title={buildEntityTitle(track.name, 'Track Profile')}
        description={experienceData.seo?.description || track.bio || track.description || `${track.name} track profile on HIJINX.`}
        image={experienceData.seo?.image || heroImage || SITE_FALLBACK_IMAGE}
      />

      {/* Mobile back header */}
      <MobileBackHeader title={track.name} />

      {/* Hero */}
      {heroImage ? (
        <div className="relative h-[340px] overflow-hidden">
          <img src={heroImage} alt={track.name} className="w-full h-full object-cover" decoding="async" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, hsl(var(--canvas) / 0.95) 0%, hsl(var(--canvas) / 0.3) 60%, transparent 100%)' }} />
          <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-6 pb-6">
            <h1 className="text-4xl font-black text-foreground drop-shadow-lg">{track.name}</h1>
            {location && (
              <div className="flex items-center gap-1.5 text-foreground-secondary mt-1 text-sm">
                <MapPin className="w-3.5 h-3.5" /> {location}
              </div>
            )}
            {track.tagline && <p className="text-sm text-foreground-secondary mt-2 italic">{track.tagline}</p>}
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-6 pt-6">
          <h1 className="text-4xl font-black text-foreground">{track.name}</h1>
          {location && (
            <div className="flex items-center gap-1.5 text-foreground-secondary mt-1 text-sm">
              <MapPin className="w-3.5 h-3.5" /> {location}
            </div>
          )}
          {track.tagline && <p className="text-sm text-foreground-secondary mt-2 italic">{track.tagline}</p>}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Share bar */}
        <div className="flex items-center justify-between mb-4">
          <EntityBreadcrumbs entityType="Track" entityName={track.name} />
          <SocialShareButtons url={window.location.href} title={`${track.name} — Track Profile`} description={experienceData.seo?.description || track.bio || track.description || ''} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-divider mb-6 scrollbar-hide">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex items-center gap-1.5 px-3 py-3 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px"
              style={{
                color: activeTab === id ? 'hsl(var(--motion))' : 'hsl(var(--foreground-quiet))',
                borderColor: activeTab === id ? 'hsl(var(--motion))' : 'transparent',
              }}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2">
            {/* Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {(track.bio || track.description) && (
                  <div className="p-5 rounded-lg border border-divider" style={{ background: 'hsl(var(--surface-interactive) / 0.3)' }}>
                    <p className="text-foreground leading-relaxed text-sm">{track.bio || track.description}</p>
                  </div>
                )}

                {/* Specs */}
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-foreground-secondary mb-3">Track Specs</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {track.track_type && <SpecCard label="Type" value={track.track_type} />}
                    {track.surface_type && <SpecCard label="Surface" value={track.surface_type} />}
                    {track.length && <SpecCard label="Length" value={`${track.length} mi`} icon={Ruler} />}
                    {track.banking && <SpecCard label="Banking" value={track.banking} />}
                    {track.configuration && <SpecCard label="Configuration" value={track.configuration} />}
                    {track.capacity && <SpecCard label="Capacity" value={track.capacity.toLocaleString()} />}
                    {track.elevation && <SpecCard label="Elevation" value={track.elevation} />}
                    {track.time_zone && <SpecCard label="Time Zone" value={track.time_zone} />}
                  </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-3">
                  <StatTile label="Events" value={experienceData.statistics?.total_events || 0} />
                  <StatTile label="Series" value={experienceData.statistics?.series_count || 0} />
                  <StatTile label="Racers" value={experienceData.statistics?.racers_count || 0} />
                </div>

                {/* Series hosted */}
                {experienceData.series?.length > 0 && (
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-foreground-secondary mb-3">Series Hosted</h2>
                    <div className="space-y-2">
                      {experienceData.series.slice(0, 5).map(s => (
                        <Link key={s.series_id || s.id} to={s.profile_url || `/series/${s.slug || s.id}`} className="flex items-center justify-between p-3 rounded-lg border border-divider hover:border-motion transition-colors group">
                          <div className="flex items-center gap-3">
                            <Flag className="w-4 h-4 text-foreground-quiet" />
                            <span className="font-medium text-foreground group-hover:text-motion">{s.name}</span>
                          </div>
                          <span className="text-xs text-foreground-quiet">{s.events_hosted} events</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Schedule */}
            {activeTab === 'schedule' && <EventHistoryList events={experienceData.event_history || []} />}

            {/* History */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatTile label="Seasons" value={experienceData.all_seasons?.length || 0} />
                  <StatTile label="Events" value={experienceData.statistics?.total_events || 0} />
                  <StatTile label="Series" value={experienceData.statistics?.series_count || 0} />
                  <StatTile label="Champions" value={experienceData.champions?.length || 0} />
                </div>
                {experienceData.series?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-foreground-secondary mb-3">Series History</h3>
                    <div className="space-y-2">
                      {experienceData.series.map(s => (
                        <div key={s.series_id || s.id} className="p-3 rounded-lg border border-divider" style={{ background: 'hsl(var(--surface-interactive) / 0.3)' }}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground">{s.name}</span>
                            <span className="text-xs text-foreground-quiet">{s.events_hosted} events</span>
                          </div>
                          {s.years_active?.length > 0 && (
                            <p className="text-xs text-foreground-quiet mt-1">{s.years_active[0]}—{s.years_active[s.years_active.length - 1]}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Timeline */}
            {activeTab === 'timeline' && <TrackTimeline timeline={experienceData.timeline || []} />}

            {/* Records */}
            {activeTab === 'records' && <TrackRecordsGrid records={experienceData.records || {}} />}

            {/* Champions */}
            {activeTab === 'champions' && <TrackChampionsPanel champions={experienceData.champions || []} />}

            {/* Racers */}
            {activeTab === 'racers' && <TrackRacerLeaders racers={experienceData.racers || []} />}

            {/* Teams */}
            {activeTab === 'teams' && <TrackTeamLeaders teams={experienceData.teams || []} />}

            {/* Vehicles */}
            {activeTab === 'vehicles' && <TrackVehicleLeaders vehicles={experienceData.vehicles || {}} />}

            {/* Gallery */}
            {activeTab === 'media' && (
              <div className="space-y-6">
                <TrackGallery media={experienceData.media || {}} />
                {experienceData.media?.outlet_stories?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-foreground-secondary mb-3">Stories</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {experienceData.media.outlet_stories.map(story => (
                        <Link key={story.id} to={story.slug ? `/story/${story.slug}` : `/OutletStoryPage?id=${story.id}`} className="block p-3 rounded-lg border border-divider hover:border-motion transition-colors">
                          <p className="text-sm font-semibold text-foreground">{story.title}</p>
                          {story.subtitle && <p className="text-xs text-foreground-quiet mt-0.5">{story.subtitle}</p>}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Visitor Info */}
            {activeTab === 'visitor' && <TrackVisitorGuide track={track} />}

            {/* Statistics */}
            {activeTab === 'statistics' && <TrackStatisticsBreakdown statistics={experienceData.statistics || {}} />}

            {/* Sponsors */}
            {activeTab === 'sponsors' && track?.id && (
              <EntitySponsorsTab targetEntityType="Track" targetEntityId={track.id} />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Status */}
            {track.operational_status && (
              <div className="p-3 rounded-lg border border-divider text-center" style={{ background: 'hsl(var(--surface-interactive) / 0.3)' }}>
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: track.operational_status === 'Active' ? 'hsl(var(--success))' : 'hsl(var(--warning))' }}>
                  {track.operational_status}
                </span>
              </div>
            )}

            {/* Contact & Info */}
            <div className="p-5 rounded-lg border border-divider space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-foreground-secondary">Contact & Info</h3>
              {track.website_url && (
                <a href={track.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-foreground-secondary hover:text-motion transition-colors">
                  <Globe className="w-4 h-4 flex-shrink-0" /> <span className="truncate">{track.website_url.replace(/^https?:\/\//, '')}</span>
                </a>
              )}
              {track.contact_email && (
                <a href={`mailto:${track.contact_email}`} className="flex items-center gap-2 text-sm text-foreground-secondary hover:text-motion transition-colors">
                  <Mail className="w-4 h-4 flex-shrink-0" /> {track.contact_email}
                </a>
              )}
              {track.phone && (
                <a href={`tel:${track.phone}`} className="flex items-center gap-2 text-sm text-foreground-secondary hover:text-motion transition-colors">
                  <Phone className="w-4 h-4 flex-shrink-0" /> {track.phone}
                </a>
              )}
              {track.address_line1 && (
                <div className="flex items-start gap-2 text-sm text-foreground-secondary">
                  <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{track.address_line1}{track.address_line2 ? `, ${track.address_line2}` : ''}{track.zip_code ? `, ${track.zip_code}` : ''}</span>
                </div>
              )}
              {!track.website_url && !track.contact_email && !track.phone && !track.address_line1 && (
                <p className="text-sm text-foreground-quiet">No contact info available.</p>
              )}
            </div>

            {/* Directions */}
            {track.latitude && track.longitude && (
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${track.latitude},${track.longitude}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold border border-divider hover:border-motion transition-colors"
                style={{ color: 'hsl(var(--motion))' }}>
                <Navigation className="w-4 h-4" /> Get Directions
              </a>
            )}

            {/* Sanctioning bodies */}
            {track.sanctioning_bodies?.length > 0 && (
              <div className="p-4 rounded-lg border border-divider">
                <h3 className="text-xs font-bold uppercase tracking-widest text-foreground-secondary mb-2">Sanctioning Bodies</h3>
                <div className="flex flex-wrap gap-1.5">
                  {track.sanctioning_bodies.map((sb, idx) => (
                    <span key={idx} className="text-xs px-2 py-1 rounded border border-divider text-foreground-secondary" style={{ background: 'hsl(var(--surface-interactive) / 0.3)' }}>{sb}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Next up */}
            {experienceData.event_history?.filter(e => new Date(e.event_date) > new Date()).length > 0 && (
              <div className="p-4 rounded-lg border border-divider">
                <h3 className="text-xs font-bold uppercase tracking-widest text-foreground-secondary mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Next Up
                </h3>
                {experienceData.event_history.filter(e => new Date(e.event_date) > new Date()).slice(0, 3).map(ev => (
                  <Link key={ev.event_id} to={ev.profile_url || `/events/${ev.slug || ev.event_id}`} className="block py-2 border-b border-divider last:border-0">
                    <p className="text-sm font-semibold text-foreground">{ev.name}</p>
                    {ev.series?.name && <p className="text-xs text-foreground-quiet">{ev.series.name}</p>}
                    <p className="text-[10px] font-mono text-foreground-quiet mt-0.5">{ev.event_date}</p>
                  </Link>
                ))}
              </div>
            )}

            {/* Completeness */}
            <TrackCompletenessIndicator completeness={experienceData.completeness || {}} />
          </div>
        </div>

        <ProfileClaimFooter entityType="Track" entityId={track.id} entityName={track.name} />
      </div>
    </PageShell>
  );
}

function SpecCard({ label, value, icon: Icon }) {
  return (
    <div className="p-3 rounded-lg border border-divider" style={{ background: 'hsl(var(--surface-interactive) / 0.3)' }}>
      <div className="text-[10px] uppercase tracking-widest text-foreground-quiet mb-1 flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </div>
      <div className="font-semibold text-foreground text-sm">{value}</div>
    </div>
  );
}

function StatTile({ label, value }) {
  return (
    <div className="p-4 rounded-lg text-center" style={{ background: 'hsl(var(--motion) / 0.1)', border: '1px solid hsl(var(--motion) / 0.2)' }}>
      <div className="text-2xl font-black text-motion">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-foreground-quiet mt-0.5">{label}</div>
    </div>
  );
}

function EventHistoryList({ events = [] }) {
  if (!events.length) {
    return (
      <div className="text-center py-12 border border-dashed border-divider rounded-lg">
        <Calendar className="w-8 h-8 mx-auto mb-2 text-foreground-quiet" />
        <p className="text-sm text-foreground-quiet">No events hosted at this track yet.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {events.map(ev => (
        <Link key={ev.event_id} to={ev.profile_url || `/events/${ev.slug || ev.event_id}`} className="flex items-center gap-3 p-3 rounded-lg border border-divider hover:border-motion transition-colors group">
          <div className="min-w-[48px] text-center px-2 py-1.5 rounded flex-shrink-0" style={{ background: 'hsl(var(--surface-interactive))' }}>
            <div className="text-[9px] font-mono uppercase text-foreground-quiet">{ev.event_date ? new Date(ev.event_date).toLocaleDateString('en-US', { month: 'short' }) : ''}</div>
            <div className="text-lg font-black text-foreground leading-none">{ev.event_date ? new Date(ev.event_date).getDate() : '—'}</div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground group-hover:text-motion truncate">{ev.name}</p>
            <div className="flex items-center gap-2 text-xs text-foreground-quiet mt-0.5">
              {ev.series?.name && <span>{ev.series.name}</span>}
              {ev.season && <span>· {ev.season}</span>}
              {ev.entry_count > 0 && <span>· {ev.entry_count} entries</span>}
            </div>
          </div>
          {ev.winner && (
            <div className="text-right flex-shrink-0">
              <Trophy className="w-3.5 h-3.5 text-motion inline" />
              <p className="text-xs text-foreground-secondary truncate max-w-[120px]">{ev.winner.racer?.display_name || '—'}</p>
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}