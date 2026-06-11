/**
 * R9CQ — EventCompliancePanel
 * Added Tech sub-tab with dedicated TechQueue for inline pass/fail.
 */
import React, { useState } from 'react';
import { Shield, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useEventWorkspace } from '../EventWorkspaceContext';
import EventTechPanel from './EventTechPanel';
import ComplianceManager from '../../ComplianceManager';
import TechQueue from '../../compliance/TechQueue';

const TABS = [
  { id: 'tech_queue', label: 'Tech Queue' },
  { id: 'compliance', label: 'Waivers & Flags' },
  { id: 'tech_detail', label: 'Tech Detail' },
];

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
  const [activeTab, setActiveTab] = useState('tech_queue');

  return (
    <div className="space-y-4">
      {/* Severity badge */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold uppercase tracking-wider ${SEVERITY_STYLES[complianceSeverity] ?? SEVERITY_STYLES.warning}`}>
          {complianceSeverity === 'clear'
            ? <CheckCircle2 className="w-3.5 h-3.5" />
            : <AlertTriangle className="w-3.5 h-3.5" />}
          Compliance: {complianceSeverity}
        </div>

        {/* Tab switcher */}
        <div className="flex gap-0.5">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded text-[10px] font-semibold uppercase tracking-wider border transition-colors ${
                activeTab === tab.id
                  ? 'bg-teal-900/30 border-teal-700/40 text-teal-300'
                  : 'bg-white/[0.03] border-white/[0.06] text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tech Queue tab — inline pass/fail, no drawer */}
      {activeTab === 'tech_queue' && (
        <TechQueue selectedEvent={selectedEvent} />
      )}

      {/* Compliance tab — waivers and flags */}
      {activeTab === 'compliance' && (
        <ComplianceManager
          selectedEvent={selectedEvent}
          user={user}
          dashboardContext={dashboardContext}
          dashboardPermissions={dashboardPermissions}
          invalidateAfterOperation={invalidateAfterOperation}
          onComplianceSeverityChange={setComplianceSeverity}
        />
      )}

      {/* Tech Detail tab — legacy TechManager */}
      {activeTab === 'tech_detail' && (
        <EventTechPanel />
      )}
    </div>
  );
}