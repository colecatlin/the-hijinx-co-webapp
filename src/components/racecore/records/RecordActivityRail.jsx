import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import ActivityTab from '@/components/management/ActivityTab';

/**
 * RecordActivityRail — collapsible right-side activity panel for RaceCore record pages.
 *
 * Props:
 *   entityName      — string, e.g. 'Track', 'Driver'
 *   onClose         — () => void
 *   overlayOnMobile — boolean (default false)
 *                     If true: below lg renders as a full dark-backdrop overlay drawer.
 *                     At lg+ keeps the standard inline rail.
 */
export default function RecordActivityRail({ entityName, onClose, overlayOnMobile = false }) {
  // Lock body scroll on mobile overlay
  useEffect(() => {
    if (!overlayOnMobile) return;
    const isMobile = window.innerWidth < 1024;
    if (isMobile) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [overlayOnMobile]);

  // Desktop: unchanged inline rail
  const railContent = (
    <div
      className={cn(
        'border-l overflow-hidden flex flex-col shrink-0 h-full',
        overlayOnMobile
          ? 'w-full max-w-[320px] lg:w-72'
          : 'w-72'
      )}
      style={{ background: '#0F1212', borderColor: 'rgba(255,255,255,0.07)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-600">
          Activity Log
        </span>
        <button
          onClick={onClose}
          aria-label="Close activity log"
          className="w-8 h-8 flex items-center justify-center text-gray-700 hover:text-gray-400 focus:outline-none focus-visible:ring-1 focus-visible:ring-teal-500 rounded transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {/* Content */}
      <div className="p-3 flex-1 overflow-y-auto">
        <ActivityTab entityName={entityName} />
      </div>
    </div>
  );

  if (!overlayOnMobile) {
    return railContent;
  }

  return (
    <>
      {/* Mobile overlay — hidden at lg+ */}
      <div className="lg:hidden">
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
        {/* Drawer — slides in from right */}
        <div className="fixed inset-y-0 right-0 z-50 flex flex-col shadow-2xl"
          style={{ width: 'min(320px, 92vw)' }}
        >
          {railContent}
        </div>
      </div>

      {/* Desktop — standard inline rail */}
      <div className="hidden lg:flex lg:flex-col lg:shrink-0 h-full">
        {railContent}
      </div>
    </>
  );
}