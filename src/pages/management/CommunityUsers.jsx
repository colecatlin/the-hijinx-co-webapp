import React from 'react';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import AdminGuard from '@/components/management/AdminGuard';
import ManagementPlaceholder from '@/components/management/ManagementPlaceholder';

export default function CommunityUsers() {
  return (
    <ManagementLayout currentPage="management/community/users">
      <AdminGuard>
        <ManagementShell title="Users" subtitle="User management — future">
          <ManagementPlaceholder
            purpose="Manage platform users — list, roles, invitations, and account status. Users are invited through the platform invite system; this module will provide a searchable list and role management."
            status="No dedicated user-management page exists yet. The built-in User entity is read-only from the client; admins invite users via the platform invite API."
            managedSystems={[
              { name: 'User list', description: 'searchable directory of platform users' },
              { name: 'Roles', description: 'admin / user role assignment' },
              { name: 'Invitations', description: 'invite new users by email' },
              { name: 'Account status', description: 'hibernation, access, and membership status' },
            ]}
            relatedLinks={[
              { label: 'Identity Applications', to: '/management/identity-applications' },
              { label: 'Access Management', to: '/ManageAccess' },
              { label: 'Memberships', to: '/ManageMemberships' },
            ]}
          />
        </ManagementShell>
      </AdminGuard>
    </ManagementLayout>
  );
}