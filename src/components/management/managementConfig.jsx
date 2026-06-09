import { Users, Trophy, MapPin, Calendar, Award, User, BarChart3, FileText, Book, MessageSquare, Megaphone, Handshake, UtensilsCrossed, Cpu, LineChart, Home, RefreshCw, FileJson, LayoutDashboard, Radar, Sparkles, Activity, TrendingUp, Map, ListChecks, BookOpen, FlaskConical, PenLine, Camera, Briefcase, Send, DollarSign, Wrench, Palette, Gauge, ShoppingCart, Package, Tag, Star, Settings, Image, MonitorPlay } from 'lucide-react';

/**
 * Single source of truth for management navigation.
 * R9BI: Removed "Core Entity Oversight" and "Race Core Records" sections — canonical home is RaceCore.
 * Removed "Media" section — canonical home is RaceCore (/racecore/media/*).
 * Added "Race Operations" link to RaceCore.
 */

export const DASHBOARD_ITEM = {
  name: 'Dashboard',
  page: 'Management',
  icon: LayoutDashboard,
};

export const MANAGEMENT_SECTIONS = [
  // ─────────────────────────────────────────────────────
  // RACE OPERATIONS — link to RaceCore OS
  // ─────────────────────────────────────────────────────
  {
    title: 'Race Operations',
    description: 'Motorsports operating system — drivers, events, results, standings, media, and more.',
    items: [
      { name: 'RaceCore OS', href: '/racecore', icon: MonitorPlay, description: 'Go to the RaceCore motorsports operating system' },
    ]
  },

  // ─────────────────────────────────────────────────────
  // PLATFORM — site-level control
  // ─────────────────────────────────────────────────────
  {
    title: 'Platform',
    description: 'Site settings, homepage, announcements, and platform controls',
    items: [
      { name: 'Motorsports Home', page: 'ManageMotorsportsHome', icon: Gauge, description: 'Control trending drivers, teams, tracks, events, and championship leaders' },
      { name: 'Discipline Management', page: 'management/discipline', icon: Palette, description: 'Manage discipline colors for map pins' },
      { name: 'Announcements', page: 'ManageAnnouncements', icon: MessageSquare, description: 'Manage rotating announcement bar' },
      { name: 'Advertising', page: 'ManageAdvertising', icon: Megaphone, description: 'Manage advertising inquiries and placements' },
      { name: 'Analytics', page: 'AnalyticsDashboard', icon: LineChart, description: 'View platform insights and data trends' },
      { name: 'Food & Beverage', page: 'ManageFoodBeverage', icon: UtensilsCrossed, description: 'Manage F&B offerings' },
      { name: 'Tech', page: 'ManageTech', icon: Cpu, description: 'Manage tech solutions and offerings' },
    ]
  },

  // ─────────────────────────────────────────────────────
  // HOMEPAGE & STORE — storefront + homepage management
  // ─────────────────────────────────────────────────────
  {
    title: 'Homepage & Store',
    description: 'Storefront operations, homepage settings, hero slides, and visual content',
    items: [
      { name: 'Storefront Dashboard', href: '/ManageHomepage?tab=storefront', icon: ShoppingCart, description: 'Revenue, orders, notifications, and store health' },
      { name: 'Homepage Settings', href: '/ManageHomepage?tab=hero', icon: Home, description: 'Hero slides, culture blocks, apparel, and social links' },
      { name: 'Products', href: '/admin/products', icon: Package, description: 'Manage product catalog' },
      { name: 'Orders', href: '/admin/orders', icon: ShoppingCart, description: 'View and fulfill orders' },
      { name: 'Variants & Stock', href: '/admin/variants', icon: Tag, description: 'Inventory, sizing, and stock levels' },
      { name: 'Collections', href: '/admin/collections', icon: Image, description: 'Organize products into collections' },
      { name: 'Discounts', href: '/admin/discounts', icon: Tag, description: 'Promo codes and discount rules' },
      { name: 'Reviews', href: '/admin/reviews', icon: Star, description: 'Moderate customer reviews' },
      { name: 'Customers', href: '/admin/customers', icon: Users, description: 'Customer CRM' },
      { name: 'Store Settings', href: '/admin/storefront-settings', icon: Settings, description: 'Global storefront configuration' },
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
  // PEOPLE / ACCESS — claims, collaborators, permissions
  // ─────────────────────────────────────────────────────
  {
    title: 'People / Access',
    description: 'Claims review, collaborator access, and entity ownership management',
    items: [
      { name: 'Driver Claims', page: 'ManageDriverClaims', icon: FileText, description: 'Review and approve driver profile claims' },
      { name: 'Entity Claims', page: 'ManageEntityClaims', icon: FileText, description: 'Review and approve entity ownership claims' },
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
      { name: 'Diagnostics', page: 'Diagnostics', icon: Wrench, description: 'Platform integrity checks, duplicate detection, and repair tools' },
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
 * Filter sections by user role.
 */
export function getManagementItemsForRole(userRole) {
  if (userRole === 'admin') {
    return MANAGEMENT_SECTIONS;
  }
  return [];
}