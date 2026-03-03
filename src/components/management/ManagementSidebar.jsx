import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { ChevronDown, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MANAGEMENT_SECTIONS, DASHBOARD_ITEM } from './managementSections';

export default function ManagementSidebar({ currentPage, onNavigate }) {
  const [expandedSections, setExpandedSections] = useState(
    SECTIONS.reduce((acc, section) => ({ ...acc, [section.title]: true }), {})
  );

  const toggleSection = (title) => {
    setExpandedSections(prev => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen overflow-y-auto sticky top-0">
      <div className="p-4">
        <h3 className="text-xs font-mono tracking-wider text-gray-400 uppercase mb-4">Management</h3>
        <nav className="space-y-1">
          <Link
            to={createPageUrl(DASHBOARD_ITEM.page)}
            onClick={() => onNavigate?.(DASHBOARD_ITEM.page)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-xs rounded transition-colors mb-3 font-semibold',
              currentPage === DASHBOARD_ITEM.page
                ? 'bg-gray-900 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="flex-1">{DASHBOARD_ITEM.name}</span>
          </Link>
          <div className="border-t border-gray-200 my-2" />
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors"
              >
                <span>{section.title}</span>
                <ChevronDown
                  className={cn(
                    'w-3 h-3 transition-transform',
                    expandedSections[section.title] && 'rotate-180'
                  )}
                />
              </button>
              {expandedSections[section.title] && (
                <div className="pl-2 space-y-1">
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
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-600 hover:bg-gray-50'
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="flex-1">{item.name}</span>
                        {item.shortcut && (
                          <span className="text-[10px] opacity-50 font-mono">⌘{item.shortcut}</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}

export { SECTIONS };