import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Search, X } from 'lucide-react';
import { MANAGEMENT_SECTIONS } from './managementSections';

const ALL_ITEMS = MANAGEMENT_SECTIONS.flatMap(section =>
  section.items.map(item => ({ ...item, section: section.title }))
);

export default function ManagementSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const filtered = query.trim()
    ? ALL_ITEMS.filter(item =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.description?.toLowerCase().includes(query.toLowerCase()) ||
        item.section.toLowerCase().includes(query.toLowerCase())
      )
    : ALL_ITEMS;

  const handleSelect = (item) => {
    setOpen(false);
    setQuery('');
    navigate(createPageUrl(item.page));
  };

  return (
    <>
      {/* Trigger input */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-foreground-quiet bg-surface rounded-lg hover:bg-surface-interactive transition-colors w-64"
      >
        <Search className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-left truncate">Search management...</span>
        <kbd className="text-xs bg-surface-elevated border border-divider rounded px-1 py-0.5 font-mono">⌘K</kbd>
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative bg-popover rounded-xl shadow-2xl w-full max-w-lg border border-divider overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-divider">
              <Search className="w-4 h-4 text-foreground-quiet shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search pages..."
                className="flex-1 text-sm outline-none bg-transparent text-foreground placeholder:text-foreground-quiet"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-foreground-quiet hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto py-2">
              {filtered.length === 0 ? (
                <p className="text-sm text-foreground-quiet px-4 py-6 text-center">No results found</p>
              ) : (
                filtered.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.page}
                      onClick={() => handleSelect(item)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-interactive transition-colors"
                    >
                      {Icon && <Icon className="w-4 h-4 text-foreground-quiet shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-foreground-quiet truncate">{item.description}</p>
                        )}
                      </div>
                      <span className="text-xs text-foreground-quiet shrink-0">{item.section}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}