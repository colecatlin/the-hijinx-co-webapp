import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, ExternalLink, Calendar, Users, TrendingUp, Camera, Settings, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import ScheduleSection from '@/components/schedule/ScheduleSection';

export default function TrackProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const trackSlug = urlParams.get('id');
  const [activeSection, setActiveSection] = useState('overview');

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.list(),
  });

  const track = tracks.find(t => t.slug === trackSlug);

  const { data: disciplines = [] } = useQuery({
    queryKey: ['trackDisciplines', track?.id],
    queryFn: () => base44.entities.TrackToDiscipline.filter({ track_id: track.id }),
    enabled: !!track?.id,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['trackEvents', track?.id],
    queryFn: () => base44.entities.TrackEvent.filter({ track_id: track.id }),
    enabled: !!track?.id,
  });

  const { data: series = [] } = useQuery({
    queryKey: ['trackSeries', track?.id],
    queryFn: () => base44.entities.TrackSeries.filter({ track_id: track.id }),
    enabled: !!track?.id,
  });

  const { data: performance } = useQuery({
    queryKey: ['trackPerformance', track?.id],
    queryFn: async () => {
      const results = await base44.entities.TrackPerformance.filter({ track_id: track.id });
      return results[0];
    },
    enabled: !!track?.id,
  });

  const { data: media } = useQuery({
    queryKey: ['trackMedia', track?.id],
    queryFn: async () => {
      const results = await base44.entities.TrackMedia.filter({ track_id: track.id });
      return results[0];
    },
    enabled: !!track?.id,
  });

  const { data: operations } = useQuery({
    queryKey: ['trackOperations', track?.id],
    queryFn: async () => {
      const results = await base44.entities.TrackOperations.filter({ track_id: track.id });
      return results[0];
    },
    enabled: !!track?.id,
  });

  const { data: community } = useQuery({
    queryKey: ['trackCommunity', track?.id],
    queryFn: async () => {
      const results = await base44.entities.TrackCommunity.filter({ track_id: track.id });
      return results[0];
    },
    enabled: !!track?.id,
  });

  if (isLoading) {
    return (
      <PageShell className="bg-[#FFF8F5]">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <Skeleton className="h-12 w-64 mb-4" />
          <Skeleton className="h-96" />
        </div>
      </PageShell>
    );
  }

  if (!track) {
    return (
      <PageShell className="bg-[#FFF8F5]">
        <div className="max-w-7xl mx-auto px-6 py-12 text-center">
          <p className="text-gray-600 mb-4">Track not found</p>
          <Link to={createPageUrl('TrackDirectory')}>
            <Button>Back to Tracks</Button>
          </Link>
        </div>
      </PageShell>
    );
  }

  const signatureEvents = events.filter(e => e.is_signature).slice(0, 3);
  const topSeries = series.slice(0, 4);

  const sections = [
    { id: 'overview', label: 'Overview', icon: MapPin },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'fan', label: 'Fan Experience', icon: Users },
    { id: 'media', label: 'Media', icon: Camera },
    { id: 'operations', label: 'Operations', icon: Settings },
    { id: 'community', label: 'Community', icon: Heart },
  ];

  const handleTrackCalendarCreated = async (calendarId) => {
    await base44.functions.invoke('saveEntityCalendarId', {
      entityType: 'Track', entityId: track.id, calendarId
    });
  };

  return (
    <PageShell className="bg-[#FFF8F5]">
      {/* Header Image */}
      {media?.hero_image_url && (
        <div className="w-full h-[400px] relative overflow-hidden">
          <img 
            src={media.hero_image_url} 
            alt={track.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      )}

      {/* Sticky sub nav */}
      <div className="sticky top-16 lg:top-[calc(4rem+41px)] bg-white border-b border-gray-200 z-40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            {sections.map(section => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => {
                    setActiveSection(section.id);
                    document.getElementById(`section-${section.id}`)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors ${
                    activeSection === section.id
                      ? 'text-[#232323] border-b-2 border-[#00FFDA]'
                      : 'text-gray-600 hover:text-[#232323]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {section.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section - One Screen Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Left Column - Primary Info */}
          <div className="lg:col-span-2">
            <Link to={createPageUrl('TrackDirectory')} className="text-sm text-gray-600 hover:text-[#00FFDA] mb-4 inline-block">
              ← Back to Tracks
            </Link>

            <h1 className="text-4xl font-black text-[#232323] mb-2">{track.name}</h1>
            
            <div className="flex items-center gap-2 text-gray-600 mb-6">
              <MapPin className="w-4 h-4" />
              {track.city}, {track.state}
            </div>

            <p className="text-lg text-gray-700 leading-relaxed mb-8">
              {track.description_summary}
            </p>

            {/* Quick Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <div className="bg-white border border-gray-200 p-4">
                <div className="text-xs text-gray-600 mb-1">Surface</div>
                <div className="font-bold text-[#232323]">
                  {track.surfaces?.join(', ') || 'N/A'}
                </div>
              </div>
              <div className="bg-white border border-gray-200 p-4">
                <div className="text-xs text-gray-600 mb-1">Length</div>
                <div className="font-bold text-[#232323]">{track.length_miles || 'N/A'} mi</div>
              </div>
              <div className="bg-white border border-gray-200 p-4">
                <div className="text-xs text-gray-600 mb-1">Turns</div>
                <div className="font-bold text-[#232323]">{track.turns_count || 'N/A'}</div>
              </div>
              <div className="bg-white border border-gray-200 p-4">
                <div className="text-xs text-gray-600 mb-1">Season</div>
                <div className="font-bold text-[#232323]">{track.status || 'N/A'}</div>
              </div>
            </div>

            {/* Track Character Tags */}
            <div className="flex flex-wrap gap-2">
              {track.elevation_profile && track.elevation_profile !== 'Unknown' && (
                <Badge className="bg-[#1A3249] text-white">{track.elevation_profile} Elevation</Badge>
              )}
              {track.viewing_quality && track.viewing_quality !== 'Unknown' && (
                <Badge className="bg-[#1A3249] text-white">{track.viewing_quality} Views</Badge>
              )}
              {track.atmosphere?.map((atm, idx) => (
                atm !== 'Unknown' && <Badge key={idx} className="bg-[#D33F49] text-white">{atm}</Badge>
              ))}
            </div>
          </div>

          {/* Right Column - Data Panel */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 p-6">
              <h3 className="text-sm font-bold text-[#232323] mb-4">Disciplines</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {disciplines.map(disc => (
                  <Badge key={disc.id} className="bg-[#232323] text-white">
                    {disc.discipline_name}
                  </Badge>
                ))}
              </div>

              <div className="mb-4">
                <div className="text-xs text-gray-600 mb-1">Status</div>
                <Badge
                  className={`${
                    track.status === 'Active'
                      ? 'bg-[#00FFDA] text-[#232323]'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {track.status}
                </Badge>
              </div>

              {signatureEvents.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs text-gray-600 mb-2">Signature Events</div>
                  {signatureEvents.map(event => (
                    <div key={event.id} className="text-sm text-[#232323] font-medium mb-1">
                      {event.name}
                    </div>
                  ))}
                </div>
              )}

              {topSeries.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs text-gray-600 mb-2">Series Hosted</div>
                  {topSeries.map(s => (
                    <div key={s.id} className="text-sm text-[#232323] mb-1">
                      {s.series_name}
                    </div>
                  ))}
                </div>
              )}

              {operations?.ticketing_url && (
                <a
                  href={operations.ticketing_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[#00FFDA] hover:text-[#1A3249] transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Get Tickets
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Below Fold Sections */}
        <div className="space-y-8">
          {/* Overview */}
          <section id="section-overview" className="bg-white border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {track.founded_year && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Founded</div>
                  <div className="text-lg font-semibold text-[#232323]">{track.founded_year}</div>
                </div>
              )}
              {track.capacity_est && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Capacity</div>
                  <div className="text-lg font-semibold text-[#232323]">{track.capacity_est.toLocaleString()}</div>
                </div>
              )}
              {track.pit_access && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Pit Access</div>
                  <div className="text-lg font-semibold text-[#232323]">{track.pit_access}</div>
                </div>
              )}
              {track.viewing_quality && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Viewing Quality</div>
                  <div className="text-lg font-semibold text-[#232323]">{track.viewing_quality}</div>
                </div>
              )}
              {track.camping && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Camping</div>
                  <div className="text-lg font-semibold text-[#232323]">{track.camping}</div>
                </div>
              )}
            </div>
            {track.accessibility_notes && (
              <div className="mt-6">
                <div className="text-sm text-gray-600 mb-2">Accessibility</div>
                <p className="text-gray-700">{track.accessibility_notes}</p>
              </div>
            )}
          </section>

          {/* Events */}
          <section id="section-events" className="bg-white border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Events and Involvement</h2>
            
            {signatureEvents.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-[#232323] mb-3">Signature Events</h3>
                <div className="space-y-3">
                  {signatureEvents.map(event => (
                    <div key={event.id} className="border-l-4 border-[#00FFDA] pl-4">
                      <div className="font-semibold text-[#232323]">{event.name}</div>
                      {event.typical_months && <div className="text-sm text-gray-600">{event.typical_months}</div>}
                      {event.series && <div className="text-sm text-gray-600">{event.series}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {events.filter(e => !e.is_signature).length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-[#232323] mb-3">Other Events</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {events.filter(e => !e.is_signature).map(event => (
                    <div key={event.id} className="text-sm">
                      <div className="font-medium text-[#232323]">{event.name}</div>
                      {event.event_type && <div className="text-gray-600">{event.event_type}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {series.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-[#232323] mb-3">Series Hosted</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {series.map(s => (
                    <div key={s.id} className="flex items-start gap-2">
                      <Badge className="bg-[#1A3249] text-white text-xs">{s.level}</Badge>
                      <div>
                        <div className="font-medium text-[#232323]">{s.series_name}</div>
                        {s.primary_discipline && <div className="text-sm text-gray-600">{s.primary_discipline}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Schedule */}
          <section id="section-schedule" className="bg-white border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Race Schedule</h2>
            <ScheduleSection
              entityType="Track"
              entityId={track.id}
              entityName={track.name}
              calendarId={track.calendar_id}
              onCalendarCreated={handleTrackCalendarCreated}
              isOwner={true}
            />
          </section>

          {/* Performance */}
          {performance && (
            <section id="section-performance" className="bg-white border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-[#232323] mb-6">Performance Snapshot</h2>
              
              {performance.lap_record_driver && (
                <div className="mb-6 p-4 bg-[#FFF8F5] border border-gray-200">
                  <div className="text-sm text-gray-600 mb-1">Lap Record</div>
                  <div className="text-xl font-bold text-[#232323]">{performance.lap_record_time}</div>
                  <div className="text-sm text-gray-700">
                    {performance.lap_record_driver} ({performance.lap_record_year})
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {performance.championship_impact && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Championship Impact</div>
                    <div className="font-semibold text-[#232323]">{performance.championship_impact}</div>
                  </div>
                )}
                {performance.trends_home_advantage && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Home Advantage</div>
                    <div className="font-semibold text-[#232323]">{performance.trends_home_advantage}</div>
                  </div>
                )}
              </div>

              {performance.trends_mech_stress && performance.trends_mech_stress.length > 0 && (
                <div className="mt-6">
                  <div className="text-sm text-gray-600 mb-2">Mechanical Stress Points</div>
                  <div className="flex flex-wrap gap-2">
                    {performance.trends_mech_stress.map((stress, idx) => (
                      <Badge key={idx} variant="outline" className="border-[#D33F49] text-[#D33F49]">
                        {stress}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {performance.trends_winning_style && (
                <div className="mt-6">
                  <div className="text-sm text-gray-600 mb-2">Winning Style</div>
                  <p className="text-gray-700">{performance.trends_winning_style}</p>
                </div>
              )}
            </section>
          )}

          {/* Fan Experience */}
          <section id="section-fan" className="bg-white border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Fan Experience</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {track.viewing_quality && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Viewing Quality</div>
                  <div className="font-semibold text-[#232323]">{track.viewing_quality}</div>
                </div>
              )}
              {track.pit_access && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Pit Access</div>
                  <div className="font-semibold text-[#232323]">{track.pit_access}</div>
                </div>
              )}
            </div>
            {operations?.parking_notes && (
              <div className="mt-6">
                <div className="text-sm text-gray-600 mb-2">Parking</div>
                <p className="text-gray-700">{operations.parking_notes}</p>
              </div>
            )}
          </section>

          {/* Media */}
          {media && (
            <section id="section-media" className="bg-white border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-[#232323] mb-6">Media</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {media.hero_image_url && (
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Hero Image</div>
                    <img src={media.hero_image_url} alt="Track hero" className="w-full border border-gray-200" />
                  </div>
                )}
                {media.track_map_url && (
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Track Map</div>
                    <img src={media.track_map_url} alt="Track map" className="w-full border border-gray-200" />
                  </div>
                )}
              </div>

              {media.gallery_urls && media.gallery_urls.length > 0 && (
                <div className="mt-6">
                  <div className="text-sm text-gray-600 mb-2">Gallery</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {media.gallery_urls.map((url, idx) => (
                      <img key={idx} src={url} alt={`Gallery ${idx + 1}`} className="w-full border border-gray-200" />
                    ))}
                  </div>
                </div>
              )}

              {media.highlight_video_url && (
                <div className="mt-6">
                  <div className="text-sm text-gray-600 mb-2">Highlight Video</div>
                  <div className="aspect-video">
                    <iframe
                      src={media.highlight_video_url}
                      className="w-full h-full border border-gray-200"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Operations */}
          {operations && (
            <section id="section-operations" className="bg-white border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-[#232323] mb-6">Operations</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {track.ownership_type && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Ownership</div>
                    <div className="font-semibold text-[#232323]">{track.ownership_type}</div>
                  </div>
                )}
                {operations.operator_name && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Operator</div>
                    <div className="font-semibold text-[#232323]">{operations.operator_name}</div>
                  </div>
                )}
                {track.reliability && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Reliability</div>
                    <div className="font-semibold text-[#232323]">{track.reliability}</div>
                  </div>
                )}
              </div>

              {track.sanctioning && track.sanctioning.length > 0 && (
                <div className="mt-6">
                  <div className="text-sm text-gray-600 mb-2">Sanctioning Bodies</div>
                  <div className="flex flex-wrap gap-2">
                    {track.sanctioning.map((sanct, idx) => (
                      <Badge key={idx} className="bg-[#232323] text-white">{sanct}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {operations.safety_notes && (
                <div className="mt-6">
                  <div className="text-sm text-gray-600 mb-2">Safety Notes</div>
                  <p className="text-gray-700">{operations.safety_notes}</p>
                </div>
              )}

              {operations.contact_email && (
                <div className="mt-6">
                  <div className="text-sm text-gray-600 mb-2">Contact</div>
                  <div className="text-[#232323]">{operations.contact_email}</div>
                  {operations.contact_phone && <div className="text-[#232323]">{operations.contact_phone}</div>}
                </div>
              )}
            </section>
          )}

          {/* Community */}
          {community && (
            <section id="section-community" className="bg-white border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-[#232323] mb-6">Community</h2>
              
              {community.youth_programs && (
                <div className="mb-6">
                  <div className="text-sm text-gray-600 mb-2">Youth Programs</div>
                  <p className="text-gray-700">{community.youth_programs}</p>
                </div>
              )}

              {community.volunteer_info && (
                <div className="mb-6">
                  <div className="text-sm text-gray-600 mb-2">Volunteer Opportunities</div>
                  <p className="text-gray-700">{community.volunteer_info}</p>
                </div>
              )}

              {community.local_impact && (
                <div className="mb-6">
                  <div className="text-sm text-gray-600 mb-2">Local Impact</div>
                  <p className="text-gray-700">{community.local_impact}</p>
                </div>
              )}

              {community.legacy_notes && (
                <div>
                  <div className="text-sm text-gray-600 mb-2">Legacy</div>
                  <p className="text-gray-700">{community.legacy_notes}</p>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </PageShell>
  );
}