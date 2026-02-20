import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import AddSessionDialog from '@/components/management/AddSessionDialog';

export default function EventSessionsSection({ event }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['eventSessions', event.id],
    queryFn: () => base44.entities.Session.filter({ event_id: event.id }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Session.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['eventSessions', event.id] }),
  });

  const handleOpen = (session = null) => {
    setEditingSession(session);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingSession(null);
  };

  const statusColors = {
    scheduled: 'bg-gray-100 text-gray-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold">Sessions</h2>
        <Button size="sm" onClick={() => handleOpen()} className="bg-gray-900">
          <Plus className="w-4 h-4 mr-1" /> Add Session
        </Button>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : sessions.length === 0 ? (
        <p className="text-gray-500 text-sm">No sessions yet. Add a session to get started.</p>
      ) : (
        <div className="space-y-2">
          {sessions.map(session => (
            <div key={session.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div>
                  <div className="text-sm font-medium">{session.name}</div>
                  <div className="text-xs text-gray-400">{session.session_type}{session.laps ? ` · ${session.laps} laps` : ''}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono px-2 py-0.5 uppercase ${statusColors[session.status] || statusColors.scheduled}`}>
                  {session.status}
                </span>
                <Button variant="ghost" size="sm" onClick={() => handleOpen(session)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { if (confirm(`Delete ${session.name}?`)) deleteMutation.mutate(session.id); }}
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddSessionDialog
        open={dialogOpen}
        onClose={handleClose}
        onSessionCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['eventSessions', event.id] });
          handleClose();
        }}
        eventId={event.id}
        initialSession={editingSession}
      />
    </div>
  );
}