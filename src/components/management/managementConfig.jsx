import { Users, Trophy, MapPin, Calendar, Newspaper, Award, User, BarChart3, FileText, Book, MessageSquare, Megaphone, Handshake, UtensilsCrossed, Cpu, LineChart, Home, RefreshCw, FileJson, LayoutDashboard, Radar, Sparkles, Activity, TrendingUp, Map, ListChecks, BookOpen, FlaskConical, PenLine, Camera, Briefcase, Send, DollarSign } from 'lucide-react';

/**
 * Single source of truth for management navigation and pages.
 * Both ManagementSidebar and Management landing page import from here.
 */

export const DASHBOARD_ITEM = {
  name: 'Dashboard',
  page: 'Management',
  icon: LayoutDashboard,
  shortcut: 'Cmd+Shift+D',
};

export const MANAGEMENT_SECTIONS = [
  {
    title: 'Core Entities',
    shortcut: 'C',
    items: [
      { name: 'Drivers', page: 'ManageDrivers', icon: User, shortcut: 'D', description: 'Manage all driver profiles and data' },
      { name: 'Teams', page: 'ManageTeams', icon: Users, shortcut: 'T', description: 'Manage racing teams and organizations' },
      { name: 'Tracks', page: 'ManageTracks', icon: MapPin, description: 'Manage racing venues and facilities' },
      { name: 'Series', page: 'ManageSeries', icon: Trophy, description: 'Manage racing series and championships' },
      { name: 'Events', page: 'ManageEvents', icon: Calendar, shortcut: 'E', description: 'Manage race events and schedules' },
      { name: 'Sessions', page: 'ManageSessions', icon: BarChart3, description: 'Manage race sessions and timing' },
      { name: 'Results', page: 'ManageResults', icon: Award, description: 'Manage race results and standings' },
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
    title: 'Editorial',
    items: [
      { name: 'Writer Workspace', page: 'management/editorial/writer-workspace', icon: PenLine, description: 'Writer assignments, drafts, and research packets' },
      { name: 'Story Radar', page: 'management/editorial/story-radar', icon: Radar, description: 'Editorial signal and recommendation dashboard' },
      { name: 'Review Queue', page: 'management/editorial/review-queue', icon: ListChecks, description: 'Prioritized editorial work queue' },
      { name: 'Narrative Arcs', page: 'management/editorial/narratives', icon: BookOpen, description: 'Track storylines and coverage planning' },
      { name: 'Research Packets', page: 'management/editorial/research-packets', icon: FlaskConical, description: 'AI-generated writer research packets' },
      { name: 'Recommendations', page: 'management/editorial/recommendations', icon: Sparkles, description: 'Review and action story recommendations' },
      { name: 'Signals', page: 'management/editorial/signals', icon: Activity, description: 'Review content signals and queue for processing' },
      { name: 'Trend Clusters', page: 'management/editorial/trend-clusters', icon: TrendingUp, description: 'Monitor active editorial trend clusters' },
      { name: 'Coverage Map', page: 'management/editorial/coverage-map', icon: Map, description: 'Review what has been covered and identify gaps' },
    ]
  },
  {
    title: 'Media',
    items: [
      { name: 'Media Applications', page: 'management/media/applications', icon: Camera, description: 'Review and approve media contributor applications' },
      { name: 'Assignments', page: 'management/media/assignments', icon: Briefcase, description: 'Create and manage contributor assignments with deliverables' },
      { name: 'Requests', page: 'management/media/requests', icon: Send, description: 'Hiring and collaboration requests from teams, outlets, and brands' },
      { name: 'Revenue & Payments', page: 'management/media/revenue', icon: DollarSign, description: 'Payout approvals, revenue events, agreements, and payment accounts' },
    ]
  },
  {
    title: 'Communications',
    items: [
      { name: 'Announcements', page: 'ManageAnnouncements', icon: MessageSquare, description: 'Manage rotating announcement bar' },
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

/**
 * Flatten all items from sections into a single array for quick lookups.
 */
export const MANAGEMENT_PAGES = MANAGEMENT_SECTIONS.reduce((acc, section) => {
  return [...acc, ...section.items];
}, []);

/**
 * Helper to get management sections and pages filtered by user role.
 * Currently only admins have access to management; non-admins see nothing.
 * @param {string} userRole - The user's role (e.g., 'admin', 'user')
 * @returns {Array} Filtered sections, or empty array if not admin
 */
export function getManagementItemsForRole(userRole) {
  if (userRole === 'admin') {
    return MANAGEMENT_SECTIONS;
  }
  return [];
}