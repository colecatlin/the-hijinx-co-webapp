import React, { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import SearchResultsGrid from '@/components/layout/SearchResultsGrid';

/**
 * Full-screen search overlay for the mobile/tablet shell (lg:hidden).
 * Reuses the cached React Query entity lists + debounced filter results
 * computed in Layout — no refetch. Bound to the same searchQuery state as
 * the desktop inline panel so both stay in sync.
 */
export default function MobileSearchOverlay({
  open,
  onClose,
  searchQuery,
  setSearchQuery,
  searchResults,
  loading,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="lg:hidden fixed inset-0 z-[70] flex flex-col"
          style={{ background: 'hsl(var(--canvas))', paddingTop: 'env(safe-area-inset-top)' }}
        >
          {/* Search header */}
          <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid hsl(var(--divider))' }}>
            <Search className="w-5 h-5 flex-shrink-0" style={{ color: 'hsl(var(--motion))' }} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search the ecosystem"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-base font-medium"
              style={{ color: 'hsl(var(--foreground))', caretColor: 'hsl(var(--motion))' }}
            />
            <button onClick={onClose} className="p-2 rounded-lg" style={{ color: 'hsl(var(--foreground-secondary))' }} aria-label="Close search">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {loading && (
              <p className="font-mono text-[10px] tracking-widest" style={{ color: 'hsl(var(--foreground-quiet) / 0.6)' }}>SEARCHING...</p>
            )}
            {!loading && searchQuery.length >= 2 && searchResults && Object.values(searchResults).every((arr) => arr.length === 0) && (
              <p className="text-sm" style={{ color: 'hsl(var(--foreground-quiet) / 0.7)' }}>No results for "{searchQuery}"</p>
            )}
            {searchQuery.length < 2 && (
              <p className="text-sm" style={{ color: 'hsl(var(--foreground-quiet) / 0.6)' }}>Type at least 2 characters to search stories, racers, events, tracks, series, teams, vehicles, media, and sponsors.</p>
            )}
            <SearchResultsGrid results={searchResults} onNavigate={onClose} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}