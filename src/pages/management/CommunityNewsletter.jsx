import React from 'react';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import AdminGuard from '@/components/management/AdminGuard';
import ManagementPlaceholder from '@/components/management/ManagementPlaceholder';

export default function CommunityNewsletter() {
  return (
    <ManagementLayout currentPage="management/community/newsletter">
      <AdminGuard>
        <ManagementShell title="Newsletter" subtitle="Newsletter subscriber management — future">
          <ManagementPlaceholder
            purpose="Manage newsletter subscribers and communications. Subscribers are collected from the footer signup form and other entry points."
            status="A NewsletterSubscriber entity exists but has no dedicated admin UI. This module will provide subscriber management and export."
            managedSystems={[
              { name: 'Subscribers', description: 'list, search, and export subscribers' },
              { name: 'Campaigns', description: 'compose and send newsletter campaigns (future)' },
            ]}
            relatedLinks={[
              { label: 'Stories', to: '/ManageStories' },
            ]}
          />
        </ManagementShell>
      </AdminGuard>
    </ManagementLayout>
  );
}