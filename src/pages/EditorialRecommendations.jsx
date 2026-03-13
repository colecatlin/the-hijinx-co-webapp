import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RecommendationDetailPanel from '@/components/editorial/RecommendationDetailPanel';
import {
  ShieldOff, ChevronUp, ChevronDown, ChevronsUpDown, Search, X, SlidersHorizontal
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const PAGE = 'management/editorial/recommendations';
const ALLOWED_ROLES = ['admin', 'editor', 'writer'];

const STATUS_OPTIONS = ['suggested', 'saved', 'approved', 'assigned', 'drafted', 'published', 'dismissed', 'covered'];
const STORY_TYPE_OPTIONS = ['feature', 'news', 'analysis', 'opinion', 'profile', 'race_report', 'data_story', 'photo_essay', 'other'];
const CATEGORY_OPTIONS = ['Racing', 'Business', 'Culture', 'Tech', 'Media', 'Marketplace'];

const STATUS_COLORS = {
  suggested: 'bg-blue-100 text-blue-700',
  saved: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  assigned: 'bg-indigo-100 text-indigo-700',
  drafted: 'bg-teal-100 text-teal-700',
  published: 'bg-gray-800 text-white',
  dismissed: 'bg-gray-100 text-gray-500',
  covered: 'bg-purple-100 text-purple-700',
};

const SORT_FIELDS = [
  { key: 'generated_at', label: 'Generated' },
  { key: 'priority_score', label: 'Priority' },
  { key: 'urgency_score', label: 'Urgency' },
  { key: 'newsworthiness_score', label: 'Newsworthiness' },
  { key: 'coverage_gap_score', label: 'Coverage Gap' },
];

function ScoreCell({ value }) {
  if (value == null) return <span className="text-gray-300">—</span>;
  const v = Math.round(value);
  const color = v >= 75 ? 'text-red-600 font-semibold' : v >= 50 ? 'text-orange-500 font-medium' : 'text-gray-500';
  return <span className={color}>{v}</span>;
}

function SortHeader({ field, label, sortKey, sortDir, onSort }) {
  const active = sortKey === field;
  return (
    <button
      onClick={() => onSort(field)}
      className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wide whitespace-nowrap transition-colors ${active ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
    >
      {label}
      {active ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-40" />}
    </button>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-8 text-xs border border-gray-200 rounded-lg px-2 pr-7 bg-white text-gray-700 appearance-none focus:outline-none focus:ring-1 focus:ring-gray-300"
      >
        <option value="">{label}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

export default function EditorialRecommendations() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState(null);
  const [sortKey, setSortKey] = useState('generated_at');
  const [sortDir, setSortDir] = useState('desc');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '', story_type: '', recommended_category: '', assigned_to: '',
    min_priority: '', min_urgency: '', min_confidence: '',
  });

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: recs = [], isLoading } = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => base44.entities.StoryRecommendation.list('-generated_at', 200),
    enabled: !!user,
  });

  const handleSort = (field) => {
    if (sortKey === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(field); setSortDir('desc'); }
  };

  const setFilter = (key, val) => setFilters(prev => ({ ...prev, [key]: val }));

  const activeFilterCount = Object.values(filters).filter(Boolean).length + (search ? 1 : 0);

  const filtered = useMemo(() => {
    let list = [...recs];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.title_suggestion?.toLowerCase().includes(q) ||
        r.summary?.toLowerCase().includes(q) ||
        r.angle?.toLowerCase().includes(q) ||
        r.related_entity_names?.some(n => n.toLowerCase().includes(q))
      );
    }
    if (filters.status) list = list.filter(r => r.status === filters.status);
    if (filters.story_type) list = list.filter(r => r.story_type === filters.story_type);
    if (filters.recommended_category) list = list.filter(r => r.recommended_category === filters.recommended_category);
    if (filters.assigned_to) list = list.filter(r => r.assigned_to?.toLowerCase().includes(filters.assigned_to.toLowerCase()));
    if (filters.min_priority) list = list.filter(r => (r.priority_score ?? 0) >= Number(filters.min_priority));
    if (filters.min_urgency) list = list.filter(r => (r.urgency_score ?? 0) >= Number(filters.min_urgency));
    if (filters.min_confidence) list = list.filter(r => (r.confidence_score ?? 0) >= Number(filters.min_confidence));

    list.sort((a, b) => {
      let va = a[sortKey] ?? 0;
      let vb = b[sortKey] ?? 0;
      if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [recs, search, filters, sortKey, sortDir]);

  const selectedRec = selectedId ? recs.find(r => r.id === selectedId) : null;

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
      <ManagementShell title="Story Recommendations" subtitle={`${filtered.length} of ${recs.length} recommendations`}>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search recommendations…"
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
            <FilterSelect label="Status" value={filters.status} onChange={v => setFilter('status', v)} options={STATUS_OPTIONS} />
            <FilterSelect label="Story Type" value={filters.story_type} onChange={v => setFilter('story_type', v)} options={STORY_TYPE_OPTIONS} />
            <FilterSelect label="Category" value={filters.recommended_category} onChange={v => setFilter('recommended_category', v)} options={CATEGORY_OPTIONS} />
            <Input
              value={filters.assigned_to}
              onChange={e => setFilter('assigned_to', e.target.value)}
              placeholder="Assigned to…"
              className="h-8 text-xs w-36"
            />
            <Input
              value={filters.min_priority}
              onChange={e => setFilter('min_priority', e.target.value)}
              placeholder="Min priority"
              type="number" min="0" max="100"
              className="h-8 text-xs w-28"
            />
            <Input
              value={filters.min_urgency}
              onChange={e => setFilter('min_urgency', e.target.value)}
              placeholder="Min urgency"
              type="number" min="0" max="100"
              className="h-8 text-xs w-28"
            />
            <Input
              value={filters.min_confidence}
              onChange={e => setFilter('min_confidence', e.target.value)}
              placeholder="Min confidence"
              type="number" min="0" max="100"
              className="h-8 text-xs w-32"
            />
            {activeFilterCount > 0 && (
              <Button size="sm" variant="ghost" className="h-8 text-xs text-gray-400 hover:text-gray-700"
                onClick={() => { setFilters({ status: '', story_type: '', recommended_category: '', assigned_to: '', min_priority: '', min_urgency: '', min_confidence: '' }); setSearch(''); }}>
                <X className="w-3 h-3 mr-1" /> Clear
              </Button>
            )}
          </div>
        )}

        {/* Layout: table + detail panel */}
        <div className="flex gap-4 min-h-0">

          {/* Table */}
          <div className={`flex-1 min-w-0 overflow-auto rounded-xl border border-gray-200 bg-white ${selectedRec ? 'hidden lg:block' : ''}`}>
            {isLoading ? (
              <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl m-4">
                No recommendations match your filters.
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 min-w-[220px]">Title</th>
                    <th className="text-left px-3 py-3">Type</th>
                    <th className="text-right px-3 py-3">
                      <SortHeader field="priority_score" label="Priority" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    </th>
                    <th className="text-right px-3 py-3">
                      <SortHeader field="urgency_score" label="Urgency" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    </th>
                    <th className="text-right px-3 py-3">
                      <SortHeader field="confidence_score" label="Confidence" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    </th>
                    <th className="text-right px-3 py-3">
                      <SortHeader field="newsworthiness_score" label="Newsworth." sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    </th>
                    <th className="text-right px-3 py-3">
                      <SortHeader field="coverage_gap_score" label="Gap" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    </th>
                    <th className="text-left px-3 py-3">Category</th>
                    <th className="text-left px-3 py-3">
                      <SortHeader field="generated_at" label="Generated" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    </th>
                    <th className="text-left px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(rec => (
                    <tr
                      key={rec.id}
                      onClick={() => setSelectedId(rec.id === selectedId ? null : rec.id)}
                      className={`cursor-pointer hover:bg-gray-50 transition-colors ${selectedId === rec.id ? 'bg-violet-50 border-l-2 border-violet-400' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 line-clamp-2 leading-snug">{rec.title_suggestion}</p>
                        {rec.related_entity_names?.length > 0 && (
                          <p className="text-gray-400 text-[11px] mt-0.5 truncate">{rec.related_entity_names.slice(0, 2).join(', ')}</p>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {rec.story_type && (
                          <span className="px-1.5 py-0.5 bg-violet-50 text-violet-700 rounded capitalize">
                            {rec.story_type.replace(/_/g, ' ')}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right"><ScoreCell value={rec.priority_score} /></td>
                      <td className="px-3 py-3 text-right"><ScoreCell value={rec.urgency_score} /></td>
                      <td className="px-3 py-3 text-right"><ScoreCell value={rec.confidence_score} /></td>
                      <td className="px-3 py-3 text-right"><ScoreCell value={rec.newsworthiness_score} /></td>
                      <td className="px-3 py-3 text-right"><ScoreCell value={rec.coverage_gap_score} /></td>
                      <td className="px-3 py-3 whitespace-nowrap text-gray-500">{rec.recommended_category ?? '—'}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-gray-400">
                        {rec.generated_at ? formatDistanceToNow(new Date(rec.generated_at), { addSuffix: true }) : '—'}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${STATUS_COLORS[rec.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {rec.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Detail Panel */}
          {selectedRec && (
            <div className="w-full lg:w-[420px] shrink-0 rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              <RecommendationDetailPanel
                rec={selectedRec}
                onClose={() => setSelectedId(null)}
                onUpdated={() => queryClient.invalidateQueries({ queryKey: ['recommendations'] })}
              />
            </div>
          )}
        </div>

      </ManagementShell>
    </ManagementLayout>
  );
}