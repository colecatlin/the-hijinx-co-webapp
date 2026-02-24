import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

const LEVEL_CONFIG = {
  1: {
    label: 'Foundation',
    colors: 'bg-gray-100 text-gray-700 border-gray-300',
    dotColor: 'bg-gray-400',
    tooltip: 'Entry point competition — local and club-based, learning stage.',
  },
  2: {
    label: 'Development',
    colors: 'bg-blue-50 text-blue-700 border-blue-300',
    dotColor: 'bg-blue-400',
    tooltip: 'Structured growth tier — regional travel, clear progression path.',
  },
  3: {
    label: 'National',
    colors: 'bg-green-50 text-green-700 border-green-300',
    dotColor: 'bg-green-500',
    tooltip: 'Recognized national championship tier — professional operations, major streaming or TV.',
  },
  4: {
    label: 'Premier',
    colors: 'bg-orange-50 text-orange-700 border-orange-300',
    dotColor: 'bg-orange-500',
    tooltip: 'Highest competitive tier within a national ecosystem — elite driver pool, major sponsor presence.',
  },
  5: {
    label: 'World',
    colors: 'bg-purple-50 text-purple-700 border-purple-300',
    dotColor: 'bg-purple-500',
    tooltip: 'Global championship tier — multi-continent infrastructure, world championship identity.',
  },
};

export default function CompetitionLevelBadge({ level, isOverride = false, size = 'md' }) {
  if (!level || level < 1 || level > 5) return null;

  const config = LEVEL_CONFIG[level];

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size] || 'text-xs px-2.5 py-1 gap-1.5';

  const dotSize = size === 'lg' ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5';

  return (
    <span className="relative group inline-flex items-center">
      <Link
        to={createPageUrl('CompetitionSystem')}
        onClick={(e) => e.stopPropagation()}
        className={`inline-flex items-center border rounded-full font-semibold tracking-wide transition-opacity hover:opacity-80 ${sizeClasses} ${config.colors}`}
        title={config.tooltip}
      >
        <span className={`rounded-full flex-shrink-0 ${dotSize} ${config.dotColor}`} />
        <span>L{level} · {config.label}</span>
        {isOverride && <span className="ml-1 opacity-60">(override)</span>}
      </Link>
      {/* Tooltip */}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity z-50 text-center leading-snug shadow-lg">
        <span className="font-semibold">Level {level}: {config.label}</span>
        <br />
        {config.tooltip}
        <span className="block mt-1 text-[10px] text-gray-400 underline">Learn more →</span>
      </span>
    </span>
  );
}

export { LEVEL_CONFIG };