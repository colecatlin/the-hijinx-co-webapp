import React from 'react';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import AdminGuard from '@/components/management/AdminGuard';
import ManagementPlaceholder from '@/components/management/ManagementPlaceholder';

export default function MediaLibrary() {
  return (
    <ManagementLayout currentPage="management/media/library">
      <AdminGuard>
        <ManagementShell title="Media Library" subtitle="Shared media library and picker — future">
          <ManagementPlaceholder
            purpose="A shared media library and picker for use across all management forms — upload, select existing, preview, replace, set alt text, and positioning. Will replace the ad-hoc image-URL inputs used across management pages today."
            status="No shared media library exists yet. Content Files (ManagedFile) is available separately but is not integrated as a picker into forms."
            managedSystems={[
              { name: 'Media library', description: 'centralized library of uploaded and external media' },
              { name: 'Media picker', description: 'reusable selector embedded in any management form' },
              { name: 'Alt text & positioning', description: 'accessibility and responsive positioning' },
            ]}
            relatedLinks={[
              { label: 'Content Files', to: '/admin/content-files' },
            ]}
          />
        </ManagementShell>
      </AdminGuard>
    </ManagementLayout>
  );
}