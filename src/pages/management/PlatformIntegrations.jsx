import React from 'react';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import AdminGuard from '@/components/management/AdminGuard';
import ManagementPlaceholder from '@/components/management/ManagementPlaceholder';

export default function PlatformIntegrations() {
  return (
    <ManagementLayout currentPage="management/platform/integrations">
      <AdminGuard>
        <ManagementShell title="Integrations" subtitle="Platform integrations — future">
          <ManagementPlaceholder
            purpose="Configure and monitor platform integrations — Shopify, Stripe, Google Maps, and OAuth connectors. Shows connection status without exposing secrets."
            status="No integrations dashboard exists yet. Integrations are configured via platform secrets and OAuth connectors. This module will surface status and configuration (never secret values)."
            managedSystems={[
              { name: 'Shopify', description: 'store domain, storefront access, collection used by homepage' },
              { name: 'Stripe', description: 'payment connection and webhook status' },
              { name: 'Google Maps', description: 'maps API key status' },
              { name: 'OAuth connectors', description: 'Google, Slack, LinkedIn, etc.' },
            ]}
            relatedLinks={[
              { label: 'Shopify Connection', to: '/management/apparel/shopify' },
            ]}
          />
        </ManagementShell>
      </AdminGuard>
    </ManagementLayout>
  );
}