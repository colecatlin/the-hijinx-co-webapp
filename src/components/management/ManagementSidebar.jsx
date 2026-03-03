import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { ChevronDown, LayoutDashboard, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MANAGEMENT_SECTIONS, DASHBOARD_ITEM } from './managementSections';

export { MANAGEMENT_SECTIONS };

export default function ManagementSidebar({ onNavigate }) {
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState(
    MANAGEMENT_SECTIONS.reduce((acc, section) => ({ ...acc, [section.title]: true }), {})
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
    <div className="w-64 bg-white border-r border-gray-200 h-screen overflow-y-auto sticky top-0 flex flex-col">
      <div className="p-4 flex-1">
        <h3 className="text-xs font-mono tracking-wider text-gray-400 uppercase mb-3">Management</h3>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 placeholder-gray-400"
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
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span className="flex-1">{DASHBOARD_ITEM.name}</span>
              </Link>
              <div className="border-t border-gray-200 my-2" />
            </>
          )}

          {filteredSections.length === 0 && (
            <p className="text-xs text-gray-400 px-3 py-4 text-center">No matches</p>
          )}

          {filteredSections.map((section) => {
            const isExpanded = trimmed ? true : expandedSections[section.title];
            return (
              <div key={section.title}>
                <button
                  onClick={() => !trimmed && toggleSection(section.title)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors',
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
                      const isActive = currentPage === item.page;
                      return (
                        <Link
                          key={item.name}
                          to={createPageUrl(item.page)}
                          onClick={() => onNavigate?.(item.page)}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 text-xs rounded transition-colors',
                            isActive
                              ? 'bg-gray-900 text-white font-semibold'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          )}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="flex-1 truncate">{item.name}</span>
                          {item.shortcut && (
                            <span className={cn(
                              'text-[10px] font-mono shrink-0',
                              isActive ? 'opacity-60' : 'text-gray-400'
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