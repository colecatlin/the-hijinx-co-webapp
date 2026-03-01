import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function EventStatusCard({ event, track }) {
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (!event?.event_date) return;

    const updateCountdown = () => {
      const eventDate = new Date(event.event_date);
      const now = new Date();

      if (eventDate <= now) {
        if (event.status === 'in_progress') {
          setCountdown('Live');
        } else {
          setCountdown('Completed');
        }
        return;
      }

      const diff = eventDate - now;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setCountdown(`${days}d ${hours}h ${minutes}m`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [event?.event_date, event?.status]);

  const statusColor = {
    upcoming: 'bg-blue-500/20 text-blue-400',
    in_progress: 'bg-green-500/20 text-green-400',
    completed: 'bg-gray-500/20 text-gray-400',
    cancelled: 'bg-red-500/20 text-red-400',
  }[event?.status] || 'bg-gray-500/20 text-gray-400';

  return (
    <Card className="bg-[#171717] border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Event Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <div className="text-xl font-bold text-white">{event?.name || 'No Event'}</div>
            {track && <div className="text-xs text-gray-500">{track.name}</div>}
          </div>
          <div className="flex flex-col gap-1 text-xs text-gray-400">
            <div>Start: {event?.event_date || '—'}</div>
            {event?.end_date && <div>End: {event.end_date}</div>}
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusColor}>{event?.status || 'unknown'}</Badge>
            {countdown && <span className="text-xs text-gray-500">{countdown}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}