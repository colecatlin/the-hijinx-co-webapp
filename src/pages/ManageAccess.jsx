import React from 'react';
import PageShell from '@/components/shared/PageShell';
import AccessCard from '@/components/management/AccessCard';

export default function ManageAccess() {
  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2">Access Management</h1>
          <p className="text-gray-600">Manage user access to various entities within the application.</p>
        </div>

        <div className="space-y-8">
          <AccessCard entityType="Driver" />
          <AccessCard entityType="Team" />
          <AccessCard entityType="Track" />
          <AccessCard entityType="Series" />
        </div>
      </div>
    </PageShell>
  );
}