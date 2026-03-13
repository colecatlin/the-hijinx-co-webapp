import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import QueueItemCard from '@/components/editorial/QueueItemCard';
import {
  ShieldOff, Search, AlertTriangle, Sparkles, Activity, TrendingUp,
  FileText, User, Map, Zap, X, Bell, Info, AlertOctagon
} from 'lucide-react';

const PAGE = 'management/editorial/review-queue';
const ALLOWED_ROLES = ['admin', 'editor', 'writer'];

const PRIORITY_THRESHOLD = 65;
const URGENCY_THRESHOLD = 65;
const MOMENTUM_THRESHOLD = 60;
const GAP_THRESHOLD = 50;

const TABS = [
  { id: 'needs-review', label: 'Needs Review Now', icon: Zap, color: 'text-red-500' },
  { id: 'high-priority', label: 'High Priority', icon: Sparkles, color: 'text-violet-500' },
  { id: 'urgent-signals', label: 'Urgent Signals', icon: Activity, color: 'text-blue-500' },
  { id: 'heating-trends', label: 'Heating Trends', icon: TrendingUp, color: 'text-orange-500' },
  { id: 'ready-to-draft', label: 'Ready to Draft', icon: FileText, color: 'text-teal-500' },
  { id: 'assigned-to-me', label: 'Assigned to Me', icon: User, color: 'text-indigo-500' },
  { id: 'coverage-gaps', label: 'Coverage Gaps', icon: Map, color: 'text-amber-500' },
];

function matchesSearch(item, q) {
  if (!q) return true;
  const lq = q.toLowerCase();
  return (
    item.title_suggestion?.toLowerCase().includes(lq) ||
    item.signal_summary?.toLowerCase().includes(lq) ||
    item.trend_name?.toLowerCase().includes(lq) ||
    item.source_entity_name?.toLowerCase().includes(lq) ||
    item.related_entity_names?.some(n => n.toLowerCase().includes(lq)) ||
    item.trend_summary?.toLowerCase().includes(lq)
  );
}

function AlertBanner({ alert }) {
  const styles = {
    urgent: { bg: 'bg-red-50 border-red-200 text-red-700', Icon: AlertOctagon },
    warning: { bg: 'bg-orange-50 border-orange-200 text-orange-700', Icon: AlertTriangle },
    info: { bg: 'bg-blue-50 border-blue-200 text-blue-700', Icon: Info },
  };
  const { bg, Icon } = styles[alert.severity] ?? styles.info;
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm ${bg}`}>
      <Icon className="w-4 h-4 shrink-0" />
      <span className="font-medium">{alert.message}</span>
    </div>
  );
}

export default function EditorialReviewQueue() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('needs-review');
  const [search, setSearch] = useState('');

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: recs = [], isLoading: recsLoading } = useQuery({
    queryKey: ['queue-recs'],
    queryFn: () => base44.entities.StoryRecommendation.list('-priority_score', 200),
    enabled: !!user,
  });

  const { data: signals = [], isLoading: signalsLoading } = useQuery({
    queryKey: ['queue-signals'],
    queryFn: () => base44.entities.ContentSignal.list('-detected_at', 200),
    enabled: !!user,
  });

  const { data: clusters = [], isLoading: clustersLoading } = useQuery({
    queryKey: ['queue-clusters'],
    queryFn: () => base44.entities.StoryTrendCluster.list('-momentum_score', 100),
    enabled: !!user,
  });

  const loading = recsLoading || signalsLoading || clustersLoading;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['queue-recs'] });
    queryClient.invalidateQueries({ queryKey: ['queue-signals'] });
    queryClient.invalidateQueries({ queryKey: ['queue-clusters'] });
    queryClient.invalidateQueries({ queryKey: ['rec-counts'] });
    queryClient.invalidateQueries({ queryKey: ['signal-counts'] });
    queryClient.invalidateQueries({ queryKey: ['high-priority-recs'] });
    queryClient.invalidateQueries({ queryKey: ['coverage-gaps'] });
  };

  const handleOpenDetail = (_item, type) => {
    const routes = {
      recommendation: '/management/editorial/recommendations',
      signal: '/management/editorial/signals',
      cluster: '/management/editorial/trend-clusters',
    };
    navigate(routes[type] ?? '/management/editorial/story-radar');
  };

  // ── Computed sections ──────────────────────────────────────────────────────

  const needsReviewItems = useMemo(() => {
    const urgentRecs = recs
      .filter(r =>
        ['suggested', 'saved'].includes(r.status) &&
        ((r.priority_score ?? 0) >= PRIORITY_THRESHOLD || (r.urgency_score ?? 0) >= URGENCY_THRESHOLD) &&
        matchesSearch(r, search)
      )
      .map(r => ({ ...r, _type: 'recommendation', _sort: (r.urgency_score ?? 0) + (r.priority_score ?? 0) }));

    const urgentSigs = signals
      .filter(s =>
        ['new', 'errored'].includes(s.status) &&
        ['high', 'critical'].includes(s.importance_level) &&
        matchesSearch(s, search)
      )
      .map(s => ({ ...s, _type: 'signal', _sort: s.importance_level === 'critical' ? 200 : 100 }));

    const hotClusters = clusters
      .filter(c =>
        c.status === 'active' &&
        (c.momentum_score ?? 0) >= MOMENTUM_THRESHOLD &&
        matchesSearch(c, search)
      )
      .map(c => ({ ...c, _type: 'cluster', _sort: c.momentum_score ?? 0 }));

    return [...urgentRecs, ...urgentSigs, ...hotClusters].sort((a, b) => b._sort - a._sort);
  }, [recs, signals, clusters, search]);

  const highPriorityRecs = useMemo(() =>
    recs.filter(r =>
      ['suggested', 'approved', 'saved'].includes(r.status) &&
      (r.priority_score ?? 0) >= 50 &&
      matchesSearch(r, search)
    ).sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0)),
    [recs, search]
  );

  const urgentSignals = useMemo(() =>
    signals
      .filter(s =>
        ['new', 'queued', 'errored'].includes(s.status) &&
        ['high', 'critical'].includes(s.importance_level) &&
        matchesSearch(s, search)
      )
      .sort((a, b) => {
        const imp = { critical: 2, high: 1 };
        return (imp[b.importance_level] ?? 0) - (imp[a.importance_level] ?? 0);
      }),
    [signals, search]
  );

  const heatingTrends = useMemo(() =>
    clusters.filter(c =>
      c.status === 'active' &&
      (c.momentum_score ?? 0) >= MOMENTUM_THRESHOLD &&
      matchesSearch(c, search)
    ),
    [clusters, search]
  );

  const readyToDraft = useMemo(() =>
    recs
      .filter(r =>
        ['approved', 'saved'].includes(r.status) &&
        !r.linked_story_id &&
        matchesSearch(r, search)
      )
      .sort((a, b) => {
        const ap = (b.priority_score ?? 0) - (a.priority_score ?? 0);
        if (ap !== 0) return ap;
        const aa = (b.approved_at ?? b.generated_at ?? '') > (a.approved_at ?? a.generated_at ?? '') ? 1 : -1;
        return aa;
      }),
    [recs, search]
  );

  const assignedToMe = useMemo(() =>
    recs.filter(r =>
      r.assigned_to &&
      user?.email &&
      r.assigned_to.toLowerCase() === user.email.toLowerCase() &&
      !['dismissed', 'covered', 'published'].includes(r.status) &&
      matchesSearch(r, search)
    ),
    [recs, user, search]
  );

  const coverageGaps = useMemo(() =>
    recs
      .filter(r =>
        ['suggested', 'saved'].includes(r.status) &&
        (r.coverage_gap_score ?? 0) >= GAP_THRESHOLD &&
        matchesSearch(r, search)
      )
      .sort((a, b) => (b.coverage_gap_score ?? 0) - (a.coverage_gap_score ?? 0)),
    [recs, search]
  );

  // ── Computed alerts ────────────────────────────────────────────────────────

  const computedAlerts = useMemo(() => {
    const alerts = [];
    const criticalSigs = signals.filter(s => s.status === 'new' && s.importance_level === 'critical');
    if (criticalSigs.length > 0) {
      alerts.push({
        id: 'crit-sigs',
        severity: 'urgent',
        message: `${criticalSigs.length} critical signal${criticalSigs.length > 1 ? 's' : ''} need immediate review`,
      });
    }
    const erroredSigs = signals.filter(s => s.status === 'errored');
    if (erroredSigs.length > 0) {
      alerts.push({
        id: 'err-sigs',
        severity: 'warning',
        message: `${erroredSigs.length} signal${erroredSigs.length > 1 ? 's' : ''} failed processing — retry required`,
      });
    }
    const urgentRec = recs.find(r => (r.urgency_score ?? 0) >= 85 && r.status === 'suggested');
    if (urgentRec) {
      alerts.push({
        id: 'urgent-rec',
        severity: 'urgent',
        message: `High urgency recommendation needs review: "${urgentRec.title_suggestion}"`,
      });
    }
    if (readyToDraft.length > 0) {
      alerts.push({
        id: 'ready-draft',
        severity: 'info',
        message: `${readyToDraft.length} recommendation${readyToDraft.length > 1 ? 's' : ''} approved and ready to convert to draft`,
      });
    }
    return alerts;
  }, [signals, recs, readyToDraft]);

  // ── Tab config ─────────────────────────────────────────────────────────────

  const tabCounts = {
    'needs-review': needsReviewItems.length,
    'high-priority': highPriorityRecs.length,
    'urgent-signals': urgentSignals.length,
    'heating-trends': heatingTrends.length,
    'ready-to-draft': readyToDraft.length,
    'assigned-to-me': assignedToMe.length,
    'coverage-gaps': coverageGaps.length,
  };

  const getTabItems = () => {
    switch (activeTab) {
      case 'needs-review': return needsReviewItems.map(i => ({ item: i, type: i._type }));
      case 'high-priority': return highPriorityRecs.map(i => ({ item: i, type: 'recommendation' }));
      case 'urgent-signals': return urgentSignals.map(i => ({ item: i, type: 'signal' }));
      case 'heating-trends': return heatingTrends.map(i => ({ item: i, type: 'cluster' }));
      case 'ready-to-draft': return readyToDraft.map(i => ({ item: i, type: 'recommendation' }));
      case 'assigned-to-me': return assignedToMe.map(i => ({ item: i, type: 'recommendation' }));
      case 'coverage-gaps': return coverageGaps.map(i => ({ item: i, type: 'recommendation' }));
      default: return [];
    }
  };

  // ── Auth guard ─────────────────────────────────────────────────────────────

  if (userLoading) return null;
  if (!user) { base44.auth.redirectToLogin('/' + PAGE); return null; }
  if (!ALLOWED_ROLES.includes(user.role)) {
    return (
      <ManagementLayout currentPage={PAGE}>
        <ManagementShell title="Access Denied" subtitle="">
          <div className="py-24 flex flex-col items-center gap-4 text-center">
            <ShieldOff className="w-10 h-10 text-gray-300" />
            <p className="text-gray-600 font-medium">Restricted to editorial staff.</p>
            <Button size="sm" onClick={() => navigate('/Management')}>Back to Management</Button>
          </div>
        </ManagementShell>
      </ManagementLayout>
    );
  }

  const currentItems = getTabItems();
  const currentTab = TABS.find(t => t.id === activeTab);
  const CurrentIcon = currentTab.icon;

  return (
    <ManagementLayout currentPage={PAGE}>
      <ManagementShell
        title="Editorial Review Queue"
        subtitle="Prioritized editorial work — one place to process signals, recommendations, and draft opportunities"
      >
        {/* Live alert banners */}
        {computedAlerts.length > 0 && (
          <div className="space-y-2 mb-5">
            {computedAlerts.map(alert => <AlertBanner key={alert.id} alert={alert} />)}
          </div>
        )}

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search titles, summaries, entities, signals…"
            className="pl-9 h-9 text-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-gray-400 hover:text-gray-700" />
            </button>
          )}
        </div>

        {/* Tab navigation */}
        <div className="flex flex-wrap gap-1.5 mb-6 pb-4 border-b border-gray-200">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const count = tabCounts[tab.id];
            const isActive = activeTab === tab.id;
            const isUrgent = tab.id === 'needs-review' && count > 0;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-gray-900 text-white shadow-sm'
                    : isUrgent
                    ? 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : tab.color}`} />
                <span className="hidden sm:inline">{tab.label}</span>
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-[18px] text-center ${
                    isActive ? 'bg-white/20 text-white' :
                    isUrgent ? 'bg-red-600 text-white' :
                    'bg-white text-gray-700 border border-gray-200'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {loading ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-36 bg-gray-100 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : currentItems.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50">
            <CurrentIcon className={`w-8 h-8 mx-auto mb-3 ${currentTab.color} opacity-30`} />
            <p className="text-sm font-medium text-gray-400">
              {search
                ? `No items match "${search}"`
                : `Nothing in ${currentTab.label} right now`}
            </p>
            {activeTab === 'assigned-to-me' && (
              <p className="text-xs text-gray-400 mt-1">
                Items assigned to <span className="font-mono">{user?.email}</span> will appear here
              </p>
            )}
            {activeTab === 'needs-review' && !search && (
              <p className="text-xs text-gray-400 mt-1">Queue is clear — great editorial health!</p>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-3">
              {currentItems.length} item{currentItems.length !== 1 ? 's' : ''}
              {search && <span> matching <span className="font-medium text-gray-600">"{search}"</span></span>}
            </p>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {currentItems.map(({ item, type }) => (
                <QueueItemCard
                  key={`${type}-${item.id}`}
                  item={item}
                  itemType={type}
                  onUpdated={invalidateAll}
                  onOpenDetail={handleOpenDetail}
                />
              ))}
            </div>
          </>
        )}
      </ManagementShell>
    </ManagementLayout>
  );
}