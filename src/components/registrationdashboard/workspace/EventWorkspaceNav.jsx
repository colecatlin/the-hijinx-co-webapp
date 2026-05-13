/**
 * REVISION R8G Part 4 — EventWorkspaceNav
 * Module navigation rail with permission-based filtering.
 * If eventPermissions is null (embedded/RegistrationDashboard mode), show all modules.
 * If eventPermissions exists, filter by the corresponding boolean key.
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
  ClipboardCheck,
  FolderDown,
  FileUp,
  Camera,
} from 'lucide-react';
import { useEventWorkspace } from './EventWorkspaceContext';

// Module permission key map — R8G Part 4
const MODULE_GROUPS = [
  {
    section: 'Event Operations',
    items: [
      { id: 'overview',    label: 'Overview',    icon: LayoutDashboard, description: 'Weekend operations summary',                    permKey: 'canViewOverview' },
      { id: 'schedule',    label: 'Schedule',    icon: Calendar,         description: 'Session timing and order',                     permKey: 'canViewSchedule' },
      { id: 'sessions',    label: 'Sessions',    icon: Layers,           description: 'Weekend structure and session flow',           permKey: 'canManageSessions' },
      { id: 'results',     label: 'Results',     icon: BarChart3,        description: 'Results input, publishing, standings triggers', permKey: 'canManageResults' },
      { id: 'entries',     label: 'Entries',     icon: LogIn,            description: 'Roster and entry management',                  permKey: 'canManageEntries' },
      { id: 'compliance',  label: 'Compliance',  icon: Shield,           description: 'Waivers, tech, eligibility',                  permKey: 'canManageCompliance' },
      { id: 'checkin',     label: 'Check-In',    icon: ClipboardCheck,   description: 'Arrival, payment, waiver, race-day check-in',  permKey: 'canManageCheckIn' },
      { id: 'exports',     label: 'Exports',     icon: FolderDown,       description: 'Download entries, results, standings, and event data', permKey: 'canViewExports' },
      { id: 'imports',     label: 'Imports',     icon: FileUp,           description: 'Import entries, results, and standings from CSV', permKey: 'canViewImports' },
      { id: 'standings',   label: 'Standings',   icon: Trophy,           description: 'Points systems and recalculation',            permKey: 'canManageStandings' },
    ],
  },
  {
    section: 'Management',
    items: [
      { id: 'media',        label: 'Media',        icon: Radio,    description: 'Credentials, assets, governance',        permKey: 'canManageMedia' },
      { id: 'media_portal', label: 'Media Portal', icon: Camera,   description: 'Full media operations — requests, waivers, deliverables, uploads, review', permKey: 'canManageMedia' },
      { id: 'activity',     label: 'Activity',     icon: Activity, description: 'Event history and audit log',            permKey: 'canViewActivity' },
      { id: 'settings',    label: 'Settings',    icon: Settings, description: 'Event configuration and permissions',    permKey: 'canManageSettings' },
    ],
  },
];

// Returns true if the module should be shown given eventPermissions.
// null → show all (embedded/RegistrationDashboard mode).
function isModuleVisible(permKey, eventPermissions) {
  if (!eventPermissions) return true;
  return !!eventPermissions[permKey];
}

export default function EventWorkspaceNav({ activePanel, onPanelChange, compact = false }) {
  const { eventPermissions } = useEventWorkspace();

  // Filter groups — hide items that are not permitted; hide empty groups.
  const visibleGroups = MODULE_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((mod) => isModuleVisible(mod.permKey, eventPermissions)),
  })).filter((group) => group.items.length > 0);

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

        {visibleGroups.map((group, groupIdx) => (
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