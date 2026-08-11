import React from 'react';
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
  ManageHomepage:       { title: 'Homepage Settings', subtitle: 'Manage homepage visuals' },
  ManageMotorsportsHome:{ title: 'Motorsports Home',  subtitle: 'Control Index46 featured content' },
  ManageSponsorshipActivations: { title: 'Sponsor Activations', subtitle: 'Manage sponsorship activations and deliverables' },
  ManageSponsorAnalytics: { title: 'Sponsor Analytics', subtitle: 'Sponsor ROI and exposure analytics' },
  AdvertisementAnalytics: { title: 'Ad Analytics',    subtitle: 'Advertisement performance analytics' },
  Diagnostics:          { title: 'Data Health',        subtitle: 'Data integrity and diagnostics' },
  Contact:              { title: 'Contact Messages',   subtitle: 'Review contact form submissions' },
  MediaPortal:          { title: 'Media Portal',       subtitle: 'Manage media applications and credentials' },
};

export default function ManagementHeader({ currentPage }) {
  const info = PAGE_TITLES[currentPage] || { title: currentPage || 'Management', subtitle: '' };

  return (
    <div className="bg-surface-elevated border-b border-divider shadow-sm px-6 py-3 flex items-center gap-4 shrink-0">
      {/* Title */}
      <div className="min-w-0 flex-1">
        <h1 className="text-base font-bold text-foreground leading-tight truncate">{info.title}</h1>
        {info.subtitle && <p className="text-xs text-foreground-quiet leading-tight truncate">{info.subtitle}</p>}
      </div>

      {/* Search */}
      <ManagementSearch />
    </div>
  );
}