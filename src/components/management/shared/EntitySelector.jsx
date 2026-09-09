import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, X, Check, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';

/**
 * EntitySelector — reusable single/multi entity picker.
 * Generalizes the EntityMultiSelect pattern with entity-type configuration.
 *
 * Props:
 *   entityType  — 'Event' | 'OutletStory' | 'HeroSlide' (extensible)
 *   mode        — 'single' | 'multi' (default 'single')
 *   value       — id (single) or array of ids (multi)
 *   onChange     — (id) | (ids[])
 *   placeholder — search placeholder
 */

const ENTITY_CONFIG = {
  Event: {
    queryKey: ['entitySelector', 'Event'],
    queryFn: () => base44.entities.Event.list('-event_date', 200),
    getLabel: (e) => e.name || 'Untitled event',
    getSubLabel: (e) => e.event_date ? e.event_date.slice(0, 10) : '',
    getThumbnail: (e) => e.cover_image_url || e.banner_image_url,
    getStatus: (e) => e.published_flag ? 'Published' : 'Draft',
  },
  OutletStory: {
    queryKey: ['entitySelector', 'OutletStory'],
    queryFn: () => base44.entities.OutletStory.filter({ status: 'published' }, '-published_date', 200),
    getLabel: (s) => s.title || 'Untitled story',
    getSubLabel: (s) => s.published_date ? s.published_date.slice(0, 10) : '',
    getThumbnail: (s) => s.cover_image,
    getStatus: (s) => s.featured ? 'Featured' : 'Published',
  },
  HeroSlide: {
    queryKey: ['entitySelector', 'HeroSlide'],
    queryFn: () => base44.entities.HeroSlide.list('sort_order', 100),
    getLabel: (s) => s.headline_line1 || 'Untitled slide',
    getSubLabel: (s) => s.subtext || '',
    getThumbnail: (s) => s.background_url,
    getStatus: (s) => s.is_active ? 'Active' : 'Hidden',
  },
};

export default function EntitySelector({
  entityType = 'Event',
  mode = 'single',
  value,
  onChange,
  placeholder = 'Search...',
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const cfg = ENTITY_CONFIG[entityType];

  const { data: entities = [] } = useQuery({
    queryKey: cfg.queryKey,
    queryFn: cfg.queryFn,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedIds = mode === 'multi' ? (Array.isArray(value) ? value : []) : (value ? [value] : []);
  const entityMap = Object.fromEntries(entities.map((e) => [e.id, e]));
  const filtered = entities
    .filter((e) => (cfg.getLabel(e) || '').toLowerCase().includes(query.toLowerCase()))
    .slice(0, 40);

  const toggle = (id) => {
    if (mode === 'single') {
      onChange(id === value ? '' : id);
      setOpen(false);
    } else {
      if (selectedIds.includes(id)) onChange(selectedIds.filter((x) => x !== id));
      else onChange([...selectedIds, id]);
    }
  };

  const clear = () => onChange(mode === 'multi' ? [] : '');

  return (
    <div ref={containerRef} className="relative">
      {/* Selected chips */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedIds.map((id) => {
            const entity = entityMap[id];
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 px-2 py-1 bg-surface-interactive text-foreground rounded-md text-xs font-medium"
              >
                {entity ? cfg.getLabel(entity) : <span className="font-mono opacity-60">{id.slice(0, 8)}…</span>}
                <button onClick={() => toggle(id)} className="text-foreground-quiet hover:text-foreground ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
          {mode === 'multi' && (
            <button onClick={clear} className="text-xs text-foreground-quiet hover:text-foreground underline">
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-quiet pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="pl-8 h-8 text-xs"
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-surface-elevated border border-divider rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="px-3 py-4 text-xs text-foreground-quiet text-center">No results</div>
          )}
          {filtered.map((entity) => {
            const selected = selectedIds.includes(entity.id);
            const sub = cfg.getSubLabel(entity);
            const thumb = cfg.getThumbnail(entity);
            return (
              <button
                key={entity.id}
                onMouseDown={(e) => { e.preventDefault(); toggle(entity.id); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-surface-interactive ${selected ? 'bg-surface-interactive' : ''}`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selected ? 'bg-motion border-motion' : 'border-divider'}`}>
                  {selected && <Check className="w-2.5 h-2.5 text-canvas" />}
                </div>
                {thumb && <img src={thumb} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-foreground truncate">{cfg.getLabel(entity)}</div>
                  {sub && <div className="text-foreground-quiet truncate">{sub}</div>}
                </div>
                <span className="text-[9px] font-mono uppercase text-foreground-quiet flex-shrink-0">{cfg.getStatus(entity)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}