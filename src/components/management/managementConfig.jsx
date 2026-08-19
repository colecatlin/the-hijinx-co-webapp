import {
  LayoutDashboard, Gauge,
  FileText, Handshake, Users,
  Activity, Palette, Cpu, Database, Search,
  Book, ListChecks, PenLine, Radar, BookOpen, FlaskConical,
  Sparkles, TrendingUp, Map, Home, Megaphone, Image as ImageIcon,
  Building2, DollarSign, Package, ShoppingCart, Tag, Star, Settings,
  MessageSquare, Mail, CreditCard,
  LineChart, BarChart3,
  Shield, FileCheck,
} from 'lucide-react';

/**
 * Management V2 — Navigation Configuration
 * ═════════════════════════════════════════════════════════════
 * Reorganized into logical operational groups:
 *
 *   Management = Company Operations
 *   RaceCore   = Race Operations
 *
 * Every admin page belongs to exactly one section.
 * No orphan pages. No RaceCore operational tools in Management.
 */

export const DASHBOARD_ITEM = {
  name: 'Overview',
  page: 'Management',
  icon: LayoutDashboard,
};

export const MANAGEMENT_SECTIONS = [
  // ─────────────────────────────────────────────────────
  // PEOPLE — users, claims, access
  // ─────────────────────────────────────────────────────
  {
    title: 'People',
    description: 'Users, claims, permissions, and access control',
    items: [
      { name: 'Claims',            page: 'ManageDriverClaims',  icon: FileText,    description: 'Review and approve driver claims' },
      { name: 'Entity Claims',     page: 'ManageEntityClaims',  icon: FileCheck,   description: 'Review entity ownership claims' },
      { name: 'Access Management', page: 'ManageAccess',        icon: Handshake,   description: 'Manage collaborator access to entities' },
    ],
  },

  // ─────────────────────────────────────────────────────
  // CONTENT — stories, editorial, homepage, advertising
  // ─────────────────────────────────────────────────────
  {
    title: 'Content',
    description: 'Articles, editorial workflow, homepage, and advertising',
    items: [
      { name: 'Stories',          page: 'ManageStories',                           icon: FileText,     description: 'Create and publish articles' },
      { name: 'Issues',           page: 'ManageIssues',                            icon: Book,         description: 'Manage magazine issues' },
      { name: 'Homepage',         href: '/ManageHomepage?tab=hero',                icon: Home,         description: 'Hero slides, culture blocks, apparel, social links' },
      { name: 'Motorsports Home', page: 'ManageMotorsportsHome',                   icon: Gauge,        description: 'Trending drivers, teams, tracks, events' },
      { name: 'Announcements',    page: 'ManageAnnouncements',                     icon: Megaphone,    description: 'Manage rotating announcement bar' },
      { name: 'Advertising',      page: 'ManageAdvertising',                       icon: Megaphone,    description: 'Manage advertising inquiries and placements' },
      { name: 'Review Queue',     page: 'management/editorial/review-queue',       icon: ListChecks,   description: 'Prioritized editorial work queue' },
      { name: 'Writer Workspace', page: 'management/editorial/writer-workspace',   icon: PenLine,      description: 'Writer assignments, drafts, and research packets' },
      { name: 'Story Radar',      page: 'management/editorial/story-radar',        icon: Radar,        description: 'Editorial signal and recommendation dashboard' },
      { name: 'Narrative Arcs',   page: 'management/editorial/narratives',         icon: BookOpen,     description: 'Track storylines and coverage planning' },
      { name: 'Research Packets', page: 'management/editorial/research-packets',   icon: FlaskConical, description: 'AI-generated writer research packets' },
      { name: 'Recommendations', page: 'management/editorial/recommendations',    icon: Sparkles,     description: 'Review and action story recommendations' },
      { name: 'Signals',          page: 'management/editorial/signals',            icon: Activity,     description: 'Review content signals' },
      { name: 'Trend Clusters',   page: 'management/editorial/trend-clusters',     icon: TrendingUp,   description: 'Monitor editorial trend clusters' },
      { name: 'Coverage Map',     page: 'management/editorial/coverage-map',       icon: Map,          description: 'Review coverage and identify gaps' },
    ],
  },

  // ─────────────────────────────────────────────────────
  // COMMERCIAL — organizations, sponsors, store, revenue
  // ─────────────────────────────────────────────────────
  {
    title: 'Commercial',
    description: 'Organizations, sponsors, activations, marketplace, and revenue',
    items: [
      { name: 'Memberships',        page: 'ManageMemberships',             icon: CreditCard,   description: 'Configure tiers, manage members, and review entitlements' },
      { name: 'Sponsor Activations', page: 'ManageSponsorshipActivations', icon: Building2,    description: 'Manage sponsorship activations and deliverables' },
      { name: 'Food & Beverage',     page: 'ManageFoodBeverage',           icon: Package,      description: 'Manage F&B offerings' },
      { name: 'Tech',                 page: 'ManageTech',                   icon: Cpu,          description: 'Manage tech solutions and offerings' },
      { name: 'Storefront',           href: '/admin/storefront',            icon: ShoppingCart, description: 'Revenue, orders, store health' },
      { name: 'Products',             href: '/admin/products',              icon: Package,      description: 'Manage product catalog' },
      { name: 'Orders',               href: '/admin/orders',                icon: ShoppingCart, description: 'View and fulfill orders' },
      { name: 'Variants & Stock',     href: '/admin/variants',               icon: Tag,          description: 'Inventory and stock levels' },
      { name: 'Collections',          href: '/admin/collections',           icon: ImageIcon,    description: 'Organize products into collections' },
      { name: 'Discounts',            href: '/admin/discounts',             icon: Tag,          description: 'Promo codes and discount rules' },
      { name: 'Reviews',              href: '/admin/reviews',              icon: Star,         description: 'Moderate customer reviews' },
      { name: 'Customers',            href: '/admin/customers',             icon: Users,        description: 'Customer CRM' },
      { name: 'Store Settings',       href: '/admin/storefront-settings',   icon: Settings,     description: 'Global storefront configuration' },
    ],
  },

  // ─────────────────────────────────────────────────────
  // ANALYTICS — platform, sponsor, advertisement
  // ─────────────────────────────────────────────────────
  {
    title: 'Analytics',
    description: 'Platform insights, sponsor analytics, and data trends',
    items: [
      { name: 'Platform Analytics', page: 'AnalyticsDashboard',       icon: LineChart,  description: 'View platform insights and data trends' },
      { name: 'Sponsor Analytics',  page: 'ManageSponsorAnalytics',    icon: BarChart3,  description: 'Sponsor ROI and exposure analytics' },
      { name: 'Ad Analytics',       page: 'AdvertisementAnalytics',    icon: BarChart3,  description: 'Advertisement performance analytics' },
    ],
  },

  // ─────────────────────────────────────────────────────
  // PLATFORM — health, config, system tools
  // ─────────────────────────────────────────────────────
  {
    title: 'Platform',
    description: 'Platform health, configuration, and system tools',
    items: [
      { name: 'Data Health',       page: 'Diagnostics',           icon: Database,   description: 'Data integrity and diagnostics' },
      { name: 'Discipline Colors',  page: 'management/discipline', icon: Palette,    description: 'Manage discipline colors for map pins' },
      { name: 'Content Files',     href: '/admin/content-files', icon: ImageIcon,  description: 'Manage uploaded content files' },
      { name: 'Hero Slides',       href: '/admin/hero-slides',   icon: ImageIcon,  description: 'Manage homepage hero slides' },
    ],
  },

  // ─────────────────────────────────────────────────────
  // COMMUNITY — feedback, contact, newsletter
  // ─────────────────────────────────────────────────────
  {
    title: 'Community',
    description: 'Feedback, contact messages, and newsletter',
    items: [
      { name: 'Contact Messages', page: 'Contact',      icon: MessageSquare, description: 'Review contact form submissions' },
      { name: 'Newsletter',       page: 'ManageStories',  icon: Mail,          description: 'Newsletter subscriber management' },
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