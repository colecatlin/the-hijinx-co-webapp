import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * RaceCoreBreadcrumb — shared tactical breadcrumb for all RaceCore surfaces.
 *
 * Props:
 *   crumbs      — Array<{ label: string, href?: string }>
 *                 Last item may omit href — renders as active text.
 *   icon        — optional Lucide icon component (defaults to Flag)
 *   onBack      — optional back button callback (renders a compact back button on the right)
 *   className   — optional additional wrapper class
 */
export default function RaceCoreBreadcrumb({ crumbs = [], icon: Icon = Flag, onBack, className, noBorder = false }) {
  return (
    <div
      className={cn(
        'flex items-center gap-0 px-3 sm:px-5 py-2 flex-shrink-0 min-w-0',
        !noBorder && 'border-b border-white/[0.06]',
        className
      )}
      style={{ background: 'rgba(8,10,12,0.95)' }}
    >
      {/* Leading icon */}
      <Icon className="w-3 h-3 text-teal-500 flex-shrink-0 mr-2" />

      {/* Crumb chain */}
      <div className="flex items-center gap-0 min-w-0 flex-1 overflow-hidden">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <React.Fragment key={i}>
              {i > 0 && (
                <ChevronRight className="w-3 h-3 text-gray-700 flex-shrink-0 mx-0.5" aria-hidden="true" />
              )}
              {!isLast && crumb.href ? (
                <Link
                  to={crumb.href}
                  className="text-[10px] font-mono text-gray-500 hover:text-gray-300 transition-colors uppercase tracking-widest whitespace-nowrap shrink-0"
                >
                  {crumb.label}
                </Link>
              ) : isLast ? (
                <span className="text-[10px] font-mono text-gray-300 uppercase tracking-widest truncate">
                  {crumb.label}
                </span>
              ) : (
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest whitespace-nowrap shrink-0">
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Optional back button */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1 px-2 py-1 rounded border border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700 transition-colors text-[10px] font-mono ml-3 shrink-0"
        >
          Back
        </button>
      )}
    </div>
  );
}