import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Pencil, Trash2, ArrowLeft, Sparkles, ArrowUpDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { format } from 'date-fns';
import AddEventForm from '@/components/management/AddEventForm';
import EventCoreDetailsSection from '@/components/management/EventManagement/EventCoreDetailsSection';
import AIEventGenerator from '@/components/management/AIEventGenerator';

export default function ManageEvents() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventForEdit, setSelectedEventForEdit] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [sortBy, setSortBy] = useState('date_desc');
  const [statusFilter, setStatusFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-event_date', 500),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Event.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });

  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.list(),
  });

  const today = new Date().toISOString().split('T')[0];

  const filteredEvents = useMemo(() => {
    let result = events.filter(event =>
      event.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (statusFilter === 'upcoming') {
      result = result.filter(e => e.event_date >= today || e.status === 'upcoming' || e.status === 'in_progress');
    } else if (statusFilter === 'finished') {
      result = result.filter(e => e.event_date < today || e.status === 'completed' || e.status === 'cancelled');
    }
    result = [...result].sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.event_date || 0) - new Date(a.event_date || 0);
      if (sortBy === 'date_asc') return new Date(a.event_date || 0) - new Date(b.event_date || 0);
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '');
      return 0;
    });
    return result;
  }, [events, searchQuery, sortBy]);

  if (showAIGenerator) {
    return (
      <PageShell>
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
      </PageShell>
    );
  }

  if (showAddForm) {
    return (
      <PageShell>
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
      </PageShell>
    );
  }

  if (selectedEventForEdit) {
    return (
      <PageShell>
        <div className="max-w-7xl mx-auto px-6 py-12">
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
              <EventCoreDetailsSection event={selectedEventForEdit} />
            </TabsContent>
            <TabsContent value="sessions" className="mt-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-gray-600">Sessions management coming soon</p>
              </div>
            </TabsContent>
            <TabsContent value="results" className="mt-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-gray-600">Results management coming soon</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl('Management')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-4xl font-black mb-2">Manage Events</h1>
            <p className="text-gray-600">{events.length} total events</p>
          </div>
          <Button variant="outline" onClick={() => setShowAIGenerator(true)} className="border-purple-300 text-purple-700 hover:bg-purple-50">
            <Sparkles className="w-4 h-4 mr-2" />
            AI Generate
          </Button>
          <Button onClick={() => setShowAddForm(true)} className="bg-gray-900">
            <Plus className="w-4 h-4 mr-2" />
            Add Event
          </Button>
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
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
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
                    <td className="px-6 py-4 font-medium">{event.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{event.series}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {event.event_date ? format(new Date(event.event_date), 'MMM d, yyyy') : 'TBA'}
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete ${event.name}?`)) {
                            deleteMutation.mutate(event.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  );
}