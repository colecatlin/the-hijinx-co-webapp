import React from 'react';
import OrganizationCreateModal from '@/components/organizations/OrganizationCreateModal';

/** Full-page wrapper around the reusable create flow. */
export default function OrganizationCreate() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <OrganizationCreateModal />
    </div>
  );
}