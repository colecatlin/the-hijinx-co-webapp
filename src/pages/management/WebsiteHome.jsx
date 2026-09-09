import React from 'react';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import AdminGuard from '@/components/management/AdminGuard';
import ManagementPlaceholder from '@/components/management/ManagementPlaceholder';

export default function WebsiteHome() {
  return (
    <ManagementLayout currentPage="management/website/home">
      <AdminGuard>
        <ManagementShell title="Home" subtitle="Homepage management — being rebuilt">
          <ManagementPlaceholder
            purpose="Manage the HIJINX homepage — hero, next up, ecosystem, what's happening, from the outlet, featured apparel, and closing CTA. Each section will support content, imagery, CTAs, visibility, ordering, data mode (auto/pinned), and scheduling."
            status="The homepage management module is being rebuilt. Home1 will become editable here in a later phase. The production homepage route is not changing yet."
            managedSystems={[
              { name: 'Hero', description: 'imagery, headlines, eyebrow, supporting copy, CTAs, scheduling' },
              { name: 'Next Up', description: 'section copy, automatic vs pinned events, display settings' },
              { name: 'Ecosystem', description: 'destination tiles, imagery, copy, visibility, ordering' },
              { name: "What's Happening", description: 'section copy, source controls, ordering, pins, visibility' },
              { name: 'From The Outlet', description: 'section copy, featured story selection, display options' },
              { name: 'Featured Apparel', description: 'section copy, lifestyle imagery, Shopify collection, product display' },
              { name: 'Closing CTA', description: 'imagery, headline, copy, CTA, scheduling' },
            ]}
            relatedLinks={[
              { label: 'Homepage Settings (legacy)', to: '/ManageHomepage' },
              { label: 'Hero Slides', to: '/admin/hero-slides' },
              { label: 'INDEX46 Curation', to: '/ManageMotorsportsHome' },
            ]}
          />
        </ManagementShell>
      </AdminGuard>
    </ManagementLayout>
  );
}