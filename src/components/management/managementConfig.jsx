import {
  LayoutDashboard, Gauge,
  FileText, Handshake, Users, User,
  Activity, Palette, Database, Search,
  Book, ListChecks, PenLine, Radar, BookOpen, FlaskConical,
  Sparkles, TrendingUp, Map, Home, Megaphone, Image as ImageIcon,
  Building2, Package, ShoppingCart, Tag, Star, Settings,
  MessageSquare, Mail, CreditCard,
  LineChart, BarChart3,
  FileCheck,
  Link2, Navigation, ShoppingBag, Store,
  Plug, ScrollText, Camera,
} from 'lucide-react';

/**
 * Management V3 — Navigation Configuration (Phase 1)
 * ═══════════════════════════════════════════════════════════
 * Single source of truth for the entire Management navigation.
 *
 * Consumed by:
 *   - ManagementSidebar
 *   - ManagementSearch
 *   - CommandPalette
 *
 * Organization (top-level domains):
 *   Website · The Outlet · Marketplace · Apparel & Store ·
 *   Community · Commercial · Media · Platform
 *
 * RaceCore is a separate peer operational system. It appears as a
 * prominent cross-link (RACECORE_LINK), NOT as a Management section.
 * RaceCore tools are never nested inside Management.
 */

export const DASHBOARD_ITEM = {
  name: 'Overview',
  page: 'Management',
  icon: LayoutDashboard,
};

/** Prominent peer-system link to RaceCore (race operations). */
export const RACECORE_LINK = {
  name: 'RaceCore OS',
  href: '/racecore',
  icon: Gauge,
  description: 'Race operations — events, records, results, standings, governance',
};

export const MANAGEMENT_SECTIONS = [
  // ─────────────────────────────────────────────────────
  // WEBSITE — public site presentation
  // ─────────────────────────────────────────────────────
  {
    title: 'Website',
    description: 'Public site presentation: home, navigation, footer, links, announcements, SEO',
    items: [
      { name: 'Home',                page: 'management/website/home',        icon: Home,         description: 'Homepage management — Home1 editor' },
      { name: 'INDEX46',             page: 'ManageMotorsportsHome',          icon: Gauge,        description: 'Public motorsports homepage curation' },
      { name: 'Navigation',          page: 'management/website/navigation',  icon: Navigation,   description: 'Public site navigation — draft, preview, publish' },
      { name: 'Footer',              page: 'management/website/footer',      icon: LayoutDashboard, description: 'Footer groups, links, pages, socials' },
      { name: 'Links',               page: 'management/website/links',       icon: Link2,         description: 'Reusable link system (future)' },
      { name: 'Announcements',       page: 'ManageAnnouncements',           icon: Megaphone,     description: 'Rotating announcement bar' },
      { name: 'Pop-Ups',             page: 'ManagePopUps',                  icon: Megaphone,     description: 'Landing pop-ups shown on the Home page' },
      { name: 'SEO',                 page: 'management/website/seo',        icon: Search,        description: 'SEO management (future)' },
      { name: 'Legacy Homepage Settings', page: 'ManageHomepage',           icon: Home,         description: 'Legacy /Home page editor — retained for rollback' },
      { name: 'Legacy Hero Slides',       href: '/admin/hero-slides',        icon: ImageIcon,    description: 'Legacy hero slides — used by legacy /Home only' },
    ],
  },

  // ─────────────────────────────────────────────────────
  // THE OUTLET — editorial content
  // ─────────────────────────────────────────────────────
  {
    title: 'The Outlet',
    description: 'Stories, issues, submissions, and the editorial workflow',
    items: [
      { name: 'Stories',            page: 'ManageStories',                          icon: FileText,     description: 'Create and publish articles' },
      { name: 'Issues',             page: 'ManageIssues',                           icon: Book,         description: 'Manage magazine issues' },
      { name: 'Review Queue',       page: 'management/editorial/review-queue',      icon: ListChecks,   description: 'Prioritized editorial work queue' },
      { name: 'Writer Workspace',  page: 'management/editorial/writer-workspace',   icon: PenLine,      description: 'Writer assignments, drafts, and research packets' },
      { name: 'Story Radar',        page: 'management/editorial/story-radar',       icon: Radar,        description: 'Editorial signal and recommendation dashboard' },
      { name: 'Narrative Arcs',     page: 'management/editorial/narratives',        icon: BookOpen,     description: 'Track storylines and coverage planning' },
      { name: 'Research Packets',  page: 'management/editorial/research-packets',  icon: FlaskConical, description: 'AI-generated writer research packets' },
      { name: 'Recommendations',  page: 'management/editorial/recommendations',   icon: Sparkles,     description: 'Review and action story recommendations' },
      { name: 'Signals',           page: 'management/editorial/signals',           icon: Activity,     description: 'Review content signals' },
      { name: 'Trend Clusters',    page: 'management/editorial/trend-clusters',    icon: TrendingUp,   description: 'Monitor editorial trend clusters' },
      { name: 'Coverage Map',      page: 'management/editorial/coverage-map',     icon: Map,          description: 'Review coverage and identify gaps' },
    ],
  },

  // ─────────────────────────────────────────────────────
  // MARKETPLACE — listing platform administration
  // ─────────────────────────────────────────────────────
  {
    title: 'Marketplace',
    description: 'Listing platform administration (future)',
    items: [
      { name: 'Marketplace', page: 'management/marketplace', icon: ShoppingBag, description: 'Listings, visibility, moderation, categories (future)' },
    ],
  },

  // ─────────────────────────────────────────────────────
  // APPAREL & STORE — commerce + Shopify connection
  // ─────────────────────────────────────────────────────
  {
    title: 'Apparel & Store',
    description: 'Storefront, products, orders, and Shopify connection',
    items: [
      { name: 'Storefront',          href: '/admin/storefront',          icon: Store,        description: 'Revenue, orders, store health' },
      { name: 'Products',            href: '/admin/products',             icon: Package,      description: 'Manage internal product catalog' },
      { name: 'Orders',              href: '/admin/orders',               icon: ShoppingCart, description: 'View and fulfill orders' },
      { name: 'Variants & Stock',    href: '/admin/variants',             icon: Tag,          description: 'Inventory and stock levels' },
      { name: 'Collections',         href: '/admin/collections',          icon: ImageIcon,    description: 'Organize products into collections' },
      { name: 'Discounts',           href: '/admin/discounts',            icon: Tag,          description: 'Promo codes and discount rules' },
      { name: 'Reviews',             href: '/admin/reviews',             icon: Star,         description: 'Moderate customer reviews' },
      { name: 'Customers',           href: '/admin/customers',           icon: Users,        description: 'Customer CRM' },
      { name: 'Store Settings',      href: '/admin/storefront-settings', icon: Settings,     description: 'Global storefront configuration' },
      { name: 'Shopify Connection',  page: 'management/apparel/shopify',  icon: Plug,         description: 'Shopify integration configuration (future)' },
    ],
  },

  // ─────────────────────────────────────────────────────
  // COMMUNITY — users, identity, access, memberships
  // ─────────────────────────────────────────────────────
  {
    title: 'Community',
    description: 'Users, identity, claims, access, memberships, and contact',
    items: [
      { name: 'Users',                 page: 'management/community/users',         icon: Users,        description: 'User list, roles, invitations (future)' },
      { name: 'Identity Applications', page: 'management/identity-applications',   icon: FileCheck,    description: 'Review identity applications' },
      { name: 'Claims',                page: 'ManageDriverClaims',                 icon: FileText,     description: 'Review and approve driver claims' },
      { name: 'Entity Claims',         page: 'ManageEntityClaims',                 icon: FileCheck,    description: 'Review entity ownership claims' },
      { name: 'Access Management',    page: 'ManageAccess',                       icon: Handshake,    description: 'Manage collaborator access to entities' },
      { name: 'Memberships',          page: 'ManageMemberships',                  icon: CreditCard,   description: 'Configure tiers, manage members' },
      { name: 'Media Portal',         page: 'MediaPortal',                        icon: Camera,       description: 'Manage media applications and credentials' },
      { name: 'Contact Messages',     page: 'Contact',                            icon: MessageSquare,description: 'Review contact form submissions' },
      { name: 'Newsletter',           page: 'management/community/newsletter',    icon: Mail,         description: 'Newsletter subscriber management (future)' },
    ],
  },

  // ─────────────────────────────────────────────────────
  // COMMERCIAL — organizations, sponsors, advertising, ventures
  // ─────────────────────────────────────────────────────
  {
    title: 'Commercial',
    description: 'Sponsorships, advertising, and venture offerings',
    items: [
      { name: 'Sponsor Activations', page: 'ManageSponsorshipActivations', icon: Building2,   description: 'Manage sponsorship activations and deliverables' },
      { name: 'Sponsor Analytics',   page: 'ManageSponsorAnalytics',       icon: BarChart3,  description: 'Sponsor ROI and exposure analytics' },
      { name: 'Advertising',         page: 'ManageAdvertising',            icon: Megaphone,  description: 'Manage advertising inquiries and placements' },
      { name: 'Food & Beverage',     page: 'ManageFoodBeverage',           icon: Package,    description: 'Manage food and beverage offerings' },
      { name: 'Tech',                page: 'ManageTech',                   icon: Settings,   description: 'Manage tech solutions and offerings' },
    ],
  },

  // ─────────────────────────────────────────────────────
  // MEDIA — content files + future media library
  // ─────────────────────────────────────────────────────
  {
    title: 'Media',
    description: 'Content files and the future shared media library',
    items: [
      { name: 'Content Files',  href: '/admin/content-files',      icon: ImageIcon, description: 'Manage uploaded content files' },
      { name: 'Media Library',  page: 'management/media/library',   icon: ImageIcon, description: 'Shared media library and picker (future)' },
    ],
  },

  // ─────────────────────────────────────────────────────
  // PLATFORM — analytics, data health, config, system tools
  // ─────────────────────────────────────────────────────
  {
    title: 'Platform',
    description: 'Platform analytics, data health, configuration, and system tools',
    items: [
      { name: 'Platform Analytics', page: 'AnalyticsDashboard',              icon: LineChart,    description: 'View platform insights and data trends' },
      { name: 'Ad Analytics',       page: 'AdvertisementAnalytics',           icon: BarChart3,    description: 'Advertisement performance analytics' },
      { name: 'RaceCore Data Health', page: 'Diagnostics',                    icon: Database,     description: 'Opens RaceCore data diagnostics (peer system)' },
      { name: 'Discipline Colors',  page: 'management/discipline',            icon: Palette,      description: 'Manage discipline colors for map pins' },
      { name: 'Integrations',       page: 'management/platform/integrations',  icon: Plug,         description: 'Platform integrations (future)' },
      { name: 'Audit Log',          page: 'management/platform/audit-log',    icon: ScrollText,   description: 'Administrative change history (future)' },
      { name: 'Settings',          page: 'management/platform/settings',     icon: Settings,     description: 'Platform-wide settings (future)' },
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