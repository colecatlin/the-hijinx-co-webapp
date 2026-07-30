import React from 'react';
import ManagementSidebar from './ManagementSidebar';
import ManagementHeader from './ManagementHeader';

export default function ManagementLayout({ children, currentPage, embedded = false }) {
  if (embedded) {
    // In embedded mode (inside RaceCoreLayout): no sidebar, no header.
    // RaceCoreLayout owns the scroll axis — do NOT add overflow-y-auto here.
    return (
      <div className="flex-1 min-h-full bg-canvas">
        {children}
      </div>
    );
  }

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