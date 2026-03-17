import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ShieldOff, Search, X, PenLine, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import WriterStatsBar from '@/components/editorial/writer/WriterStatsBar';
import AssignedRecommendations from '@/components/editorial/writer/AssignedRecommendations';
import AssignedPackets from '@/components/editorial/writer/AssignedPackets';
import DraftsInProgress from '@/components/editorial/writer/DraftsInProgress';
import SavedForLater from '@/components/editorial/writer/SavedForLater';
import RecentEditorialUpdates from '@/components/editorial/writer/RecentEditorialUpdates';
import WriterAssignmentsPanel from '@/components/editorial/writer/WriterAssignmentsPanel.jsx';

const PAGE = 'management/editorial/writer-workspace';
const ALLOWED_ROLES = ['admin'];

export default function WriterWorkspace() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('assigned');

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: recommendations = [], isLoading: recsLoading } = useQuery({
    queryKey: ['writer-recs', user?.email],
    queryFn: () => base44.entities.StoryRecommendation.list('-updated_date', 200),
    enabled: !!user,
  });

  const { data: packets = [], isLoading: packetsLoading } = useQuery({
    queryKey: ['writer-packets', user?.email],
    queryFn: () => base44.entities.StoryResearchPacket.list('-generated_at', 200),
    enabled: !!user,
  });

  const { data: drafts = [], isLoading: draftsLoading } = useQuery({
    queryKey: ['writer-drafts', user?.email],
    queryFn: () => base44.entities.OutletStory.list('-updated_date', 100),
    enabled: !!user,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['writer-recs'] });
    queryClient.invalidateQueries({ queryKey: ['writer-packets'] });
    queryClient.invalidateQueries({ queryKey: ['writer-drafts'] });
  };

  if (userLoading) return null;
  if (!user) { base44.auth.redirectToLogin('/' + PAGE); return null; }
  if (!ALLOWED_ROLES.includes(user.role)) {
    return (
      <ManagementLayout currentPage={PAGE}>
        <ManagementShell title="Writer Workspace">
          <div className="py-24 flex flex-col items-center gap-4 text-center">
            <ShieldOff className="w-10 h-10 text-gray-300" />
            <p className="text-gray-500 text-sm">Restricted to editorial staff.</p>
            <Button size="sm" onClick={() => navigate('/Management')}>Back to Management</Button>
          </div>
        </ManagementShell>
      </ManagementLayout>
    );
  }

  const me = user.email;

  // Filter by assignment to current user
  const myRecs = recommendations.filter(r =>
    r.assigned_to === me &&
    ['approved', 'saved', 'drafted', 'in_progress', 'ready_for_review'].includes(r.status)
  );
  const myPackets = packets.filter(p =>
    p.assigned_to === me &&
    ['generated', 'reviewed', 'attached_to_draft'].includes(p.status)
  );
  const myDrafts = drafts.filter(d =>
    d.author === me || d.assigned_to === me
  );
  const savedRecs = recommendations.filter(r => r.assigned_to === me && r.status === 'saved');

  const q = search.toLowerCase();
  const filterRec = (r) => !q ||
    r.title_suggestion?.toLowerCase().includes(q) ||
    r.related_entity_names?.some(n => n.toLowerCase().includes(q));
  const filterPacket = (p) => !q ||
    p.title?.toLowerCase().includes(q) ||
    p.source_title?.toLowerCase().includes(q);
  const filterDraft = (d) => !q || d.title?.toLowerCase().includes(q);

  const tabs = [
    { key: 'assignments', label: 'Assignments', count: null },
    { key: 'assigned', label: 'Recommendations', count: myRecs.length },
    { key: 'packets', label: 'Research Packets', count: myPackets.length },
    { key: 'drafts', label: 'Drafts', count: myDrafts.length },
    { key: 'saved', label: 'Saved', count: savedRecs.length },
    { key: 'updates', label: 'Updates', count: null },
  ];

  const isLoading = recsLoading || packetsLoading || draftsLoading;

  return (
    <ManagementLayout currentPage={PAGE}>
      <ManagementShell
        title="Writer Workspace"
        subtitle={`Logged in as ${me}`}
      >
        <WriterStatsBar
          myRecs={myRecs}
          myPackets={myPackets}
          myDrafts={myDrafts}
        />

        {/* Search */}
        <div className="relative my-5 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search assignments, packets, drafts…"
            className="pl-9 h-9 text-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 mb-5">
          {tabs.map(t => (
            <button key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 text-xs font-semibold transition-colors border-b-2 -mb-px ${
                activeTab === t.key
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}>
              {t.label}
              {t.count != null && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === t.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
                }`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-12 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading workspace…
          </div>
        ) : (
          <>
            {activeTab === 'assignments' && (
              <WriterAssignmentsPanel currentUser={user} />
            )}
            {activeTab === 'assigned' && (
              <AssignedRecommendations
                recs={myRecs.filter(filterRec)}
                onUpdated={invalidate}
              />
            )}
            {activeTab === 'packets' && (
              <AssignedPackets
                packets={myPackets.filter(filterPacket)}
                onUpdated={invalidate}
              />
            )}
            {activeTab === 'drafts' && (
              <DraftsInProgress
                drafts={myDrafts.filter(filterDraft)}
                packets={myPackets}
                recs={myRecs}
                onUpdated={invalidate}
              />
            )}
            {activeTab === 'saved' && (
              <SavedForLater
                recs={savedRecs.filter(filterRec)}
                onUpdated={invalidate}
              />
            )}
            {activeTab === 'updates' && (
              <RecentEditorialUpdates userEmail={me} />
            )}
          </>
        )}
      </ManagementShell>
    </ManagementLayout>
  );
}