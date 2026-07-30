import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { ChevronDown, Search, LayoutDashboard, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DASHBOARD_ITEM, MANAGEMENT_SECTIONS } from '@/components/management/managementConfig';

export default function ManagementSidebar({ onNavigate }) {
  const location = useLocation();
  const [query, setQuery] = useState('');
  // Sections open by default — most-used groups
  const DEFAULT_OPEN = new Set([]);
  const [expandedSections, setExpandedSections] = useState(
    MANAGEMENT_SECTIONS.reduce((acc, section) => ({
      ...acc,
      [section.title]: DEFAULT_OPEN.has(section.title),
    }), {})
  );

  // Derive current page from pathname (e.g. "/ManageDrivers" → "ManageDrivers")
  const currentPage = location.pathname.replace(/^\//, '') || 'Management';

  const toggleSection = (title) => {
    setExpandedSections(prev => ({ ...prev, [title]: !prev[title] }));
  };

  // Filter logic
  const trimmed = query.trim().toLowerCase();
  const filteredSections = trimmed
    ? MANAGEMENT_SECTIONS
        .map(section => ({
          ...section,
          items: section.items.filter(item => item.name.toLowerCase().includes(trimmed)),
        }))
        .filter(section => section.items.length > 0)
    : MANAGEMENT_SECTIONS;

  return (
    <div className="w-64 bg-surface-elevated border-r border-divider h-screen overflow-y-auto sticky top-0 flex flex-col">
      <div className="p-4 flex-1">
        <h3 className="text-xs font-mono tracking-wider text-foreground-quiet uppercase mb-3">Management</h3>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-quiet pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-divider rounded-lg focus:outline-none focus:ring-1 focus:ring-motion focus:border-motion placeholder:text-foreground-quiet"
          />
        </div>

        <nav className="space-y-1">
          {/* Dashboard link — hide during search */}
          {!trimmed && (
            <>
              <Link
                to={createPageUrl(DASHBOARD_ITEM.page)}
                onClick={() => onNavigate?.(DASHBOARD_ITEM.page)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-xs rounded transition-colors mb-1 font-semibold',
                  currentPage === DASHBOARD_ITEM.page
                    ? 'bg-motion text-white'
                    : 'text-foreground-secondary hover:bg-surface-interactive'
                )}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span className="flex-1">{DASHBOARD_ITEM.name}</span>
              </Link>

              <Link
                to="/racecore"
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-xs rounded transition-colors mb-1 font-semibold border',
                  location.pathname.startsWith('/racecore')
                    ? 'bg-motion-muted text-motion border-motion/40'
                    : 'text-motion hover:bg-motion-muted hover:text-motion-active border-motion/20'
                )}
              >
                <Gauge className="w-4 h-4 shrink-0" />
                <span className="flex-1">RaceCore OS →</span>
              </Link>
              <div className="border-t border-divider my-2" />
            </>
          )}

          {filteredSections.length === 0 && (
            <p className="text-xs text-foreground-quiet px-3 py-4 text-center">No matches</p>
          )}

          {filteredSections.map((section) => {
            const isExpanded = trimmed ? true : expandedSections[section.title];
            return (
              <div key={section.title}>
                <button
                  onClick={() => !trimmed && toggleSection(section.title)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase text-foreground-quiet hover:text-foreground hover:bg-surface-interactive rounded transition-colors',
                    trimmed && 'cursor-default'
                  )}
                >
                  <span>{section.title}</span>
                  {!trimmed && (
                    <ChevronDown
                      className={cn(
                        'w-3 h-3 transition-transform',
                        isExpanded && 'rotate-180'
                      )}
                    />
                  )}
                </button>

                {isExpanded && (
                  <div className="pl-2 space-y-0.5">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const to = item.href || createPageUrl(item.page);
                      const isActive = item.href
                        ? location.pathname + location.search === item.href || location.pathname === item.href.split('?')[0]
                        : currentPage === item.page;
                      return (
                        <Link
                          key={item.name}
                          to={to}
                          onClick={() => !item.href && onNavigate?.(item.page)}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 text-xs rounded transition-colors',
                            isActive
                              ? 'bg-motion text-white font-semibold'
                              : 'text-foreground-secondary hover:bg-surface-interactive hover:text-foreground'
                          )}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="flex-1 truncate">{item.name}</span>
                          {item.shortcut && (
                            <span className={cn(
                              'text-[10px] font-mono shrink-0',
                              isActive ? 'opacity-60' : 'text-foreground-quiet'
                            )}>
                              ⌘{item.shortcut}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
}