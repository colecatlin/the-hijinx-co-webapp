import React from 'react';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import AdminGuard from '@/components/management/AdminGuard';
import SeoEditor from '@/components/management/seo/SeoEditor';

export default function WebsiteSeo() {
  return (
    <ManagementLayout currentPage="management/website/seo">
      <AdminGuard>
        <ManagementShell
          title="SEO"
          subtitle="Site-wide SEO defaults, static page metadata, social sharing, and indexing controls"
        >
          <SeoEditor />
        </ManagementShell>
      </AdminGuard>
    </ManagementLayout>
  );
}