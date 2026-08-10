import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';

export default function SponsorshipPicker({ sponsorships, organizations, selectedId, onSelect }) {
  const [query, setQuery] = useState('');

  const orgMap = useMemo(() => {
    const m = new Map();
    (organizations || []).forEach(o => m.set(o.id, o));
    return m;
  }, [organizations]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return (sponsorships || []).filter(s => {
      const org = orgMap.get(s.sponsor_organization_id);
      const orgName = org?.name?.toLowerCase() || '';
      return orgName.includes(q) || s.target_entity_type?.toLowerCase().includes(q) ||
             s.relationship_type?.toLowerCase().includes(q) || s.tier?.toLowerCase().includes(q);
    }).slice(0, 100);
  }, [sponsorships, query, orgMap]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'hsl(var(--foreground-quiet))' }} />
        <input
          type="text"
          placeholder="Search sponsorships by sponsor name, target, tier..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full pl-10 pr-3 py-2 rounded-lg text-sm bg-transparent border"
          style={{ borderColor: 'hsl(var(--divider))', color: 'hsl(var(--foreground))' }}
        />
      </div>
      <div className="max-h-64 overflow-y-auto rounded-lg border" style={{ borderColor: 'hsl(var(--divider))' }}>
        {filtered.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm" style={{ color: 'hsl(var(--foreground-quiet))' }}>No sponsorships found.</p>
        ) : filtered.map(s => {
          const org = orgMap.get(s.sponsor_organization_id);
          const isSelected = s.id === selectedId;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className="w-full text-left px-4 py-3 transition-colors border-b last:border-b-0"
              style={{
                borderColor: 'hsl(var(--divider) / 0.5)',
                background: isSelected ? 'hsl(var(--motion) / 0.12)' : 'transparent',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold truncate" style={{ color: 'hsl(var(--foreground))' }}>
                  {org?.name || 'Unknown Sponsor'}
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded"
                  style={{ background: 'hsl(var(--surface-interactive))', color: 'hsl(var(--foreground-secondary))' }}>
                  {s.tier || '—'}
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                {s.target_entity_type} · {s.relationship_type} · {s.status}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}