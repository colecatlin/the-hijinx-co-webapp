import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldOff, FlaskConical, Search, X, Filter, Loader2, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import ResearchPacketDetail from '@/components/editorial/ResearchPacketDetail';

const PAGE = 'management/editorial/research-packets';
const ALLOWED_ROLES = ['admin'];

const SOURCE_TYPE_LABELS = {
  recommendation: 'Recommendation',
  narrative_arc: 'Narrative Arc',
  trend_cluster: 'Trend Cluster',
  story: 'Story',
  driver: 'Driver',
  team: 'Team',
  track: 'Track',
  series: 'Series',
  event: 'Event',
  manual_topic: 'Manual Topic',
};

const STATUS_COLORS = {
  generated:        'bg-blue-100 text-blue-700',
  reviewed:         'bg-green-100 text-green-700',
  attached_to_draft:'bg-teal-100 text-teal-700',
  archived:         'bg-gray-100 text-gray-400',
};

const SOURCE_COLORS = {
  recommendation: 'bg-violet-100 text-violet-700',
  narrative_arc:  'bg-yellow-100 text-yellow-700',
  trend_cluster:  'bg-orange-100 text-orange-700',
  story:          'bg-teal-100 text-teal-700',
  driver:         'bg-blue-100 text-blue-700',
  team:           'bg-indigo-100 text-indigo-700',
  track:          'bg-green-100 text-green-700',
  series:         'bg-pink-100 text-pink-700',
  event:          'bg-red-100 text-red-700',
  manual_topic:   'bg-gray-100 text-gray-600',
};

export default function EditorialResearchPackets() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: packets = [], isLoading } = useQuery({
    queryKey: ['research-packets'],
    queryFn: () => base44.entities.StoryResearchPacket.list('-generated_at', 200),
    enabled: !!user,
  });

  if (userLoading) return null;
  if (!user) { base44.auth.redirectToLogin('/' + PAGE); return null; }
  if (!ALLOWED_ROLES.includes(user.role)) {
    return (
      <ManagementLayout currentPage={PAGE}>
        <ManagementShell title="Access Denied" subtitle="">
          <div className="py-24 flex flex-col items-center gap-4 text-center">
            <ShieldOff className="w-10 h-10 text-gray-300" />
            <p className="text-gray-500 text-sm">Restricted to editorial staff.</p>
            <Button size="sm" onClick={() => navigate('/Management')}>Back</Button>
          </div>
        </ManagementShell>
      </ManagementLayout>
    );
  }

  const filtered = packets.filter(p => {
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchSource = sourceFilter === 'all' || p.source_type === sourceFilter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      p.title?.toLowerCase().includes(q) ||
      p.source_title?.toLowerCase().includes(q) ||
      p.summary?.toLowerCase().includes(q) ||
      p.assigned_to?.toLowerCase().includes(q);
    return matchStatus && matchSource && matchSearch;
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['research-packets'] });
  };

  return (
    <ManagementLayout currentPage={PAGE}>
      <ManagementShell
        title="Research Packets"
        subtitle="AI-generated editorial research packets for writers and editors"
      >
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total', count: packets.length, color: 'bg-gray-50' },
            { label: 'Generated', count: packets.filter(p => p.status === 'generated').length, color: 'bg-blue-50' },
            { label: 'Reviewed', count: packets.filter(p => p.status === 'reviewed').length, color: 'bg-green-50' },
            { label: 'Attached', count: packets.filter(p => p.status === 'attached_to_draft').length, color: 'bg-teal-50' },
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
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search packets…" className="pl-9 h-9 text-sm" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-gray-400" /></button>}
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="h-9 text-xs border border-gray-200 rounded-lg px-3 bg-white text-gray-700">
            <option value="all">All Status</option>
            <option value="generated">Generated</option>
            <option value="reviewed">Reviewed</option>
            <option value="attached_to_draft">Attached to Draft</option>
            <option value="archived">Archived</option>
          </select>
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
            className="h-9 text-xs border border-gray-200 rounded-lg px-3 bg-white text-gray-700">
            <option value="all">All Sources</option>
            {Object.entries(SOURCE_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-5">
          {/* List */}
          <div className={`flex-1 min-w-0 space-y-2 ${selected ? 'hidden xl:block xl:max-w-[52%]' : ''}`}>
            {isLoading ? (
              [...Array(5)].map((_, i) => <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-xl" />)
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50">
                <FlaskConical className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-400">No research packets found</p>
                <p className="text-xs text-gray-400 mt-1">Generate packets from Recommendations, Narrative Arcs, or Trend Clusters</p>
              </div>
            ) : (
              filtered.map(packet => (
                <button key={packet.id}
                  onClick={() => setSelected(packet)}
                  className={`w-full text-left p-4 rounded-xl border transition-all hover:shadow-sm ${
                    selected?.id === packet.id
                      ? 'border-gray-900 bg-gray-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`px-2 py-0.5 text-xs rounded capitalize ${SOURCE_COLORS[packet.source_type] ?? 'bg-gray-100 text-gray-600'}`}>
                        {SOURCE_TYPE_LABELS[packet.source_type] ?? packet.source_type}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded capitalize ${STATUS_COLORS[packet.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {packet.status?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {packet.generated_at && (
                      <span className="text-[11px] text-gray-400 shrink-0">
                        {formatDistanceToNow(new Date(packet.generated_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 leading-snug mb-1">{packet.title}</p>
                  {packet.source_title && packet.source_title !== packet.title && (
                    <p className="text-xs text-gray-400 mb-1">Source: {packet.source_title}</p>
                  )}
                  {packet.summary && (
                    <p className="text-xs text-gray-500 line-clamp-2">{packet.summary}</p>
                  )}
                  {packet.assigned_to && (
                    <p className="text-xs text-indigo-500 mt-1.5">→ {packet.assigned_to}</p>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Detail */}
          {selected && (
            <div className="flex-1 min-w-0 xl:max-w-[48%]">
              <ResearchPacketDetail
                packet={selected}
                onClose={() => setSelected(null)}
                onUpdated={() => {
                  invalidate();
                  setSelected(null);
                }}
              />
            </div>
          )}
        </div>
      </ManagementShell>
    </ManagementLayout>
  );
}