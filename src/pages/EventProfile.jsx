import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { MapPin, Calendar, Trophy, Flag, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';
import SocialShareButtons from '@/components/shared/SocialShareButtons';
import { createPageUrl } from '@/components/utils';
import ResultsPanel from '@/components/results/ResultsPanel';
import EventResultsSubmissionForm from '@/components/EventResultsSubmissionForm';
import EventResultsInputSection from '@/components/management/EventManagement/EventResultsInputSection';

export default function EventProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id');
  const [activeSection, setActiveSection] = useState('overview');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list(),
  });

  const event = events.find(e => e.id === eventId);

  const { data: sessions = [] } = useQuery({
    queryKey: ['eventSessions', eventId],
    queryFn: () => base44.entities.Session.filter({ event_id: eventId }),
    enabled: !!eventId,
  });

  const { data: track } = useQuery({
    queryKey: ['track', event?.track_id],
    queryFn: () => base44.entities.Track.filter({ id: event.track_id }).then(tracks => tracks[0]),
    enabled: !!event?.track_id,
  });

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

  if (!event) {
    return (
      <PageShell className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-12 text-center">
          <p className="text-gray-600 mb-4">Event not found</p>
          <Link to={createPageUrl('EventDirectory')}>
            <Button>Back to Events</Button>
          </Link>
        </div>
      </PageShell>
    );
  }

  const sections = [
    { id: 'overview', label: 'Overview', icon: MapPin },
    { id: 'sessions', label: 'Sessions', icon: Calendar },
    { id: 'results', label: 'Results', icon: Trophy },
  ];

  return (
    <PageShell className="bg-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-4">
          <Link to={createPageUrl('EventDirectory')} className="text-sm text-gray-600 hover:text-[#00FFDA]">
            ← Back to Events
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 items-start">
          <div className="lg:col-span-2">
            <Separator className="mb-3" />
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-black text-[#232323] leading-none">{event.name}</h1>
              {event.round_number && (
                <div className="text-xl font-bold text-gray-500">Rnd {event.round_number}</div>
              )}
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
                  {event.series && (
                    <div className="mb-4">
                      <div className="text-sm text-gray-600 mb-1">Series</div>
                      <div className="text-lg font-semibold text-[#232323]">{event.series}</div>
                    </div>
                  )}
                  {event.season && (
                    <div className="mb-4">
                      <div className="text-sm text-gray-600 mb-1">Season</div>
                      <div className="text-lg font-semibold text-[#232323]">{event.season}</div>
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                    <Calendar className="w-4 h-4" />
                    Event Date
                  </div>
                  <div className="text-lg font-semibold text-[#232323] mb-1">
                    {event.event_date ? format(new Date(event.event_date), 'MMMM d, yyyy') : 'TBA'}
                    {event.end_date && event.end_date !== event.event_date && (
                      <span className="text-gray-500"> – {format(new Date(event.end_date), 'MMMM d, yyyy')}</span>
                    )}
                  </div>
                  {(() => {
                    if (!event.event_date || event.status === 'completed' || event.status === 'cancelled') return null;
                    if (event.status === 'in_progress') return <div className="text-sm font-bold text-green-600 mb-4">In Progress</div>;
                    const days = differenceInCalendarDays(parseISO(event.event_date), new Date());
                    if (days < 0) return null;
                    if (days === 0) return <div className="text-sm font-bold text-green-600 mb-4">Today</div>;
                    return <div className="text-sm font-bold text-orange-500 mb-4">In {days} day{days !== 1 ? 's' : ''}</div>;
                  })()}
                  {track && (
                    <div>
                      <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                        <MapPin className="w-4 h-4" />
                        Venue
                      </div>
                      <div className="text-lg font-semibold text-[#232323]">{track.name}</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-6">
                <Badge className={`${
                  event.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                  event.status === 'in_progress' ? 'bg-green-100 text-green-800' :
                  event.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {event.status}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-6 relative -mt-1">
            <div className="absolute -top-12 right-0 z-10">
              <SocialShareButtons 
                url={window.location.href}
                title={`${event.name} - Event`}
                description=""
              />
            </div>
            {track && (
              <div className="bg-white border border-gray-200 p-6">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Venue</div>
                <div className="font-bold text-[#232323] text-lg mb-1">{track.name}</div>
                {(track.location_city || track.location_state) && (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <MapPin className="w-3 h-3" />
                    {[track.location_city, track.location_state, track.location_country].filter(Boolean).join(', ')}
                  </div>
                )}
                {track.track_type && (
                  <div className="text-sm text-gray-500 mt-2">{track.track_type}</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <section id="section-sessions" className="bg-white border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Sessions</h2>
            {sessions.length > 0 ? (
              <div className="space-y-3">
                {sessions.map(session => (
                  <div key={session.id} className="border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold">{session.name}</div>
                        <div className="text-sm text-gray-600">{session.session_type}</div>
                      </div>
                      <Badge className={`${
                        session.status === 'completed' ? 'bg-green-100 text-green-800' :
                        session.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {session.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No sessions scheduled yet.</p>
            )}
          </section>

          <section id="section-results" className="bg-white border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Results & Standings</h2>
            <ResultsPanel eventId={eventId} seriesName={event.series} />
          </section>
        </div>
      </div>
    </PageShell>
  );
}