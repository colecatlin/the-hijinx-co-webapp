import React from 'react';
import { User } from 'lucide-react';

const STATUS_CONFIG = {
  'Novice': {
    colors: 'bg-gray-100 text-gray-600 border-gray-200',
    tooltip: 'Novice: Just starting out in organized competition.',
  },
  'Amateur': {
    colors: 'bg-blue-50 text-blue-700 border-blue-200',
    tooltip: 'Amateur: Regular competitor without professional funding or full-time commitment.',
  },
  'Semi-Professional': {
    colors: 'bg-orange-50 text-orange-700 border-orange-200',
    tooltip: 'Semi-Professional: Partial sponsorship or income from racing, competing at a recognized level.',
  },
  'Professional': {
    colors: 'bg-green-50 text-green-700 border-green-200',
    tooltip: 'Professional: Full-time racer with significant sponsorship, team backing, or salary.',
  },
};

export default function CareerStatusTag({ status, size = 'md' }) {
  if (!status || !STATUS_CONFIG[status]) return null;
  const config = STATUS_CONFIG[status];

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size] || 'text-xs px-2.5 py-1 gap-1.5';

  const iconSize = size === 'lg' ? 'w-3.5 h-3.5' : 'w-3 h-3';

  return (
    <span className="relative group inline-flex items-center">
      <span className={`inline-flex items-center border rounded-full font-medium ${sizeClasses} ${config.colors}`}>
        <User className={`flex-shrink-0 ${iconSize}`} />
        <span>{status}</span>
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity z-50 text-center leading-snug shadow-lg">
        {config.tooltip}
      </span>
    </span>
  );
}