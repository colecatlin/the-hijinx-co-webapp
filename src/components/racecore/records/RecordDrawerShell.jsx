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
 *   entityType     — string e.g. 'Driver', 'Team', 'Track', 'Series' — shown in overline
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
  entityType,
}) {
  const visibleTabs = tabs.filter(t => !t.hidden);
  const firstTab = defaultTab || visibleTabs[0]?.value;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          'flex flex-col p-0 border-l overflow-hidden',
          WIDTH_CLASSES[width] || WIDTH_CLASSES.wide,
          'w-full'
        )}
        style={{ maxHeight: '100dvh', background: 'hsl(var(--surface))', borderColor: 'hsl(var(--divider))' }}
      >
        {/* ── Header ── */}
        <SheetHeader className="shrink-0 px-6 pt-5 pb-4 border-b border-divider">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-mono text-motion/60 tracking-[0.35em] uppercase mb-1">
                  {entityType ? `${entityType} Record` : 'Record'}
                </p>
              <h2 className="text-base font-semibold text-foreground truncate leading-tight">
                {isLoading ? (
                  <span className="text-foreground-quiet">Loading…</span>
                ) : (
                  title || 'Untitled'
                )}
              </h2>
              {subtitle && (
                <p className="text-xs text-foreground-quiet mt-0.5 truncate">{subtitle}</p>
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
            <Loader2 className="w-7 h-7 animate-spin text-foreground-quiet" />
          </div>
        ) : (
          <Tabs defaultValue={firstTab} className="flex-1 flex flex-col overflow-hidden">
            {/* Tab list */}
            <div className="shrink-0 px-6 pt-3 pb-0 border-b border-divider overflow-x-auto scrollbar-hide">
              <TabsList className="flex h-auto gap-0.5 bg-transparent p-0 rounded-none w-max">
                {visibleTabs.map(tab => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    disabled={tab.disabled}
                    className={cn(
                      'text-[11px] font-mono px-3 py-2 rounded-none border-b-2 border-transparent',
                      'text-foreground-quiet hover:text-foreground data-[state=active]:text-foreground',
                      'data-[state=active]:border-motion',
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