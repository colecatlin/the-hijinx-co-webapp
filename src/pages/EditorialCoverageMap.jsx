import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CoverageMapDetailPanel from '@/components/editorial/CoverageMapDetailPanel';
import { ShieldOff, Search, SlidersHorizontal, X, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { format } from 'date-fns';

const PAGE = 'management/editorial/coverage-map';
const ALLOWED_ROLES = ['admin', 'editor', 'writer'];

const CATEGORY_OPTIONS = ['Racing', 'Business', 'Culture', 'Tech', 'Media', 'Marketplace'];
const ARTICLE_TYPE_OPTIONS = ['feature', 'news', 'analysis', 'opinion', 'profile', 'race_report', 'data_story', 'photo_essay', 'other'];

const CATEGORY_COLORS = {
  Racing: 'bg-red-50 text-red-600',
  Business: 'bg-blue-50 text-blue-600',
  Culture: 'bg-purple-50 text-purple-600',
  Tech: 'bg-cyan-50 text-cyan-600',
  Media: 'bg-yellow-50 text-yellow-600',
  Marketplace: 'bg-green-50 text-green-600',
};

function SortHeader({ field, label, sortKey, sortDir, onSort }) {
  const active = sortKey === field;
  return (
    <button
      onClick={() => onSort(field)}
      className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wide whitespace-nowrap transition-colors ${active ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
    >
      {label}
      {active
        ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
        : <ChevronsUpDown className="w-3 h-3 opacity-40" />}
    </button>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="h-8 text-xs border border-gray-200 rounded-lg px-2 pr-7 bg-white text-gray-700 appearance-none focus:outline-none focus:ring-1 focus:ring-gray-300"
    >
      <option value="">{label}</option>
      {options.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
    </select>
  );
}

function ScoreCell({ value, highColor = 'text-green-600', lowColor = 'text-gray-400' }) {
  if (value == null) return <span className="text-gray-300">—</span>;
  const color = value >= 70 ? highColor : value >= 40 ? 'text-yellow-500' : lowColor;
  return <span className={`font-semibold ${color}`}>{Math.round(value)}</span>;
}

export default function EditorialCoverageMap() {
  const navigate = useNavigate();

  const [selectedId, setSelectedId] = useState(null);
  const [sortKey, setSortKey] = useState('published_date');
  const [sortDir, setSortDir] = useState('desc');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: '', subcategory: '', article_type: '',
    after_date: '', min_performance: '', min_evergreen: '',
  });

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['coverage-map'],
    queryFn: () => base44.entities.OutletStoryCoverageMap.list('-published_date', 300),
    enabled: !!user,
  });

  const handleSort = (field) => {
    if (sortKey === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(field); setSortDir('desc'); }
  };

  const setFilter = (key, val) => setFilters(prev => ({ ...prev, [key]: val }));

  const activeFilterCount = Object.values(filters).filter(Boolean).length + (search ? 1 : 0);

  const filtered = useMemo(() => {
    let list = [...entries];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.story_title?.toLowerCase().includes(q) ||
        e.subcategory?.toLowerCase().includes(q) ||
        e.covered_topics?.some(t => t.toLowerCase().includes(q)) ||
        e.covered_keywords?.some(k => k.toLowerCase().includes(q))
      );
    }
    if (filters.category) list = list.filter(e => e.category === filters.category);
    if (filters.subcategory) list = list.filter(e => e.subcategory?.toLowerCase().includes(filters.subcategory.toLowerCase()));
    if (filters.article_type) list = list.filter(e => e.article_type === filters.article_type);
    if (filters.after_date) list = list.filter(e => e.published_date && e.published_date >= filters.after_date);
    if (filters.min_performance) list = list.filter(e => (e.performance_score ?? 0) >= Number(filters.min_performance));
    if (filters.min_evergreen) list = list.filter(e => (e.evergreen_score ?? 0) >= Number(filters.min_evergreen));

    list.sort((a, b) => {
      let va = a[sortKey] ?? (typeof a[sortKey] === 'number' ? 0 : '');
      let vb = b[sortKey] ?? (typeof b[sortKey] === 'number' ? 0 : '');
      if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [entries, search, filters, sortKey, sortDir]);

  const selectedEntry = selectedId ? entries.find(e => e.id === selectedId) : null;

  if (userLoading) return null;

  if (!user) {
    base44.auth.redirectToLogin('/' + PAGE);
    return null;
  }

  if (!ALLOWED_ROLES.includes(user.role)) {
    return (
      <ManagementLayout currentPage={PAGE}>
        <ManagementShell title="Access Denied" subtitle="">
          <div className="py-24 flex flex-col items-center gap-4 text-center">
            <ShieldOff className="w-10 h-10 text-gray-300" />
            <p className="text-gray-600 font-medium">Restricted to editorial staff.</p>
            <Button size="sm" onClick={() => navigate(createPageUrl('Management'))}>Back to Management</Button>
          </div>
        </ManagementShell>
      </ManagementLayout>
    );
  }

  return (
    <ManagementLayout currentPage={PAGE}>
      <ManagementShell
        title="Coverage Map"
        subtitle={`${filtered.length} entr${filtered.length !== 1 ? 'ies' : 'y'}`}
      >
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search stories, topics, keywords…"
              className="h-8 text-xs pl-8 pr-3"
            />
          </div>
          <Button
            size="sm"
            variant={showFilters ? 'default' : 'outline'}
            className="h-8 text-xs gap-1.5"
            onClick={() => setShowFilters(v => !v)}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 bg-white text-gray-900 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {/* Filter Bar */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
            <FilterSelect label="Category" value={filters.category} onChange={v => setFilter('category', v)} options={CATEGORY_OPTIONS} />
            <FilterSelect label="Article Type" value={filters.article_type} onChange={v => setFilter('article_type', v)} options={ARTICLE_TYPE_OPTIONS} />
            <Input
              value={filters.subcategory}
              onChange={e => setFilter('subcategory', e.target.value)}
              placeholder="Subcategory…"
              className="h-8 text-xs w-36"
            />
            <Input
              value={filters.after_date}
              onChange={e => setFilter('after_date', e.target.value)}
              type="date"
              className="h-8 text-xs w-36"
            />
            <Input
              value={filters.min_performance}
              onChange={e => setFilter('min_performance', e.target.value)}
              placeholder="Min performance"
              type="number" min="0" max="100"
              className="h-8 text-xs w-32"
            />
            <Input
              value={filters.min_evergreen}
              onChange={e => setFilter('min_evergreen', e.target.value)}
              placeholder="Min evergreen"
              type="number" min="0" max="100"
              className="h-8 text-xs w-32"
            />
            {activeFilterCount > 0 && (
              <Button size="sm" variant="ghost" className="h-8 text-xs text-gray-400 hover:text-gray-700"
                onClick={() => { setFilters({ category: '', subcategory: '', article_type: '', after_date: '', min_performance: '', min_evergreen: '' }); setSearch(''); }}>
                <X className="w-3 h-3 mr-1" /> Clear
              </Button>
            )}
          </div>
        )}

        {/* Layout */}
        <div className="flex gap-4 min-h-0">

          {/* Table */}
          <div className={`flex-1 min-w-0 overflow-auto rounded-xl border border-gray-200 bg-white ${selectedEntry ? 'hidden lg:block' : ''}`}>
            {isLoading ? (
              <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl m-4">
                No coverage entries match your filters.
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
                  <tr>
                    <th className="text-left px-4 py-3 min-w-[220px]">
                      <SortHeader field="story_title" label="Story Title" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    </th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Category</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Subcategory</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Type</th>
                    <th className="text-left px-3 py-3">
                      <SortHeader field="published_date" label="Published" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    </th>
                    <th className="text-right px-3 py-3">
                      <SortHeader field="performance_score" label="Perf." sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    </th>
                    <th className="text-right px-3 py-3">
                      <SortHeader field="evergreen_score" label="Evergreen" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(entry => (
                    <tr
                      key={entry.id}
                      onClick={() => setSelectedId(entry.id === selectedId ? null : entry.id)}
                      className={`cursor-pointer hover:bg-gray-50 transition-colors ${selectedId === entry.id ? 'bg-indigo-50 border-l-2 border-indigo-400' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 truncate max-w-[220px]">{entry.story_title}</p>
                        {entry.is_gap && (
                          <span className="text-[10px] text-orange-500 font-semibold">Coverage Gap</span>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {entry.category && (
                          <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${CATEGORY_COLORS[entry.category] ?? 'bg-gray-100 text-gray-500'}`}>
                            {entry.category}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-gray-500 whitespace-nowrap max-w-[120px] truncate">
                        {entry.subcategory ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-gray-500 whitespace-nowrap capitalize">
                        {entry.article_type?.replace(/_/g, ' ') ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                        {entry.published_date ? format(new Date(entry.published_date), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <ScoreCell value={entry.performance_score} highColor="text-green-600" />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <ScoreCell value={entry.evergreen_score} highColor="text-indigo-600" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Detail Panel */}
          {selectedEntry && (
            <div
              className="w-full lg:w-[380px] shrink-0 rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col"
              style={{ maxHeight: 'calc(100vh - 200px)' }}
            >
              <CoverageMapDetailPanel
                entry={selectedEntry}
                onClose={() => setSelectedId(null)}
              />
            </div>
          )}
        </div>

      </ManagementShell>
    </ManagementLayout>
  );
}