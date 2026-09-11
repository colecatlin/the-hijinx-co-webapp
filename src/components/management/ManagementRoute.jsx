import React from 'react';
import AdminGuard from '@/components/management/AdminGuard';
import ManagementLayout from '@/components/management/ManagementLayout';

/**
 * ManagementRoute — wraps a Management page that does NOT render its own
 * ManagementLayout. Provides AdminGuard + ManagementLayout so the page
 * gets the Management sidebar/header without the public Layout chrome.
 *
 * Pages that already import ManagementLayout internally should NOT use
 * this wrapper — they render directly (LayoutWrapper skips public Layout
 * for them via MANAGEMENT_SHELL_PAGES).
 */
export default function ManagementRoute({ children, currentPage }) {
  return (
    <ManagementLayout currentPage={currentPage}>
      <AdminGuard>
        {children}
      </AdminGuard>
    </ManagementLayout>
  );
}