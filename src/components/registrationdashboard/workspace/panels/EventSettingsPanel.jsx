/**
 * REVISION 7A Part 2 — EventSettingsPanel
 * Placeholder for future event-level workspace settings and permissions.
 * No real settings or schema changes introduced here.
 */
import React from 'react';
import { useEventWorkspace } from '../EventWorkspaceContext';
import { Settings, Shield, Users, Lock, ArrowRight } from 'lucide-react';

function ConceptCard({ icon: Icon, title, description, tag }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-[#111] border border-gray-800/50 rounded-lg">
      <div className="w-8 h-8 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-xs font-semibold text-gray-300">{title}</p>
          {tag && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 font-mono uppercase">{tag}</span>
          )}
        </div>
        <p className="text-[11px] text-gray-600 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export default function EventSettingsPanel() {
  const { selectedEvent, isAdmin, organizationType } = useEventWorkspace();

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-600">Event Workspace Settings</p>
        <p className="text-[11px] text-gray-600 mt-0.5">Future configuration and access controls for this event workspace.</p>
      </div>

      {/* Current context summary */}
      <div className="p-4 bg-[#111] border border-teal-900/40 rounded-lg space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-teal-600 mb-2">Current Workspace Scope</p>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Event</span>
            <span className="text-gray-300 font-medium truncate max-w-[60%] text-right">{selectedEvent?.name || '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Context type</span>
            <span className="text-gray-300 font-medium capitalize">{organizationType || '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Status</span>
            <span className="text-gray-300 font-medium">{selectedEvent?.status || '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Access level</span>
            <span className={`font-bold ${isAdmin ? 'text-teal-400' : 'text-gray-400'}`}>
              {isAdmin ? 'Admin' : 'Operator'}
            </span>
          </div>
        </div>
      </div>

      {/* Future concepts */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-700 mb-2">Coming in Future Revisions</p>
        <div className="space-y-2">
          <ConceptCard
            icon={Shield}
            title="Event-Level Permission Scoping"
            description="Grant specific users access to individual modules (Results, Entries, Media) for this event only, without global role changes."
            tag="R7B"
          />
          <ConceptCard
            icon={Users}
            title="External Collaborator Access"
            description="Invite track operators, series officials, or media coordinators into this event workspace with scoped read/write access."
            tag="R7B"
          />
          <ConceptCard
            icon={Lock}
            title="Module Lock Controls"
            description="Lock individual workspace panels (Entries, Results, Standings) after event completion to prevent accidental edits."
            tag="Future"
          />
          <ConceptCard
            icon={Settings}
            title="Workspace Preferences"
            description="Configure default views, display preferences, and notification settings for this event workspace."
            tag="Future"
          />
        </div>
      </div>

      <p className="text-[10px] text-gray-700 leading-relaxed">
        No schema changes have been made. These settings panels are placeholders to preview the future event workspace access model.
      </p>
    </div>
  );
}