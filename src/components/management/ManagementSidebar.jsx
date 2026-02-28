import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { ChevronDown, Users, Trophy, MapPin, Calendar, Newspaper, Package, Award, Mail, User, BarChart3, FileText, Book, MessageSquare, Image, TrendingUp, Heart, Handshake, UtensilsCrossed, Cpu, LineChart, Home, RefreshCw, Megaphone, FileJson, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const SECTIONS = [
  {
    title: 'Core Entities',
    shortcut: 'C',
    items: [
      { name: 'Drivers', page: 'ManageDrivers', icon: User, shortcut: 'D' },
      { name: 'Teams', page: 'ManageTeams', icon: Users, shortcut: 'T' },
      { name: 'Tracks', page: 'ManageTracks', icon: MapPin },
      { name: 'Series', page: 'ManageSeries', icon: Trophy },
      { name: 'Events', page: 'ManageEvents', icon: Calendar, shortcut: 'E' },
      { name: 'Sessions', page: 'ManageSessions', icon: BarChart3 },
      { name: 'Results', page: 'ManageResults', icon: Award },
      { name: 'Points Config', page: 'ManagePointsConfig', icon: Trophy },
      { name: 'Driver Claims', page: 'ManageDriverClaims', icon: FileText },
    ]
  },
  {
    title: 'Content',
    items: [
      { name: 'Stories', page: 'ManageStories', icon: FileText },
      { name: 'Issues', page: 'ManageIssues', icon: Book },
    ]
  },
  {
    title: 'Communications',
    items: [
      { name: 'Announcements', page: 'ManageAnnouncements', icon: MessageSquare },
      { name: 'Advertising', page: 'ManageAdvertising', icon: Megaphone },
      { name: 'Access Management', page: 'ManageAccess', icon: Handshake },
    ]
  },
  {
    title: 'Features',
    items: [
      { name: 'Food & Beverage', page: 'ManageFoodBeverage', icon: UtensilsCrossed },
      { name: 'Tech', page: 'ManageTech', icon: Cpu },
    ]
  },
  {
    title: 'Analytics',
    items: [
      { name: 'Analytics Dashboard', page: 'AnalyticsDashboard', icon: LineChart },
    ]
  },
  {
    title: 'Data & Integration',
    items: [
      { name: 'CSV Import/Export', page: 'ManageCSVImportExport', icon: FileJson },
      { name: 'Schedule Sync', page: 'ManageCalendarSync', icon: RefreshCw },
    ]
  },
  {
    title: 'Site Settings',
    items: [
      { name: 'Homepage', page: 'ManageHomepage', icon: Home },
    ]
  }
];

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