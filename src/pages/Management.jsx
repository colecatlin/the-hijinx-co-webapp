import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import PageShell from '@/components/shared/PageShell';
import { Users, Trophy, MapPin, Calendar, Newspaper, Package, Award, Mail, User, BarChart3, FileText, Book, MessageSquare, Image, TrendingUp, Heart, Handshake, UtensilsCrossed, Cpu, LineChart, Home, RefreshCw, Megaphone, FileJson, Clock, ClipboardList } from 'lucide-react';

export default function Management() {
  const sections = [
    {
      title: 'Core Entities',
      items: [
        { name: 'Drivers', page: 'ManageDrivers', icon: User, description: 'Manage all driver profiles and data' },
        { name: 'Teams', page: 'ManageTeams', icon: Users, description: 'Manage racing teams and organizations' },
        { name: 'Tracks', page: 'ManageTracks', icon: MapPin, description: 'Manage racing venues and facilities' },
        { name: 'Series', page: 'ManageSeries', icon: Trophy, description: 'Manage racing series and championships' },
        { name: 'Events', page: 'ManageEvents', icon: Calendar, description: 'Manage race events and schedules' },
        { name: 'Sessions', page: 'ManageSessions', icon: BarChart3, description: 'Manage race sessions and timing' },
        { name: 'Results', page: 'ManageResults', icon: Award, description: 'Manage race results and standings' },
        { name: 'Registrations', page: 'ManageRegistrations', icon: ClipboardList, description: 'Manage driver, team, and event registrations' },
        { name: 'Points Config', page: 'ManagePointsConfig', icon: Trophy, description: 'Link Google Sheets for automated standings calculation' },
        { name: 'Driver Claims', page: 'ManageDriverClaims', icon: FileText, description: 'Review driver-submitted results' },
      ]
    },
    {
      title: 'Content',
      items: [
        { name: 'Stories', page: 'ManageStories', icon: FileText, description: 'Create and publish articles' },
        { name: 'Issues', page: 'ManageIssues', icon: Book, description: 'Manage magazine issues' },
      ]
    },
    {
      title: 'Communications',
      items: [
        { name: 'Announcements', page: 'ManageAnnouncements', icon: MessageSquare, description: 'Manage rotating announcement bar' },
        { name: 'Messages', page: 'ManageMessages', icon: Mail, description: 'View contact messages and inquiries' },
        { name: 'Advertising', page: 'ManageAdvertising', icon: Megaphone, description: 'Manage advertising inquiries' },
        { name: 'Access Management', page: 'ManageAccess', icon: Handshake, description: 'Manage user access to entities' },
      ]
    },
    {
      title: 'Features',
      items: [
        { name: 'Food & Beverage', page: 'ManageFoodBeverage', icon: UtensilsCrossed, description: 'Manage food and beverage offerings' },
        { name: 'Tech', page: 'ManageTech', icon: Cpu, description: 'Manage tech solutions and offerings' },
      ]
    },
    {
      title: 'Analytics',
      items: [
        { name: 'Analytics Dashboard', page: 'AnalyticsDashboard', icon: LineChart, description: 'View insights and data trends' },
      ]
    },
    {
      title: 'Data & Integration',
      items: [
        { name: 'CSV Import/Export', page: 'ManageCSVImportExport', icon: FileJson, description: 'Bulk import/export all entities as CSV files' },
        { name: 'Schedule Sync', page: 'ManageCalendarSync', icon: RefreshCw, description: 'Sync ICS/webcal schedules into Events' },
      ]
    },
    {
      title: 'Site Settings',
      items: [
        { name: 'Homepage', page: 'ManageHomepage', icon: Home, description: 'Manage homepage section images and visuals' },
      ]
    }
  ];

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2">Management</h1>
          <p className="text-gray-600">Backend system for managing all content and data</p>
        </div>

        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">
                {section.title}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={createPageUrl(item.page)}
                      className="block p-6 bg-white border border-gray-200 rounded-lg hover:border-gray-900 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-gray-900 transition-colors">
                          <Icon className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg mb-1">{item.name}</h3>
                          <p className="text-sm text-gray-600">{item.description}</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}