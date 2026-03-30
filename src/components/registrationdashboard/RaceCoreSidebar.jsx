import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { canTab } from '@/components/access/accessControl';
import { cn } from '@/lib/utils';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { RACE_CORE_NAV_GROUPS } from './raceCoreNavConfig';

export default function RaceCoreSidebar({
  activeTab,
  onTabChange,
  dashboardPermissions,
  isAdmin,
  user,
  selectedEvent,
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
    // href items (People group) are always visible — they're platform-wide links
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

  return (
    <div className="w-48 shrink-0 bg-[#111111] border-r border-gray-800 min-h-full flex flex-col py-3 overflow-y-auto">
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