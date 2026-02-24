import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, MapPin, Search, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function SeriesTracksSection({ seriesId, seriesName }) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [trackSearch, setTrackSearch] = useState('');
  const [selectedTrackId, setSelectedTrackId] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [roundNumber, setRoundNumber] = useState('');

  // Load events for this series that have a track_id
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['seriesEvents', seriesId],
    queryFn: () => base44.entities.Event.filter({ series: seriesName }),
    enabled: !!seriesName,
  });

  // Load all tracks
  const { data: allTracks = [] } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.list('name', 500),
  });

  const createEventMutation = useMutation({
    mutationFn: (data) => base44.entities.Event.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seriesEvents', seriesId] });
      toast.success('Track event added');
      setShowAddForm(false);
      setSelectedTrackId('');
      setEventName('');
      setEventDate('');
      setRoundNumber('');
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id) => base44.entities.Event.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seriesEvents', seriesId] });
      toast.success('Event removed');
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Event.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seriesEvents', seriesId] });
      toast.success('Event updated');
    },
  });

  const eventsWithTracks = events.filter(e => e.track_id);
  const tracksUsed = new Set(eventsWithTracks.map(e => e.track_id));
  const trackMap = Object.fromEntries(allTracks.map(t => [t.id, t]));

  // Group events by track
  const eventsByTrack = {};
  eventsWithTracks.forEach(ev => {
    if (!eventsByTrack[ev.track_id]) eventsByTrack[ev.track_id] = [];
    eventsByTrack[ev.track_id].push(ev);
  });

  const availableTracks = allTracks.filter(t =>
    t.name?.toLowerCase().includes(trackSearch.toLowerCase())
  );

  const handleAddEvent = () => {
    if (!selectedTrackId || !eventDate) {
      toast.error('Select a track and date');
      return;
    }
    const track = trackMap[selectedTrackId];
    const name = eventName || (track ? `${seriesName} at ${track.name}` : seriesName);
    createEventMutation.mutate({
      name,
      track_id: selectedTrackId,
      series: seriesName,
      event_date: eventDate,
      round_number: roundNumber ? parseInt(roundNumber) : undefined,
      status: 'upcoming',
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary card */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <div className="text-3xl font-black">{Object.keys(eventsByTrack).length}</div>
          <div className="text-sm text-gray-500 mt-1">Unique Tracks</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-black">{eventsWithTracks.length}</div>
          <div className="text-sm text-gray-500 mt-1">Total Events</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-black">
            {eventsWithTracks.filter(e => e.status === 'upcoming').length}
          </div>
          <div className="text-sm text-gray-500 mt-1">Upcoming</div>
        </Card>
      </div>

      {/* Track list grouped */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base font-semibold">Tracks in this Series</CardTitle>
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add Event at Track
          </Button>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="text-sm text-gray-500 py-4">Loading...</div>
          ) : Object.keys(eventsByTrack).length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No track events yet. Add events to link tracks to this series.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(eventsByTrack).map(([trackId, trackEvents]) => {
                const track = trackMap[trackId];
                return (
                  <div key={trackId} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Track header */}
                    <div className="bg-gray-50 px-4 py-3 flex items-center gap-3">
                      {track?.logo_url && (
                        <img src={track.logo_url} alt="" className="h-8 w-8 object-contain rounded" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{track?.name || 'Unknown Track'}</div>
                        <div className="text-xs text-gray-500">
                          {[track?.location_city, track?.location_state].filter(Boolean).join(', ')}
                          {track?.track_type && ` • ${track.track_type}`}
                          {track?.length && ` • ${track.length} mi`}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {trackEvents.length} event{trackEvents.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    {/* Events at this track */}
                    <div className="divide-y divide-gray-100">
                      {trackEvents.sort((a, b) => (a.event_date || '').localeCompare(b.event_date || '')).map(ev => (
                        <div key={ev.id} className="px-4 py-3 flex items-center gap-3">
                          {ev.round_number && (
                            <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600 min-w-[36px] text-center">
                              R{ev.round_number}
                            </span>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{ev.name}</div>
                            <div className="text-xs text-gray-500">
                              {ev.event_date}
                              {ev.end_date && ev.end_date !== ev.event_date && ` – ${ev.end_date}`}
                            </div>
                          </div>
                          <StatusBadge status={ev.status} />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              if (confirm('Remove this event?')) deleteEventMutation.mutate(ev.id);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Event Form */}
      {showAddForm && (
        <Card className="border-2 border-blue-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Add Event at Track</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Search & Select Track</label>
              <Input
                placeholder="Type to search tracks..."
                value={trackSearch}
                onChange={e => setTrackSearch(e.target.value)}
                className="mb-2"
              />
              <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                {availableTracks.slice(0, 20).map(track => (
                  <button
                    key={track.id}
                    onClick={() => { setSelectedTrackId(track.id); setTrackSearch(track.name); }}
                    className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-0 ${
                      selectedTrackId === track.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{track.name}</div>
                      <div className="text-xs text-gray-500">
                        {[track.location_city, track.location_state].filter(Boolean).join(', ')}
                        {track.track_type && ` • ${track.track_type}`}
                      </div>
                    </div>
                  </button>
                ))}
                {availableTracks.length === 0 && (
                  <div className="px-3 py-4 text-sm text-gray-400 text-center">No tracks found</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Event Date *</label>
                <Input
                  type="date"
                  value={eventDate}
                  onChange={e => setEventDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Round #</label>
                <Input
                  type="number"
                  placeholder="e.g. 1"
                  value={roundNumber}
                  onChange={e => setRoundNumber(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Event Name <span className="text-gray-400 font-normal">(optional)</span></label>
              <Input
                placeholder={`Auto: ${seriesName} at [Track Name]`}
                value={eventName}
                onChange={e => setEventName(e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleAddEvent}
                disabled={createEventMutation.isPending || !selectedTrackId || !eventDate}
                className="bg-[#232323]"
              >
                {createEventMutation.isPending ? 'Adding...' : 'Add Event'}
              </Button>
              <Button variant="outline" onClick={() => {
                setShowAddForm(false);
                setSelectedTrackId('');
                setTrackSearch('');
                setEventName('');
                setEventDate('');
                setRoundNumber('');
              }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    upcoming: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status?.replace('_', ' ') || 'upcoming'}
    </span>
  );
}