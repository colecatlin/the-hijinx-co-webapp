import React from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * RecordsFilterRail — compact tactical inline filter bar for RaceCore record pages.
 *
 * Props:
 *   search          — string, current search value
 *   onSearch        — (val: string) => void
 *   searchPlaceholder — string
 *   filters         — Array<{ key, value, onChange, options: [{label, value}], placeholder }>
 *   hasActiveFilters — boolean
 *   onClearAll      — () => void
 *   resultCount     — number, filtered count
 *   totalCount      — number, total count
 *   actions         — ReactNode, optional right-side slot
 */

function CompactSelect({ value, onChange, options, placeholder }) {
  return (
    <div className="relative shrink-0">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={cn(
          'appearance-none h-7 pl-2.5 pr-6 text-[11px] font-mono rounded border transition-colors outline-none cursor-pointer',
          'bg-gray-900 border-gray-700 text-gray-300',
          'hover:border-gray-500 focus:border-teal-600/70',
          value && 'text-teal-300 border-teal-700/50'
        )}
      >
        <option value="">{placeholder}</option>
        {options.map(o => (
          <option key={o.value ?? o} value={o.value ?? o}>
            {o.label ?? o}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-gray-500 pointer-events-none" />
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
  return (
    <div className="flex flex-wrap items-center gap-2 px-5 py-2 border-b border-gray-800/60">

      {/* Search */}
      <div className="relative flex-1 min-w-[160px] max-w-[260px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-600 pointer-events-none" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={search}
          onChange={e => onSearch(e.target.value)}
          className="w-full h-7 pl-7 pr-7 text-[11px] font-mono rounded border bg-gray-900 border-gray-700 text-gray-300 placeholder-gray-600 outline-none hover:border-gray-600 focus:border-teal-600/70 transition-colors"
        />
        {search && (
          <button
            onClick={() => onSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Dynamic select filters */}
      {filters.map(f => (
        <CompactSelect
          key={f.key}
          value={f.value}
          onChange={f.onChange}
          options={f.options}
          placeholder={f.placeholder}
        />
      ))}

      {/* Clear all */}
      {hasActiveFilters && (
        <button
          onClick={onClearAll}
          className="h-7 px-2.5 text-[10px] font-mono rounded border border-gray-700/50 text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-colors flex items-center gap-1 shrink-0"
        >
          <X className="w-2.5 h-2.5" /> Clear
        </button>
      )}

      {/* Optional right actions */}
      {actions && <div className="shrink-0">{actions}</div>}

      {/* Result count */}
      {(resultCount !== undefined && totalCount !== undefined) && (
        <div className="ml-auto text-[10px] font-mono text-gray-700 shrink-0">
          {resultCount} / {totalCount}
        </div>
      )}
    </div>
  );
}