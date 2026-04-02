import { Users, Trophy, MapPin, Calendar, Newspaper, Award, User, BarChart3, FileText, Book, MessageSquare, Megaphone, Handshake, UtensilsCrossed, Cpu, LineChart, Home, RefreshCw, FileJson, LayoutDashboard, Radar, Sparkles, Activity, TrendingUp, Map, ListChecks, BookOpen, FlaskConical, PenLine, Camera, Briefcase, Send, DollarSign, ShieldCheck, Database, Wrench, GitMerge } from 'lucide-react';

/**
 * Single source of truth for management navigation.
 *
 * Management role: admin oversight, moderation, diagnostics, bulk ops, access control, content/platform control.
 * Management is NOT the primary deep-editor for Driver, Team, Track, Series, or Event.
 * Deep operational editing routes through /race-core/:entity/:id (canonical Race Core editors).
 */

export const DASHBOARD_ITEM = {
  name: 'Dashboard',
  page: 'Management',
  icon: LayoutDashboard,
};

export const MANAGEMENT_SECTIONS = [
  // ─────────────────────────────────────────────────────
  // PLATFORM — site-level control
  // ─────────────────────────────────────────────────────
  {
    title: 'Platform',
    description: 'Site settings, homepage, announcements, and platform controls',
    items: [
      { name: 'Homepage Settings', page: 'ManageHomepage', icon: Home, description: 'Manage homepage section images and visuals' },
      { name: 'Announcements', page: 'ManageAnnouncements', icon: MessageSquare, description: 'Manage rotating announcement bar' },
      { name: 'Advertising', page: 'ManageAdvertising', icon: Megaphone, description: 'Manage advertising inquiries and placements' },
      { name: 'Analytics', page: 'AnalyticsDashboard', icon: LineChart, description: 'View platform insights and data trends' },
      { name: 'Food & Beverage', page: 'ManageFoodBeverage', icon: UtensilsCrossed, description: 'Manage F&B offerings' },
      { name: 'Tech', page: 'ManageTech', icon: Cpu, description: 'Manage tech solutions and offerings' },
    ]
  },

  // ─────────────────────────────────────────────────────
  // CONTENT / EDITORIAL — stories, media, publishing
  // ─────────────────────────────────────────────────────
  {
    title: 'Content / Editorial',
    description: 'Stories, editorial workflow, media credentials, and publishing tools',
    items: [
      { name: 'Stories', page: 'ManageStories', icon: FileText, description: 'Create and publish articles' },
      { name: 'Issues', page: 'ManageIssues', icon: Book, description: 'Manage magazine issues' },
      { name: 'Review Queue', page: 'management/editorial/review-queue', icon: ListChecks, description: 'Prioritized editorial work queue' },
      { name: 'Writer Workspace', page: 'management/editorial/writer-workspace', icon: PenLine, description: 'Writer assignments, drafts, and research packets' },
      { name: 'Story Radar', page: 'management/editorial/story-radar', icon: Radar, description: 'Editorial signal and recommendation dashboard' },
      { name: 'Narrative Arcs', page: 'management/editorial/narratives', icon: BookOpen, description: 'Track storylines and coverage planning' },
      { name: 'Research Packets', page: 'management/editorial/research-packets', icon: FlaskConical, description: 'AI-generated writer research packets' },
      { name: 'Recommendations', page: 'management/editorial/recommendations', icon: Sparkles, description: 'Review and action story recommendations' },
      { name: 'Signals', page: 'management/editorial/signals', icon: Activity, description: 'Review content signals and queue for processing' },
      { name: 'Trend Clusters', page: 'management/editorial/trend-clusters', icon: TrendingUp, description: 'Monitor active editorial trend clusters' },
      { name: 'Coverage Map', page: 'management/editorial/coverage-map', icon: Map, description: 'Review coverage and identify gaps' },
    ]
  },

  // ─────────────────────────────────────────────────────
  // MEDIA — contributor applications, assignments, payments
  // ─────────────────────────────────────────────────────
  {
    title: 'Media',
    description: 'Media contributor management, credentials, assignments, and revenue',
    items: [
      { name: 'Media Applications', page: 'management/media/applications', icon: Camera, description: 'Review and approve media contributor applications' },
      { name: 'Assignments', page: 'management/media/assignments', icon: Briefcase, description: 'Create and manage contributor assignments with deliverables' },
      { name: 'Requests', page: 'management/media/requests', icon: Send, description: 'Hiring and collaboration requests from teams, outlets, and brands' },
      { name: 'Revenue & Payments', page: 'management/media/revenue', icon: DollarSign, description: 'Payout approvals, revenue events, agreements, and payment accounts' },
    ]
  },

  // ─────────────────────────────────────────────────────
  // PEOPLE / ACCESS — claims, collaborators, permissions
  // ─────────────────────────────────────────────────────
  {
    title: 'People / Access',
    description: 'Claims review, collaborator access, and entity ownership management',
    items: [
      { name: 'Driver Claims', page: 'ManageDriverClaims', icon: FileText, description: 'Review and approve driver profile claims' },
      { name: 'Access Management', page: 'ManageAccess', icon: Handshake, description: 'Manage user collaborator access to entities' },
    ]
  },

  // ─────────────────────────────────────────────────────
  // DATA / INTEGRITY — imports, diagnostics, health
  // ─────────────────────────────────────────────────────
  {
    title: 'Data / Integrity',
    description: 'Imports, exports, diagnostics, data health, and calendar sync',
    items: [
      { name: 'CSV Import/Export', page: 'ManageCSVImportExport', icon: FileJson, description: 'Bulk import/export all entities as CSV' },
      { name: 'Schedule Sync', page: 'ManageCalendarSync', icon: RefreshCw, description: 'Sync ICS/webcal schedules into Events' },
      { name: 'Champ Import', page: 'management/champ-import', icon: GitMerge, description: 'Import championship data from external sources' },
      { name: 'Diagnostics', page: 'Diagnostics', icon: Wrench, description: 'Platform integrity checks, duplicate detection, and repair tools' },
    ]
  },

  // ─────────────────────────────────────────────────────
  // CORE ENTITY OVERSIGHT — admin list/moderation views
  // Deep editing routes through Race Core canonical editors
  // ─────────────────────────────────────────────────────
  {
    title: 'Core Entity Oversight',
    description: 'Admin list views, moderation, bulk actions. Deep editing → Race Core editors.',
    items: [
      { name: 'Drivers (Admin)', page: 'ManageDrivers', icon: User, description: 'Admin overview: bulk ops, visibility, claims, duplicate detection. Edit → Race Core.' },
      { name: 'Teams (Admin)', page: 'ManageTeams', icon: Users, description: 'Admin overview: bulk ops, status, duplicate detection. Edit → Race Core.' },
      { name: 'Tracks (Admin)', page: 'ManageTracks', icon: MapPin, description: 'Admin overview: status, duplicate detection. Edit → Race Core.' },
      { name: 'Series (Admin)', page: 'ManageSeries', icon: Trophy, description: 'Admin overview: status, bulk ops. Edit → Race Core.' },
      { name: 'Events (Admin)', page: 'ManageEvents', icon: Calendar, description: 'Admin event list and metadata overview.' },
    ]
  },

  // ─────────────────────────────────────────────────────
  // RACE CORE RECORDS — operational data under admin review
  // ─────────────────────────────────────────────────────
  {
    title: 'Race Core Records',
    description: 'Operational racing data — review and repair. Use Race Core Ops for live management.',
    items: [
      { name: 'Sessions', page: 'ManageSessions', icon: BarChart3, description: 'Review and repair race session records' },
      { name: 'Results', page: 'ManageResults', icon: Award, description: 'Review and repair race results records' },
      { name: 'Points Config', page: 'ManagePointsConfig', icon: Trophy, description: 'Points sheet integration and standings automation' },
    ]
  },
];

/**
 * Flatten all items for quick lookups.
 */
export const MANAGEMENT_PAGES = MANAGEMENT_SECTIONS.reduce((acc, section) => {
  return [...acc, ...section.items];
}, []);

/**
 * Filter sections by user role. Currently only admins have management access.
 */
export function getManagementItemsForRole(userRole) {
  if (userRole === 'admin') {
    return MANAGEMENT_SECTIONS;
  }
  return [];
}