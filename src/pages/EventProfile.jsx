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
import { format } from 'date-fns';
import SocialShareButtons from '@/components/shared/SocialShareButtons';
import { createPageUrl } from '@/components/utils';

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
        <Link to={createPageUrl('EventDirectory')} className="text-sm text-gray-600 hover:text-[#00FFDA] mb-4 inline-block">
          ← Back to Events
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 items-start">
          <div className="lg:col-span-2">
            <Separator className="mb-3" />
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-4xl font-black text-[#232323] leading-none">{event.name}</h1>
              {event.round_number && (
                <div className="text-2xl font-bold text-gray-600">Round {event.round_number}</div>
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
                  <div className="text-sm text-gray-600 mb-1">Series</div>
                  <div className="text-lg font-semibold text-[#232323] mb-4">{event.series}</div>
                  
                  <div className="text-sm text-gray-600 mb-1">Season</div>
                  <div className="text-lg font-semibold text-[#232323]">{event.season}</div>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                    <Calendar className="w-4 h-4" />
                    Event Date
                  </div>
                  <div className="text-lg font-semibold text-[#232323] mb-4">
                    {event.event_date ? format(new Date(event.event_date), 'MMMM d, yyyy') : 'TBA'}
                  </div>
                  
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
          </div>
        </div>

        <div className="space-y-4">
          <section id="section-sessions" className="bg-white p-8">
            <Separator className="mb-3" />
            <h2 className="text-2xl font-bold text-[#232323] mb-6 mt-3">Sessions</h2>
            {sessions.length > 0 ? (
              <div className="space-y-3">
                {sessions.map(session => (
                  <div key={session.id} className="border border-gray-200 rounded-lg p-4">
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

          <section id="section-results" className="bg-white p-8">
            <Separator className="mb-3" />
            <h2 className="text-2xl font-bold text-[#232323] mb-6 mt-3">Results</h2>
            <p className="text-gray-500">Results will be available after the event.</p>
          </section>
        </div>
      </div>
    </PageShell>
  );
}