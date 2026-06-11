/**
 * R9CZ-R1 — IncidentParticipantPicker
 * Multi-select driver/entry picker for incident involved participants.
 * Searchable by name, car number, or class.
 */
import React, { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';

export default function IncidentParticipantPicker({ entries = [], drivers = [], selectedDriverIds = [], onChange }) {
  const [search, setSearch] = useState('');

  const driverMap = useMemo(() =>
    Object.fromEntries(drivers.map(d => [d.id, d])),
    [drivers]
  );

  // Build enriched entry list with driver info
  const enriched = useMemo(() => entries.map(e => {
    const d = driverMap[e.driver_id];
    return {
      ...e,
      driver: d,
      displayName: d ? `${d.first_name} ${d.last_name}` : 'Unknown Driver',
      searchKey: [
        d ? `${d.first_name} ${d.last_name}` : '',
        e.car_number || '',
        e.transponder_id || '',
      ].join(' ').toLowerCase(),
    };
  }), [entries, driverMap]);

  const filtered = useMemo(() => {
    if (!search.trim()) return enriched;
    const q = search.toLowerCase();
    return enriched.filter(e => e.searchKey.includes(q));
  }, [enriched, search]);

  const selectedSet = new Set(selectedDriverIds);

  const toggle = (driverId) => {
    const next = new Set(selectedSet);
    next.has(driverId) ? next.delete(driverId) : next.add(driverId);
    onChange(Array.from(next));
  };

  const selectedEntries = enriched.filter(e => selectedSet.has(e.driver_id));

  return (
    <div className="space-y-2">
      {/* Selected chips */}
      {selectedEntries.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedEntries.map(e => (
            <span
              key={e.driver_id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-900/40 border border-red-700/40 text-[10px] text-red-200 font-semibold"
            >
              #{e.car_number} {e.displayName}
              <button
                type="button"
                onClick={() => toggle(e.driver_id)}
                className="hover:text-white transition-colors"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-600" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search driver name or car #…"
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded text-[11px] text-gray-200 placeholder-gray-600 pl-7 pr-3 py-1.5 outline-none focus:border-red-600/40"
        />
      </div>

      {/* Driver list */}
      {search.trim() && (
        <div className="max-h-36 overflow-y-auto space-y-0.5 rounded border border-white/[0.06] bg-white/[0.02] p-1">
          {filtered.length === 0 ? (
            <p className="text-[10px] text-gray-600 py-2 text-center">No entries match</p>
          ) : (
            filtered.map(e => {
              const isSelected = selectedSet.has(e.driver_id);
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => toggle(e.driver_id)}
                  className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-[11px] transition-colors ${
                    isSelected
                      ? 'bg-red-900/30 border border-red-700/30 text-red-200'
                      : 'text-gray-300 hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="font-mono font-bold text-[10px] w-8 text-right flex-shrink-0">
                    #{e.car_number || '?'}
                  </span>
                  <span className="flex-1 truncate">{e.displayName}</span>
                  {isSelected && <span className="text-[9px] text-red-400">✓</span>}
                </button>
              );
            })
          )}
        </div>
      )}

      {selectedDriverIds.length === 0 && !search && (
        <p className="text-[10px] text-gray-700">Type to search and add involved drivers</p>
      )}
    </div>
  );
}