import React from 'react';
import ManagementSidebar from './ManagementSidebar';
import ManagementHeader from './ManagementHeader';

export default function ManagementLayout({ children, currentPage }) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <ManagementSidebar currentPage={currentPage} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <ManagementHeader currentPage={currentPage} />
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}