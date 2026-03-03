import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import BurnoutSpinner from '@/components/shared/BurnoutSpinner';
import { Search, Plus, Pencil, Trash2, ArrowLeft, Sparkles, ArrowUpDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { format } from 'date-fns';
import AddEventForm from '@/components/management/AddEventForm';
import EventCoreDetailsSection from '@/components/management/EventManagement/EventCoreDetailsSection';
import EventSessionsSection from '@/components/management/EventManagement/EventSessionsSection';
import EventResultsSection from '@/components/management/EventManagement/EventResultsSection';
import EventResultsInputSection from '@/components/management/EventManagement/EventResultsInputSection';
import AIEventGenerator from '@/components/management/AIEventGenerator';
import ActivityTab from '@/components/management/ActivityTab';
import PublishTab from '@/components/management/PublishTab';

export default function ManageEvents() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventForEdit, setSelectedEventForEdit] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [sortBy, setSortBy] = useState('date_desc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [deletingEventId, setDeletingEventId] = useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const isAdmin = user?.role === 'admin';

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('id', 500),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, event }) => {
      await base44.entities.Event.delete(id);
      await base44.functions.invoke('logDeletion', { entityName: 'Event', recordIds: [id], recordNames: [event?.name] });
    },
    onSuccess: () => {
      setDeletingEventId(null);
      queryClient.invalidateQueries({ queryKey: ['events'] });
      alert('Event deleted successfully');
    },
    onError: (error) => {
      setDeletingEventId(null);
      alert(`Error deleting event: ${error.message}`);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async ({ ids, selectedItems }) => {
      for (const id of ids) {
        await base44.entities.Event.delete(id);
      }
      const names = selectedItems?.map(e => e.name) || [];
      await base44.functions.invoke('logDeletion', { entityName: 'Event', recordIds: ids, recordNames: names });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setSelectedEvents([]);
      alert('Events deleted successfully');
    },
    onError: (error) => {
      alert(`Error deleting events: ${error.message}`);
    },
  });

  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.list(),
  });

  const filteredEvents = useMemo(() => {
    let result = events.filter(event =>
      event.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (statusFilter === 'upcoming') {
      result = result.filter(e => e.status === 'upcoming' || e.status === 'in_progress');
    } else if (statusFilter === 'finished') {
      result = result.filter(e => e.status === 'completed' || e.status === 'cancelled');
    }
    result = [...result].sort((a, b) => {
      const dateA = a.event_date ? new Date(a.event_date + 'T12:00:00') : new Date(0);
      const dateB = b.event_date ? new Date(b.event_date + 'T12:00:00') : new Date(0);
      if (sortBy === 'date_desc') return dateA - dateB;
      if (sortBy === 'date_asc') return dateB - dateA;
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '');
      return 0;
    });
    return result;
  }, [events, searchQuery, sortBy, statusFilter]);

  if (showAIGenerator) {
    return (
      <ManagementLayout currentPage="ManageEvents">
        <div className="max-w-2xl mx-auto px-6 py-12">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => setShowAIGenerator(false)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-4xl font-black">AI Event Generator</h1>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <AIEventGenerator
              tracks={tracks}
              onCancel={() => setShowAIGenerator(false)}
              onSuccess={(newEvent) => {
                setShowAIGenerator(false);
                setSelectedEventForEdit(newEvent);
              }}
            />
          </div>
        </div>
      </ManagementLayout>
    );
  }

  if (showAddForm) {
    return (
      <ManagementLayout currentPage="ManageEvents">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-4xl font-black">Add Event</h1>
          </div>
          <AddEventForm
            tracks={tracks}
            onCancel={() => setShowAddForm(false)}
            onSuccess={(newEvent) => {
              setShowAddForm(false);
              setSelectedEventForEdit(newEvent);
            }}
          />
        </div>
      </ManagementLayout>
    );
  }

  if (selectedEventForEdit) {
    return (
      <ManagementLayout currentPage="ManageEvents">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
            <h3 className="font-bold text-amber-900 mb-1">Operational Control Notice</h3>
            <p className="text-sm text-amber-800">Event lifecycle management is handled exclusively through RegistrationDashboard. This page is limited to metadata maintenance.</p>
          </div>

          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => setSelectedEventForEdit(null)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-4xl font-black mb-2">{selectedEventForEdit.name}</h1>
              <p className="text-gray-600">Manage all event data</p>
            </div>
          </div>

          <Tabs defaultValue="core" className="mt-6">
            <TabsList>
              <TabsTrigger value="core">Core Details</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>
            <TabsContent value="core" className="mt-6">
              <EventCoreDetailsSection event={selectedEventForEdit} isDraftOnly={selectedEventForEdit.status === 'Draft'} />
            </TabsContent>
            <TabsContent value="sessions" className="mt-6">
              <EventSessionsSection event={selectedEventForEdit} />
            </TabsContent>
            <TabsContent value="results" className="mt-6">
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-bold mb-4">Input Results</h2>
                  <EventResultsInputSection eventId={selectedEventForEdit.id} />
                </div>
                <div>
                  <h2 className="text-xl font-bold mb-4">All Results</h2>
                  <EventResultsSection event={selectedEventForEdit} />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ManagementLayout>
    );
  }

  return (
    <ManagementLayout currentPage="ManageEvents">
      <ManagementShell
        title="Events"
        subtitle={`${events.length} total events`}
        actions={activeTab === 'data' ? <>
          <Button variant="outline" onClick={() => setShowAIGenerator(true)} className="border-purple-300 text-purple-700 hover:bg-purple-50"><Sparkles className="w-4 h-4 mr-2" />AI Generate</Button>
          <Button onClick={() => setShowAddForm(true)} className="bg-gray-900"><Plus className="w-4 h-4 mr-2" />Add Event</Button>
        </> : undefined}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="relationships">Relationships</TabsTrigger>
            <TabsTrigger value="publish">Publish</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Total Events</p>
                <p className="text-2xl font-bold text-gray-900">{events.length}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Upcoming</p>
                <p className="text-2xl font-bold text-blue-600">{events.filter(e => e.status === 'upcoming').length}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">In Progress</p>
                <p className="text-2xl font-bold text-green-600">{events.filter(e => e.status === 'in_progress').length}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Completed</p>
                <p className="text-2xl font-bold text-gray-500">{events.filter(e => e.status === 'completed').length}</p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-bold text-amber-900 mb-1">Operational Control Notice</h3>
              <p className="text-sm text-amber-800">Event lifecycle management is handled exclusively through RegistrationDashboard. This page is limited to metadata maintenance.</p>
            </div>
            <Button onClick={() => setShowAddForm(true)} className="w-full bg-[#232323] hover:bg-[#1A3249]">
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <h3 className="font-bold text-amber-900 mb-1">Operational Control Notice</h3>
              <p className="text-sm text-amber-800">Event lifecycle management is handled exclusively through RegistrationDashboard. This page is limited to metadata maintenance.</p>
            </div>

            <div className="mb-4 flex gap-2">
          {['all', 'upcoming', 'finished'].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                statusFilter === f
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {f === 'all' ? 'All' : f === 'upcoming' ? 'Upcoming' : 'Finished'}
            </button>
          ))}
        </div>

        <div className="mb-6 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48">
              <ArrowUpDown className="w-4 h-4 mr-2 text-gray-400" />
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Date (Newest First)</SelectItem>
              <SelectItem value="date_asc">Date (Oldest First)</SelectItem>
              <SelectItem value="name_asc">Name (A–Z)</SelectItem>
              <SelectItem value="name_desc">Name (Z–A)</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && selectedEvents.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={() => {
                if (window.confirm(`Delete ${selectedEvents.length} selected event(s)?`)) {
                  const selectedItems = filteredEvents.filter(e => selectedEvents.includes(e.id));
                  bulkDeleteMutation.mutate({ ids: selectedEvents, selectedItems });
                }
              }}
              disabled={bulkDeleteMutation.isPending}
              className={bulkDeleteMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}
            >
              {bulkDeleteMutation.isPending ? (
                <BurnoutSpinner />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              {bulkDeleteMutation.isPending ? 'Deleting...' : `Delete ${selectedEvents.length}`}
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {isAdmin && <th className="px-6 py-3 text-left w-12">
                    <Checkbox 
                      checked={selectedEvents.length === filteredEvents.length && filteredEvents.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedEvents(filteredEvents.map(e => e.id));
                        } else {
                          setSelectedEvents([]);
                        }
                      }}
                    />
                  </th>}
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase">Series</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-bold uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredEvents.map(event => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    {isAdmin && <td className="px-6 py-4">
                      <Checkbox 
                        checked={selectedEvents.includes(event.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedEvents(prev => [...prev, event.id]);
                          } else {
                            setSelectedEvents(prev => prev.filter(id => id !== event.id));
                          }
                        }}
                      />
                    </td>}
                    <td className="px-6 py-4 font-medium">{event.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{event.series}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {event.event_date ? format(new Date(event.event_date), 'MMM d, yyyy') : 'TBA'}
                      {event.end_date && event.end_date !== event.event_date && (
                        <span className="text-gray-400"> – {format(new Date(event.end_date), 'MMM d')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded ${
                        event.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                        event.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {event.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedEventForEdit(event)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {isAdmin && <Button
                         variant="ghost"
                         size="sm"
                         onClick={() => {
                           if (confirm(`Delete ${event.name}?`)) {
                             setDeletingEventId(event.id);
                             deleteMutation.mutate({ id: event.id, event });
                           }
                         }}
                         disabled={deletingEventId === event.id}
                         className={deletingEventId === event.id ? 'opacity-50 cursor-not-allowed' : ''}
                       >
                         {deletingEventId === event.id ? (
                           <div className="text-gray-400"><BurnoutSpinner /></div>
                         ) : (
                           <Trash2 className="w-4 h-4 text-red-600" />
                         )}
                       </Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            )}
          </TabsContent>

          <TabsContent value="relationships" className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Event Relationships</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Series</p>
                  <p className="text-lg font-semibold">Parent Series</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Track</p>
                  <p className="text-lg font-semibold">Venue</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Sessions</p>
                  <p className="text-lg font-semibold">Race Schedule</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">Manage event relationships by editing the event's sections.</p>
            </div>
          </TabsContent>

          <TabsContent value="publish">
            <PublishTab 
              entityCount={events.length}
              draftCount={0}
              liveCount={events.length}
              hasPublishControl={false}
            />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityTab entityName="Event" />
          </TabsContent>
        </Tabs>
      </ManagementShell>
    </ManagementLayout>
  );
}