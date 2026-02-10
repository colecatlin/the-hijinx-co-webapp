import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import PageShell from '@/components/shared/PageShell';
import SectionHeader from '@/components/shared/SectionHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, MapPin, Plus, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function ScheduleHome() {
  const [seriesFilter, setSeriesFilter] = useState('all');
  const [trackFilter, setTrackFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('Upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-date_start', 200),
  });

  const { data: series = [] } = useQuery({
    queryKey: ['seriesSchedule'],
    queryFn: () => base44.entities.Series.filter({ status: 'Active' }),
  });

  const { data: tracks = [] } = useQuery({
    queryKey: ['tracksSchedule'],
    queryFn: () => base44.entities.Track.filter({ status: 'Active' }),
  });

  const filtered = events.filter(e => {
    const matchesSeries = seriesFilter === 'all' || e.series_id === seriesFilter;
    const matchesTrack = trackFilter === 'all' || e.track_id === trackFilter;
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    const matchesSearch = !searchQuery || e.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSeries && matchesTrack && matchesStatus && matchesSearch;
  });

  const statusColors = {
    Draft: 'bg-gray-200 text-gray-700',
    Upcoming: 'bg-blue-100 text-blue-800',
    Completed: 'bg-green-100 text-green-800',
    Cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto px-6 py-12 md:py-20">
        <div className="flex items-center justify-between mb-8">
          <SectionHeader label="Motorsports" title="Events" subtitle="Upcoming races and events." />
          {user?.role === 'admin' && (
            <Button onClick={() => setShowCreateForm(true)} className="bg-[#232323] hover:bg-[#1A3249]">
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-none text-xs"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44 rounded-none text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Upcoming">Upcoming</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={seriesFilter} onValueChange={setSeriesFilter}>
            <SelectTrigger className="w-44 rounded-none text-xs"><SelectValue placeholder="All Series" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Series</SelectItem>
              {series.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={trackFilter} onValueChange={setTrackFilter}>
            <SelectTrigger className="w-44 rounded-none text-xs"><SelectValue placeholder="All Tracks" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tracks</SelectItem>
              {tracks.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Calendar} title="No events found" message="Events will appear here once scheduled." />
        ) : (
          <div className="space-y-3">
            {filtered.map((event) => (
              <div
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className="border border-gray-200 p-5 flex flex-col md:flex-row md:items-center gap-4 hover:border-gray-400 transition-colors cursor-pointer"
              >
                {event.hero_image && (
                  <img src={event.hero_image} alt={event.name} className="w-full md:w-24 h-16 object-cover" />
                )}
                <div className="w-16 text-center shrink-0">
                  <span className="font-mono text-[10px] text-gray-400 uppercase">{format(new Date(event.date_start), 'MMM')}</span>
                  <p className="text-2xl font-black">{format(new Date(event.date_start), 'd')}</p>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-sm mb-1">{event.name}</h3>
                  <div className="flex flex-wrap items-center gap-3">
                    {event.series_name && <span className="font-mono text-[10px] text-gray-400 tracking-wider">{event.series_name}</span>}
                    {event.track_name && (
                      <span className="flex items-center gap-1 text-[10px] text-gray-400">
                        <MapPin className="w-3 h-3" /> {event.track_name}
                      </span>
                    )}
                    <Badge className={statusColors[event.status]}>{event.status}</Badge>
                  </div>
                </div>
                {event.date_end && event.date_end !== event.date_start && (
                  <span className="text-xs text-gray-400 font-mono">
                    {format(new Date(event.date_start), 'MMM d')} – {format(new Date(event.date_end), 'MMM d')}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Event Detail Modal */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">{selectedEvent?.name}</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              {selectedEvent.hero_image && (
                <img src={selectedEvent.hero_image} alt={selectedEvent.name} className="w-full h-64 object-cover rounded-lg" />
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-600 mb-1">Date</div>
                  <div className="font-semibold">
                    {format(new Date(selectedEvent.date_start), 'MMM d, yyyy')}
                    {selectedEvent.date_end && selectedEvent.date_end !== selectedEvent.date_start && 
                      ` – ${format(new Date(selectedEvent.date_end), 'MMM d, yyyy')}`}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">Status</div>
                  <Badge className={statusColors[selectedEvent.status]}>{selectedEvent.status}</Badge>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">Track</div>
                  <div className="font-semibold">{selectedEvent.track_name}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">Series</div>
                  <div className="font-semibold">{selectedEvent.series_name}</div>
                </div>
                {selectedEvent.event_type && (
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Event Type</div>
                    <div className="font-semibold">{selectedEvent.event_type}</div>
                  </div>
                )}
              </div>
              {selectedEvent.summary && (
                <div>
                  <div className="text-xs text-gray-600 mb-1">Summary</div>
                  <p className="text-gray-700">{selectedEvent.summary}</p>
                </div>
              )}
              <div className="flex gap-3">
                {selectedEvent.ticket_url && (
                  <a href={selectedEvent.ticket_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Tickets
                    </Button>
                  </a>
                )}
                {selectedEvent.livestream_url && (
                  <a href={selectedEvent.livestream_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Livestream
                    </Button>
                  </a>
                )}
                {selectedEvent.results_url && (
                  <a href={selectedEvent.results_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Results
                    </Button>
                  </a>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Event Form */}
      {showCreateForm && <EventCreateForm onClose={() => setShowCreateForm(false)} />}
    </PageShell>
  );
}

function EventCreateForm({ onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    date_start: '',
    date_end: '',
    track_id: '',
    series_id: '',
    status: 'Draft',
    event_type: 'Race Weekend',
    summary: '',
    ticket_url: '',
    livestream_url: '',
    results_url: '',
    hero_image: '',
  });

  const { data: series = [] } = useQuery({
    queryKey: ['seriesSchedule'],
    queryFn: () => base44.entities.Series.filter({ status: 'Active' }),
  });

  const { data: tracks = [] } = useQuery({
    queryKey: ['tracksSchedule'],
    queryFn: () => base44.entities.Track.filter({ status: 'Active' }),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const selectedTrack = tracks.find(t => t.id === formData.track_id);
      const selectedSeries = series.find(s => s.id === formData.series_id);
      const slug = `${formData.name.toLowerCase().replace(/\s+/g, '-')}-${formData.date_start}`;
      
      await base44.entities.Event.create({
        ...formData,
        slug,
        track_name: selectedTrack?.name,
        series_name: selectedSeries?.name,
      });
      
      queryClient.invalidateQueries(['events']);
      toast.success('Event created successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to create event');
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Event Name *</label>
            <Input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="rounded-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Start Date *</label>
              <Input
                required
                type="date"
                value={formData.date_start}
                onChange={(e) => setFormData({ ...formData, date_start: e.target.value })}
                className="rounded-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">End Date</label>
              <Input
                type="date"
                value={formData.date_end}
                onChange={(e) => setFormData({ ...formData, date_end: e.target.value })}
                className="rounded-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Track *</label>
              <Select required value={formData.track_id} onValueChange={(val) => setFormData({ ...formData, track_id: val })}>
                <SelectTrigger className="rounded-none"><SelectValue placeholder="Select track" /></SelectTrigger>
                <SelectContent>
                  {tracks.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Series *</label>
              <Select required value={formData.series_id} onValueChange={(val) => setFormData({ ...formData, series_id: val })}>
                <SelectTrigger className="rounded-none"><SelectValue placeholder="Select series" /></SelectTrigger>
                <SelectContent>
                  {series.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Upcoming">Upcoming</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Event Type</label>
              <Select value={formData.event_type} onValueChange={(val) => setFormData({ ...formData, event_type: val })}>
                <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Race Weekend">Race Weekend</SelectItem>
                  <SelectItem value="Single Day">Single Day</SelectItem>
                  <SelectItem value="Festival">Festival</SelectItem>
                  <SelectItem value="Test">Test</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Summary</label>
            <Input
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              className="rounded-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Hero Image URL</label>
            <Input
              value={formData.hero_image}
              onChange={(e) => setFormData({ ...formData, hero_image: e.target.value })}
              className="rounded-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Ticket URL</label>
            <Input
              value={formData.ticket_url}
              onChange={(e) => setFormData({ ...formData, ticket_url: e.target.value })}
              className="rounded-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Livestream URL</label>
            <Input
              value={formData.livestream_url}
              onChange={(e) => setFormData({ ...formData, livestream_url: e.target.value })}
              className="rounded-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Results URL</label>
            <Input
              value={formData.results_url}
              onChange={(e) => setFormData({ ...formData, results_url: e.target.value })}
              className="rounded-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-[#232323] hover:bg-[#1A3249]">Create Event</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}