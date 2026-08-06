/**
 * REVISION 7A Part 2 — DeferredModulePanel
 * Shown for operational panels not yet migrated into the workspace.
 * Provides an "Open Existing Module" action that bridges back to the old activeTab.
 */
import React from 'react';
import { useEventWorkspace } from '../EventWorkspaceContext';
import { ExternalLink, ArrowRight } from 'lucide-react';

const MODULE_META = {
  sessions:   { label: 'Classes & Sessions', tab: 'classesSessions', description: 'Manage event classes, create and order sessions, configure advancement rules.' },
  results:    { label: 'Results',            tab: 'results',         description: 'Enter, import, and publish race results. Manage session lifecycle from Draft to Official.' },
  entries:    { label: 'Entries',            tab: 'entries',         description: 'Manage driver entries, check-in status, transponders, and car numbers.' },
  compliance: { label: 'Compliance',         tab: 'compliance',      description: 'Review compliance flags, waiver status, license verification, and tech readiness.' },
  standings:  { label: 'Points & Standings', tab: 'pointsStandings', description: 'Calculate championship standings, configure points rulesets, and publish standings.' },
  media:      { label: 'Media',              tab: 'media',           description: 'Manage media credentials, governance policies, and media portal access.' },
};

export default function DeferredModulePanel({ panelId }) {
  const { onLegacyTabChange } = useEventWorkspace();
  const meta = MODULE_META[panelId] || {
    label: panelId,
    tab: panelId,
    description: 'This module is managed through the existing RaceCore tools.',
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-5 max-w-sm mx-auto">
      <div className="w-12 h-12 rounded-xl bg-surface border border-divider flex items-center justify-center">
        <ExternalLink className="w-5 h-5 text-foreground-quiet" />
      </div>

      <div>
        <p className="text-sm font-bold text-foreground-secondary mb-1">{meta.label}</p>
        <p className="text-xs text-foreground-quiet leading-relaxed">{meta.description}</p>
      </div>

      <div className="w-full space-y-2">
        <div className="px-3 py-2 bg-surface border border-divider rounded-lg text-left">
          <p className="text-[10px] text-foreground-quiet font-mono uppercase tracking-wider mb-0.5">Migration Status</p>
          <p className="text-xs text-foreground-quiet">
            This module is currently managed through the existing RaceCore tools. It will be integrated into the Event Workspace in a future revision.
          </p>
        </div>

        {onLegacyTabChange && (
          <button
            onClick={() => onLegacyTabChange(meta.tab)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-motion/10 border border-motion/40 text-motion rounded-lg text-xs font-semibold hover:bg-motion/20 transition-colors"
          >
            Open {meta.label} Module
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}