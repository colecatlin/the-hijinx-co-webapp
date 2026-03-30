import React, { useState } from 'react';
import { canTab } from '@/components/access/accessControl';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { RACE_CORE_NAV_GROUPS } from './raceCoreNavConfig';

/**
 * Race Core left sidebar navigation.
 * Replaces the flat TabsList with grouped, role-aware nav.
 * All tab switching still goes through activeTab / onTabChange (same state as before).
 */
export default function RaceCoreSidebar({
  activeTab,
  onTabChange,
  dashboardPermissions,
  isAdmin,
  user,
  selectedEvent,
}) {
  // All groups expanded by default
  const [collapsed, setCollapsed] = useState({});

  const isOwnerOrEditor =
    isAdmin || ['entity_owner', 'entity_editor'].includes(user?.role);

  const toggle = (id) =>
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  const isVisible = (item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.ownerOnly && !isOwnerOrEditor) return false;
    if (item.canTabKey && !canTab(dashboardPermissions, item.canTabKey)) return false;
    return true;
  };

  const isDisabled = (item) => item.requiresEvent && !selectedEvent;

  return (
    <div className="w-52 shrink-0 bg-[#111111] border-r border-gray-800 min-h-full flex flex-col py-3">
      {RACE_CORE_NAV_GROUPS.map((group) => {
        // Filter visible items
        const visibleItems = group.items.filter(isVisible);
        // Hide entire group if no visible items
        if (visibleItems.length === 0) return null;
        // Hide admin group for non-admins and non-owners
        if (group.adminOnly && !isOwnerOrEditor) return null;

        const isOpen = !collapsed[group.id];

        return (
          <div key={group.id} className="mb-1">
            {/* Group header */}
            <button
              onClick={() => toggle(group.id)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-300 transition-colors"
            >
              <span>{group.label}</span>
              <ChevronDown
                className={cn(
                  'w-3 h-3 transition-transform opacity-50',
                  !isOpen && '-rotate-90'
                )}
              />
            </button>

            {isOpen && (
              <div className="space-y-0.5 px-2">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.tab;
                  const disabled = isDisabled(item);

                  return (
                    <button
                      key={item.tab}
                      onClick={() => !disabled && onTabChange(item.tab)}
                      disabled={disabled}
                      title={disabled ? 'Select an event first' : undefined}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs transition-colors text-left',
                        active
                          ? 'bg-gray-700 text-white font-semibold'
                          : disabled
                          ? 'text-gray-700 cursor-not-allowed'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                      )}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{item.label}</span>
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