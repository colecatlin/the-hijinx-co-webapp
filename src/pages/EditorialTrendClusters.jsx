import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TrendClusterDetailPanel from '@/components/editorial/TrendClusterDetailPanel';
import { ShieldOff, Search, SlidersHorizontal, X, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const PAGE = 'management/editorial/trend-clusters';
const ALLOWED_ROLES = ['admin', 'editor', 'writer'];

const STATUS_OPTIONS = ['forming', 'active', 'peaking', 'cooling', 'closed', 'ignored', 'archived'];
const TREND_TYPE_OPTIONS = ['entity_surge', 'topic_wave', 'rivalry', 'milestone_run', 'controversy', 'sponsorship_wave', 'series_growth', 'other'];

const STATUS_COLORS = {
  forming: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  peaking: 'bg-orange-100 text-orange-700',
  cooling: 'bg-yellow-100 text-yellow-700',
  closed: 'bg-gray-100 text-gray-500',
  ignored: 'bg-gray-100 text-gray-400',
  archived: 'bg-gray-100 text-gray-400',
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

export default function EditorialTrendClusters() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState(null);
  const [sortKey, setSortKey] = useState('momentum_score');
  const [sortDir, setSortDir] = useState('desc');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    trend_type: '', status: '', min_momentum: '',
  });

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clusters = [], isLoading } = useQuery({
    queryKey: ['trend-clusters'],
    queryFn: () => base44.entities.StoryTrendCluster.list('-momentum_score', 200),
    enabled: !!user,
  });

  const handleSort = (field) => {
    if (sortKey === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(field); setSortDir('desc'); }
  };

  const setFilter = (key, val) => setFilters(prev => ({ ...prev, [key]: val }));
  const activeFilterCount = Object.values(filters).filter(Boolean).length + (search ? 1 : 0);

  const filtered = useMemo(() => {
    let list = [...clusters];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.trend_name?.toLowerCase().includes(q) ||
        c.trend_summary?.toLowerCase().includes(q) ||
        c.related_entity_names?.some(n => n.toLowerCase().includes(q))
      );
    }
    if (filters.trend_type) list = list.filter(c => c.trend_type === filters.trend_type);
    if (filters.status) list = list.filter(c => c.status === filters.status);
    if (filters.min_momentum) list = list.filter(c => (c.momentum_score ?? 0) >= Number(filters.min_momentum));

    list.sort((a, b) => {
      let va = a[sortKey] ?? (typeof a[sortKey] === 'number' ? 0 : '');
      let vb = b[sortKey] ?? (typeof b[sortKey] === 'number' ? 0 : '');
      if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [clusters, search, filters, sortKey, sortDir]);

  const selectedCluster = selectedId ? clusters.find(c => c.id === selectedId) : null;

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
        title="Trend Clusters"
        subtitle={`${filtered.length} cluster${filtered.length !== 1 ? 's' : ''}`}
      >
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search clusters…"
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
            <FilterSelect label="Trend Type" value={filters.trend_type} onChange={v => setFilter('trend_type', v)} options={TREND_TYPE_OPTIONS} />
            <FilterSelect label="Status" value={filters.status} onChange={v => setFilter('status', v)} options={STATUS_OPTIONS} />
            <Input
              value={filters.min_momentum}
              onChange={e => setFilter('min_momentum', e.target.value)}
              placeholder="Min momentum"
              type="number" min="0" max="100"
              className="h-8 text-xs w-32"
            />
            {activeFilterCount > 0 && (
              <Button size="sm" variant="ghost" className="h-8 text-xs text-gray-400 hover:text-gray-700"
                onClick={() => { setFilters({ trend_type: '', status: '', min_momentum: '' }); setSearch(''); }}>
                <X className="w-3 h-3 mr-1" /> Clear
              </Button>
            )}
          </div>
        )}

        {/* Layout */}
        <div className="flex gap-4 min-h-0">

          {/* Table */}
          <div className={`flex-1 min-w-0 overflow-auto rounded-xl border border-gray-200 bg-white ${selectedCluster ? 'hidden lg:block' : ''}`}>
            {isLoading ? (
              <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl m-4">
                No trend clusters match your filters.
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 min-w-[200px]">Trend Name</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Type</th>
                    <th className="text-right px-3 py-3">
                      <SortHeader field="momentum_score" label="Momentum" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    </th>
                    <th className="text-right px-3 py-3">
                      <SortHeader field="story_count" label="Stories" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    </th>
                    <th className="text-left px-3 py-3">
                      <SortHeader field="last_activity_date" label="Last Activity" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    </th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(cluster => (
                    <tr
                      key={cluster.id}
                      onClick={() => setSelectedId(cluster.id === selectedId ? null : cluster.id)}
                      className={`cursor-pointer hover:bg-gray-50 transition-colors ${selectedId === cluster.id ? 'bg-orange-50 border-l-2 border-orange-400' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 truncate max-w-[200px]">{cluster.trend_name}</p>
                        {cluster.related_entity_names?.length > 0 && (
                          <p className="text-gray-400 text-[11px] mt-0.5 truncate">
                            {cluster.related_entity_names.slice(0, 2).join(', ')}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {cluster.trend_type && (
                          <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded capitalize text-[11px]">
                            {cluster.trend_type.replace(/_/g, ' ')}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {cluster.momentum_score != null ? (
                          <span className={`font-semibold ${cluster.momentum_score >= 75 ? 'text-red-600' : cluster.momentum_score >= 50 ? 'text-orange-500' : 'text-gray-500'}`}>
                            {Math.round(cluster.momentum_score)}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-3 text-right text-gray-600">{cluster.story_count ?? 0}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-gray-400">
                        {cluster.last_activity_date
                          ? formatDistanceToNow(new Date(cluster.last_activity_date), { addSuffix: true })
                          : '—'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${STATUS_COLORS[cluster.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {cluster.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Detail Panel */}
          {selectedCluster && (
            <div
              className="w-full lg:w-[400px] shrink-0 rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col"
              style={{ maxHeight: 'calc(100vh - 200px)' }}
            >
              <TrendClusterDetailPanel
                cluster={selectedCluster}
                onClose={() => setSelectedId(null)}
                onUpdated={() => queryClient.invalidateQueries({ queryKey: ['trend-clusters'] })}
              />
            </div>
          )}
        </div>

      </ManagementShell>
    </ManagementLayout>
  );
}