import React from 'react';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import AdminGuard from '@/components/management/AdminGuard';
import ManagementPlaceholder from '@/components/management/ManagementPlaceholder';

export default function WebsiteLinks() {
  return (
    <ManagementLayout currentPage="management/website/links">
      <AdminGuard>
        <ManagementShell title="Links" subtitle="Reusable link system — future">
          <ManagementPlaceholder
            purpose="A reusable link/content system for use across the site — footer, navigation, CTAs, and editorial. Links are intentionally separate from the Footer system so they can be referenced by any surface."
            status="No reusable link entity exists yet. Links are currently defined per-surface (footer, header, homepage) with no shared registry."
            managedSystems={[
              { name: 'Reusable Link', description: 'label, destination (internal page / entity / external URL), enabled, sort order, new tab' },
              { name: 'Link Groups', description: 'optional grouping for organized reuse' },
            ]}
            notes="No existing link-type entity was found during the audit. HomepageSettings stores social and apparel links inline, but there is no general-purpose link registry. A future Links entity would be referenced by Footer, Navigation, and homepage CTAs rather than duplicating destinations."
            relatedLinks={[
              { label: 'Footer management', to: '/management/website/footer' },
              { label: 'Navigation management', to: '/management/website/navigation' },
            ]}
          />
        </ManagementShell>
      </AdminGuard>
    </ManagementLayout>
  );
}