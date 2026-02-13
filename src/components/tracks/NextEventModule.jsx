import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, Trophy, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

export default function NextEventModule({ trackId }) {
  const [modalOpen, setModalOpen] = useState(false);

  const { data: nextEvent } = useQuery({
    queryKey: ['nextEvent', trackId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const events = await base44.entities.Event.filter({
        track_id: trackId,
        status: 'Published'
      });
      const upcoming = events
        .filter(e => e.start_date >= today)
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
      return upcoming[0];
    }
  });

  const { data: series } = useQuery({
    queryKey: ['series', nextEvent?.series_id],
    queryFn: () => base44.entities.Series.filter({ id: nextEvent.series_id }),
    enabled: !!nextEvent?.series_id
  });

  const { data: classes } = useQuery({
    queryKey: ['classes', nextEvent?.series_id],
    queryFn: () => base44.entities.Class.filter({ series_id: nextEvent.series_id, status: 'Published' }),
    enabled: !!nextEvent?.series_id
  });

  const { data: entries } = useQuery({
    queryKey: ['entries', nextEvent?.id],
    queryFn: () => base44.entities.EventEntry.filter({ event_id: nextEvent.id, status: 'Published' }),
    enabled: !!nextEvent?.id
  });

  const { data: sessions } = useQuery({
    queryKey: ['sessions', nextEvent?.id],
    queryFn: () => base44.entities.Session.filter({ event_id: nextEvent.id, status: 'Published' }),
    enabled: !!nextEvent?.id
  });

  const { data: drivers } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.filter({ status: 'Published' }),
    enabled: !!entries && entries.length > 0
  });

  if (!nextEvent) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Next Event</h2>
        <p className="text-gray-600">No upcoming events scheduled</p>
      </div>
    );
  }

  const topDrivers = entries
    ?.slice(0, 5)
    .map(e => drivers?.find(d => d.id === e.driver_id))
    .filter(Boolean) || [];

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Next Event</h2>
        <div className="space-y-3">
          <h3 className="text-2xl font-bold">{nextEvent.name}</h3>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>{new Date(nextEvent.start_date).toLocaleDateString()}</span>
            {nextEvent.end_date && nextEvent.end_date !== nextEvent.start_date && (
              <span>- {new Date(nextEvent.end_date).toLocaleDateString()}</span>
            )}
          </div>
          {series && series[0] && (
            <div className="flex items-center gap-2 text-gray-600">
              <Trophy className="w-4 h-4" />
              <span>{series[0].name}</span>
            </div>
          )}
          <Button onClick={() => setModalOpen(true)} className="mt-4">
            View Details
          </Button>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{nextEvent.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold mb-2">Event Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(nextEvent.start_date).toLocaleDateString()}</span>
                  {nextEvent.end_date && nextEvent.end_date !== nextEvent.start_date && (
                    <span>- {new Date(nextEvent.end_date).toLocaleDateString()}</span>
                  )}
                </div>
                {series && series[0] && (
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    <span>{series[0].name}</span>
                  </div>
                )}
                {nextEvent.purse_total && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    <span>Prize Purse: ${nextEvent.purse_total.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {classes && classes.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Classes</h4>
                <div className="flex flex-wrap gap-2">
                  {classes.map(c => (
                    <span key={c.id} className="px-3 py-1 bg-gray-100 text-sm rounded">
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {topDrivers.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Registered Drivers (Top 5)</h4>
                <div className="space-y-2">
                  {topDrivers.map(driver => (
                    <div key={driver.id} className="text-sm">
                      {driver.first_name} {driver.last_name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sessions && sessions.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Event Schedule</h4>
                <div className="space-y-2">
                  {sessions.map(session => (
                    <div key={session.id} className="flex justify-between text-sm">
                      <span>{session.name}</span>
                      <span className="text-gray-600">
                        {session.start_time ? new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Link to={createPageUrl('EventHub', { slug: nextEvent.slug })}>
                <Button>View Full Event</Button>
              </Link>
              <Link to={createPageUrl('EventHub', { slug: nextEvent.slug, tab: 'entries' })}>
                <Button variant="outline">View Entries</Button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}