import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { MapPin, ExternalLink, Calendar, Trophy, Users, Share2 } from 'lucide-react';
import SocialShareButtons from '@/components/shared/SocialShareButtons';
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

  const { data: events } = useQuery({
    queryKey: ['seriesEvents', series?.id],
    queryFn: () => base44.entities.SeriesEvent.filter({ series_id: series.id }),
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
    <PageShell className="bg-white">
      {mediaItem?.hero_image_url && (
        <div className="w-full h-[400px] relative overflow-hidden">
          <img 
            src={mediaItem.hero_image_url} 
            alt={series.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-12">
        <Link to={createPageUrl('SeriesHome')} className="text-sm text-gray-600 hover:text-[#00FFDA] mb-4 inline-block">
          ← Back to Series
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 items-start">
          <div className="lg:col-span-2">
            <Separator className="mb-3" />
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-4xl font-black text-[#232323] leading-none">{series.name}</h1>
            </div>

            <div className="flex gap-1 overflow-x-auto border-b border-gray-200 mb-3">
              {sections.map(section => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => {
                      setActiveSection(section.id);
                      if (section.id === 'overview') {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      } else {
                        const element = document.getElementById(`section-${section.id}`);
                        if (element) {
                          const offset = element.getBoundingClientRect().top + window.pageYOffset - 120;
                          window.scrollTo({ top: offset, behavior: 'smooth' });
                        }
                      }
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

            <Separator className="mb-3" />
            <div className="bg-white p-8 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Discipline</div>
                  <div className="text-lg font-semibold text-[#232323] mb-4">{series.discipline}</div>
                  
                  <div className="text-sm text-gray-600 mb-1">Founded</div>
                  <div className="text-lg font-semibold text-[#232323]">{series.founded_year || '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Region</div>
                  <div className="text-lg font-semibold text-[#232323] mb-4">{series.region}</div>
                  
                  <div className="text-sm text-gray-600 mb-1">Competition Level</div>
                  <div className="text-lg font-semibold text-[#232323]">{series.competition_level}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 relative -mt-1">
            <div className="absolute -top-12 right-0 z-10">
              <SocialShareButtons 
                url={window.location.href}
                title={`${series.name} - Series Profile`}
                description={series.description_summary}
              />
            </div>
            {mediaItem?.logo_url && (
              <div className="bg-white">
                <div className="w-full h-[480px] relative bg-gray-50 overflow-hidden flex items-center justify-center p-8">
                  <img src={mediaItem.logo_url} alt={series.name} className="max-w-full max-h-full object-contain" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {activeSection === 'format' && format?.[0] && (
            <section className="bg-white p-8">
              <Separator className="mb-3" />
              <h2 className="text-2xl font-bold text-[#232323] mb-6 mt-3">Race Format</h2>
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
            </section>
          )}

          {activeSection === 'classes' && classes && classes.length > 0 && (
            <section className="bg-white p-8">
              <Separator className="mb-3" />
              <h2 className="text-2xl font-bold text-[#232323] mb-6 mt-3">Classes</h2>
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
            </section>
          )}

          {activeSection === 'calendar' && events && events.length > 0 && (
            <section className="bg-white p-8">
              <Separator className="mb-3" />
              <h2 className="text-2xl font-bold text-[#232323] mb-6 mt-3">Calendar</h2>
              <div className="space-y-4">
                {events.map(event => (
                  <div key={event.id} className="border border-gray-200 rounded-lg p-6 flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold mb-2">{event.event_name}</h3>
                      {event.start_date && <p className="text-sm text-gray-600">{event.start_date}</p>}
                      {event.is_championship_decider && <span className="inline-block mt-2 px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">Championship Decider</span>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeSection === 'standings' && (
            <section className="bg-white p-8">
              <Separator className="mb-3" />
              <h2 className="text-2xl font-bold text-[#232323] mb-6 mt-3 text-center">Standings</h2>
              <p className="text-gray-600 text-center">Standings coming soon</p>
            </section>
          )}

          {activeSection === 'media' && mediaItem && (
            <section className="bg-white p-8">
              <Separator className="mb-3" />
              <h2 className="text-2xl font-bold text-[#232323] mb-6 mt-3">Media</h2>
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
            </section>
          )}

          {activeSection === 'governance' && governance?.[0] && (
            <section className="bg-white p-8">
              <Separator className="mb-3" />
              <h2 className="text-2xl font-bold text-[#232323] mb-6 mt-3">Governance</h2>
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
            </section>
          )}

          {activeSection === 'overview' && (
            <section className="bg-white p-8">
              <Separator className="mb-3" />
              <h2 className="text-2xl font-bold text-[#232323] mb-6 mt-3 text-center">Overview</h2>
              <p className="text-gray-600 text-center">Select a section above to view more information</p>
            </section>
          )}

          {activeSection === 'teams' && (
            <section className="bg-white p-8">
              <Separator className="mb-3" />
              <h2 className="text-2xl font-bold text-[#232323] mb-6 mt-3 text-center">Teams</h2>
              <p className="text-gray-600 text-center">Teams coming soon</p>
            </section>
          )}

          {activeSection === 'drivers' && (
            <section className="bg-white p-8">
              <Separator className="mb-3" />
              <h2 className="text-2xl font-bold text-[#232323] mb-6 mt-3 text-center">Drivers</h2>
              <p className="text-gray-600 text-center">Drivers coming soon</p>
            </section>
          )}

          {activeSection === 'tracks' && (
            <section className="bg-white p-8">
              <Separator className="mb-3" />
              <h2 className="text-2xl font-bold text-[#232323] mb-6 mt-3 text-center">Tracks</h2>
              <p className="text-gray-600 text-center">Tracks coming soon</p>
            </section>
          )}
        </div>
      </div>
    </PageShell>
  );
}