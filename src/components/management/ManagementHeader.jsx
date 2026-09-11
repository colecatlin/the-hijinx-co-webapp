import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ManagementSearch from './ManagementSearch';

// R9CB: Removed all motorsports entity titles — RaceCore owns those.
// Management header only covers platform administration pages.
const PAGE_TITLES = {
  Management:           { title: 'Operations Hub',     subtitle: 'The operating system for Hijinx' },
  ManageDriverClaims:   { title: 'Claims',             subtitle: 'Review and approve driver profile claims' },
  ManageEntityClaims:   { title: 'Entity Claims',     subtitle: 'Review and approve entity ownership claims' },
  ManageAccess:         { title: 'Access Management', subtitle: 'Manage user collaborator access to entities' },
  ManageStories:        { title: 'Stories',            subtitle: 'Create and publish articles' },
  ManageIssues:         { title: 'Issues',             subtitle: 'Manage magazine issues' },
  ManageAnnouncements:  { title: 'Announcements',     subtitle: 'Manage announcement bar' },
  ManageAdvertising:    { title: 'Advertising',        subtitle: 'Manage advertising inquiries' },
  ManageFoodBeverage:   { title: 'Food & Beverage',   subtitle: 'Manage food and beverage offerings' },
  ManageTech:           { title: 'Tech',              subtitle: 'Manage tech offerings' },
  AnalyticsDashboard:   { title: 'Platform Analytics', subtitle: 'View insights and data trends' },
  ManageHomepage:       { title: 'Legacy Homepage Settings', subtitle: 'Legacy /Home page editor — retained for rollback' },
  ManageMotorsportsHome:{ title: 'Motorsports Home',  subtitle: 'Control Index46 featured content' },
  ManageSponsorshipActivations: { title: 'Sponsor Activations', subtitle: 'Manage sponsorship activations and deliverables' },
  ManageSponsorAnalytics: { title: 'Sponsor Analytics', subtitle: 'Sponsor ROI and exposure analytics' },
  AdvertisementAnalytics: { title: 'Ad Analytics',    subtitle: 'Advertisement performance analytics' },
  Diagnostics:          { title: 'RaceCore Data Health', subtitle: 'Opens RaceCore data diagnostics (peer system)' },
  Contact:              { title: 'Contact Messages',   subtitle: 'Review contact form submissions' },
  MediaPortal:          { title: 'Media Portal',       subtitle: 'Manage media applications and credentials' },
  // ── Phase 1: Website placeholders ──
  'management/website/home':       { title: 'Home',          subtitle: 'Home editor — the active homepage' },
  'management/website/navigation': { title: 'Navigation',   subtitle: 'Public site navigation — draft, preview, publish' },
  'management/website/footer':     { title: 'Footer',        subtitle: 'Footer groups, links, pages, socials' },
  'management/website/links':      { title: 'Links',         subtitle: 'Reusable link system — future' },
  'management/website/seo':        { title: 'SEO',           subtitle: 'SEO management — future' },
  // ── Phase 1: other placeholders ──
  'management/marketplace':              { title: 'Marketplace',        subtitle: 'Listing platform administration — future' },
  'management/community/users':          { title: 'Users',              subtitle: 'User management — future' },
  'management/community/newsletter':     { title: 'Newsletter',         subtitle: 'Newsletter subscriber management — future' },
  'management/media/library':            { title: 'Media Library',      subtitle: 'Shared media library — future' },
  'management/platform/integrations':    { title: 'Integrations',       subtitle: 'Platform integrations — future' },
  'management/platform/audit-log':       { title: 'Audit Log',          subtitle: 'Administrative change history — future' },
  'management/platform/settings':        { title: 'Settings',           subtitle: 'Platform-wide settings — future' },
  'management/apparel/shopify':          { title: 'Shopify Connection', subtitle: 'Shopify integration configuration — future' },
  'management/discipline':                { title: 'Discipline Colors',  subtitle: 'Manage discipline colors for map pins' },
  ManageDisciplineColors:                  { title: 'Discipline Colors',  subtitle: 'Manage discipline colors for map pins' },
  'identity-applications':                { title: 'Identity Applications', subtitle: 'Review identity applications' },
  // ── Editorial pages ──
  'management/editorial/story-radar':        { title: 'Story Radar',       subtitle: 'Editorial signal and recommendation dashboard' },
  'management/editorial/recommendations':    { title: 'Recommendations',  subtitle: 'Review and action story recommendations' },
  'management/editorial/signals':            { title: 'Signals',           subtitle: 'Review content signals' },
  'management/editorial/trend-clusters':      { title: 'Trend Clusters',   subtitle: 'Monitor editorial trend clusters' },
  'management/editorial/coverage-map':        { title: 'Coverage Map',      subtitle: 'Review coverage and identify gaps' },
  'management/editorial/review-queue':         { title: 'Review Queue',     subtitle: 'Prioritized editorial work queue' },
  'management/editorial/narratives':           { title: 'Narrative Arcs',   subtitle: 'Track storylines and coverage planning' },
  'management/editorial/research-packets':     { title: 'Research Packets', subtitle: 'AI-generated writer research packets' },
  'management/editorial/writer-workspace':     { title: 'Writer Workspace', subtitle: 'Writer assignments, drafts, and research packets' },
};

export default function ManagementHeader({ currentPage }) {
  const navigate = useNavigate();
  const info = PAGE_TITLES[currentPage] || { title: currentPage || 'Management', subtitle: '' };

  return (
    <div className="bg-surface-elevated border-b border-divider shadow-sm px-6 py-3 flex items-center gap-4 shrink-0">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label="Go back"
        className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-secondary hover:text-foreground hover:bg-surface-interactive transition-colors shrink-0"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      {/* Title */}
      <div className="min-w-0 flex-1">
        <h1 className="text-base font-bold text-foreground leading-tight truncate">{info.title}</h1>
        {info.subtitle && <p className="text-xs text-foreground-quiet leading-tight truncate">{info.subtitle}</p>}
      </div>

      {/* View Site — opens public homepage in new tab */}
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-divider text-foreground-secondary hover:text-foreground hover:bg-surface-interactive transition-colors shrink-0"
      >
        View Site
      </a>

      {/* Search */}
      <ManagementSearch />
    </div>
  );
}