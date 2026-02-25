import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Button } from '@/components/ui/button';

export default function ManageDriverCommunity() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-12 text-center">
      <h1 className="text-2xl font-bold mb-4">Driver Community</h1>
      <p className="text-gray-500 mb-6">This section has been removed.</p>
      <Link to={createPageUrl('Management')}>
        <Button variant="outline">Back to Management</Button>
      </Link>
    </div>
  );
}