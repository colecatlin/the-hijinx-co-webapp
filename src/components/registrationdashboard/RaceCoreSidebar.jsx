import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { canTab, canAction } from '@/components/access/accessControl';
import { cn } from '@/lib/utils';
import { ChevronDown, ExternalLink, Plus, Upload, RefreshCw, Send, Download, Film, Mic } from 'lucide-react';
import { RACE_CORE_NAV_GROUPS } from './raceCoreNavConfig';

export default function RaceCoreSidebar({
  activeTab,
  onTabChange,
  dashboardPermissions,
  isAdmin,
  user,
  selectedEvent,
  // Quick action callbacks
  onQuickCreate,
  onCreateEvent,
  onImportEntries,
  onSyncTiming,
  onPublish,
  onExport,
  onMediaPortal,
  announcerMode,
  onAnnouncerModeToggle,
}) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState({});

  const isOwnerOrEditor =
    isAdmin || ['entity_owner', 'entity_editor'].includes(user?.role);

  const toggle = (id) =>
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  const isVisible = (item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.ownerOnly && !isOwnerOrEditor) return false;
    if (item.href) return true;
    if (item.canTabKey && !canTab(dashboardPermissions, item.canTabKey)) return false;
    return true;
  };

  const isDisabled = (item) => !item.href && item.requiresEvent && !selectedEvent;

  const handleItemClick = (item) => {
    if (item.href) {
      navigate(item.href);
      return;
    }
    if (!isDisabled(item)) {
      onTabChange(item.tab);
    }
  };

  // Build the list of quick actions to show
  const quickActions = [
    isAdmin && { label: 'Quick Create', icon: Plus, onClick: onQuickCreate },
    canAction(dashboardPermissions, 'create_event') && { label: 'Create Event', icon: Plus, onClick: onCreateEvent },
    canAction(dashboardPermissions, 'import_csv') && selectedEvent && { label: 'Import Entries', icon: Upload, onClick: onImportEntries },
    canAction(dashboardPermissions, 'sync_timing') && selectedEvent && { label: 'Sync Timing', icon: RefreshCw, onClick: onSyncTiming },
    canAction(dashboardPermissions, 'publish_official') && selectedEvent && { label: 'Publish', icon: Send, onClick: onPublish },
    canAction(dashboardPermissions, 'export') && selectedEvent && { label: 'Export', icon: Download, onClick: onExport },
    canTab(dashboardPermissions, 'media') && { label: 'Media Portal', icon: Film, onClick: onMediaPortal },
    { label: announcerMode ? 'Announcer On' : 'Announcer Mode', icon: Mic, onClick: () => onAnnouncerModeToggle?.(!announcerMode), active: announcerMode, purple: true },
  ].filter(Boolean);

  return (
    <div className="w-48 shrink-0 bg-[#111111] border-r border-gray-800 min-h-full flex flex-col py-3 overflow-y-auto">

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <div className="mb-1">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-600">
            Quick Actions
          </div>
          <div className="space-y-0.5 px-2 pb-1">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={action.onClick}
                  className={cn(
                    'w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs transition-colors text-left',
                    action.purple && action.active
                      ? 'bg-purple-900/40 text-purple-300'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                  )}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate flex-1">{action.label}</span>
                </button>
              );
            })}
          </div>
          <div className="mx-3 border-t border-gray-800 mb-1" />
        </div>
      )}

      {RACE_CORE_NAV_GROUPS.map((group) => {
        const visibleItems = group.items.filter(isVisible);
        if (visibleItems.length === 0) return null;
        if (group.adminOnly && !isOwnerOrEditor) return null;

        const isOpen = collapsed[group.id] !== true;

        return (
          <div key={group.id} className="mb-0.5">
            <button
              onClick={() => toggle(group.id)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-600 hover:text-gray-400 transition-colors"
            >
              <span>{group.label}</span>
              <ChevronDown
                className={cn(
                  'w-3 h-3 transition-transform opacity-40',
                  !isOpen && '-rotate-90'
                )}
              />
            </button>

            {isOpen && (
              <div className="space-y-0.5 px-2 pb-1">
                {visibleItems.map((item) => {
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
                        'w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs transition-colors text-left',
                        active
                          ? 'bg-gray-700 text-white font-semibold'
                          : disabled
                          ? 'text-gray-700 cursor-not-allowed'
                          : isHref
                          ? 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                      )}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate flex-1">{item.label}</span>
                      {isHref && (
                        <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-30" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}