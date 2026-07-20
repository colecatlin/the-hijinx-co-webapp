/**
 * RaceCoreSidebar — Tactical Compressed Navigation
 * R8Y Part 1: High-density operational sidebar
 * - Compressed rows, reduced padding
 * - Active left-rail indicator
 * - Monospace group labels
 * - Muted inactive / strong active states
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { canTab, canAction } from '@/components/access/accessControl';
import { cn } from '@/lib/utils';
import { ChevronDown, Plus, Film, Mic, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { RACE_CORE_NAV_GROUPS } from './raceCoreNavConfig';

export default function RaceCoreSidebar({
  dashboardPermissions,
  isAdmin,
  user,
  selectedEvent,
  onQuickCreate,
  onCreateEvent,
  onMediaPortal,
  announcerMode,
  onAnnouncerModeToggle,
  navCollapsed = false,
  onToggleNavCollapsed,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const COLLAPSE_STORAGE_KEY = 'racecore:nav-collapsed';
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem(COLLAPSE_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify(collapsed));
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  const isOwnerOrEditor = isAdmin || ['entity_owner', 'entity_editor'].includes(user?.role);
  const toggle = (id) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  // Parse current tab from URL search string for active state
  const currentTabParam = new URLSearchParams(location.search).get('tab');

  const isVisible = (item) => {
    if (item.workspaceMigrated) return false;
    if (item.adminOnly && !isAdmin) return false;
    if (item.ownerOnly && !isOwnerOrEditor) return false;
    if (item.href) return true;
    if (item.canTabKey && !canTab(dashboardPermissions, item.canTabKey)) return false;
    return true;
  };

  const isDisabled = (item) => item.requiresEvent && !selectedEvent;

  const handleItemClick = (item) => {
    if (item.href) navigate(item.href);
  };

  // Global-safe quick actions only (no selectedEvent gates)
  const quickActions = [
    isAdmin && { label: 'Quick Create', icon: Plus, onClick: onQuickCreate },
    canAction(dashboardPermissions, 'create_event') && { label: 'New Event', icon: Plus, onClick: onCreateEvent },
    canTab(dashboardPermissions, 'media') && { label: 'Media Portal', icon: Film, onClick: onMediaPortal },
    { label: announcerMode ? 'ANN ON' : 'Announcer', icon: Mic, onClick: () => onAnnouncerModeToggle?.(!announcerMode), active: announcerMode },
    // R9BI: Quick link to Management for admin tools

  ].filter(Boolean);

  return (
    <div
      className={cn(
        'shrink-0 border-r min-h-full flex flex-col overflow-y-auto transition-[width] duration-200',
        navCollapsed ? 'w-12' : 'w-44'
      )}
      style={{ background: '#0F1212', borderColor: 'rgba(255,255,255,0.07)' }}
    >
      {/* Home link — HIJINX platform */}
      <button
        onClick={() => navigate('/')}
        className={cn(
          'w-full flex items-center hover:opacity-70 transition-opacity',
          navCollapsed ? 'justify-center px-1 pt-3 pb-2' : 'px-3 pt-3 pb-2 gap-2'
        )}
        title="Back to HIJINX"
      >
        <img
          src="https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/857494da6_Asset444x.png"
          alt="HIJINX"
          className="h-4 w-auto object-contain"
          style={{ filter: 'brightness(0) invert(1)', opacity: 0.7 }}
        />
        {!navCollapsed && (
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69875e8c5d41c7f087ed1b90/8021cd5dd_Asset484x.png"
            alt="HIJINX"
            className="h-5 w-auto object-contain"
            style={{ filter: 'brightness(0) invert(1)', opacity: 0.55 }}
          />
        )}
      </button>

      {/* Identity strip */}
      <div
        className={cn(
          'flex items-center gap-2',
          navCollapsed ? 'justify-center px-1 py-2' : 'px-3 py-2 justify-between'
        )}
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        {navCollapsed ? (
          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-gray-600">RC</span>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-600">RaceCore</span>
            {isAdmin && (
              <span className="text-[9px] font-mono text-amber-600 border border-amber-800/50 px-1 py-px rounded-sm tracking-widest">ADM</span>
            )}
          </div>
        )}
        {!navCollapsed && (
          <button
            onClick={() => {
              const allCollapsed = RACE_CORE_NAV_GROUPS.every(g => collapsed[g.id] === true);
              if (allCollapsed) {
                setCollapsed({});
              } else {
                const next = {};
                RACE_CORE_NAV_GROUPS.forEach(g => { next[g.id] = true; });
                setCollapsed(next);
              }
            }}
            title="Collapse all / Expand all sections"
            className="text-[9px] font-mono uppercase tracking-widest text-gray-700 hover:text-teal-400 transition-colors"
          >
            All
          </button>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggleNavCollapsed}
        title={navCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className={cn(
          'w-full flex items-center text-gray-600 hover:text-teal-400 hover:bg-gray-800/30 transition-colors',
          navCollapsed ? 'justify-center py-2' : 'justify-end px-3 py-1 gap-1 text-[9px] font-mono uppercase tracking-widest'
        )}
      >
        {navCollapsed
          ? <PanelLeftOpen className="w-3.5 h-3.5" />
          : (<><span>Collapse</span><PanelLeftClose className="w-3 h-3" /></>)
        }
      </button>

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <div className="py-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={action.onClick}
                title={action.label}
                className={cn(
                  'w-full flex items-center text-xs transition-colors text-left',
                  navCollapsed ? 'justify-center px-1 py-1.5' : 'gap-2 px-3 py-1',
                  action.active
                    ? 'text-amber-300 bg-amber-900/20'
                    : 'text-gray-500 hover:text-gray-200 hover:bg-gray-800/30'
                )}
              >
                <Icon className="w-3 h-3 shrink-0" />
                {!navCollapsed && <span className="truncate font-mono tracking-wide">{action.label}</span>}
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
            <div key={group.id} className={cn('mb-0.5', navCollapsed && 'mb-1')}>
              {/* Group label — collapsible (hidden in icon-only mode) */}
              {!navCollapsed && (
                <button
                 onClick={() => toggle(group.id)}
                 className="w-full flex items-center justify-between px-3 py-1 text-[9px] font-mono font-bold uppercase tracking-widest text-gray-600 hover:text-gray-300 hover:bg-gray-800/30 rounded-sm transition-colors"
                >
                  <span>{group.label}</span>
                  <ChevronDown className={cn('w-2.5 h-2.5 transition-transform opacity-40', !isOpen && '-rotate-90')} />
                </button>
              )}

              {(navCollapsed || isOpen) && visibleItems.map((item) => {
                const Icon = item.icon;
                const isHref = !!item.href;
                // Active state: resolve pathname + optional tab query param
                const active = (() => {
                  if (!isHref) return false;
                  const [hrefPath, hrefQuery] = item.href.split('?');
                  if (location.pathname !== hrefPath) {
                    return location.pathname.startsWith(hrefPath + '/');
                  }
                  if (!hrefQuery) {
                    // Pure path (e.g. /racecore = overview): active when no tab param
                    return hrefPath === '/racecore' ? !currentTabParam : true;
                  }
                  // Has query — match tab param
                  return new URLSearchParams(hrefQuery).get('tab') === currentTabParam;
                })();
                const disabled = isDisabled(item);
                const itemTitle = disabled ? 'Select an event first' : item.label;

                return (
                  <button
                    key={item.tab || item.href}
                    onClick={() => handleItemClick(item)}
                    disabled={disabled}
                    title={itemTitle}
                    className={cn(
                      'relative w-full flex items-center text-xs transition-colors text-left',
                      navCollapsed ? 'justify-center px-1 py-1.5 gap-0' : 'gap-2 pl-3 pr-2 py-1',
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
                    {!navCollapsed && <span className="truncate flex-1">{item.label}</span>}
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