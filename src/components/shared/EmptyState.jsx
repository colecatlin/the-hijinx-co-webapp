import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', message = 'Check back soon.' }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <Icon className="w-10 h-10 mb-4" style={{ color: 'hsl(var(--foreground-quiet) / 0.5)' }} />
      <h3 className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{title}</h3>
      <p className="text-sm mt-1 max-w-xs" style={{ color: 'hsl(var(--foreground-secondary))' }}>{message}</p>
    </div>
  );
}