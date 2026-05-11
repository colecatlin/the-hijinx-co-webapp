/**
 * REVISION 7B — EventWorkspaceNav
 * Command-center module navigation rail (vertical).
 * Replaces horizontal tabs with a true command-center module switcher.
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

const MODULES = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'sessions', label: 'Sessions', icon: Layers },
  { id: 'results', label: 'Results', icon: BarChart3 },
  { id: 'entries', label: 'Entries', icon: LogIn },
  { id: 'compliance', label: 'Compliance', icon: Shield },
  { id: 'standings', label: 'Standings', icon: Trophy },
  { id: 'media', label: 'Media', icon: Radio },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function EventWorkspaceNav({ activePanel, onPanelChange }) {
  return (
    <div
      className="w-56 flex-shrink-0 border-r border-gray-800/60 overflow-y-auto"
      style={{
        background: 'rgba(10,12,14,0.8)',
      }}
    >
      <div className="p-3 space-y-1">
        <p className="text-[9px] uppercase tracking-widest font-bold text-gray-600 px-2 mb-2">Event Operations</p>
        {MODULES.map(mod => {
          const Icon = mod.icon;
          const isActive = activePanel === mod.id;
          return (
            <button
              key={mod.id}
              onClick={() => onPanelChange(mod.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
                isActive
                  ? 'bg-teal-900/40 text-teal-300 border border-teal-800/50'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-900/30'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="line-clamp-1">{mod.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}