import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  ShieldOff, BookOpen, TrendingUp, Search, X, Plus, Loader2,
  Zap, RefreshCw, ChevronRight, ExternalLink, AlertTriangle, Map
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import NarrativeArcDetail from '@/components/editorial/NarrativeArcDetail';

const PAGE = 'management/editorial/narratives';
const ALLOWED_ROLES = ['admin', 'editor', 'writer'];

const ARC_TYPE_LABELS = {
  championship_battle: 'Championship Battle',
  rivalry: 'Rivalry',
  momentum_shift: 'Momentum Shift',
  win_streak: 'Win Streak',
  rookie_breakout: 'Rookie Breakout',
  sponsor_movement: 'Sponsor Movement',
  team_growth: 'Team Growth',
  series_instability: 'Series Instability',
  schedule_drama: 'Schedule Drama',
  controversy: 'Controversy',
  industry_trend: 'Industry Trend',
  cultural_story: 'Cultural Story',
  technology_shift: 'Technology Shift',
};

const ARC_TYPE_COLORS = {
  championship_battle: 'bg-yellow-100 text-yellow-800',
  rivalry: 'bg-red-100 text-red-700',
  momentum_shift: 'bg-blue-100 text-blue-700',
  win_streak: 'bg-green-100 text-green-700',
  rookie_breakout: 'bg-teal-100 text-teal-700',
  sponsor_movement: 'bg-indigo-100 text-indigo-700',
  team_growth: 'bg-violet-100 text-violet-700',
  series_instability: 'bg-orange-100 text-orange-700',
  controversy: 'bg-rose-100 text-rose-700',
  industry_trend: 'bg-cyan-100 text-cyan-700',
  cultural_story: 'bg-pink-100 text-pink-700',
  technology_shift: 'bg-sky-100 text-sky-700',
  schedule_drama: 'bg-amber-100 text-amber-700',
};

const STATUS_COLORS = {
  active:   'bg-green-100 text-green-700',
  emerging: 'bg-blue-100 text-blue-700',
  cooling:  'bg-orange-100 text-orange-700',
  closed:   'bg-gray-100 text-gray-500',
  ignored:  'bg-gray-50 text-gray-400',
};

function MomentumBar({ score }) {
  const pct = Math.min(100, Math.max(0, score ?? 0));
  const color = pct >= 70 ? 'bg-red-500' : pct >= 50 ? 'bg-orange-400' : pct >= 30 ? 'bg-yellow-400' : 'bg-gray-300';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-gray-500 w-6 text-right">{Math.round(pct)}</span>
    </div>
  );
}

export default function EditorialNarratives() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active,emerging');
  const [selectedArc, setSelectedArc] = useState(null);
  const [runningDetection, setRunningDetection] = useState(false);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: arcs = [], isLoading: arcsLoading } = useQuery({
    queryKey: ['narrative-arcs'],
    queryFn: () => base44.entities.NarrativeArc.list('-momentum_score', 200),
    enabled: !!user,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['coverage-plans'],
    queryFn: () => base44.entities.NarrativeCoveragePlan.list('-created_date', 200),
    enabled: !!user,
  });

  const planByArcId = Object.fromEntries(plans.map(p => [p.arc_id, p]));

  const statusSet = new Set(statusFilter.split(',').filter(Boolean));
  const filtered = arcs.filter(arc => {
    const matchStatus = statusFilter === 'all' || statusSet.has(arc.status);
    const q = search.toLowerCase();
    const matchSearch = !q ||
      arc.arc_name?.toLowerCase().includes(q) ||
      arc.arc_summary?.toLowerCase().includes(q) ||
      arc.entity_names?.some(n => n.toLowerCase().includes(q));
    return matchStatus && matchSearch;
  });

  const runDetection = async () => {
    setRunningDetection(true);
    try {
      const res = await base44.functions.invoke('detectNarrativeArcs', {});
      if (res.data?.success) {
        toast.success(`Detection complete — ${res.data.arcs_created ?? 0} new arcs, ${res.data.arcs_updated ?? 0} updated`);
        queryClient.invalidateQueries({ queryKey: ['narrative-arcs'] });
        queryClient.invalidateQueries({ queryKey: ['coverage-plans'] });
      } else {
        toast.error(res.data?.error ?? 'Detection failed');
      }
    } catch {
      toast.error('Detection failed');
    }
    setRunningDetection(false);
  };

  if (userLoading) return null;
  if (!user) { base44.auth.redirectToLogin('/' + PAGE); return null; }
  if (!ALLOWED_ROLES.includes(user.role)) {
    return (
      <ManagementLayout currentPage={PAGE}>
        <ManagementShell title="Access Denied" subtitle="">
          <div className="py-24 flex flex-col items-center gap-4 text-center">
            <ShieldOff className="w-10 h-10 text-gray-300" />
            <p className="text-gray-500 text-sm">Restricted to editorial staff.</p>
            <Button size="sm" onClick={() => navigate('/Management')}>Back to Management</Button>
          </div>
        </ManagementShell>
      </ManagementLayout>
    );
  }

  const gapCount = arcs.filter(a => a.coverage_gap_flagged && ['active', 'emerging'].includes(a.status)).length;

  return (
    <ManagementLayout currentPage={PAGE}>
      <ManagementShell
        title="Narrative Arcs"
        subtitle="Ongoing storylines detected across the motorsports ecosystem"
        actions={
          <Button
            onClick={runDetection}
            disabled={runningDetection}
            size="sm"
            className="gap-2 bg-gray-900 hover:bg-gray-700 text-white"
          >
            {runningDetection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            Run Detection
          </Button>
        }
      >
        {/* Gap alert */}
        {gapCount > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 mb-5 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span><span className="font-semibold">{gapCount} narrative arc{gapCount > 1 ? 's' : ''}</span> have high momentum but no published coverage.</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Active', count: arcs.filter(a => a.status === 'active').length, color: 'bg-green-50' },
            { label: 'Emerging', count: arcs.filter(a => a.status === 'emerging').length, color: 'bg-blue-50' },
            { label: 'Coverage Gaps', count: gapCount, color: 'bg-amber-50' },
            { label: 'Coverage Plans', count: plans.length, color: 'bg-violet-50' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border border-gray-200 ${s.color} px-4 py-3`}>
              <p className="text-xl font-bold text-gray-900">{s.count}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search arcs, entities…" className="pl-9 h-9 text-sm" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-gray-400" /></button>}
          </div>
          {[['active,emerging', 'Active'], ['active', 'Active Only'], ['cooling', 'Cooling'], ['all', 'All']].map(([val, label]) => (
            <button key={val} onClick={() => setStatusFilter(val)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${statusFilter === val ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-5">
          {/* Arc list */}
          <div className={`flex-1 min-w-0 space-y-2 ${selectedArc ? 'hidden xl:block xl:max-w-[52%]' : ''}`}>
            {arcsLoading ? (
              [...Array(5)].map((_, i) => <div key={i} className="h-28 bg-gray-100 animate-pulse rounded-xl" />)
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50">
                <BookOpen className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-400">No narrative arcs found</p>
                {!arcsLoading && arcs.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">Click "Run Detection" to analyze recent signals</p>
                )}
              </div>
            ) : (
              filtered.map(arc => {
                const plan = planByArcId[arc.id];
                const isGap = arc.coverage_gap_flagged && ['active', 'emerging'].includes(arc.status);
                return (
                  <button
                    key={arc.id}
                    onClick={() => setSelectedArc(arc)}
                    className={`w-full text-left p-4 rounded-xl border transition-all hover:shadow-sm ${
                      selectedArc?.id === arc.id ? 'border-gray-900 bg-gray-50 shadow-sm' :
                      isGap ? 'border-amber-200 bg-amber-50/30 hover:border-amber-300' :
                      'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded capitalize ${ARC_TYPE_COLORS[arc.arc_type] ?? 'bg-gray-100 text-gray-600'}`}>
                          {ARC_TYPE_LABELS[arc.arc_type] ?? arc.arc_type}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded capitalize ${STATUS_COLORS[arc.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {arc.status}
                        </span>
                        {isGap && (
                          <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded font-medium flex items-center gap-1">
                            <Map className="w-3 h-3" /> Coverage Gap
                          </span>
                        )}
                        {plan && (
                          <span className="px-2 py-0.5 text-xs bg-violet-50 text-violet-600 rounded capitalize">
                            {plan.coverage_strategy?.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                      {arc.last_update_date && (
                        <span className="text-[11px] text-gray-400 shrink-0">
                          {formatDistanceToNow(new Date(arc.last_update_date), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-gray-900 leading-snug mb-1.5">{arc.arc_name}</p>
                    {arc.arc_summary && (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-2">{arc.arc_summary}</p>
                    )}
                    <MomentumBar score={arc.momentum_score} />
                    {arc.entity_names?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {arc.entity_names.slice(0, 4).map((n, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">{n}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>{arc.signal_ids?.length ?? 0} signals</span>
                      <span>{arc.recommendation_ids?.length ?? 0} recs</span>
                      <span>{arc.story_ids?.length ?? 0} stories</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Detail panel */}
          {selectedArc && (
            <div className="flex-1 min-w-0 xl:max-w-[48%]">
              <NarrativeArcDetail
                arc={selectedArc}
                plan={planByArcId[selectedArc.id]}
                onClose={() => setSelectedArc(null)}
                onUpdated={() => {
                  queryClient.invalidateQueries({ queryKey: ['narrative-arcs'] });
                  queryClient.invalidateQueries({ queryKey: ['coverage-plans'] });
                }}
              />
            </div>
          )}
        </div>
      </ManagementShell>
    </ManagementLayout>
  );
}