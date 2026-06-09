import {
  LayoutDashboard,
  FileText, Book, ListChecks, PenLine, Radar, BookOpen, FlaskConical,
  Sparkles, Activity, TrendingUp, Map,
  ShoppingCart, Package, Tag, Star, Settings, Image, Users,
  FileText as FileTextIcon, Handshake, LineChart, Palette,
  UtensilsCrossed, Cpu, Home, Megaphone, Gauge, MonitorPlay,
} from 'lucide-react';

/**
 * Management navigation — single source of truth for ManagementLayout sidebar.
 * R9CA: Platform Administration only.
 * Racing entities (Drivers, Teams, Series, Tracks, Events, Sessions, Results,
 * Standings, Points Rulesets, Imports, Calendar Sync, Diagnostics,
 * Media Applications/Assignments/Requests) have been removed.
 * RaceCore is the sole owner of all motorsports entities.
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
    description: 'Motorsports operating system — all racing entity management.',
    items: [
      { name: 'RaceCore OS', href: '/racecore', icon: MonitorPlay, description: 'Drivers, Teams, Series, Tracks, Events, Results, Standings, Media, and Data tools' },
    ],
  },

  // ─────────────────────────────────────────────────────
  // WEBSITE — public-facing content and display
  // ─────────────────────────────────────────────────────
  {
    title: 'Website',
    description: 'Homepage, motorsports home, announcements, and site content',
    items: [
      { name: 'Homepage Settings',   href: '/ManageHomepage?tab=hero', icon: Home,     description: 'Hero slides, culture blocks, apparel, and social links' },
      { name: 'Motorsports Home',    page: 'ManageMotorsportsHome',    icon: Gauge,    description: 'Trending drivers, teams, tracks, events, and championship leaders' },
      { name: 'Announcements',       page: 'ManageAnnouncements',      icon: Megaphone, description: 'Manage rotating announcement bar' },
      { name: 'Advertising',         page: 'ManageAdvertising',        icon: Megaphone, description: 'Manage advertising inquiries and placements' },
    ],
  },

  // ─────────────────────────────────────────────────────
  // CONTENT / EDITORIAL — stories, editorial workflow
  // ─────────────────────────────────────────────────────
  {
    title: 'Content / Editorial',
    description: 'Stories, editorial workflow, and publishing tools',
    items: [
      { name: 'Stories',            page: 'ManageStories',                           icon: FileText,    description: 'Create and publish articles' },
      { name: 'Issues',             page: 'ManageIssues',                            icon: Book,        description: 'Manage magazine issues' },
      { name: 'Review Queue',       page: 'management/editorial/review-queue',       icon: ListChecks,  description: 'Prioritized editorial work queue' },
      { name: 'Writer Workspace',   page: 'management/editorial/writer-workspace',   icon: PenLine,     description: 'Writer assignments, drafts, and research packets' },
      { name: 'Story Radar',        page: 'management/editorial/story-radar',        icon: Radar,       description: 'Editorial signal and recommendation dashboard' },
      { name: 'Narrative Arcs',     page: 'management/editorial/narratives',         icon: BookOpen,    description: 'Track storylines and coverage planning' },
      { name: 'Research Packets',   page: 'management/editorial/research-packets',   icon: FlaskConical, description: 'AI-generated writer research packets' },
      { name: 'Recommendations',    page: 'management/editorial/recommendations',    icon: Sparkles,    description: 'Review and action story recommendations' },
      { name: 'Signals',            page: 'management/editorial/signals',            icon: Activity,    description: 'Review content signals and queue for processing' },
      { name: 'Trend Clusters',     page: 'management/editorial/trend-clusters',     icon: TrendingUp,  description: 'Monitor active editorial trend clusters' },
      { name: 'Coverage Map',       page: 'management/editorial/coverage-map',       icon: Map,         description: 'Review coverage and identify gaps' },
    ],
  },

  // ─────────────────────────────────────────────────────
  // STORE — storefront + ecommerce
  // ─────────────────────────────────────────────────────
  {
    title: 'Store',
    description: 'Storefront operations, products, orders, and customers',
    items: [
      { name: 'Storefront Dashboard', href: '/admin/storefront',          icon: ShoppingCart, description: 'Revenue, orders, notifications, and store health' },
      { name: 'Products',             href: '/admin/products',            icon: Package,      description: 'Manage product catalog' },
      { name: 'Orders',               href: '/admin/orders',              icon: ShoppingCart, description: 'View and fulfill orders' },
      { name: 'Variants & Stock',     href: '/admin/variants',            icon: Tag,          description: 'Inventory, sizing, and stock levels' },
      { name: 'Collections',          href: '/admin/collections',         icon: Image,        description: 'Organize products into collections' },
      { name: 'Discounts',            href: '/admin/discounts',           icon: Tag,          description: 'Promo codes and discount rules' },
      { name: 'Reviews',              href: '/admin/reviews',             icon: Star,         description: 'Moderate customer reviews' },
      { name: 'Customers',            href: '/admin/customers',           icon: Users,        description: 'Customer CRM' },
      { name: 'Store Settings',       href: '/admin/storefront-settings', icon: Settings,     description: 'Global storefront configuration' },
    ],
  },

  // ─────────────────────────────────────────────────────
  // ACCESS CONTROL — users, claims, collaborators
  // ─────────────────────────────────────────────────────
  {
    title: 'Access Control',
    description: 'Claims review, collaborator access, and entity ownership management',
    items: [
      { name: 'Driver Claims',      page: 'ManageDriverClaims',  icon: FileTextIcon, description: 'Review and approve driver profile claims' },
      { name: 'Entity Claims',      page: 'ManageEntityClaims',  icon: FileTextIcon, description: 'Review and approve entity ownership claims' },
      { name: 'Access Management',  page: 'ManageAccess',        icon: Handshake,    description: 'Manage user collaborator access to entities' },
    ],
  },

  // ─────────────────────────────────────────────────────
  // PLATFORM — analytics, config, misc
  // ─────────────────────────────────────────────────────
  {
    title: 'Platform',
    description: 'Analytics, discipline colors, and platform configuration',
    items: [
      { name: 'Analytics',          page: 'AnalyticsDashboard',       icon: LineChart,      description: 'View platform insights and data trends' },
      { name: 'Discipline Colors',  page: 'management/discipline',    icon: Palette,        description: 'Manage discipline colors for map pins' },
      { name: 'Food & Beverage',    page: 'ManageFoodBeverage',       icon: UtensilsCrossed, description: 'Manage F&B offerings' },
      { name: 'Tech',               page: 'ManageTech',               icon: Cpu,             description: 'Manage tech solutions and offerings' },
    ],
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