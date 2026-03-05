import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Clock, ShieldCheck, ShieldAlert } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { differenceInDays, differenceInHours, format, isPast } from 'date-fns';

const LEGITIMACY_BADGE = {
  confirmed:            { cls: 'bg-green-900/50 text-green-300', icon: ShieldCheck, label: 'Confirmed' },
  pending_confirmation: { cls: 'bg-amber-900/50 text-amber-300', icon: Clock, label: 'Pending confirmation' },
  rejected:             { cls: 'bg-red-900/50 text-red-300', icon: ShieldAlert, label: 'Rejected' },
};

export default function EventStatusCard({ selectedEvent, selectedTrack, dashboardContext }) {
  const queryClient = useQueryClient();
  const [track, setTrack] = useState(selectedTrack);
  const [timeInfo, setTimeInfo] = useState(null);

  const { data: fetchedTrack, isLoading: trackLoading } = useQuery({
    queryKey: ['track', selectedEvent?.track_id],
    queryFn: () => selectedEvent?.track_id ? base44.entities.Track.get(selectedEvent.track_id) : null,
    enabled: !!selectedEvent?.track_id && !selectedTrack,
  });

  useEffect(() => {
    if (fetchedTrack) setTrack(fetchedTrack);
    else if (selectedTrack) setTrack(selectedTrack);
  }, [fetchedTrack, selectedTrack]);

  useEffect(() => {
    if (!selectedEvent?.event_date) return;

    const updateTimeInfo = () => {
      const eventDate = new Date(selectedEvent.event_date);
      const now = new Date();
      const isPastEvent = isPast(eventDate);

      if (selectedEvent.status === 'Draft' || selectedEvent.status === 'Published') {
        const daysUntil = differenceInDays(eventDate, now);
        const hoursUntil = differenceInHours(eventDate, now) % 24;
        setTimeInfo(`${daysUntil}d ${hoursUntil}h until event`);
      } else if (selectedEvent.status === 'Live' || selectedEvent.status === 'Completed') {
        const hoursSince = differenceInHours(now, eventDate);
        const daysSince = Math.floor(hoursSince / 24);
        setTimeInfo(`${daysSince}d ${hoursSince % 24}h since start`);
      }
    };

    updateTimeInfo();
    const interval = setInterval(updateTimeInfo, 60000);
    return () => clearInterval(interval);
  }, [selectedEvent]);

  const statusColor = useMemo(() => {
    switch (selectedEvent?.status) {
      case 'Draft': return 'bg-gray-700 text-gray-100';
      case 'Published': return 'bg-blue-700/50 text-blue-100';
      case 'Live': return 'bg-green-700/50 text-green-100';
      case 'Completed': return 'bg-slate-700/50 text-slate-100';
      default: return 'bg-gray-700 text-gray-100';
    }
  }, [selectedEvent?.status]);

  return (
    <Card className="bg-[#171717] border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Calendar className="w-4 h-4" /> Event Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs text-gray-400 mb-1">Event Name</p>
          <p className="text-sm font-semibold text-white">{selectedEvent?.name}</p>
        </div>

        {track && (
          <div>
            <p className="text-xs text-gray-400 mb-1">Track</p>
            <div className="flex items-center gap-2">
              <MapPin className="w-3 h-3 text-gray-500" />
              <p className="text-sm text-gray-200">{track.name}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-400 mb-1">Start Date</p>
            <p className="text-sm font-mono text-gray-200">{selectedEvent?.event_date}</p>
          </div>
          {selectedEvent?.end_date && (
            <div>
              <p className="text-xs text-gray-400 mb-1">End Date</p>
              <p className="text-sm font-mono text-gray-200">{selectedEvent.end_date}</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Badge className={`${statusColor} text-xs`}>
            {selectedEvent?.status || 'Unknown'}
          </Badge>
          {timeInfo && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {timeInfo}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}