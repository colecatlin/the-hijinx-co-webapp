import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import PageShell from '@/components/shared/PageShell';
import StatsBar from '@/components/management/StatsBar';
import ManagementSidebar from '@/components/management/ManagementSidebar';
import CommandPalette from '@/components/management/CommandPalette';

const MANAGEMENT_SECTIONS = [
  {
    title: 'Core Entities',
    items: [
      { name: 'Drivers', page: 'ManageDrivers', description: 'Manage all driver profiles and data' },
      { name: 'Teams', page: 'ManageTeams', description: 'Manage racing teams and organizations' },
      { name: 'Tracks', page: 'ManageTracks', description: 'Manage racing venues and facilities' },
      { name: 'Series', page: 'ManageSeries', description: 'Manage racing series and championships' },
      { name: 'Events', page: 'ManageEvents', description: 'Manage race events and schedules' },
      { name: 'Sessions', page: 'ManageSessions', description: 'Manage race sessions and timing' },
      { name: 'Results', page: 'ManageResults', description: 'Manage race results and standings' },
      { name: 'Points Config', page: 'ManagePointsConfig', description: 'Link Google Sheets for automated standings calculation' },
      { name: 'Driver Claims', page: 'ManageDriverClaims', description: 'Review driver-submitted results' },
    ]
  },
  {
    title: 'Content',
    items: [
      { name: 'Stories', page: 'ManageStories', description: 'Create and publish articles' },
      { name: 'Issues', page: 'ManageIssues', description: 'Manage magazine issues' },
    ]
  },
  {
    title: 'Communications',
    items: [
      { name: 'Announcements', page: 'ManageAnnouncements', description: 'Manage rotating announcement bar' },
      { name: 'Advertising', page: 'ManageAdvertising', description: 'Manage advertising inquiries' },
      { name: 'Access Management', page: 'ManageAccess', description: 'Manage user access to entities' },
    ]
  },
  {
    title: 'Features',
    items: [
      { name: 'Food & Beverage', page: 'ManageFoodBeverage', description: 'Manage food and beverage offerings' },
      { name: 'Tech', page: 'ManageTech', description: 'Manage tech solutions and offerings' },
    ]
  },
  {
    title: 'Analytics',
    items: [
      { name: 'Analytics Dashboard', page: 'AnalyticsDashboard', description: 'View insights and data trends' },
    ]
  },
  {
    title: 'Data & Integration',
    items: [
      { name: 'CSV Import/Export', page: 'ManageCSVImportExport', description: 'Bulk import/export all entities as CSV files' },
      { name: 'Schedule Sync', page: 'ManageCalendarSync', description: 'Sync ICS/webcal schedules into Events' },
    ]
  },
  {
    title: 'Site Settings',
    items: [
      { name: 'Homepage', page: 'ManageHomepage', description: 'Manage homepage section images and visuals' },
    ]
  }
];

export default function Management() {
  const location = useLocation();
  const [currentPage] = useState(null);

  return (
    <>
      <CommandPalette />
      <div className="flex h-screen bg-gray-50">
        <ManagementSidebar currentPage={currentPage} />
        <div className="flex-1 overflow-y-auto">
          <PageShell>
            <div className="max-w-6xl mx-auto px-6 py-12">
              <div className="mb-8">
                <h1 className="text-4xl font-black mb-2">Management Dashboard</h1>
                <p className="text-gray-600">Backend system for managing all content and data</p>
                <p className="text-xs text-gray-400 mt-2">Press Cmd+K for quick navigation • Use Cmd+D, Cmd+E, Cmd+T for shortcuts</p>
              </div>

              <StatsBar />

              <div className="space-y-8">
                {MANAGEMENT_SECTIONS.map((section) => (
                  <div key={section.title}>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">
                      {section.title}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {section.items.map((item) => (
                        <div
                          key={item.name}
                          className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-900 hover:shadow-md transition-all"
                        >
                          <h3 className="font-bold text-lg mb-1">{item.name}</h3>
                          <p className="text-sm text-gray-600">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </PageShell>
        </div>
      </div>
    </>
  );
}