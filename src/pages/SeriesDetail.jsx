import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import SeriesNavigation from '@/components/series/SeriesNavigation';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

export default function SeriesDetail() {
  const [searchParams] = useSearchParams();
  const slug = searchParams.get('slug');
  const [activeSection, setActiveSection] = useState('overview');

  const { data: series, isLoading: seriesLoading } = useQuery({
    queryKey: ['series', slug],
    queryFn: async () => {
      const allSeries = await base44.entities.Series.list();
      return allSeries.find(s => s.slug === slug);
    },
    enabled: !!slug,
  });

  const { data: format } = useQuery({
    queryKey: ['seriesFormat', series?.id],
    queryFn: () => base44.entities.SeriesFormat.filter({ series_id: series.id }),
    enabled: !!series?.id,
  });

  const { data: classes } = useQuery({
    queryKey: ['seriesClasses', series?.id],
    queryFn: () => base44.entities.SeriesClass.filter({ series_id: series.id }),
    enabled: !!series?.id,
  });

  const { data: seasons } = useQuery({
    queryKey: ['seriesSeasons', series?.id],
    queryFn: () => base44.entities.SeriesSeason.filter({ series_id: series.id }),
    enabled: !!series?.id,
  });

  const { data: seriesEvents } = useQuery({
    queryKey: ['seriesEvents', series?.id],
    queryFn: () => base44.entities.SeriesEvent.filter({ series_id: series.id }),
    enabled: !!series?.id,
  });

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['upcomingSeriesEvents', series?.id],
    queryFn: async () => {
      const allEvents = await base44.entities.Event.filter({ series_id: series.id, status: 'Upcoming' }, 'date_start', 5);
      return allEvents;
    },
    enabled: !!series?.id,
  });

  const { data: pastEvents = [] } = useQuery({
    queryKey: ['pastSeriesEvents', series?.id],
    queryFn: async () => {
      const allEvents = await base44.entities.Event.filter({ series_id: series.id, status: 'Completed' }, '-date_start', 5);
      return allEvents;
    },
    enabled: !!series?.id,
  });

  const { data: media } = useQuery({
    queryKey: ['seriesMedia', series?.id],
    queryFn: () => base44.entities.SeriesMedia.filter({ series_id: series.id }),
    enabled: !!series?.id,
  });

  const { data: governance } = useQuery({
    queryKey: ['seriesGovernance', series?.id],
    queryFn: () => base44.entities.SeriesGovernance.filter({ series_id: series.id }),
    enabled: !!series?.id,
  });

  if (seriesLoading) {
    return (
      <PageShell>
        <div className="bg-white pt-8">
          <div className="max-w-7xl mx-auto px-6">
            <Skeleton className="h-12 w-1/3 mb-4" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </PageShell>
    );
  }

  if (!series) {
    return (
      <PageShell>
        <div className="bg-white min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-black mb-2">Series Not Found</h1>
            <p className="text-gray-600">The series you're looking for doesn't exist.</p>
          </div>
        </div>
      </PageShell>
    );
  }

  const disciplineColors = {
    'Asphalt Oval': 'bg-blue-100 text-blue-800',
    'Road Racing': 'bg-red-100 text-red-800',
    'Off Road': 'bg-orange-100 text-orange-800',
    'Snowmobile': 'bg-cyan-100 text-cyan-800',
    'Rallycross': 'bg-purple-100 text-purple-800',
    'Mixed': 'bg-gray-100 text-gray-800',
  };

  const mediaItem = media?.[0];

  return (
    <PageShell>
      <div className="bg-white">
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200 pt-8 pb-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-3 gap-8 mb-8">
              <div className="col-span-2">
                <div className="mb-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${disciplineColors[series.discipline]}`}>
                    {series.discipline}
                  </span>
                </div>
                <h1 className="text-5xl font-black mb-4">{series.name}</h1>
                <p className="text-gray-600 text-lg mb-6">{series.description_summary}</p>

                <div className="grid grid-cols-4 gap-4 bg-white border border-gray-200 rounded-lg p-6">
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Founded</div>
                    <div className="text-lg font-black">{series.founded_year || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Governing Body</div>
                    <div className="text-sm font-medium">{series.governing_body || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Competition Level</div>
                    <div className="text-sm font-medium">{series.competition_level}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Region</div>
                    <div className="text-sm font-medium">{series.region}</div>
                  </div>
                </div>
              </div>

              {mediaItem?.logo_url && (
                <div className="col-span-1">
                  <div className="bg-white border border-gray-200 rounded-lg p-6 flex items-center justify-center h-full">
                    <img src={mediaItem.logo_url} alt={series.name} className="max-h-32 object-contain" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <SeriesNavigation activeSection={activeSection} onSectionChange={setActiveSection} />

        {/* Content Sections */}
        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Format Section */}
          {activeSection === 'format' && format?.[0] && (
            <div className="space-y-6">
              <h2 className="text-3xl font-black">Race Format</h2>
              {format[0].race_weekend_format && (
                <div>
                  <h3 className="font-bold mb-2">Race Weekend Format</h3>
                  <p className="text-gray-600">{format[0].race_weekend_format}</p>
                </div>
              )}
              {format[0].points_system_summary && (
                <div>
                  <h3 className="font-bold mb-2">Points System</h3>
                  <p className="text-gray-600">{format[0].points_system_summary}</p>
                </div>
              )}
              {format[0].playoff_format && (
                <div>
                  <h3 className="font-bold mb-2">Playoff Format</h3>
                  <p className="text-gray-600">{format[0].playoff_format}</p>
                </div>
              )}
              {format[0].vehicle_rules_summary && (
                <div>
                  <h3 className="font-bold mb-2">Vehicle Rules</h3>
                  <p className="text-gray-600">{format[0].vehicle_rules_summary}</p>
                </div>
              )}
            </div>
          )}

          {/* Classes Section */}
          {activeSection === 'classes' && classes && classes.length > 0 && (
            <div>
              <h2 className="text-3xl font-black mb-6">Classes</h2>
              <div className="space-y-4">
                {classes.map(cls => (
                  <div key={cls.id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-bold">{cls.class_name}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${cls.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {cls.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {cls.level && <p className="text-sm text-gray-600 mb-1">Level: {cls.level}</p>}
                    {cls.vehicle_type && <p className="text-sm text-gray-600">Vehicle: {cls.vehicle_type}</p>}
                    {cls.notes && <p className="text-sm text-gray-700 mt-3">{cls.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Calendar Section */}
          {activeSection === 'calendar' && (
            <div className="space-y-8">
              <h2 className="text-3xl font-black">Calendar</h2>
              
              {upcomingEvents.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">Upcoming Events</h3>
                    <Link to={`${createPageUrl('ScheduleHome')}?series=${series.id}`} className="text-sm text-blue-600 hover:text-blue-800">
                      See All Events →
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {upcomingEvents.map(event => (
                      <div key={event.id} className="border border-gray-200 rounded-lg p-5">
                        <h4 className="font-bold mb-1">{event.name}</h4>
                        <div className="text-sm text-gray-600">
                          {format(new Date(event.date_start), 'MMM d, yyyy')}
                          {event.date_end && event.date_end !== event.date_start && 
                            ` – ${format(new Date(event.date_end), 'MMM d, yyyy')}`}
                        </div>
                        {event.track_name && <div className="text-sm text-gray-600">{event.track_name}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pastEvents.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold mb-4">Past Events</h3>
                  <div className="space-y-2">
                    {pastEvents.map(event => (
                      <div key={event.id} className="text-sm border-l-2 border-gray-300 pl-4 py-1">
                        <div className="font-medium">{event.name}</div>
                        <div className="text-gray-600">{format(new Date(event.date_start), 'MMM d, yyyy')} • {event.track_name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {seriesEvents && seriesEvents.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold mb-4">Event Schedule</h3>
                  <div className="space-y-4">
                    {seriesEvents.map(event => (
                      <div key={event.id} className="border border-gray-200 rounded-lg p-6 flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-bold mb-2">{event.event_name}</h3>
                          {event.start_date && <p className="text-sm text-gray-600">{event.start_date}</p>}
                          {event.is_championship_decider && <span className="inline-block mt-2 px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">Championship Decider</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Standings Placeholder */}
          {activeSection === 'standings' && (
            <div className="text-center py-12">
              <h2 className="text-3xl font-black mb-4">Standings</h2>
              <p className="text-gray-600">Standings coming soon</p>
            </div>
          )}

          {/* Media Section */}
          {activeSection === 'media' && mediaItem && (
            <div className="space-y-6">
              <h2 className="text-3xl font-black">Media</h2>
              {mediaItem.hero_image_url && (
                <div className="rounded-lg overflow-hidden">
                  <img src={mediaItem.hero_image_url} alt={series.name} className="w-full h-96 object-cover" />
                </div>
              )}
              {mediaItem.broadcast_partners && (
                <div>
                  <h3 className="font-bold mb-2">Broadcast Partners</h3>
                  <p className="text-gray-600">{mediaItem.broadcast_partners}</p>
                </div>
              )}
              {mediaItem.website_url && (
                <a href={mediaItem.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">
                  Visit Website
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          )}

          {/* Governance Section */}
          {activeSection === 'governance' && governance?.[0] && (
            <div className="space-y-6">
              <h2 className="text-3xl font-black">Governance</h2>
              {governance[0].sanctioning_body && (
                <div>
                  <h3 className="font-bold mb-2">Sanctioning Body</h3>
                  <p className="text-gray-600">{governance[0].sanctioning_body}</p>
                </div>
              )}
              {governance[0].ownership && (
                <div>
                  <h3 className="font-bold mb-2">Ownership</h3>
                  <p className="text-gray-600">{governance[0].ownership}</p>
                </div>
              )}
              {governance[0].leadership && (
                <div>
                  <h3 className="font-bold mb-2">Leadership</h3>
                  <p className="text-gray-600">{governance[0].leadership}</p>
                </div>
              )}
              {governance[0].rulebook_url && (
                <a href={governance[0].rulebook_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">
                  Rulebook
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          )}

          {/* Overview (Default) */}
          {activeSection === 'overview' && (
            <div className="text-center py-12">
              <h2 className="text-3xl font-black mb-4">Overview</h2>
              <p className="text-gray-600">Select a section above to view more information</p>
            </div>
          )}

          {/* Teams Placeholder */}
          {activeSection === 'teams' && (
            <div className="text-center py-12">
              <h2 className="text-3xl font-black mb-4">Teams</h2>
              <p className="text-gray-600">Teams coming soon</p>
            </div>
          )}

          {/* Drivers Placeholder */}
          {activeSection === 'drivers' && (
            <div className="text-center py-12">
              <h2 className="text-3xl font-black mb-4">Drivers</h2>
              <p className="text-gray-600">Drivers coming soon</p>
            </div>
          )}

          {/* Tracks Placeholder */}
          {activeSection === 'tracks' && (
            <div className="text-center py-12">
              <h2 className="text-3xl font-black mb-4">Tracks</h2>
              <p className="text-gray-600">Tracks coming soon</p>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}