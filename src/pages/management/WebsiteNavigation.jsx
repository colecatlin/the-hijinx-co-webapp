import React from 'react';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import AdminGuard from '@/components/management/AdminGuard';
import ManagementPlaceholder from '@/components/management/ManagementPlaceholder';

export default function WebsiteNavigation() {
  return (
    <ManagementLayout currentPage="management/website/navigation">
      <AdminGuard>
        <ManagementShell title="Navigation" subtitle="Public site navigation — future">
          <ManagementPlaceholder
            purpose="Manage the public site header navigation — primary destinations, dropdowns, and ordering."
            status="No navigation editor exists yet. Header navigation is currently hardcoded in the application layout."
            managedSystems={[
              { name: 'Primary nav', description: 'Home, The Outlet, INDEX46, Apparel, Marketplace' },
              { name: 'Dropdowns', description: 'Sub-navigation groups and ordering' },
              { name: 'Mobile nav', description: 'Bottom navigation and drawer menu' },
            ]}
            notes="The public header is defined in src/Layout.jsx (navItems array) and the mobile bottom nav in src/components/layout/MobileBottomNav.jsx. A future version of this module will make these editable without code changes."
            relatedLinks={[
              { label: 'Footer management', to: '/management/website/footer' },
              { label: 'Links management', to: '/management/website/links' },
            ]}
          />
        </ManagementShell>
      </AdminGuard>
    </ManagementLayout>
  );
}