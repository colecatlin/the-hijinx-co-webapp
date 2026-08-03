import React, { useState } from 'react';
import { Search, X, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * RecordsFilterRail — compact tactical inline filter bar for RaceCore record pages.
 *
 * Responsive behavior:
 *   Desktop (md+): full inline rail — search + filters side by side
 *   Mobile (<md):  search always visible; filters collapse into expandable panel
 *                  active filter count badge shown on toggle button
 *
 * Props:
 *   search           — string, current search value
 *   onSearch         — (val: string) => void
 *   searchPlaceholder — string
 *   filters          — Array<{ key, value, onChange, options: [{label, value}], placeholder }>
 *   hasActiveFilters — boolean
 *   onClearAll       — () => void
 *   resultCount      — number, filtered count
 *   totalCount       — number, total count
 *   actions          — ReactNode, optional right-side slot
 */

function CompactSelect({ value, onChange, options, placeholder }) {
  return (
    <div className="relative shrink-0">
      <label htmlFor={`filter-${placeholder}`} className="sr-only">{placeholder} filter</label>
      <select
        id={`filter-${placeholder}`}
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label={`Filter by ${placeholder}`}
        className={cn(
          'appearance-none h-9 md:h-7 pl-2.5 pr-6 text-[11px] font-mono rounded border transition-colors outline-none cursor-pointer w-full md:w-auto',
          'text-foreground',
          'hover:border-motion/40 focus:border-motion',
          value ? 'text-motion border-motion/40' : 'border-divider'
        )}
        style={{ background: 'hsl(var(--surface-elevated))' }}
      >
        <option value="">{placeholder}</option>
        {options.map(o => (
          <option key={o.value ?? o} value={o.value ?? o}>
            {o.label ?? o}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-foreground-quiet pointer-events-none" aria-hidden="true" />
    </div>
  );
}

export default function RecordsFilterRail({
  search = '',
  onSearch,
  searchPlaceholder = 'Search...',
  filters = [],
  hasActiveFilters = false,
  onClearAll,
  resultCount,
  totalCount,
  actions,
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount = filters.filter(f => f.value).length;

  return (
    <div className="border-b border-divider">

      {/* Primary row — always visible */}
      <div className="flex items-center gap-2 px-4 md:px-5 py-2">

        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-foreground-quiet pointer-events-none" aria-hidden="true" />
          <label htmlFor="records-search" className="sr-only">{searchPlaceholder}</label>
          <input
            id="records-search"
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={e => onSearch(e.target.value)}
            aria-label={searchPlaceholder}
            className="w-full h-9 md:h-7 pl-7 pr-7 text-[11px] font-mono rounded border text-foreground placeholder-foreground-quiet outline-none hover:border-motion/40 focus:border-motion transition-colors bg-surface-elevated border-divider"
          />
          {search && (
            <button
              onClick={() => onSearch('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-foreground-quiet hover:text-foreground"
            >
              <X className="w-3 h-3" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Desktop: inline filters */}
        <div className="hidden md:flex items-center gap-2 flex-wrap">
          {filters.map(f => (
            <CompactSelect
              key={f.key}
              value={f.value}
              onChange={f.onChange}
              options={f.options}
              placeholder={f.placeholder}
            />
          ))}

          {hasActiveFilters && (
            <button
              onClick={onClearAll}
              aria-label="Clear all filters"
              className="h-7 px-2.5 text-[10px] font-mono rounded border border-divider text-foreground-quiet hover:text-foreground hover:border-motion/30 transition-colors flex items-center gap-1 shrink-0"
            >
              <X className="w-2.5 h-2.5" aria-hidden="true" /> Clear
            </button>
          )}
        </div>

        {/* Mobile: filter toggle button */}
        {filters.length > 0 && (
          <button
            onClick={() => setFiltersOpen(v => !v)}
            aria-expanded={filtersOpen}
            aria-label={`${filtersOpen ? 'Close' : 'Open'} filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ''}`}
            className={cn(
              'md:hidden flex items-center gap-1.5 h-9 px-3 rounded border text-[11px] font-mono transition-colors shrink-0',
              filtersOpen || activeFilterCount > 0
                ? 'border-motion/40 bg-motion/10 text-motion'
                : 'border-divider text-foreground-quiet hover:border-motion/30 hover:text-foreground'
            )}
          >
            <SlidersHorizontal className="w-3 h-3" aria-hidden="true" />
            Filters
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-motion text-white text-[9px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}

        {/* Optional right actions */}
        {actions && <div className="shrink-0">{actions}</div>}

        {/* Result count */}
        {(resultCount !== undefined && totalCount !== undefined) && (
          <div className="ml-auto text-[10px] font-mono text-foreground-quiet shrink-0 whitespace-nowrap">
            {resultCount} / {totalCount}
          </div>
        )}
      </div>

      {/* Mobile expanded filter panel */}
      {filtersOpen && (
        <div className="md:hidden px-4 pb-3 flex flex-col gap-2 pt-2 border-t border-divider">
          {filters.map(f => (
            <div key={f.key} className="flex flex-col gap-0.5">
              <span className="text-[9px] font-mono uppercase tracking-widest text-foreground-quiet">{f.placeholder}</span>
              <CompactSelect
                value={f.value}
                onChange={f.onChange}
                options={f.options}
                placeholder={f.placeholder}
              />
            </div>
          ))}
          {hasActiveFilters && (
            <button
              onClick={() => { onClearAll(); setFiltersOpen(false); }}
              aria-label="Clear all filters"
              className="mt-1 h-9 px-3 text-[11px] font-mono rounded border border-divider text-foreground-quiet hover:text-foreground hover:border-motion/30 transition-colors flex items-center gap-1.5 self-start"
            >
              <X className="w-3 h-3" aria-hidden="true" /> Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}