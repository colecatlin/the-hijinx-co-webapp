import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, Save, Globe, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function ManageRaceControlEventBuilder() {
  const queryClient = useQueryClient();
  const [eventId, setEventId] = useState('');
  const [formData, setFormData] = useState({});
  const [newClassName, setNewClassName] = useState('');

  // Get eventId from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('eventId');
    if (id) setEventId(id);
  }, []);

  // Fetch event
  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['raceControlEvent', eventId],
    queryFn: () => base44.entities.RaceControlEvent.get(eventId),
    enabled: !!eventId,
  });

  // Fetch tracks and series
  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.list(),
  });

  const { data: series = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
  });

  // Fetch event classes
  const { data: classes = [] } = useQuery({
    queryKey: ['eventClasses', eventId],
    queryFn: () => base44.entities.RaceControlEventClass.filter(
      { racecontrolevent_id: eventId }
    ),
    enabled: !!eventId,
  });

  // Fetch sessions for each class
  const { data: sessions = {} } = useQuery({
    queryKey: ['eventSessions', eventId, classes.map(c => c.id).join(',')],
    queryFn: async () => {
      const sessionsByClass = {};
      for (const cls of classes) {
        const classSessions = await base44.entities.RaceControlSession.filter(
          { racecontroleventclass_id: cls.id }
        );
        sessionsByClass[cls.id] = classSessions.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      }
      return sessionsByClass;
    },
    enabled: classes.length > 0,
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: (data) => base44.entities.RaceControlEvent.update(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raceControlEvent', eventId] });
    },
  });

  // Create class mutation
  const createClassMutation = useMutation({
    mutationFn: (className) =>
      base44.entities.RaceControlEventClass.create({
        racecontrolevent_id: eventId,
        class_name: className,
        status: 'open',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventClasses', eventId] });
      setNewClassName('');
    },
  });

  // Delete class mutation
  const deleteClassMutation = useMutation({
    mutationFn: async (classId) => {
      const entries = await base44.entities.RaceControlEntry.filter(
        { class_name: classId }
      );
      if (entries.length > 0) {
        throw new Error('Cannot delete class with existing entries');
      }
      return base44.entities.RaceControlEventClass.delete(classId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventClasses', eventId] });
    },
  });

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: (sessionData) =>
      base44.entities.RaceControlSession.create(sessionData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventSessions', eventId] });
    },
  });

  // Update session sort order mutation
  const updateSessionOrderMutation = useMutation({
    mutationFn: async (updates) => {
      for (const [sessionId, sortOrder] of Object.entries(updates)) {
        await base44.entities.RaceControlSession.update(sessionId, { sort_order: sortOrder });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventSessions', eventId] });
    },
  });

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination || source.index === destination.index) return;

    const classId = source.droppableId;
    const classSessions = sessions[classId] || [];
    const newSessions = Array.from(classSessions);
    const [movedSession] = newSessions.splice(source.index, 1);
    newSessions.splice(destination.index, 0, movedSession);

    const updates = {};
    newSessions.forEach((session, index) => {
      updates[session.id] = index;
    });
    updateSessionOrderMutation.mutate(updates);
  };

  const handleEventChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveDraft = () => {
    updateEventMutation.mutate({ ...formData, status: 'draft' });
  };

  const handlePublish = () => {
    updateEventMutation.mutate({ ...formData, status: 'published' });
  };

  const handleArchive = () => {
    updateEventMutation.mutate({ status: 'archived' });
  };

  if (!eventId) {
    return (
      <PageShell>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>No event selected. Please select an event from the RaceControl Events page.</AlertDescription>
          </Alert>
        </div>
      </PageShell>
    );
  }

  if (eventLoading) {
    return (
      <PageShell>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center py-12 text-gray-500">Loading event...</div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="bg-white min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-black mb-2">Event Builder</h1>
            <p className="text-gray-600">{event?.event_name || 'Configure Event'}</p>
          </div>

          <div className="space-y-8">
            {/* Event Information */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Event Information</CardTitle>
                  <CardDescription>Basic event details and configuration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">Event Name</label>
                      <Input
                        value={formData.event_name || event?.event_name || ''}
                        onChange={(e) => handleEventChange('event_name', e.target.value)}
                        placeholder="Event name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">Event Slug</label>
                      <Input
                        value={formData.event_slug || event?.event_slug || ''}
                        onChange={(e) => handleEventChange('event_slug', e.target.value)}
                        placeholder="event-slug"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">Track</label>
                      <Select
                        value={formData.track_id || event?.track_id || ''}
                        onValueChange={(value) => handleEventChange('track_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select track" />
                        </SelectTrigger>
                        <SelectContent>
                          {tracks.map(track => (
                            <SelectItem key={track.id} value={track.id}>{track.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">Series</label>
                      <Select
                        value={formData.series_id || event?.series_id || ''}
                        onValueChange={(value) => handleEventChange('series_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select series" />
                        </SelectTrigger>
                        <SelectContent>
                          {series.map(serie => (
                            <SelectItem key={serie.id} value={serie.id}>{serie.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">Season Year</label>
                      <Input
                        value={formData.season_year || event?.season_year || ''}
                        onChange={(e) => handleEventChange('season_year', e.target.value)}
                        placeholder="2026"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">Timezone</label>
                      <Select
                        value={formData.timezone || event?.timezone || 'America/Denver'}
                        onValueChange={(value) => handleEventChange('timezone', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/Denver">Mountain (Denver)</SelectItem>
                          <SelectItem value="America/Chicago">Central</SelectItem>
                          <SelectItem value="America/New_York">Eastern</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">Start Date</label>
                      <Input
                        type="date"
                        value={formData.start_date || event?.start_date || ''}
                        onChange={(e) => handleEventChange('start_date', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">End Date</label>
                      <Input
                        type="date"
                        value={formData.end_date || event?.end_date || ''}
                        onChange={(e) => handleEventChange('end_date', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">Status</label>
                      <Select
                        value={formData.status || event?.status || 'draft'}
                        onValueChange={(value) => handleEventChange('status', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="live">Live</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Registration Settings */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Registration Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">Registration Opens</label>
                      <Input
                        type="datetime-local"
                        value={formData.registration_open || event?.registration_open || ''}
                        onChange={(e) => handleEventChange('registration_open', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">Registration Closes</label>
                      <Input
                        type="datetime-local"
                        value={formData.registration_close || event?.registration_close || ''}
                        onChange={(e) => handleEventChange('registration_close', e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.registration_enabled !== false && event?.registration_enabled !== false}
                          onChange={(e) => handleEventChange('registration_enabled', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm font-semibold">Registration Enabled</span>
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Event Classes */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Event Classes</CardTitle>
                  <CardDescription>Manage racing classes and divisions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {classes.length > 0 && (
                    <div className="space-y-3">
                      {classes.map(cls => (
                        <div key={cls.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                          <div>
                            <p className="font-semibold">{cls.class_name}</p>
                            <p className="text-sm text-gray-600">Max entries: {cls.max_entries || '—'}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <Select value={cls.status} onValueChange={(value) => {
                              // Update class status
                              base44.entities.RaceControlEventClass.update(cls.id, { status: value });
                              queryClient.invalidateQueries({ queryKey: ['eventClasses', eventId] });
                            }}>
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="full">Full</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteClassMutation.mutate(cls.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-4 border-t">
                    <Input
                      placeholder="New class name"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                    />
                    <Button
                      onClick={() => createClassMutation.mutate(newClassName)}
                      disabled={!newClassName}
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Class
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Sessions by Class */}
            <DragDropContext onDragEnd={handleDragEnd}>
              {classes.map((cls) => (
                <motion.div
                  key={cls.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>{cls.class_name} Sessions</CardTitle>
                      <CardDescription>Drag to reorder sessions</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Droppable droppableId={cls.id}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className="space-y-2"
                          >
                            {(sessions[cls.id] || []).map((session, index) => (
                              <Draggable key={session.id} draggableId={session.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`p-4 border border-gray-200 rounded-lg ${
                                      snapshot.isDragging ? 'bg-blue-50 border-blue-300' : ''
                                    }`}
                                  >
                                    <div className="grid grid-cols-4 gap-4">
                                      <div>
                                        <p className="text-xs text-gray-500">Session Name</p>
                                        <p className="font-semibold">{session.session_name}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500">Type</p>
                                        <p className="font-semibold text-sm">{session.session_type}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500">Time</p>
                                        <p className="font-semibold text-sm">{session.scheduled_time ? new Date(session.scheduled_time).toLocaleString() : '—'}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500">Status</p>
                                        <p className="font-semibold text-sm">{session.status}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>

                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => createSessionMutation.mutate({
                          racecontrolevent_id: eventId,
                          racecontroleventclass_id: cls.id,
                          session_name: `Session ${(sessions[cls.id]?.length || 0) + 1}`,
                          session_type: 'practice',
                        })}
                      >
                        <Plus className="w-4 h-4" />
                        Add Session
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </DragDropContext>

            {/* Controls */}
            <div className="flex gap-3 sticky bottom-6">
              <Button
                onClick={handleSaveDraft}
                variant="outline"
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                Save Draft
              </Button>
              <Button
                onClick={handlePublish}
                className="gap-2"
              >
                <Globe className="w-4 h-4" />
                Publish Event
              </Button>
              {event?.status !== 'archived' && (
                <Button
                  onClick={handleArchive}
                  variant="destructive"
                  className="gap-2 ml-auto"
                >
                  <AlertCircle className="w-4 h-4" />
                  Archive Event
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}