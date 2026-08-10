import React, { useState } from 'react';
import { Table, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const CLASSIFICATION_COLORS = {
  Measured: 'hsl(var(--success))',
  Derived: 'hsl(var(--motion))',
  Estimated: 'hsl(var(--warning))',
  Unavailable: 'hsl(var(--foreground-quiet))',
};

export default function SponsorEvidenceTable({ evidence }) {
  const [filter, setFilter] = useState('');
  const [classFilter, setClassFilter] = useState('all');

  if (!evidence || !Array.isArray(evidence)) return null;

  const filtered = evidence.filter((row) => {
    const matchesFilter = !filter || row.metric.toLowerCase().includes(filter.toLowerCase());
    const matchesClass = classFilter === 'all' || row.classification === classFilter;
    return matchesFilter && matchesClass;
  });

  const classCounts = evidence.reduce((acc, row) => {
    acc[row.classification] = (acc[row.classification] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="rounded-xl border p-5" style={{ borderColor: 'hsl(var(--divider))', background: 'hsl(var(--surface))' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Table className="w-4 h-4 opacity-60" />
          <h3 className="text-sm font-bold uppercase tracking-wide">Evidence Matrix</h3>
        </div>
        <div className="flex gap-2 text-[10px] font-mono">
          {Object.entries(classCounts).map(([cls, count]) => (
            <span key={cls} className="px-2 py-0.5 rounded" style={{ background: `${CLASSIFICATION_COLORS[cls]}20`, color: CLASSIFICATION_COLORS[cls] }}>
              {cls}: {count}
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-40" />
          <Input
            placeholder="Filter metrics..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="h-8 text-xs rounded-md border px-2"
          style={{ borderColor: 'hsl(var(--divider))', background: 'hsl(var(--surface))' }}
        >
          <option value="all">All</option>
          <option value="Measured">Measured</option>
          <option value="Derived">Derived</option>
          <option value="Estimated">Estimated</option>
          <option value="Unavailable">Unavailable</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b" style={{ borderColor: 'hsl(var(--divider))' }}>
              <th className="text-left py-2 px-2 font-semibold uppercase tracking-wide opacity-60">Metric</th>
              <th className="text-right py-2 px-2 font-semibold uppercase tracking-wide opacity-60">Value</th>
              <th className="text-left py-2 px-2 font-semibold uppercase tracking-wide opacity-60">Classification</th>
              <th className="text-left py-2 px-2 font-semibold uppercase tracking-wide opacity-60 hidden sm:table-cell">Evidence Entity</th>
              <th className="text-right py-2 px-2 font-semibold uppercase tracking-wide opacity-60 hidden md:table-cell">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={i} className="border-b last:border-0" style={{ borderColor: 'hsl(var(--divider) / 0.4)' }}>
                <td className="py-1.5 px-2 font-mono">{row.metric}</td>
                <td className="py-1.5 px-2 text-right font-mono">
                  {row.classification === 'Unavailable' ? '—' : typeof row.value === 'object' ? '[data]' : String(row.value ?? '—')}
                </td>
                <td className="py-1.5 px-2">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase" style={{ background: `${CLASSIFICATION_COLORS[row.classification]}20`, color: CLASSIFICATION_COLORS[row.classification] }}>
                    {row.classification}
                  </span>
                </td>
                <td className="py-1.5 px-2 font-mono opacity-60 hidden sm:table-cell">{row.evidence_entity}</td>
                <td className="py-1.5 px-2 text-right font-mono hidden md:table-cell">{row.confidence}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <p className="text-center text-sm opacity-40 py-4">No metrics match the filter</p>
      )}
    </div>
  );
}