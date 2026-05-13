/**
 * RaceCoreSidebar — Tactical Compressed Navigation
 * R8Y Part 1: High-density operational sidebar
 * - Compressed rows, reduced padding
 * - Active left-rail indicator
 * - Monospace group labels
 * - Muted inactive / strong active states
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { canTab, canAction } from '@/components/access/accessControl';
import { cn } from '@/lib/utils';
import { ChevronDown, ExternalLink, Plus, Film, Mic } from 'lucide-react';
import { RACE_CORE_NAV_GROUPS } from './raceCoreNavConfig';

export default function RaceCoreSidebar({
  activeTab,
  onTabChange,
  dashboardPermissions,
  isAdmin,
  user,
  selectedEvent,
  onQuickCreate,
  onCreateEvent,
  onMediaPortal,
  announcerMode,
  onAnnouncerModeToggle,
  // kept for signature compat — not used in global command mode
  onImportEntries,
  onSyncTiming,
  onPublish,
  onExport,
}) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState({});

  const isOwnerOrEditor = isAdmin || ['entity_owner', 'entity_editor'].includes(user?.role);
  const toggle = (id) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  const isVisible = (item) => {
    if (item.workspaceMigrated) return false;
    if (item.adminOnly && !isAdmin) return false;
    if (item.ownerOnly && !isOwnerOrEditor) return false;
    if (item.href) return true;
    if (item.canTabKey && !canTab(dashboardPermissions, item.canTabKey)) return false;
    return true;
  };

  const isDisabled = (item) => !item.href && item.requiresEvent && !selectedEvent;

  const handleItemClick = (item) => {
    if (item.href) { navigate(item.href); return; }
    if (!isDisabled(item)) onTabChange(item.tab);
  };

  // Global-safe quick actions only (no selectedEvent gates)
  const quickActions = [
    isAdmin && { label: 'Quick Create', icon: Plus, onClick: onQuickCreate },
    canAction(dashboardPermissions, 'create_event') && { label: 'New Event', icon: Plus, onClick: onCreateEvent },
    canTab(dashboardPermissions, 'media') && { label: 'Media Portal', icon: Film, onClick: onMediaPortal },
    { label: announcerMode ? 'ANN ON' : 'Announcer', icon: Mic, onClick: () => onAnnouncerModeToggle?.(!announcerMode), active: announcerMode },
  ].filter(Boolean);

  return (
    <div
      className="w-44 shrink-0 border-r border-gray-800/70 min-h-full flex flex-col overflow-y-auto"
      style={{ background: '#0d0d0d' }}
    >
      {/* Identity strip */}
      <div className="px-3 py-2 border-b border-gray-800/60 flex items-center gap-2">
        <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-gray-600">RACECORE</span>
        {isAdmin && (
          <span className="text-[8px] font-mono text-amber-600 border border-amber-800/50 px-1 py-px rounded-sm tracking-widest">ADM</span>
        )}
      </div>

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <div className="border-b border-gray-800/60 py-1">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={action.onClick}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-1 text-xs transition-colors text-left',
                  action.active
                    ? 'text-purple-300 bg-purple-900/20'
                    : 'text-gray-500 hover:text-gray-200 hover:bg-gray-800/30'
                )}
              >
                <Icon className="w-3 h-3 shrink-0" />
                <span className="truncate font-mono tracking-wide">{action.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Nav groups */}
      <div className="flex-1 py-1">
        {RACE_CORE_NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(isVisible);
          if (visibleItems.length === 0) return null;
          if (group.adminOnly && !isOwnerOrEditor) return null;

          const isOpen = collapsed[group.id] !== true;

          return (
            <div key={group.id} className="mb-0.5">
              {/* Group label — collapsible */}
              <button
                onClick={() => toggle(group.id)}
                className="w-full flex items-center justify-between px-3 py-1 text-[8px] font-mono font-bold uppercase tracking-widest text-gray-700 hover:text-gray-500 transition-colors"
              >
                <span>{group.label}</span>
                <ChevronDown className={cn('w-2.5 h-2.5 transition-transform opacity-40', !isOpen && '-rotate-90')} />
              </button>

              {isOpen && visibleItems.map((item) => {
                const Icon = item.icon;
                const isHref = !!item.href;
                const active = !isHref && activeTab === item.tab;
                const disabled = isDisabled(item);

                return (
                  <button
                    key={item.tab || item.href}
                    onClick={() => handleItemClick(item)}
                    disabled={disabled}
                    title={disabled ? 'Select an event first' : undefined}
                    className={cn(
                      'relative w-full flex items-center gap-2 pl-3 pr-2 py-1 text-xs transition-colors text-left',
                      active
                        ? 'text-white bg-gray-800/50'
                        : disabled
                        ? 'text-gray-800 cursor-not-allowed'
                        : isHref
                        ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/20'
                        : 'text-gray-500 hover:text-gray-200 hover:bg-gray-800/20'
                    )}
                  >
                    {/* Active left rail */}
                    {active && (
                      <span className="absolute left-0 top-0.5 bottom-0.5 w-0.5 rounded-full bg-teal-500" />
                    )}
                    <Icon className="w-3 h-3 shrink-0 flex-shrink-0" />
                    <span className="truncate flex-1">{item.label}</span>
                    {isHref && <ExternalLink className="w-2 h-2 shrink-0 opacity-20" />}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}