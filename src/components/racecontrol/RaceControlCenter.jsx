/**
 * R9BR Sprint 3 — RaceControlCenter
 * Full operational governance shell.
 * Seven workflow tabs: Incidents, Penalties, Protests, Rulings, Grid, Holds, Tech.
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useEventWorkspace } from '@/components/registrationdashboard/workspace/EventWorkspaceContext';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle, StickyNote, Radio, Gavel, MessageSquareWarning,
  BookOpen, LayoutList, Lock, Wrench, Users,
} from 'lucide-react';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

// Queues (read-only summaries — kept for quick overview)
import OfficialsSummary from './queues/OfficialsSummary';
import SessionNotesLog from './queues/SessionNotesLog';

// Sprint 3 workflow managers
import IncidentManager from './workflows/IncidentManager';
import PenaltyManager from './workflows/PenaltyManager';
import ProtestManager from './workflows/ProtestManager';
import StewardRulingManager from './workflows/StewardRulingManager';
import GridApprovalManager from './workflows/GridApprovalManager';
import ResultsHoldManager from './workflows/ResultsHoldManager';
import TechHoldWorkflow from './workflows/TechHoldWorkflow';

// Modals
import CreateIncidentModal from './modals/CreateIncidentModal';
import CreateSessionNoteModal from './modals/CreateSessionNoteModal';

const DQ = applyDefaultQueryOptions();

const TABS = [
  { key: 'incidents',  label: 'Incidents',  Icon: AlertTriangle,       color: 'text-orange-400' },
  { key: 'penalties',  label: 'Penalties',  Icon: Gavel,               color: 'text-red-400' },
  { key: 'protests',   label: 'Protests',   Icon: MessageSquareWarning, color: 'text-yellow-400' },
  { key: 'rulings',    label: 'Rulings',    Icon: BookOpen,            color: 'text-blue-400' },
  { key: 'grid',       label: 'Grid',       Icon: LayoutList,          color: 'text-teal-400' },
  { key: 'holds',      label: 'Holds',      Icon: Lock,                color: 'text-amber-400' },
  { key: 'tech',       label: 'Tech',       Icon: Wrench,              color: 'text-orange-300' },
  { key: 'notes',      label: 'Notes',      Icon: StickyNote,          color: 'text-teal-300' },
  { key: 'officials',  label: 'Officials',  Icon: Users,               color: 'text-gray-400' },
];

export default function RaceControlCenter() {
  const { selectedEvent, eventId, isAdmin, eventPermissions } = useEventWorkspace();
  const [activeTab, setActiveTab] = useState('incidents');
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', eventId],
    queryFn: () => base44.entities.Session.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  const canCreateIncident = isAdmin || !!eventPermissions?.canCreateIncident;
  const canCreateSessionNote = isAdmin || !!eventPermissions?.canCreateSessionNote;

  return (
    <div className="space-y-4">
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
              <AlertTriangle className="w-3.5 h-3.5" /> Report Incident
            </Button>
          )}
          {canCreateSessionNote && (
            <Button size="sm" onClick={() => setShowNoteModal(true)}
              className="bg-teal-800/80 hover:bg-teal-700 text-white border border-teal-700/60 text-xs gap-1.5">
              <StickyNote className="w-3.5 h-3.5" /> Add Note
            </Button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0.5 overflow-x-auto scrollbar-hide border-b border-gray-800/60 pb-px">
        {TABS.map(({ key, label, Icon, color }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold tracking-wide whitespace-nowrap border-b-2 transition-all ${
              activeTab === key
                ? `border-teal-500 text-white`
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <Icon className={`w-3 h-3 ${activeTab === key ? color : 'text-gray-600'}`} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div className="rounded-xl border border-gray-800/60 bg-gray-950/50 p-4 min-h-[200px]">
        {activeTab === 'incidents' && (
          <IncidentManager eventId={eventId} />
        )}
        {activeTab === 'penalties' && (
          <PenaltyManager eventId={eventId} sessions={sessions} />
        )}
        {activeTab === 'protests' && (
          <ProtestManager eventId={eventId} sessions={sessions} />
        )}
        {activeTab === 'rulings' && (
          <StewardRulingManager eventId={eventId} />
        )}
        {activeTab === 'grid' && (
          <GridApprovalManager eventId={eventId} sessions={sessions} />
        )}
        {activeTab === 'holds' && (
          <ResultsHoldManager eventId={eventId} />
        )}
        {activeTab === 'tech' && (
          <TechHoldWorkflow eventId={eventId} sessions={sessions} />
        )}
        {activeTab === 'notes' && (
          <div className="space-y-2">
            {canCreateSessionNote && (
              <div className="flex justify-end mb-2">
                <Button size="sm" onClick={() => setShowNoteModal(true)}
                  className="bg-teal-800/80 hover:bg-teal-700 text-white text-xs gap-1.5">
                  <StickyNote className="w-3.5 h-3.5" /> Add Note
                </Button>
              </div>
            )}
            <SessionNotesLog eventId={eventId} />
          </div>
        )}
        {activeTab === 'officials' && (
          <OfficialsSummary eventId={eventId} />
        )}
      </div>

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