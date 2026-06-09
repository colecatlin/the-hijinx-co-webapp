/**
 * R9BQ Sprint 2 — SessionNotesLog
 * Read-only log of session notes for an event.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { StickyNote } from 'lucide-react';
import { format } from 'date-fns';

const NOTE_TYPE_COLOR = {
  Caution: 'bg-yellow-900/60 text-yellow-300',
  'Red Flag': 'bg-red-900/60 text-red-300',
  Restart: 'bg-green-900/60 text-green-300',
  Medical: 'bg-rose-900/60 text-rose-300',
  Weather: 'bg-blue-900/60 text-blue-300',
  'Penalty Notification': 'bg-orange-900/60 text-orange-300',
  'Protest Filed': 'bg-purple-900/60 text-purple-300',
  Debris: 'bg-gray-700 text-gray-300',
  General: 'bg-gray-700 text-gray-300',
};

export default function SessionNotesLog({ eventId }) {
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['sessionNotes', eventId],
    queryFn: () => base44.entities.SessionNote.filter({ event_id: eventId }, '-created_date', 100),
    enabled: !!eventId,
  });

  if (isLoading) return <div className="text-gray-500 text-xs py-3">Loading notes…</div>;
  if (notes.length === 0) return <div className="text-gray-600 text-xs py-3">No session notes yet</div>;

  return (
    <div className="space-y-2">
      {notes.map(note => (
        <div key={note.id} className="rounded-lg border border-gray-800 bg-gray-900/40 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <StickyNote className="w-3.5 h-3.5 text-teal-400 flex-shrink-0 mt-0.5" />
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${NOTE_TYPE_COLOR[note.note_type] || 'bg-gray-700 text-gray-300'}`}>
                {note.note_type}
              </span>
              {note.lap_number && (
                <span className="text-[10px] text-gray-500">Lap {note.lap_number}</span>
              )}
            </div>
            <span className="text-[10px] text-gray-600 flex-shrink-0">
              {note.created_at ? format(new Date(note.created_at), 'HH:mm') : ''}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">{note.body}</p>
          {note.author_role && (
            <p className="text-[10px] text-gray-600 mt-1">{note.author_role}</p>
          )}
        </div>
      ))}
    </div>
  );
}