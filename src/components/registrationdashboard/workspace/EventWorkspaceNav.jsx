/**
 * REVISION R7H — EventWorkspaceNav
 * Command-center module navigation rail with grouped sections.
 * Two operational zones: Event Operations + Management.
 * Responsive: desktop (w-56 + labels) → mobile (w-12 + icons only).
 */
import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  Layers,
  BarChart3,
  LogIn,
  Shield,
  Trophy,
  Radio,
  Activity,
  Settings,
} from 'lucide-react';

const MODULE_GROUPS = [
  {
    section: 'Event Operations',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard, description: 'Weekend operations summary' },
      { id: 'schedule', label: 'Schedule', icon: Calendar, description: 'Session timing and order' },
      { id: 'sessions', label: 'Sessions', icon: Layers, description: 'Weekend structure and session flow' },
      { id: 'results', label: 'Results', icon: BarChart3, description: 'Results input, publishing, standings triggers' },
      { id: 'entries', label: 'Entries', icon: LogIn, description: 'Roster and entry management' },
      { id: 'compliance', label: 'Compliance', icon: Shield, description: 'Waivers, tech, eligibility' },
      { id: 'standings', label: 'Standings', icon: Trophy, description: 'Points systems and recalculation' },
    ],
  },
  {
    section: 'Management',
    items: [
      { id: 'media', label: 'Media', icon: Radio, description: 'Credentials, assets, governance' },
      { id: 'activity', label: 'Activity', icon: Activity, description: 'Event history and audit log' },
      { id: 'settings', label: 'Settings', icon: Settings, description: 'Event configuration and permissions' },
    ],
  },
];

export default function EventWorkspaceNav({ activePanel, onPanelChange, compact = false }) {
  return (
    <div
      className={`${compact ? 'w-12' : 'w-56'} flex-shrink-0 border-r border-gray-800/60 overflow-y-auto transition-all`}
      style={{
        background: 'rgba(10,12,14,0.8)',
      }}
    >
      <div className={`${compact ? 'p-1.5' : 'p-3'} space-y-1`}>
        {!compact && (
          <p className="text-[9px] uppercase tracking-widest font-bold text-gray-600 px-2 mb-3">Event Operations</p>
        )}

        {MODULE_GROUPS.map((group, groupIdx) => (
          <div key={group.section}>
            {/* Section divider + label */}
            {groupIdx > 0 && !compact && (
              <div className="my-2 border-t border-gray-800/40 pt-2">
                <p className="text-[9px] uppercase tracking-widest font-bold text-gray-600 px-2 mb-1">{group.section}</p>
              </div>
            )}

            {/* Items */}
            <div className={compact ? 'space-y-0.5' : 'space-y-0.5'}>
              {group.items.map((mod) => {
                const Icon = mod.icon;
                const isActive = activePanel === mod.id;

                if (compact) {
                  return (
                    <button
                      key={mod.id}
                      onClick={() => onPanelChange(mod.id)}
                      title={mod.label}
                      className={`w-full flex items-center justify-center p-2 rounded transition-all ${
                        isActive
                          ? 'bg-teal-900/60 text-teal-300 border-l-2 border-teal-400'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/40'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                    </button>
                  );
                }

                return (
                  <button
                    key={mod.id}
                    onClick={() => onPanelChange(mod.id)}
                    title={mod.description}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
                      isActive
                        ? 'bg-teal-900/60 text-teal-300 border-l-2 border-teal-400'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/40'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="line-clamp-1">{mod.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}