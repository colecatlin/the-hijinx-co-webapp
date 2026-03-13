import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SignalDetailPanel from '@/components/editorial/SignalDetailPanel';
import { ShieldOff, Search, SlidersHorizontal, X, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const PAGE = 'management/editorial/signals';
const ALLOWED_ROLES = ['admin', 'editor', 'writer'];

const STATUS_OPTIONS = ['new', 'queued', 'processing', 'processed', 'dismissed', 'errored', 'ignored'];
const SIGNAL_TYPE_OPTIONS = ['result_posted', 'standings_change', 'new_driver', 'team_change', 'event_published', 'social_mention', 'external_news', 'milestone', 'controversy', 'partnership', 'other'];
const ENTITY_TYPE_OPTIONS = ['Driver', 'Team', 'Track', 'Series', 'Event', 'External'];
const IMPORTANCE_OPTIONS = ['low', 'medium', 'high', 'critical'];

const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-700',
  queued: 'bg-indigo-100 text-indigo-700',
  processing: 'bg-yellow-100 text-yellow-700',
  processed: 'bg-green-100 text-green-700',
  dismissed: 'bg-gray-100 text-gray-500',
  errored: 'bg-red-100 text-red-700',
  ignored: 'bg-gray-100 text-gray-400',
};

const IMPORTANCE_COLORS = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-500',
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

export default function EditorialSignals() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState(null);
  const [sortKey, setSortKey] = useState('detected_at');
  const [sortDir, setSortDir] = useState('desc');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showIgnored, setShowIgnored] = useState(false);
  const [filters, setFilters] = useState({
    status: '', signal_type: '', source_entity_type: '', importance_level: '', ai_processed: '',
  });

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: signals = [], isLoading } = useQuery({
    queryKey: ['signals'],
    queryFn: () => base44.entities.ContentSignal.list('-detected_at', 300),
    enabled: !!user,
  });

  const handleSort = (field) => {
    if (sortKey === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(field); setSortDir('desc'); }
  };

  const setFilter = (key, val) => setFilters(prev => ({ ...prev, [key]: val }));

  const activeFilterCount = Object.values(filters).filter(Boolean).length + (search ? 1 : 0);

  const filtered = useMemo(() => {
    let list = [...signals];

    // Primary queue rule: exclude ignored unless toggled
    if (!showIgnored && !filters.status) {
      list = list.filter(s => s.status !== 'ignored');
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.source_entity_name?.toLowerCase().includes(q) ||
        s.signal_summary?.toLowerCase().includes(q) ||
        s.trigger_action?.toLowerCase().includes(q) ||
        s.signal_type?.toLowerCase().includes(q)
      );
    }
    if (filters.status) list = list.filter(s => s.status === filters.status);
    if (filters.signal_type) list = list.filter(s => s.signal_type === filters.signal_type);
    if (filters.source_entity_type) list = list.filter(s => s.source_entity_type === filters.source_entity_type);
    if (filters.importance_level) list = list.filter(s => s.importance_level === filters.importance_level);
    if (filters.ai_processed !== '') list = list.filter(s => String(s.ai_processed) === filters.ai_processed);

    list.sort((a, b) => {
      let va = a[sortKey] ?? '';
      let vb = b[sortKey] ?? '';
      if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [signals, search, filters, sortKey, sortDir, showIgnored]);

  const selectedSignal = selectedId ? signals.find(s => s.id === selectedId) : null;

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

  const ignoredCount = signals.filter(s => s.status === 'ignored').length;

  return (
    <ManagementLayout currentPage={PAGE}>
      <ManagementShell
        title="Content Signals"
        subtitle={`${filtered.length} signal${filtered.length !== 1 ? 's' : ''}${showIgnored ? ' (including ignored)' : ''}`}
      >
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search signals…"
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
          {ignoredCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className={`h-8 text-xs ${showIgnored ? 'text-gray-700' : 'text-gray-400'}`}
              onClick={() => setShowIgnored(v => !v)}
            >
              {showIgnored ? 'Hide' : 'Show'} Ignored ({ignoredCount})
            </Button>
          )}
        </div>

        {/* Filter Bar */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
            <FilterSelect label="Status" value={filters.status} onChange={v => setFilter('status', v)} options={STATUS_OPTIONS} />
            <FilterSelect label="Signal Type" value={filters.signal_type} onChange={v => setFilter('signal_type', v)} options={SIGNAL_TYPE_OPTIONS} />
            <FilterSelect label="Entity Type" value={filters.source_entity_type} onChange={v => setFilter('source_entity_type', v)} options={ENTITY_TYPE_OPTIONS} />
            <FilterSelect label="Importance" value={filters.importance_level} onChange={v => setFilter('importance_level', v)} options={IMPORTANCE_OPTIONS} />
            <select
              value={filters.ai_processed}
              onChange={e => setFilter('ai_processed', e.target.value)}
              className="h-8 text-xs border border-gray-200 rounded-lg px-2 pr-7 bg-white text-gray-700 appearance-none focus:outline-none focus:ring-1 focus:ring-gray-300"
            >
              <option value="">AI Processed</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
            {activeFilterCount > 0 && (
              <Button size="sm" variant="ghost" className="h-8 text-xs text-gray-400 hover:text-gray-700"
                onClick={() => { setFilters({ status: '', signal_type: '', source_entity_type: '', importance_level: '', ai_processed: '' }); setSearch(''); }}>
                <X className="w-3 h-3 mr-1" /> Clear
              </Button>
            )}
          </div>
        )}

        {/* Layout: table + detail panel */}
        <div className="flex gap-4 min-h-0">

          {/* Table */}
          <div className={`flex-1 min-w-0 overflow-auto rounded-xl border border-gray-200 bg-white ${selectedSignal ? 'hidden lg:block' : ''}`}>
            {isLoading ? (
              <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl m-4">
                No signals match your filters.
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 min-w-[180px]">Source Entity</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Type</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Signal Type</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 max-w-[200px]">Trigger</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Importance</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Status</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">AI</th>
                    <th className="text-left px-3 py-3">
                      <SortHeader field="detected_at" label="Detected" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(sig => (
                    <tr
                      key={sig.id}
                      onClick={() => setSelectedId(sig.id === selectedId ? null : sig.id)}
                      className={`cursor-pointer hover:bg-gray-50 transition-colors ${selectedId === sig.id ? 'bg-blue-50 border-l-2 border-blue-400' : ''} ${sig.status === 'ignored' ? 'opacity-50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 truncate max-w-[160px]">{sig.source_entity_name ?? '—'}</p>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-gray-500">{sig.source_entity_type ?? '—'}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded capitalize">
                          {sig.signal_type?.replace(/_/g, ' ') ?? '—'}
                        </span>
                      </td>
                      <td className="px-3 py-3 max-w-[200px]">
                        <p className="truncate text-gray-500">{sig.trigger_action ?? '—'}</p>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {sig.importance_level && (
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${IMPORTANCE_COLORS[sig.importance_level]}`}>
                            {sig.importance_level}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${STATUS_COLORS[sig.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {sig.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {sig.ai_processed
                          ? <span className="text-violet-500 font-bold text-xs">✓</span>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-gray-400">
                        {sig.detected_at
                          ? formatDistanceToNow(new Date(sig.detected_at), { addSuffix: true })
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Detail Panel */}
          {selectedSignal && (
            <div
              className="w-full lg:w-[400px] shrink-0 rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col"
              style={{ maxHeight: 'calc(100vh - 200px)' }}
            >
              <SignalDetailPanel
                signal={selectedSignal}
                onClose={() => setSelectedId(null)}
                onUpdated={() => queryClient.invalidateQueries({ queryKey: ['signals'] })}
                onOpenRecommendation={(id) => {
                  if (id) navigate(`/management/editorial/recommendations?rec=${id}`);
                }}
                onOpenCluster={(id) => {
                  if (id) navigate(`/management/editorial/trend-clusters?cluster=${id}`);
                }}
              />
            </div>
          )}
        </div>

      </ManagementShell>
    </ManagementLayout>
  );
}