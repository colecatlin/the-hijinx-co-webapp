import React from 'react';
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const WIDTH_CLASSES = {
  compact: 'sm:max-w-lg',
  medium:  'sm:max-w-2xl',
  wide:    'sm:max-w-4xl',
  full:    'sm:max-w-[90vw]',
};

/**
 * RecordDrawerShell — shared slide-over shell for RaceCore record editors.
 *
 * Props:
 *   open           — boolean
 *   onOpenChange   — (open: boolean) => void
 *   title          — string
 *   subtitle       — string (optional)
 *   isLoading      — boolean
 *   width          — 'compact' | 'medium' | 'wide' | 'full'  (default 'wide')
 *   tabs           — array of { value, label, content, hidden? }
 *   defaultTab     — string (default: first tab value)
 *   actions        — ReactNode (header right slot)
 */
export default function RecordDrawerShell({
  open,
  onOpenChange,
  title,
  subtitle,
  isLoading = false,
  width = 'wide',
  tabs = [],
  defaultTab,
  actions,
}) {
  const visibleTabs = tabs.filter(t => !t.hidden);
  const firstTab = defaultTab || visibleTabs[0]?.value;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          'flex flex-col p-0 bg-[#080C0C] border-l border-gray-800 overflow-hidden',
          WIDTH_CLASSES[width] || WIDTH_CLASSES.wide,
          'w-full'
        )}
        // Override SheetContent close button positioning
        style={{ maxHeight: '100dvh' }}
      >
        {/* ── Header ── */}
        <SheetHeader className="shrink-0 px-6 pt-5 pb-4 border-b border-gray-800/80">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-mono text-teal-500/70 tracking-[0.35em] uppercase mb-1">
                Record Editor
              </p>
              <h2 className="text-xl font-bold text-white truncate leading-tight">
                {isLoading ? (
                  <span className="text-gray-600">Loading…</span>
                ) : (
                  title || 'Untitled'
                )}
              </h2>
              {subtitle && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2 shrink-0 mt-1">{actions}</div>
            )}
          </div>
        </SheetHeader>

        {/* ── Body ── */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-gray-600" />
          </div>
        ) : (
          <Tabs defaultValue={firstTab} className="flex-1 flex flex-col overflow-hidden">
            {/* Tab list */}
            <div className="shrink-0 px-6 pt-3 pb-0 border-b border-gray-800/60 overflow-x-auto scrollbar-hide">
              <TabsList className="flex h-auto gap-0.5 bg-transparent p-0 rounded-none w-max">
                {visibleTabs.map(tab => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    disabled={tab.disabled}
                    className={cn(
                      'text-[11px] font-mono px-3 py-2 rounded-t-md rounded-b-none border-b-2 border-transparent',
                      'text-gray-500 hover:text-gray-300 data-[state=active]:text-teal-400',
                      'data-[state=active]:border-teal-500 data-[state=active]:bg-teal-500/5',
                      'transition-all bg-transparent disabled:opacity-30'
                    )}
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Tab content — scrollable */}
            <div className="flex-1 overflow-y-auto">
              {visibleTabs.map(tab => (
                <TabsContent
                  key={tab.value}
                  value={tab.value}
                  className="mt-0 p-6 focus-visible:outline-none"
                >
                  {tab.content}
                </TabsContent>
              ))}
            </div>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}