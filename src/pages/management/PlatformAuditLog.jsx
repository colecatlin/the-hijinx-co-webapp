import React from 'react';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import AdminGuard from '@/components/management/AdminGuard';
import ManagementPlaceholder from '@/components/management/ManagementPlaceholder';

export default function PlatformAuditLog() {
  return (
    <ManagementLayout currentPage="management/platform/audit-log">
      <AdminGuard>
        <ManagementShell title="Audit Log" subtitle="Administrative change history — future">
          <ManagementPlaceholder
            purpose="View administrative change history — who changed what, when, across entities, permissions, homepage publishing, and platform configuration."
            status="An AuditLog entity and createAuditLog backend function already exist (used by RaceCore data governance) but are not surfaced in a Management UI. This module will surface that data as a read-only viewer."
            managedSystems={[
              { name: 'Audit log viewer', description: 'filterable, read-only history of administrative actions' },
            ]}
            notes="The existing AuditLog entity stores entity_type, entity_id, action, before_data, after_data, performed_by, and timestamp. A future viewer will filter by entity type, action, and user."
            relatedLinks={[
              { label: 'Data Health', to: '/Diagnostics' },
            ]}
          />
        </ManagementShell>
      </AdminGuard>
    </ManagementLayout>
  );
}