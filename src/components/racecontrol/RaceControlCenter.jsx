/**
 * R9BQ Sprint 2 — RaceControlCenter
 * Read-only Race Control shell with create flows for Incident and SessionNote.
 * No destructive operations (no approve, apply, resolve, hold, publish).
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useEventWorkspace } from '@/components/registrationdashboard/workspace/EventWorkspaceContext';
import { Button } from '@/components/ui/button';
import { AlertTriangle, StickyNote, Radio } from 'lucide-react';
import IncidentQueue from './queues/IncidentQueue';
import PenaltyQueue from './queues/PenaltyQueue';
import ProtestQueue from './queues/ProtestQueue';
import GridQueue from './queues/GridQueue';
import TechHoldQueue from './queues/TechHoldQueue';
import SessionNotesLog from './queues/SessionNotesLog';
import OfficialsSummary from './queues/OfficialsSummary';
import CreateIncidentModal from './modals/CreateIncidentModal';
import CreateSessionNoteModal from './modals/CreateSessionNoteModal';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

function SectionHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{title}</h3>
      {action}
    </div>
  );
}

function Section({ title, action, children }) {
  return (
    <div className="rounded-xl border border-gray-800/60 bg-gray-950/50 p-4">
      <SectionHeader title={title} action={action} />
      {children}
    </div>
  );
}

export default function RaceControlCenter() {
  const { selectedEvent, eventId, isAdmin, eventPermissions } = useEventWorkspace();
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);

  // Sessions for dropdowns
  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', eventId],
    queryFn: () => base44.entities.Session.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  // Permission checks — additive from official permissions merged into eventPermissions
  const canCreateIncident = isAdmin || !!eventPermissions?.canCreateIncident;
  const canCreateSessionNote = isAdmin || !!eventPermissions?.canCreateSessionNote;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-900/40 border border-teal-800/60 flex items-center justify-center">
            <Radio className="w-4 h-4 text-teal-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Race Control</h2>
            <p className="text-[11px] text-gray-500">{selectedEvent?.name || '—'}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {canCreateIncident && (
            <Button size="sm" onClick={() => setShowIncidentModal(true)}
              className="bg-orange-800/80 hover:bg-orange-700 text-white border border-orange-700/60 text-xs gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Create Incident
            </Button>
          )}
          {canCreateSessionNote && (
            <Button size="sm" onClick={() => setShowNoteModal(true)}
              className="bg-teal-800/80 hover:bg-teal-700 text-white border border-teal-700/60 text-xs gap-1.5">
              <StickyNote className="w-3.5 h-3.5" />
              Add Note
            </Button>
          )}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Incidents */}
        <Section title="Active Incidents"
          action={canCreateIncident && (
            <button onClick={() => setShowIncidentModal(true)}
              className="text-[10px] text-orange-400 hover:text-orange-300 transition-colors">+ New</button>
          )}>
          <IncidentQueue eventId={eventId} />
        </Section>

        {/* Penalties */}
        <Section title="Proposed Penalties">
          <PenaltyQueue eventId={eventId} />
        </Section>

        {/* Protests */}
        <Section title="Active Protests">
          <ProtestQueue eventId={eventId} />
        </Section>

        {/* Grid Lineups */}
        <Section title="Grid Queue">
          <GridQueue eventId={eventId} />
        </Section>

        {/* Tech Holds */}
        <Section title="Tech Holds">
          <TechHoldQueue eventId={eventId} />
        </Section>

        {/* Officials */}
        <Section title="Officials On Duty">
          <OfficialsSummary eventId={eventId} />
        </Section>
      </div>

      {/* Session Notes — full width */}
      <Section title="Session Notes Log"
        action={canCreateSessionNote && (
          <button onClick={() => setShowNoteModal(true)}
            className="text-[10px] text-teal-400 hover:text-teal-300 transition-colors">+ Add Note</button>
        )}>
        <SessionNotesLog eventId={eventId} />
      </Section>

      {/* Modals */}
      <CreateIncidentModal
        open={showIncidentModal}
        onClose={() => setShowIncidentModal(false)}
        eventId={eventId}
        sessions={sessions}
      />
      <CreateSessionNoteModal
        open={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        eventId={eventId}
        sessions={sessions}
      />
    </div>
  );
}