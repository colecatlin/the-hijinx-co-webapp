import React from 'react';
import { Globe, MapPin, Map } from 'lucide-react';

const SCOPE_CONFIG = {
  Local: {
    colors: 'bg-gray-100 text-gray-600 border-gray-200',
    icon: MapPin,
    tooltip: 'Local: Club or regional area competition.',
  },
  Regional: {
    colors: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    icon: Map,
    tooltip: 'Regional: Multi-state or regional footprint.',
  },
  National: {
    colors: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Map,
    tooltip: 'National: Operates across an entire country.',
  },
  International: {
    colors: 'bg-teal-50 text-teal-700 border-teal-200',
    icon: Globe,
    tooltip: 'International: Spans multiple countries.',
  },
  Global: {
    colors: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: Globe,
    tooltip: 'Global: Multi-continent championship infrastructure.',
  },
};

export default function GeographicScopeTag({ scope, size = 'md' }) {
  if (!scope || !SCOPE_CONFIG[scope]) return null;
  const config = SCOPE_CONFIG[scope];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size] || 'text-xs px-2.5 py-1 gap-1.5';

  const iconSize = size === 'lg' ? 'w-3.5 h-3.5' : 'w-3 h-3';

  return (
    <span className="relative group inline-flex items-center">
      <span className={`inline-flex items-center border rounded-full font-medium ${sizeClasses} ${config.colors}`}>
        <Icon className={`flex-shrink-0 ${iconSize}`} />
        <span>{scope}</span>
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity z-50 text-center leading-snug shadow-lg">
        {config.tooltip}
      </span>
    </span>
  );
}