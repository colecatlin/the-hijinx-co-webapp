import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { User, Users, MapPin, Trophy, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ManagementSearch from './ManagementSearch';

const QUICK_ACTIONS = [
  { label: 'Driver', page: 'ManageDrivers', icon: User },
  { label: 'Team', page: 'ManageTeams', icon: Users },
  { label: 'Track', page: 'ManageTracks', icon: MapPin },
  { label: 'Series', page: 'ManageSeries', icon: Trophy },
  { label: 'Event', page: 'ManageEvents', icon: Calendar },
];

const PAGE_TITLES = {
  Management: { title: 'Management Dashboard', subtitle: 'Backend system for all content and data' },
  ManageDrivers: { title: 'Drivers', subtitle: 'Manage all driver profiles' },
  ManageTeams: { title: 'Teams', subtitle: 'Manage racing teams and organizations' },
  ManageTracks: { title: 'Tracks', subtitle: 'Manage racing venues and facilities' },
  ManageSeries: { title: 'Series', subtitle: 'Manage racing series and championships' },
  ManageEvents: { title: 'Events', subtitle: 'Manage race events and schedules' },
  ManageSessions: { title: 'Sessions', subtitle: 'Manage race sessions and timing' },
  ManageResults: { title: 'Results', subtitle: 'Manage race results' },
  ManagePointsConfig: { title: 'Points Config', subtitle: 'Automated standings configuration' },
  ManageDriverClaims: { title: 'Driver Claims', subtitle: 'Review driver-submitted results' },
  ManageStories: { title: 'Stories', subtitle: 'Create and publish articles' },
  ManageIssues: { title: 'Issues', subtitle: 'Manage magazine issues' },
  ManageAnnouncements: { title: 'Announcements', subtitle: 'Manage announcement bar' },
  ManageAdvertising: { title: 'Advertising', subtitle: 'Manage advertising inquiries' },
  ManageAccess: { title: 'Access Management', subtitle: 'Manage user entity access' },
  ManageFoodBeverage: { title: 'Food & Beverage', subtitle: 'Manage food and beverage offerings' },
  ManageTech: { title: 'Tech', subtitle: 'Manage tech offerings' },
  AnalyticsDashboard: { title: 'Analytics', subtitle: 'View insights and data trends' },
  ManageCSVImportExport: { title: 'CSV Import / Export', subtitle: 'Bulk data operations' },
  ManageCalendarSync: { title: 'Schedule Sync', subtitle: 'Sync ICS/webcal schedules' },
  ManageHomepage: { title: 'Homepage Settings', subtitle: 'Manage homepage visuals' },
};

export default function ManagementHeader({ currentPage }) {
  const navigate = useNavigate();
  const info = PAGE_TITLES[currentPage] || { title: currentPage || 'Management', subtitle: '' };

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-3 flex items-center gap-4 shrink-0">
      {/* Title */}
      <div className="min-w-0 flex-1">
        <h1 className="text-base font-bold text-gray-900 leading-tight truncate">{info.title}</h1>
        {info.subtitle && <p className="text-xs text-gray-400 leading-tight truncate">{info.subtitle}</p>}
      </div>

      {/* Search */}
      <ManagementSearch />

      {/* Quick actions */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs text-gray-400 mr-1 hidden xl:block">New:</span>
        {QUICK_ACTIONS.map(({ label, page, icon: Icon }) => (
          <Button
            key={page}
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 hidden sm:flex"
            onClick={() => navigate(createPageUrl(page))}
          >
            <Icon className="w-3 h-3" />
            <span className="hidden lg:inline">{label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}