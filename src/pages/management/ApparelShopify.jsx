import React from 'react';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import AdminGuard from '@/components/management/AdminGuard';
import ManagementPlaceholder from '@/components/management/ManagementPlaceholder';

export default function ApparelShopify() {
  return (
    <ManagementLayout currentPage="management/apparel/shopify">
      <AdminGuard>
        <ManagementShell title="Shopify Connection" subtitle="Shopify integration configuration — future">
          <ManagementPlaceholder
            purpose="Configure the Shopify connection — store domain, storefront access status, and the collection used by the homepage Featured Apparel section. Shopify remains the source of truth for the product catalog; this module only configures the connection and presentation selection."
            status="Shopify is already connected via platform secrets and a Storefront API backend function. This module will expose connection status and collection selection without showing secret values."
            managedSystems={[
              { name: 'Shopify connection', description: 'store domain and storefront access status' },
              { name: 'Collection selection', description: 'which Shopify collection the homepage features' },
            ]}
            notes="Shopify credentials are stored securely as platform secrets (SHOPIFY_STORE_DOMAIN, SHOPIFY_STOREFRONT_ACCESS_TOKEN) and are never exposed in the UI. The getShopifyFeaturedProducts backend function reads products via the Storefront API."
            relatedLinks={[
              { label: 'Storefront', to: '/admin/storefront' },
              { label: 'Products', to: '/admin/products' },
            ]}
          />
        </ManagementShell>
      </AdminGuard>
    </ManagementLayout>
  );
}