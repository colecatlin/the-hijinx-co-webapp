import React from 'react';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import AdminGuard from '@/components/management/AdminGuard';
import ManagementPlaceholder from '@/components/management/ManagementPlaceholder';

export default function WebsiteFooter() {
  return (
    <ManagementLayout currentPage="management/website/footer">
      <AdminGuard>
        <ManagementShell title="Footer" subtitle="Footer groups, links, pages, socials, and legal">
          <ManagementPlaceholder
            purpose="Manage the global site footer — navigation groups, links, footer pages, social links, and legal/utility links. Eventually supports ordering, visibility, and internal/external destinations."
            status="Footer content is currently hardcoded. This module will eventually make it editable without code changes."
            managedSystems={[
              { name: 'Navigation Group', description: 'title, enabled, sort order' },
              { name: 'Footer Link', description: 'label, destination, group, enabled, sort order, internal/external, new tab' },
              { name: 'Footer Page', description: 'title, slug, content/linked page, enabled, footer group, sort order' },
              { name: 'Social Link', description: 'platform, label, destination, enabled, sort order' },
              { name: 'Legal / Utility', description: 'label, destination, enabled, sort order' },
            ]}
            notes={
              <>
                <p className="mb-2">Current footer data sources (documented for the future editor):</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Footer link groups are hardcoded in <code className="font-mono text-xs">src/components/shared/Footer.jsx</code> (5 groups: Platform, Get Started, Ventures, Company, Legal).</li>
                  <li>Social links are stored in the <code className="font-mono text-xs">HomepageSettings</code> entity and edited via Homepage Settings → Socials tab.</li>
                  <li>Legal links (Privacy, Terms) are hardcoded footer entries pointing to existing pages.</li>
                  <li>Hashtag Library was added to the footer navigation as part of Phase 1 (see Company group).</li>
                </ul>
              </>
            }
            relatedLinks={[
              { label: 'Homepage Settings (Socials)', to: '/ManageHomepage?tab=socials' },
              { label: 'Links management', to: '/management/website/links' },
              { label: 'Hashtag Library', to: '/hashtag-library' },
            ]}
          />
        </ManagementShell>
      </AdminGuard>
    </ManagementLayout>
  );
}