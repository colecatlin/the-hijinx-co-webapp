import React from 'react';

/**
 * PublishTab
 * Displays publish status overview for entities with profile_status or visibility controls.
 * 
 * Props:
 *   entityCount - total entity count
 *   draftCount - count of draft/hidden records
 *   liveCount - count of live/published records
 *   hasPublishControl - boolean indicating if entity supports publish status (default true)
 */
export default function PublishTab({ entityCount, draftCount, liveCount, hasPublishControl = true }) {
  if (!hasPublishControl) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500">This entity type does not have publish controls.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-600 mb-1">Total Records</p>
        <p className="text-2xl font-bold text-gray-900">{entityCount}</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-600 mb-1">Draft</p>
        <p className="text-2xl font-bold text-yellow-600">{draftCount}</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-600 mb-1">Published</p>
        <p className="text-2xl font-bold text-green-600">{liveCount}</p>
      </div>
    </div>
  );
}