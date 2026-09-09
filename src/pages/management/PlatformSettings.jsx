import React from 'react';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import AdminGuard from '@/components/management/AdminGuard';
import ManagementPlaceholder from '@/components/management/ManagementPlaceholder';

export default function PlatformSettings() {
  return (
    <ManagementLayout currentPage="management/platform/settings">
      <AdminGuard>
        <ManagementShell title="Settings" subtitle="Platform-wide settings — future">
          <ManagementPlaceholder
            purpose="Platform-wide configuration — brand defaults, global settings, and cross-cutting options that apply across all surfaces."
            status="No platform settings entity exists yet. Surface-specific settings (HomepageSettings, MotorsportsHomeSettings, StorefrontSettings) exist separately. This module will hold truly global config."
            managedSystems={[
              { name: 'Brand defaults', description: 'colors, typography, global identity' },
              { name: 'Global config', description: 'cross-cutting options not owned by a single surface' },
            ]}
            relatedLinks={[
              { label: 'Homepage Settings', to: '/ManageHomepage' },
              { label: 'Motorsports Home Settings', to: '/ManageMotorsportsHome' },
            ]}
          />
        </ManagementShell>
      </AdminGuard>
    </ManagementLayout>
  );
}