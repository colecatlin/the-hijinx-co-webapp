import React, { useState, useEffect } from 'react';
import SeoMeta, { buildEntityTitle, SITE_FALLBACK_IMAGE } from '@/components/system/seoMeta';
import Analytics from '@/components/system/analyticsTracker';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { applyExperienceQueryOptions } from '@/components/utils/queryDefaults';
import PageShell from '@/components/shared/PageShell';
import { EntityNotFound } from '@/components/data/EntityNotFoundState';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Calendar, Flag, Truck, TrendingUp, Trophy, AlertCircle, Wrench, Users, Camera, Cog, Handshake, List } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, isValid } from 'date-fns';
import SocialShareButtons from '@/components/shared/SocialShareButtons';
import EntitySponsorsTab from '@/components/shared/EntitySponsorsTab';
import EntityBreadcrumbs from '@/components/shared/EntityBreadcrumbs';
import MobileBackHeader from '@/components/shared/MobileBackHeader';
import VehicleTimeline from '@/components/vehicles/VehicleTimeline';
import VehicleAchievementsGrid from '@/components/vehicles/VehicleAchievementsGrid';
import VehicleStatisticsBreakdown from '@/components/vehicles/VehicleStatisticsBreakdown';
import VehicleHistoryPanel from '@/components/vehicles/VehicleHistoryPanel';
import VehicleChassisHistory from '@/components/vehicles/VehicleChassisHistory';
import VehicleEngineHistory from '@/components/vehicles/VehicleEngineHistory';
import VehicleCompletenessIndicator from '@/components/vehicles/VehicleCompletenessIndicator';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Truck },
  { id: 'history', label: 'History', icon: Flag },
  { id: 'chassis', label: 'Chassis', icon: Wrench },
  { id: 'engine', label: 'Engine', icon: Cog },
  { id: 'timeline', label: 'Timeline', icon: Calendar },
  { id: 'stats', label: 'Statistics', icon: TrendingUp },
  { id: 'achievements', label: 'Achievements', icon: Trophy },
  { id: 'media', label: 'Media', icon: Camera },
  { id: 'events', label: 'Events', icon: List },
  { id: 'sponsors', label: 'Sponsors', icon: Handshake },
];

function safeDateFormat(dateStr, fmt = 'MMM d, yyyy') {
  if (!dateStr) return 'TBA';
  const d = new Date(dateStr);
  return isValid(d) ? format(d, fmt) : 'TBA';
}

export default function VehicleProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const vehicleSlug = (urlParams.get('slug') || urlParams.get('id') || '').trim() || null;
  const [activeTab, setActiveTab] = useState('overview');

  const { data: experienceData, isLoading } = useQuery(applyExperienceQueryOptions({
    queryKey: ['vehicleExperience', vehicleSlug],
    queryFn: () => base44.functions.invoke('getVehicleExperience', { slug: vehicleSlug, vehicle_id: vehicleSlug?.length === 24 ? vehicleSlug : undefined, allow_draft: true }),
    enabled: !!vehicleSlug,
  }));
  const experience = experienceData?.data || experienceData || null;
  const vehicle = experience?.vehicle || null;

  useEffect(() => { window.scrollTo(0, 0); setActiveTab('overview'); }, [vehicleSlug]);
  useEffect(() => { if (vehicle?.id) Analytics.track('vehicle_profile_view', { vehicle_id: vehicle.id }); }, [vehicle?.id]);

  if (isLoading) {
    return (
      <PageShell className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <Skeleton className="h-12 w-64 mb-4" />
          <Skeleton className="h-96" />
        </div>
      </PageShell>
    );
  }

  if (!vehicle) return <EntityNotFound entityType="Vehicle" />;

  const vehicleName = vehicle.nickname || `${vehicle.manufacturer || ''} ${vehicle.model || ''}`.trim() || 'Vehicle';
  const vehicleImg = vehicle.hero_image_url || vehicle.profile_image_url || SITE_FALLBACK_IMAGE;
  const vehicleDesc = vehicle.bio || [
    vehicle.manufacturer, vehicle.model, vehicle.year ? String(vehicle.year) : '',
    vehicle.primary_discipline, vehicle.vehicle_type,
  ].filter(Boolean).join(' · ') || `${vehicleName} racing vehicle profile on HIJINX.`;

  return (
    <PageShell className="bg-white">
      <SeoMeta
        title={buildEntityTitle(vehicleName, 'Vehicle Profile')}
        description={vehicleDesc}
        image={vehicleImg}
      />
      {experience?.seo?.structured_data && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(experience.seo.structured_data) }} />
      )}

      <MobileBackHeader tone="light" title={vehicleName} to="/Directory?cat=vehicles" />

      {/* HERO */}
      <div className="relative w-full h-[280px] bg-[#0A0A0A] overflow-hidden">
        {vehicle.hero_image_url ? (
          <img src={vehicle.hero_image_url} alt={vehicleName} className="absolute inset-0 w-full h-full object-cover opacity-40" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-[#0A0A0A]" />
        )}
        <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-6 pb-8">
          <div className="flex items-end gap-5">
            <div className="flex-shrink-0 hidden sm:flex w-24 h-24 rounded-xl bg-white/10 border border-white/20 items-center justify-center p-3">
              {vehicle.profile_image_url
                ? <img src={vehicle.profile_image_url} alt={vehicleName} className="max-w-full max-h-full object-contain" loading="lazy" decoding="async" />
                : <Truck className="w-10 h-10 text-white/40" />}
            </div>
            <div className="flex-1 pb-1">
              <div className="flex items-center gap-3 mb-1">
                {vehicle.number_default && (
                  <Badge className="bg-[#00FFDA]/20 text-[#00FFDA] border border-[#00FFDA]/30 text-xs">#{vehicle.number_default}</Badge>
                )}
                {vehicle.racing_status && (
                  <Badge className={vehicle.racing_status === 'Active' ? 'bg-[#00FFDA]/20 text-[#00FFDA] border border-[#00FFDA]/30 text-xs' : 'bg-white/10 text-white/70 border border-white/20 text-xs'}>
                    {vehicle.racing_status}
                  </Badge>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white leading-none">{vehicleName}</h1>
              {vehicle.manufacturer && (
                <p className="text-white/60 mt-1.5 text-sm">
                  {[vehicle.manufacturer, vehicle.model, vehicle.year ? String(vehicle.year) : null].filter(Boolean).join(' · ')}
                  {vehicle.primary_discipline ? ` · ${vehicle.primary_discipline}` : ''}
                </p>
              )}
              {vehicle.tagline && (
                <p className="text-white/50 mt-1 text-sm italic">{vehicle.tagline}</p>
              )}
            </div>
            <div className="pb-2 flex-shrink-0">
              <SocialShareButtons url={window.location.href} title={`${vehicleName} - Vehicle Profile`} description={vehicleDesc} />
            </div>
          </div>
        </div>
      </div>

      {/* NAV BAR */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-2 pt-2 pb-0">
            <EntityBreadcrumbs entityType="Vehicle" entityName={vehicleName} />
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'text-[#232323] border-b-2 border-[#00FFDA] -mb-px'
                      : 'text-gray-500 hover:text-[#232323]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {experience?.profile_completeness && (
          <div className="mb-6 max-w-xs">
            <VehicleCompletenessIndicator completeness={experience.profile_completeness} />
          </div>
        )}

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {vehicle.manufacturer && (
                  <div>
                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Manufacturer</div>
                    <div className="text-base font-semibold text-[#232323]">{vehicle.manufacturer}</div>
                  </div>
                )}
                {vehicle.model && (
                  <div>
                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Model</div>
                    <div className="text-base font-semibold text-[#232323]">{vehicle.model}</div>
                  </div>
                )}
                {vehicle.year && (
                  <div>
                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Year</div>
                    <div className="text-base font-semibold text-[#232323]">{vehicle.year}</div>
                  </div>
                )}
                {vehicle.vehicle_type && (
                  <div>
                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Type</div>
                    <div className="text-base font-semibold text-[#232323]">{vehicle.vehicle_type}</div>
                  </div>
                )}
                {vehicle.primary_discipline && (
                  <div>
                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Discipline</div>
                    <div className="text-base font-semibold text-[#232323]">{vehicle.primary_discipline}</div>
                  </div>
                )}
                {vehicle.build_year && (
                  <div>
                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Build Year</div>
                    <div className="text-base font-semibold text-[#232323]">{vehicle.build_year}</div>
                  </div>
                )}
                {vehicle.vin_last4 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">VIN (last 4)</div>
                    <div className="text-base font-semibold text-[#232323] font-mono">****{vehicle.vin_last4}</div>
                  </div>
                )}
                {vehicle.primary_color && (
                  <div>
                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Color</div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border border-gray-300" style={{ background: vehicle.primary_color.startsWith('#') ? vehicle.primary_color : '#ccc' }} />
                      <div className="text-base font-semibold text-[#232323]">{vehicle.primary_color}</div>
                    </div>
                  </div>
                )}
              </div>
              {vehicle.bio && <p className="text-gray-700 leading-relaxed text-base">{vehicle.bio}</p>}
            </div>
            {experience?.statistics?.career && experience.statistics.career.starts > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-8">
                <h3 className="text-lg font-semibold text-[#232323] mb-4">Career Performance</h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                  {[['Starts', experience.statistics.career.starts], ['Wins', experience.statistics.career.wins], ['Podiums', experience.statistics.career.podiums], ['Top 5', experience.statistics.career.top5], ['Top 10', experience.statistics.career.top10], ['Championships', experience.statistics.career.championships]].map(([label, val]) => (
                    <div key={label} className="bg-gray-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-black text-[#232323]">{val}</div>
                      <div className="text-xs text-gray-600 uppercase tracking-wide mt-1">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* HISTORY */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-black text-[#232323] mb-6">Vehicle History</h2>
            <VehicleHistoryPanel history={experience?.history} />
          </div>
        )}

        {/* CHASSIS */}
        {activeTab === 'chassis' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-black text-[#232323] mb-6">Chassis History</h2>
            <VehicleChassisHistory chassis={experience?.chassis} />
          </div>
        )}

        {/* ENGINE */}
        {activeTab === 'engine' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-black text-[#232323] mb-6">Engine History</h2>
            <VehicleEngineHistory engine={experience?.engine} />
          </div>
        )}

        {/* TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-black text-[#232323] mb-6">Career Timeline</h2>
            <VehicleTimeline timeline={experience?.timeline || []} />
          </div>
        )}

        {/* STATISTICS */}
        {activeTab === 'stats' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-black text-[#232323] mb-6">Statistics</h2>
            <VehicleStatisticsBreakdown statistics={experience?.statistics} />
          </div>
        )}

        {/* ACHIEVEMENTS */}
        {activeTab === 'achievements' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-black text-[#232323] mb-6">Achievements</h2>
            <VehicleAchievementsGrid achievements={experience?.achievements || []} />
          </div>
        )}

        {/* MEDIA */}
        {activeTab === 'media' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-black text-[#232323] mb-6">Media</h2>
            {experience?.media?.outlet_stories && experience.media.outlet_stories.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {experience.media.outlet_stories.map(story => (
                  <Link key={story.id} to={story.slug ? `/story/${story.slug}` : `/OutletStoryPage?id=${story.id}`} className="block border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    {story.cover_image_url && <img src={story.cover_image_url} alt={story.title} className="w-full h-32 object-cover" />}
                    <div className="p-4">
                      <div className="font-semibold text-[#232323] text-sm">{story.title}</div>
                      {story.subtitle && <div className="text-xs text-gray-500 mt-1">{story.subtitle}</div>}
                      <div className="text-xs text-gray-400 mt-2">{story.published_date ? new Date(story.published_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}</div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 text-gray-600">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>No media coverage yet. Stories mentioning this vehicle will appear here.</p>
              </div>
            )}
          </div>
        )}

        {/* EVENTS — events this vehicle participated in (from experience timeline) */}
        {activeTab === 'events' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-black text-[#232323] mb-6">Events</h2>
            {experience?.timeline?.length > 0 ? (
              <div className="space-y-3">
                {experience.timeline
                  .filter(t => t.event_id || t.event?.id)
                  .map((t, i) => {
                    const event = t.event || { id: t.event_id, name: t.event_name, event_date: t.date, profile_url: t.event?.profile_url };
                    return (
                      <Link
                        key={t.event_id || t.event?.id || i}
                        to={event.profile_url || (event.slug ? `/events/${event.slug}` : `/EventProfile?id=${event.id}`)}
                        className="block p-4 border border-gray-200 rounded-lg hover:border-[#00FFDA] hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-[#232323]">{event.name || t.event_name || 'Unnamed Event'}</h4>
                            <p className="text-sm text-gray-500">
                              {t.date ? safeDateFormat(t.date) : event.event_date ? safeDateFormat(event.event_date) : 'TBA'}
                              {t.series?.name && ` · ${t.series.name}`}
                              {t.track?.name && ` · ${t.track.name}`}
                            </p>
                          </div>
                          {t.result?.position && <Badge className="bg-blue-100 text-blue-800 text-xs">P{t.result.position}</Badge>}
                        </div>
                      </Link>
                    );
                  })}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 text-gray-600">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>No event history available. Events this vehicle participated in will appear here.</p>
              </div>
            )}
          </div>
        )}

        {/* SPONSORS */}
        {activeTab === 'sponsors' && vehicle?.id && (
          <EntitySponsorsTab targetEntityType="Vehicle" targetEntityId={vehicle.id} />
        )}
      </div>
    </PageShell>
  );
}