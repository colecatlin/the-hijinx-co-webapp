import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import SessionForm from './SessionForm';
import { format, parseISO } from 'date-fns';
import { isSessionLocked, isOperationalSession } from '@/components/registrationdashboard/sessionLifecycle';

export default function SessionManager({ eventId, eventName }) {
  const [showForm, setShowForm] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['eventSessions', eventId],
    queryFn: async () => {
      return base44.entities.Session.filter({ event_id: eventId }, 'session_number', 500);
    },
    enabled: !!eventId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Session.create({
      ...data,
      event_id: eventId,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventSessions', eventId] });
      setShowForm(false);
      toast.success('Session created');
    },
    onError: (error) => toast.error(`Error creating session: ${error.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Session.update(editingSession.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventSessions', eventId] });
      setEditingSession(null);
      setShowForm(false);
      toast.success('Session updated');
    },
    onError: (error) => toast.error(`Error updating session: ${error.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Session.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventSessions', eventId] });
      toast.success('Session deleted');
    },
    onError: (error) => toast.error(`Error deleting session: ${error.message}`),
  });

  const handleSubmit = (formData) => {
    if (editingSession) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (session) => {
    setEditingSession(session);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingSession(null);
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy h:mm a');
    } catch {
      return dateStr;
    }
  };

  return (
    <div>
      {showForm && (
        <SessionForm
          session={editingSession}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Event Sessions</h3>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Add Session
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading sessions...</p>
      ) : sessions.length === 0 ? (
        <Card className="p-8 text-center">
          <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 mb-4">No sessions yet for this event.</p>
          <Button onClick={() => setShowForm(true)} size="sm">
            Create First Session
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <Card key={session.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold">{session.name}</h4>
                      <Badge variant="outline">{session.session_type}</Badge>
                      {session.round_number && (
                        <Badge className="bg-blue-50 text-blue-700">Round {session.round_number}</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-600">
                      {session.scheduled_time && (
                        <div>
                          <span className="font-medium">Time:</span> {formatDateTime(session.scheduled_time)}
                        </div>
                      )}
                      {session.laps && (
                        <div>
                          <span className="font-medium">Laps:</span> {session.laps}
                        </div>
                      )}
                      {session.duration_minutes && (
                        <div>
                          <span className="font-medium">Duration:</span> {session.duration_minutes}m
                        </div>
                      )}
                      {session.session_number && (
                        <div>
                          <span className="font-medium">Order:</span> #{session.session_number}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(session)}
                      className="gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      disabled={isOperationalSession(session)}
                      title={isOperationalSession(session) ? 'Operational sessions must be managed through Race Ops.' : undefined}
                      onClick={() => {
                        if (confirm(`Delete session "${session.name}"?`)) {
                          deleteMutation.mutate(session.id);
                        }
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}