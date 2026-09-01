import React, { useState, useRef, useEffect } from 'react';
import { Search, Check } from 'lucide-react';

/**
 * DriverCombobox — searchable dropdown of Driver records with free-text fallback.
 *
 * Props:
 *   value    — { driver_id, driver_name }
 *   onChange — (next: { driver_id, driver_name }) => void
 *   drivers  — Driver[] (preloaded list to filter client-side)
 */
export default function DriverCombobox({ value, onChange, drivers = [] }) {
  const [query, setQuery] = useState(value?.driver_name || '');
  const [open, setOpen] = useState(false);
  const blurTimer = useRef(null);

  // Sync external value changes (e.g. when editing a different row)
  useEffect(() => {
    setQuery(value?.driver_name || '');
  }, [value?.driver_id, value?.driver_name]);

  const handleSelect = (driver) => {
    const name = driver.full_name || [driver.first_name, driver.last_name].filter(Boolean).join(' ').trim();
    onChange({ driver_id: driver.id, driver_name: name });
    setQuery(name);
    setOpen(false);
  };

  const handleInputChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    // Free-text: driver_id null, driver_name = typed text
    onChange({ driver_id: null, driver_name: v });
    setOpen(true);
  };

  const handleFocus = () => {
    setOpen(true);
    if (blurTimer.current) clearTimeout(blurTimer.current);
  };

  const handleBlur = () => {
    blurTimer.current = setTimeout(() => setOpen(false), 150);
  };

  const driverName = (d) => d.full_name || [d.first_name, d.last_name].filter(Boolean).join(' ').trim();

  const filtered = (drivers || [])
    .filter(d => driverName(d).toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  const hasMatch = filtered.length > 0;

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5 rounded-md border px-2 h-9" style={{ borderColor: 'hsl(var(--divider))', background: 'hsl(var(--surface-elevated))' }}>
        <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'hsl(var(--foreground-quiet))' }} />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Search or type name…"
          className="flex-1 bg-transparent outline-none text-sm min-w-0"
          style={{ color: 'hsl(var(--foreground))' }}
        />
        {value?.driver_id && (
          <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'hsl(var(--motion))' }} />
        )}
      </div>
      {open && hasMatch && (
        <div
          className="absolute z-50 mt-1 w-full rounded-md border shadow-lg max-h-52 overflow-y-auto"
          style={{ background: 'hsl(var(--surface-elevated))', borderColor: 'hsl(var(--divider))' }}
        >
          {filtered.map(d => {
            const name = driverName(d);
            return (
              <button
                key={d.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(d); }}
                className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[hsl(var(--surface-interactive))]"
                style={{ color: 'hsl(var(--foreground))' }}
              >
                <span className="font-medium">{name}</span>
                {d.hometown_city && (
                  <span className="ml-2 text-xs" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                    {d.hometown_city}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}