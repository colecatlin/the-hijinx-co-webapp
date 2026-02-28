import React from 'react';
import PageShell from '@/components/shared/PageShell';
import OperationLogsViewer from '@/components/management/OperationLogsViewer';

export default function ManageOperationLogs() {
  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2">Operation Logs</h1>
          <p className="text-gray-600">View all imports, exports, and data operations with ability to reverse imports</p>
        </div>

        <OperationLogsViewer />
      </div>
    </PageShell>
  );
}