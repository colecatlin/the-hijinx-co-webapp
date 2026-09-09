import React from 'react';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import AdminGuard from '@/components/management/AdminGuard';
import ManagementPlaceholder from '@/components/management/ManagementPlaceholder';

export default function Marketplace() {
  return (
    <ManagementLayout currentPage="management/marketplace">
      <AdminGuard>
        <ManagementShell title="Marketplace" subtitle="Listing platform administration — future">
          <ManagementPlaceholder
            purpose="Administer the HIJINX Marketplace listing platform — listings, visibility, moderation, categories, and archived listings. HIJINX Marketplace is a listing platform; payments and transaction disputes are not handled here."
            status="No Marketplace admin surface exists yet. Vehicle listings are currently managed as records inside RaceCore. This module will focus on platform/listing administration, not transactions."
            managedSystems={[
              { name: 'Listings', description: 'view, search, and manage marketplace listings' },
              { name: 'Visibility', description: 'draft / live / archived status' },
              { name: 'Moderation', description: 'review reported or flagged listings (future)' },
              { name: 'Categories', description: 'listing categories and classification' },
              { name: 'Archived listings', description: 'view and restore archived listings' },
            ]}
            relatedLinks={[
              { label: 'Vehicle Directory', to: '/Directory?cat=vehicles' },
            ]}
          />
        </ManagementShell>
      </AdminGuard>
    </ManagementLayout>
  );
}