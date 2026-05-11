/**
 * REVISION 7A Part 7 — EventCompliancePanel
 * Thin adapter: renders TechManager (via EventTechPanel) and ComplianceManager
 * as black boxes, pulling all required props from EventWorkspaceContext.
 *
 * ComplianceManager and TechManager internals are NOT modified.
 * onComplianceSeverityChange is handled locally — display only, no lifecycle gate.
 */
import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { useEventWorkspace } from '../EventWorkspaceContext';
import EventTechPanel from './EventTechPanel';
import ComplianceManager from '../../ComplianceManager';

const SEVERITY_STYLES = {
  clear:   'bg-green-900/30 text-green-300 border-green-800/50',
  warning: 'bg-yellow-900/30 text-yellow-300 border-yellow-800/50',
};

export default function EventCompliancePanel() {
  const {
    selectedEvent,
    user,
    dashboardContext,
    dashboardPermissions,
    invalidateAfterOperation,
  } = useEventWorkspace();

  const [complianceSeverity, setComplianceSeverity] = useState('clear');

  return (
    <div className="space-y-6">
      {/* ── Compliance severity badge ── */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold uppercase tracking-wider ${SEVERITY_STYLES[complianceSeverity] ?? SEVERITY_STYLES.warning}`}>
        {complianceSeverity === 'clear'
          ? <CheckCircle2 className="w-3.5 h-3.5" />
          : <AlertTriangle className="w-3.5 h-3.5" />}
        Compliance: {complianceSeverity}
      </div>

      {/* ── Tech section ── */}
      <section>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Tech Inspection</p>
        <EventTechPanel />
      </section>

      {/* ── Compliance section ── */}
      <section>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Compliance</p>
        <ComplianceManager
          selectedEvent={selectedEvent}
          user={user}
          dashboardContext={dashboardContext}
          dashboardPermissions={dashboardPermissions}
          invalidateAfterOperation={invalidateAfterOperation}
          onComplianceSeverityChange={setComplianceSeverity}
        />
      </section>
    </div>
  );
}