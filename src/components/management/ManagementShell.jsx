import React from 'react';

/**
 * ManagementShell
 * Consistent inner content wrapper for all Management pages.
 * Sits inside ManagementLayout's scrollable content area.
 *
 * Props:
 *   title    - string  (required) page title
 *   subtitle - string  (optional) short description
 *   actions  - ReactNode (optional) right-aligned buttons / controls
 *   children - page body content
 *   maxWidth - string  (optional) tailwind max-w class, default "max-w-7xl"
 */
export default function ManagementShell({ title, subtitle, actions, children, maxWidth = 'max-w-7xl' }) {
  return (
    <div className={`${maxWidth} mx-auto px-6 py-6`}>
      {/* Page header */}
      <div className="flex items-start gap-4 mb-6 pb-5 border-b border-gray-200">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-0.5 leading-snug">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {actions}
          </div>
        )}
      </div>

      {/* Page body */}
      <div>
        {children}
      </div>
    </div>
  );
}