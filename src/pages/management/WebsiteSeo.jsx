import React from 'react';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import AdminGuard from '@/components/management/AdminGuard';
import ManagementPlaceholder from '@/components/management/ManagementPlaceholder';

export default function WebsiteSeo() {
  return (
    <ManagementLayout currentPage="management/website/seo">
      <AdminGuard>
        <ManagementShell title="SEO" subtitle="SEO management — future">
          <ManagementPlaceholder
            purpose="Manage SEO metadata across the public site — per-route titles, descriptions, Open Graph tags, canonical URLs, and sitemap generation."
            status="No SEO management surface exists yet. A sitemap generation backend function already exists."
            managedSystems={[
              { name: 'Page SEO', description: 'per-route title, description, OG tags, canonical' },
              { name: 'Sitemap', description: 'sitemap generation (generateSitemap function exists)' },
              { name: 'Robots', description: 'robots.txt (serveRobots function exists)' },
            ]}
            notes="index.html currently holds static head/meta tags. A future SEO module would let admins override per-route metadata without editing code."
            relatedLinks={[]}
          />
        </ManagementShell>
      </AdminGuard>
    </ManagementLayout>
  );
}