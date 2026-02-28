import React from 'react';
import ManagementSidebar from './ManagementSidebar';
import PageShell from '@/components/shared/PageShell';

export default function ManagementLayout({ children, currentPage }) {
  return (
    <>
      <div className="flex h-screen bg-gray-50">
        <ManagementSidebar currentPage={currentPage} />
        <div className="flex-1 overflow-y-auto">
          <PageShell>
            {children}
          </PageShell>
        </div>
      </div>
    </>
  );
}