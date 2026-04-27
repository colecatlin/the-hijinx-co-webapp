import React, { useState, useRef, useEffect } from 'react';
import { X, Search, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';

function getLabel(entity) {
  if (!entity) return null;
  if (entity.first_name) return `${entity.first_name} ${entity.last_name}`;
  if (entity.title) return entity.title;
  return entity.name || entity.id;
}

function getSubLabel(entity) {
  if (!entity) return null;
  if (entity.primary_discipline) return entity.primary_discipline;
  if (entity.primary_category) return entity.primary_category;
  if (entity.event_date) return entity.event_date?.slice(0, 10);
  if (entity.location_city) return entity.location_city;
  return null;
}

export default function EntityMultiSelect({ entities = [], selectedIds = [], onChange, placeholder = 'Search...' }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = entities.filter((e) => {
    const label = getLabel(e) || '';
    return label.toLowerCase().includes(query.toLowerCase());
  }).slice(0, 40);

  const toggle = (id) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const entityMap = Object.fromEntries(entities.map((e) => [e.id, e]));

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
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-900 text-white rounded-md text-xs font-medium"
              >
                {entity ? getLabel(entity) : <span className="font-mono opacity-60">{id.slice(0, 8)}…</span>}
                <button
                  onClick={() => toggle(id)}
                  className="text-white/50 hover:text-white ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
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
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="px-3 py-4 text-xs text-gray-400 text-center">No results</div>
          )}
          {filtered.map((entity) => {
            const selected = selectedIds.includes(entity.id);
            const sub = getSubLabel(entity);
            return (
              <button
                key={entity.id}
                onMouseDown={(e) => { e.preventDefault(); toggle(entity.id); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-gray-50 ${selected ? 'bg-gray-50' : ''}`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selected ? 'bg-gray-900 border-gray-900' : 'border-gray-300'}`}>
                  {selected && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900 truncate">{getLabel(entity)}</div>
                  {sub && <div className="text-gray-400 truncate">{sub}</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}