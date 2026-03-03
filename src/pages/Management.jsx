import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import PageShell from '@/components/shared/PageShell';
import StatsBar from '@/components/management/StatsBar';
import ManagementSidebar from '@/components/management/ManagementSidebar';
import CommandPalette from '@/components/management/CommandPalette';
import DataHealthPanel from '@/components/management/DataHealthPanel';
import { MANAGEMENT_SECTIONS } from '@/components/management/managementSections';

export default function Management() {
  const location = useLocation();
  const [currentPage] = useState(null);

  return (
    <>
      <CommandPalette />
      <div className="flex h-screen bg-gray-50">
        <ManagementSidebar currentPage={currentPage} />
        <div className="flex-1 overflow-y-auto">
          <PageShell>
            <div className="max-w-6xl mx-auto px-6 py-12">
              <div className="mb-8">
                <h1 className="text-4xl font-black mb-2">Management Dashboard</h1>
                <p className="text-gray-600">Backend system for managing all content and data</p>
                <p className="text-xs text-gray-400 mt-2">Press Cmd+K for quick navigation • Use Cmd+D, Cmd+E, Cmd+T for shortcuts</p>
              </div>

              <StatsBar />

              <div className="mt-8">
                <DataHealthPanel />
              </div>
            </div>
          </PageShell>
        </div>
      </div>
    </>
  );
}