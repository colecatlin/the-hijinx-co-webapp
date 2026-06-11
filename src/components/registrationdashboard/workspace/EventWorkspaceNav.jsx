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
  Siren,
  Flag,
} from 'lucide-react';
import { useEventWorkspace } from './EventWorkspaceContext';
import { useModules } from '@/components/racecore/modules/ModuleProvider';

// Module permission key map — R8G Part 4
const MODULE_GROUPS = [
  {
    section: 'Event Operations',
    items: [
      { id: 'overview',    label: 'Overview',    icon: LayoutDashboard, description: 'Weekend operations summary',                    permKey: 'canViewOverview' },
      { id: 'schedule',      label: 'Schedule',      icon: Calendar,  description: 'Session timing and order',                     permKey: 'canViewSchedule' },
      { id: 'race_control', label: 'Race Control',  icon: Siren,     description: 'Incidents, penalties, protests, grid, tech holds', permKey: 'canViewRaceControl' },
      { id: 'sessions',     label: 'Sessions',      icon: Layers,    description: 'Weekend structure and session flow',           permKey: 'canManageSessions' },
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
      { id: 'closeout',    label: 'Closeout',    icon: Flag,     description: 'Event closeout checklist and completion', permKey: 'canManageSettings' },
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
  const { governanceEnabled } = useModules();

  // Filter groups — hide items that are not permitted; hide empty groups.
  // R9BX: Also hide race_control when Governance module is disabled.
  const visibleGroups = MODULE_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((mod) => {
      if (mod.id === 'race_control' && !governanceEnabled) return false;
      return isModuleVisible(mod.permKey, eventPermissions);
    }),
  })).filter((group) => group.items.length > 0);

  return (
    <div
      className={`${compact ? 'w-12' : 'w-44'} flex-shrink-0 border-r overflow-y-auto transition-all`}
      style={{
        background: '#0F1212',
        borderColor: 'rgba(255,255,255,0.07)',
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
              <div className="my-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
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
                      className={`relative w-full flex items-center justify-center p-2 rounded transition-all ${
                        isActive
                          ? 'bg-white/[0.06] text-white'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
                      }`}
                    >
                      {isActive && <span className="absolute left-0 top-0.5 bottom-0.5 w-0.5 rounded-full bg-teal-500" />}
                      <Icon className="w-4 h-4 flex-shrink-0" />
                    </button>
                  );
                }

                return (
                  <button
                    key={mod.id}
                    onClick={() => onPanelChange(mod.id)}
                    title={mod.description}
                    className={`relative w-full flex items-center gap-2.5 px-3 py-1.5 rounded text-[11px] font-mono font-semibold uppercase tracking-wider transition-all ${
                      isActive
                        ? 'bg-white/[0.06] text-white'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'
                    }`}
                  >
                    {isActive && <span className="absolute left-0 top-0.5 bottom-0.5 w-0.5 rounded-full bg-teal-500" />}
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