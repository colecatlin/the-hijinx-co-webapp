import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldOff, Radar, Activity, TrendingUp, Map, CheckCircle, XCircle, Bookmark, ExternalLink, ChevronRight, Loader2 } from 'lucide-react';
import { logStoryRadarEvent } from '@/components/editorial/storyRadarLogger';
import { formatDistanceToNow } from 'date-fns';

const ALLOWED_ROLES = ['admin', 'editor', 'writer'];
const PAGE = 'management/editorial/story-radar';

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, color = 'bg-gray-50', loading }) {
  return (
    <div className={`rounded-xl border border-gray-200 ${color} px-5 py-4`}>
      {loading ? (
        <div className="h-7 w-12 bg-gray-200 animate-pulse rounded mb-1" />
      ) : (
        <p className="text-2xl font-bold text-gray-900">{value ?? 0}</p>
      )}
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

// ─── Score Badge ──────────────────────────────────────────────────────────────
function ScoreBadge({ label, value, color }) {
  if (value == null) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {label}: {Math.round(value)}
    </span>
  );
}

// ─── Importance Badge ─────────────────────────────────────────────────────────
const importanceColors = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-600',
};

function ImportanceBadge({ level }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${importanceColors[level] ?? importanceColors.low}`}>
      {level}
    </span>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, count, iconColor = 'text-violet-500' }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      </div>
      {count != null && (
        <span className="text-xs text-gray-400">{count} item{count !== 1 ? 's' : ''}</span>
      )}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ message }) {
  return (
    <div className="py-10 text-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl">
      {message}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StoryRadar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState({});

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // ── Counts ──
  const { data: signalCounts, isLoading: signalCountsLoading } = useQuery({
    queryKey: ['signal-counts'],
    queryFn: async () => {
      const [newSigs, queued, errored] = await Promise.all([
        base44.entities.ContentSignal.filter({ status: 'new' }),
        base44.entities.ContentSignal.filter({ status: 'queued' }),
        base44.entities.ContentSignal.filter({ status: 'errored' }),
      ]);
      return { new: newSigs.length, queued: queued.length, errored: errored.length };
    },
    enabled: !!user,
  });

  const { data: recCounts, isLoading: recCountsLoading } = useQuery({
    queryKey: ['rec-counts'],
    queryFn: async () => {
      const [suggested, approved, drafted] = await Promise.all([
        base44.entities.StoryRecommendation.filter({ status: 'suggested' }),
        base44.entities.StoryRecommendation.filter({ status: 'approved' }),
        base44.entities.StoryRecommendation.filter({ status: 'drafted' }),
      ]);
      return { suggested: suggested.length, approved: approved.length, drafted: drafted.length };
    },
    enabled: !!user,
  });

  const { data: clusterCount, isLoading: clusterCountLoading } = useQuery({
    queryKey: ['cluster-count'],
    queryFn: () => base44.entities.StoryTrendCluster.filter({ status: 'active' }),
    enabled: !!user,
    select: d => d.length,
  });

  const { data: gapCount, isLoading: gapCountLoading } = useQuery({
    queryKey: ['gap-count'],
    queryFn: () => base44.entities.OutletStoryCoverageMap.filter({ is_gap: true }),
    enabled: !!user,
    select: d => d.length,
  });

  // ── Section 1: High Priority Recommendations ──
  const { data: highPriorityRecs = [], isLoading: recsLoading } = useQuery({
    queryKey: ['high-priority-recs'],
    queryFn: async () => {
      const recs = await base44.entities.StoryRecommendation.filter({ status: 'suggested' }, '-priority_score', 10);
      return recs.sort((a, b) => {
        const pa = (b.priority_score ?? 0) + (b.urgency_score ?? 0);
        const pb = (a.priority_score ?? 0) + (a.urgency_score ?? 0);
        return pa - pb;
      }).slice(0, 10);
    },
    enabled: !!user,
  });

  // ── Section 2: Recent Signals ──
  const { data: recentSignals = [], isLoading: signalsLoading } = useQuery({
    queryKey: ['recent-signals'],
    queryFn: () => base44.entities.ContentSignal.list('-detected_at', 15),
    enabled: !!user,
  });

  // ── Section 3: Active Trend Clusters ──
  const { data: trendClusters = [], isLoading: clustersLoading } = useQuery({
    queryKey: ['active-clusters'],
    queryFn: async () => {
      const clusters = await base44.entities.StoryTrendCluster.filter({ status: 'active' }, '-momentum_score', 8);
      return clusters;
    },
    enabled: !!user,
  });

  // ── Section 4: Coverage Gaps ──
  const { data: coverageGaps = [], isLoading: gapsLoading } = useQuery({
    queryKey: ['coverage-gaps'],
    queryFn: async () => {
      const [suggested, saved] = await Promise.all([
        base44.entities.StoryRecommendation.filter({ status: 'suggested' }, '-coverage_gap_score', 20),
        base44.entities.StoryRecommendation.filter({ status: 'saved' }, '-coverage_gap_score', 20),
      ]);
      return [...suggested, ...saved]
        .filter(r => r.coverage_gap_score != null)
        .sort((a, b) => (b.coverage_gap_score ?? 0) - (a.coverage_gap_score ?? 0))
        .slice(0, 10);
    },
    enabled: !!user,
  });

  // ── Recommendation quick actions ──
  const handleRecAction = async (id, newStatus) => {
    setActionLoading(prev => ({ ...prev, [id]: newStatus }));
    await base44.entities.StoryRecommendation.update(id, { status: newStatus });
    queryClient.invalidateQueries({ queryKey: ['high-priority-recs'] });
    queryClient.invalidateQueries({ queryKey: ['rec-counts'] });
    queryClient.invalidateQueries({ queryKey: ['coverage-gaps'] });
    setActionLoading(prev => ({ ...prev, [id]: null }));
  };

  // ── Auth guard ──
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
            <p className="text-gray-600 font-medium">Access denied</p>
            <p className="text-gray-400 text-sm max-w-sm">Story Radar is restricted to editorial staff.</p>
            <Button size="sm" onClick={() => navigate(createPageUrl('Management'))}>Back to Management</Button>
          </div>
        </ManagementShell>
      </ManagementLayout>
    );
  }

  const countLoading = signalCountsLoading || recCountsLoading || clusterCountLoading || gapCountLoading;

  return (
    <ManagementLayout currentPage={PAGE}>
      <ManagementShell title="Story Radar" subtitle="Editorial signals, recommendations, and coverage intelligence">

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
          <StatCard label="New Signals" value={signalCounts?.new} loading={signalCountsLoading} color="bg-blue-50" />
          <StatCard label="Queued" value={signalCounts?.queued} loading={signalCountsLoading} color="bg-indigo-50" />
          <StatCard label="Errored" value={signalCounts?.errored} loading={signalCountsLoading} color="bg-red-50" />
          <StatCard label="Suggested Recs" value={recCounts?.suggested} loading={recCountsLoading} color="bg-violet-50" />
          <StatCard label="Approved Recs" value={recCounts?.approved} loading={recCountsLoading} color="bg-green-50" />
          <StatCard label="Drafted Recs" value={recCounts?.drafted} loading={recCountsLoading} color="bg-teal-50" />
          <StatCard label="Active Clusters" value={clusterCount} loading={clusterCountLoading} color="bg-orange-50" />
          <StatCard label="Coverage Gaps" value={gapCount} loading={gapCountLoading} color="bg-amber-50" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Section 1: High Priority Recommendations ── */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
            <SectionHeader icon={Radar} title="High Priority Recommendations" count={highPriorityRecs.length} iconColor="text-violet-500" />
            {recsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : highPriorityRecs.length === 0 ? (
              <EmptyState message="No high priority recommendations at this time." />
            ) : (
              <div className="space-y-3">
                {highPriorityRecs.map(rec => (
                  <div key={rec.id} className="flex flex-col sm:flex-row sm:items-start gap-3 p-4 rounded-lg border border-gray-100 hover:border-gray-200 bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">{rec.title_suggestion}</p>
                        {rec.story_type && (
                          <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs rounded capitalize">{rec.story_type.replace('_', ' ')}</span>
                        )}
                        {rec.recommended_format && (
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded capitalize">{rec.recommended_format.replace('_', ' ')}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <ScoreBadge label="Priority" value={rec.priority_score} color="bg-red-100 text-red-700" />
                        <ScoreBadge label="Urgency" value={rec.urgency_score} color="bg-orange-100 text-orange-700" />
                        <ScoreBadge label="Confidence" value={rec.confidence_score} color="bg-blue-100 text-blue-700" />
                      </div>
                      {rec.why_now && (
                        <p className="text-xs text-gray-500 line-clamp-2">{rec.why_now}</p>
                      )}
                      {rec.related_entity_names?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {rec.related_entity_names.map((name, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-white border border-gray-200 text-gray-600 text-xs rounded">{name}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex sm:flex-col gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-green-700 hover:bg-green-50"
                        disabled={!!actionLoading[rec.id]}
                        onClick={() => handleRecAction(rec.id, 'approved')}
                      >
                        {actionLoading[rec.id] === 'approved' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-amber-700 hover:bg-amber-50"
                        disabled={!!actionLoading[rec.id]}
                        onClick={() => handleRecAction(rec.id, 'saved')}
                      >
                        {actionLoading[rec.id] === 'saved' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bookmark className="w-3 h-3 mr-1" />}
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-gray-500 hover:bg-gray-100"
                        disabled={!!actionLoading[rec.id]}
                        onClick={() => handleRecAction(rec.id, 'dismissed')}
                      >
                        {actionLoading[rec.id] === 'dismissed' ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3 mr-1" />}
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Section 2: Recent Signals ── */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <SectionHeader icon={Activity} title="Recent Signals" count={recentSignals.length} iconColor="text-blue-500" />
            {signalsLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-gray-100 animate-pulse rounded-lg" />)}
              </div>
            ) : recentSignals.length === 0 ? (
              <EmptyState message="No signals detected yet." />
            ) : (
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {recentSignals.map(sig => (
                  <div key={sig.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-gray-800 truncate">{sig.source_entity_name ?? '—'}</p>
                      <ImportanceBadge level={sig.importance_level} />
                    </div>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {sig.signal_type && (
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded capitalize">{sig.signal_type.replace(/_/g, ' ')}</span>
                      )}
                      {sig.trigger_action && (
                        <span className="text-xs text-gray-500 truncate">{sig.trigger_action}</span>
                      )}
                    </div>
                    {sig.signal_summary && (
                      <p className="text-xs text-gray-500 line-clamp-2">{sig.signal_summary}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 text-xs rounded capitalize ${
                        sig.status === 'errored' ? 'bg-red-100 text-red-700' :
                        sig.status === 'processed' ? 'bg-green-100 text-green-700' :
                        sig.status === 'new' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{sig.status}</span>
                      {sig.ai_processed && (
                        <span className="px-1.5 py-0.5 bg-violet-100 text-violet-700 text-xs rounded">AI ✓</span>
                      )}
                      {sig.detected_at && (
                        <span className="text-xs text-gray-400 ml-auto">
                          {formatDistanceToNow(new Date(sig.detected_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Section 3: Active Trend Clusters ── */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <SectionHeader icon={TrendingUp} title="Active Trend Clusters" count={trendClusters.length} iconColor="text-orange-500" />
            {clustersLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />)}
              </div>
            ) : trendClusters.length === 0 ? (
              <EmptyState message="No active trend clusters." />
            ) : (
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {trendClusters.map(cluster => (
                  <div key={cluster.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-gray-900 truncate">{cluster.trend_name}</p>
                      {cluster.momentum_score != null && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded">
                          {Math.round(cluster.momentum_score)} momentum
                        </span>
                      )}
                    </div>
                    {cluster.trend_type && (
                      <span className="inline-block px-1.5 py-0.5 bg-orange-50 text-orange-600 text-xs rounded capitalize">
                        {cluster.trend_type.replace(/_/g, ' ')}
                      </span>
                    )}
                    {cluster.trend_summary && (
                      <p className="text-xs text-gray-500 line-clamp-2">{cluster.trend_summary}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {cluster.story_count != null && <span>{cluster.story_count} stories</span>}
                      {cluster.last_activity_date && (
                        <span>Last activity {formatDistanceToNow(new Date(cluster.last_activity_date), { addSuffix: true })}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Section 4: Coverage Gaps ── */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
            <SectionHeader icon={Map} title="Coverage Gaps" count={coverageGaps.length} iconColor="text-amber-500" />
            {gapsLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-gray-100 animate-pulse rounded-lg" />)}
              </div>
            ) : coverageGaps.length === 0 ? (
              <EmptyState message="No coverage gaps identified." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {coverageGaps.map(rec => (
                  <div key={rec.id} className="p-3 rounded-lg border border-gray-100 bg-amber-50/40 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-gray-900 truncate">{rec.title_suggestion}</p>
                      {rec.coverage_gap_score != null && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded shrink-0">
                          Gap: {Math.round(rec.coverage_gap_score)}
                        </span>
                      )}
                    </div>
                    {rec.angle && (
                      <p className="text-xs text-gray-500 italic line-clamp-1">{rec.angle}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {rec.recommended_category && (
                        <span className="px-1.5 py-0.5 bg-white border border-gray-200 text-gray-600 text-xs rounded">{rec.recommended_category}</span>
                      )}
                      {rec.recommended_subcategory && (
                        <span className="px-1.5 py-0.5 bg-white border border-gray-200 text-gray-500 text-xs rounded">{rec.recommended_subcategory}</span>
                      )}
                    </div>
                    {rec.related_entity_names?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {rec.related_entity_names.slice(0, 3).map((name, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-white border border-amber-200 text-amber-700 text-xs rounded">{name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </ManagementShell>
    </ManagementLayout>
  );
}