import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', message = 'Content is coming soon.' }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <Icon className="w-10 h-10 text-gray-300 mb-4" />
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      <p className="text-sm text-gray-400 mt-1 max-w-xs">{message}</p>
    </div>
  );
}