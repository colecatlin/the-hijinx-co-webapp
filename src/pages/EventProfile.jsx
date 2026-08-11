import React, { useState, useMemo, useEffect } from 'react';
import SeoMeta, { buildEntityTitle, SITE_FALLBACK_IMAGE } from '@/components/system/seoMeta';
import Analytics from '@/components/system/analyticsTracker';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { getEventProfileData } from '@/components/entities/publicPageDataApi';
import PageShell from '@/components/shared/PageShell';
import MobileBackHeader from '@/components/shared/MobileBackHeader';
import { EntityNotFound, EntityUnavailable } from '@/components/data/EntityNotFoundState';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Calendar, Trophy, Flag, AlertCircle, ExternalLink, List, Users, Clock, Award, Image, BarChart, Handshake } from 'lucide-react';
import EntitySponsorsTab from '@/components/shared/EntitySponsorsTab';
import EntityBreadcrumbs from '@/components/shared/EntityBreadcrumbs';
import ProfileClaimFooter from '@/components/onboarding/ProfileClaimFooter';
import { Link } from 'react-router-dom';
import { format, differenceInCalendarDays, parseISO, isValid } from 'date-fns';
import SocialShareButtons from '@/components/shared/SocialShareButtons';
import { createPageUrl } from '@/components/utils';
import { isEventPublic } from '@/components/system/publishHelpers';

import EventOverview from '@/components/events/EventOverview';
import EventScheduleView from '@/components/events/EventScheduleView';
import EventEntryList from '@/components/events/EventEntryList';
import EventClassesGrid from '@/components/events/EventClassesGrid';
import EventResultsView from '@/components/events/EventResultsView';
import EventStandingsImpact from '@/components/events/EventStandingsImpact';
import EventTimeline from '@/components/events/EventTimeline';
import EventVenueInfo from '@/components/events/EventVenueInfo';
import EventMediaSection from '@/components/events/EventMediaSection';

function safeDateFormat(dateStr, fmt = 'MMMM d, yyyy') {
  if (!dateStr) return 'TBA';
  try { const d = parseISO(dateStr); return isValid(d) ? format(d, fmt) : 'TBA'; } catch { return 'TBA'; }
}
function safeDaysUntil(dateStr) {
  if (!dateStr) return null;
  try { return differenceInCalendarDays(parseISO(dateStr), new Date()); } catch { return null; }
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: MapPin },
  { id: 'schedule', label: 'Schedule', icon: Clock },
  { id: 'entries', label: 'Entries', icon: Users },
  { id: 'classes', label: 'Classes', icon: Flag },
  { id: 'results', label: 'Results', icon: Trophy },
  { id: 'standings', label: 'Standings', icon: BarChart },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'venue', label: 'Venue', icon: MapPin },
  { id: 'media', label: 'Media', icon: Image },
  { id: 'sponsors', label: 'Sponsors', icon: Handshake },
];

export default function EventProfile({ routeSlug }) {
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = (urlParams.get('id') || '').trim() || null;
  const eventSlug = routeSlug || (urlParams.get('slug') || '').trim() || null;
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedClassId, setSelectedClassId] = useState('');

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me(), retry: false });
  const { data: isAuthenticated } = useQuery({ queryKey: ['isAuthenticated'], queryFn: () => base44.auth.isAuthenticated(), retry: false });

  // Phase 13: Try getEventExperience backend function first, fall back to legacy data loader
  const { data: experienceData, isLoading: isLoadingExp } = useQuery({
    queryKey: ['eventExperience', eventId, eventSlug],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke('getEventExperience', { event_id: eventId, slug: eventSlug });
        return res.data;
      } catch {
        return null;
      }
    },
    enabled: !!(eventId || eventSlug),
  });

  // Fallback: legacy data loader
  const { data: legacyData, isLoading: isLoadingLegacy } = useQuery({
    queryKey: ['eventProfileData', eventId, eventSlug],
    queryFn: () => getEventProfileData({ id: eventId, slug: eventSlug }),
    enabled: !!(eventId || eventSlug) && !experienceData,
  });

  const isLoading = isLoadingExp && !experienceData && isLoadingLegacy && !legacyData;

  // Use experience data if available, otherwise fall back to legacy
  const event = experienceData?.event || legacyData?.event || null;
  const track = experienceData?.track || legacyData?.track || null;
  const series = experienceData?.series || legacyData?.series || null;
  const sessions = experienceData?.sessions || legacyData?.sessions || [];
  const classes = experienceData?.classes || legacyData?.classes || [];
  const entries = experienceData?.entries || [];
  const racers = experienceData?.racers || [];
  const teams = experienceData?.teams || [];
  const vehicles = experienceData?.vehicles || [];
  const qualifying = experienceData?.qualifying || [];
  const heatFeatureResults = experienceData?.heat_feature_results || [];
  const standingsImpact = experienceData?.standings_impact || { available: false, leaders: [] };
  const timeline = experienceData?.timeline || [];
  const statistics = experienceData?.statistics || null;
  const sponsors = experienceData?.sponsors || null;
  const media = experienceData?.media || null;
  const history = experienceData?.history || null;
  const spectatorInfo = experienceData?.spectator_info || event?.spectator_info || null;
  const seo = experienceData?.seo || null;

  const isPublicEvent = event && isEventPublic(event);
  const canViewDraft = user?.role === 'admin' && event?.status === 'Draft';
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (event) Analytics.profileViewEvent(event.id, event.name, event.status);
  }, [event?.id]);

  if (isLoading) {
    return (
      <PageShell>
        <div className="max-w-7xl mx-auto px-6 py-12">
          <Skeleton className="h-12 w-64 mb-4" />
          <Skeleton className="h-96" />
        </div>
      </PageShell>
    );
  }

  if (!event) return <EntityNotFound entityType="Event" />;
  if (!isPublicEvent && !canViewDraft) return <EntityUnavailable entityType="Event" />;

  const heroImg = event.event_cover_image_url || track?.image_url || null;
  const eventTitle = event.season ? `${event.season} ${event.name}` : event.name;
  const eventDesc = seo?.description || [track?.name ? `At ${track.name}` : '', event.event_date ? `on ${safeDateFormat(event.event_date)}` : '', series?.name ? `— ${series.name}` : ''].filter(Boolean).join(' ') || `${event.name} event details on HIJINX.`;
  const daysUntil = safeDaysUntil(event.event_date);

  return (
    <PageShell className="light-page">
      <SeoMeta
        title={seo?.title || buildEntityTitle(eventTitle, 'Event')}
        description={eventDesc}
        image={seo?.image || heroImg || undefined}
      />
      {seo?.structured_data && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(seo.structured_data) }} />
      )}

      <MobileBackHeader tone="light" title={eventTitle} to={createPageUrl('EventDirectory')} />

      {/* HERO */}
      <div className="hero-dark relative w-full h-[300px] bg-[#0A0A0A] overflow-hidden">
        {heroImg ? (
          <>
            <img src={heroImg} alt={event.name} className="w-full h-full object-cover opacity-50" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/30 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-[#0A0A0A]" />
        )}
        <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-6 pb-8">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              {event.round_number && <div className="text-white/50 text-sm font-medium mb-1">Round {event.round_number}</div>}
              <h1 className="text-4xl md:text-5xl font-black text-white leading-none">{eventTitle}</h1>
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-white/60">
                {track?.name && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{track.name}</span>}
                {event.event_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{safeDateFormat(event.event_date)}</span>}
                {series?.name && <span>{series.name}</span>}
              </div>
            </div>
            <div className="pb-2 flex-shrink-0 flex items-center gap-2">
              <SocialShareButtons url={window.location.href} title={`${event.name} - Event`} description={eventDesc} />
            </div>
          </div>
        </div>
      </div>

      {/* NAV */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-2 pt-2">
            <EntityBreadcrumbs entityType="Event" entityName={event.name} />
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'text-black border-b-2 border-[#00FFDA] -mb-px' : 'text-gray-500 hover:text-black'}`}
                >
                  <Icon className="w-3.5 h-3.5" />{tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <EventOverview event={event} series={series} track={track} statistics={statistics} seo={seo} />
        )}

        {activeTab === 'schedule' && (
          <EventScheduleView schedule={experienceData?.schedule || []} />
        )}

        {activeTab === 'entries' && (
          <EventEntryList entries={entries} classes={classes} />
        )}

        {activeTab === 'classes' && (
          <EventClassesGrid
            classes={classes}
            onJumpToSessions={(classId) => { setSelectedClassId(classId); setActiveTab('schedule'); }}
          />
        )}

        {activeTab === 'results' && (
          <EventResultsView
            sessions={sessions}
            qualifying={qualifying}
            heat_feature_results={heatFeatureResults}
          />
        )}

        {activeTab === 'standings' && (
          <EventStandingsImpact standingsImpact={standingsImpact} series={series} event={event} />
        )}

        {activeTab === 'timeline' && (
          <EventTimeline timeline={timeline} />
        )}

        {activeTab === 'venue' && (
          <EventVenueInfo track={track} spectatorInfo={spectatorInfo} event={event} />
        )}

        {activeTab === 'media' && (
          <EventMediaSection media={media} sponsors={sponsors} history={history} />
        )}

        {activeTab === 'sponsors' && event?.id && (
          <EntitySponsorsTab targetEntityType="Event" targetEntityId={event.id} />
        )}

        <ProfileClaimFooter entityType="Event" entityId={event?.id} entityName={event.name} />
      </div>
    </PageShell>
  );
}