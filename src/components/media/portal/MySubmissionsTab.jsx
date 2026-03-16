import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Plus, ArrowRight, Loader2, Zap, ChevronDown, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import ContributorSubmissionForm from './ContributorSubmissionForm';
import {
  EDITORIAL_STATUS_COLORS,
  EDITORIAL_STATUS_LABELS,
  SUBMISSION_TYPE_LABELS,
  canPublishDirect,
  WRITER_TRUST_LEVELS,
} from '@/components/editorial/editorialBridge';

const LEGACY_STATUS_COLORS = {
  pending:   'bg-amber-900/60 text-amber-300',
  reviewing: 'bg-blue-900/60 text-blue-300',
  accepted:  'bg-green-900/60 text-green-300',
  declined:  'bg-red-900/60 text-red-300',
};

function SubmissionCard({ sub }) {
  const [expanded, setExpanded] = useState(false);
  const editorialStatus = sub.editorial_status;
  const statusClass = editorialStatus
    ? EDITORIAL_STATUS_COLORS[editorialStatus]
    : LEGACY_STATUS_COLORS[sub.status] || 'bg-gray-700 text-gray-300';
  const statusLabel = editorialStatus
    ? EDITORIAL_STATUS_LABELS[editorialStatus]
    : sub.status;

  return (
    <div className="bg-[#171717] border border-gray-800 rounded-xl overflow-hidden">
      <button
        className="w-full text-left p-4 flex items-start justify-between gap-3 hover:bg-[#1a1a1a] transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {sub.submission_type && (
              <span className="text-gray-500 text-xs uppercase tracking-wide">
                {SUBMISSION_TYPE_LABELS[sub.submission_type] || sub.submission_type}
              </span>
            )}
            {sub.submission_source === 'mediaportal' && (
              <span className="text-gray-600 text-xs">· MediaPortal</span>
            )}
          </div>
          <p className="text-white text-sm font-medium truncate">{sub.title}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {sub.category && <span className="text-gray-500 text-xs">{sub.category}</span>}
            {sub.created_date && (
              <span className="text-gray-600 text-xs">{new Date(sub.created_date).toLocaleDateString()}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={statusClass + ' text-xs'}>{statusLabel}</Badge>
          <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-800 p-4 space-y-3">
          {sub.pitch && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Summary</p>
              <p className="text-gray-300 text-sm">{sub.pitch}</p>
            </div>
          )}
          {/* Review notes from editorial */}
          {sub.review_notes && (
            <div className="bg-amber-900/10 border border-amber-900/30 rounded p-3">
              <p className="text-amber-300 text-xs font-medium mb-1">Editorial Notes</p>
              <p className="text-amber-200 text-xs whitespace-pre-wrap">{sub.review_notes}</p>
            </div>
          )}
          {/* Decline reason (legacy) */}
          {sub.decline_reason && sub.status === 'declined' && (
            <div className="bg-red-900/10 border border-red-900/30 rounded p-2">
              <p className="text-red-300 text-xs">{sub.decline_reason}</p>
            </div>
          )}
          {/* Link to created draft */}
          {sub.converted_draft_story_id && (
            <div className="bg-blue-900/10 border border-blue-900/30 rounded p-3 flex items-center justify-between gap-2">
              <p className="text-blue-300 text-xs font-medium">Draft story created from this submission</p>
              <Link to={`/management/editorial/writer-workspace`}>
                <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300 gap-1 text-xs h-7">
                  Open <ExternalLink className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          )}
          {sub.editorial_status === 'published_direct' && (
            <div className="bg-teal-900/10 border border-teal-900/30 rounded p-2">
              <p className="text-teal-300 text-xs flex items-center gap-1.5">
                <Zap className="w-3 h-3" /> Published directly as verified writer
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MySubmissionsTab({ currentUser, isContributor, hasMediaRole, mediaProfile, mediaOutlet }) {
  const [showForm, setShowForm] = useState(false);
  const directPublishEligible = canPublishDirect(mediaProfile);
  const trustInfo = WRITER_TRUST_LEVELS[mediaProfile?.writer_trust_level || 'none'];

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['myContributorSubmissions', currentUser?.id, currentUser?.email],
    queryFn: async () => {
      // Fetch by user_id (new) and email (legacy) and merge
      const [byUserId, byEmail] = await Promise.all([
        currentUser?.id
          ? base44.entities.StorySubmission.filter({ submitter_user_id: currentUser.id }, '-created_date', 50)
          : Promise.resolve([]),
        currentUser?.email
          ? base44.entities.StorySubmission.filter({ email: currentUser.email }, '-created_date', 50)
          : Promise.resolve([]),
      ]);
      const seen = new Set();
      return [...byUserId, ...byEmail].filter(s => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      }).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!(currentUser?.id || currentUser?.email),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-white font-bold text-lg">My Submissions</h2>
          <p className="text-gray-500 text-sm">{submissions.length} submission{submissions.length !== 1 ? 's' : ''}</p>
        </div>
        {isContributor && (
          <Button
            size="sm"
            onClick={() => setShowForm(s => !s)}
            className="bg-white text-black hover:bg-gray-100 gap-1.5 text-xs"
          >
            <Plus className="w-3 h-3" /> {showForm ? 'Cancel' : 'New Submission'}
          </Button>
        )}
        {!isContributor && (
          <Link to={createPageUrl('OutletSubmit')}>
            <Button size="sm" variant="outline" className="border-gray-700 text-gray-300 gap-1.5 text-xs">
              <Plus className="w-3 h-3" /> Submit Story
            </Button>
          </Link>
        )}
      </div>

      {/* Verified writer notice */}
      {isContributor && directPublishEligible && (
        <div className="bg-teal-900/10 border border-teal-900/40 rounded-xl p-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-teal-400 shrink-0" />
          <p className="text-teal-300 text-xs">
            You are a <strong>{trustInfo.label}</strong> — full story submissions are eligible for direct publish without editorial review.
          </p>
        </div>
      )}

      {/* Contributor submission form */}
      {isContributor && showForm && (
        <ContributorSubmissionForm
          currentUser={currentUser}
          mediaProfile={mediaProfile}
          mediaOutlet={mediaOutlet}
          onSuccess={() => setShowForm(false)}
        />
      )}

      {/* Writer workspace link */}
      {isContributor && (hasMediaRole?.('writer') || hasMediaRole?.('editor')) && (
        <div className="bg-blue-900/10 border border-blue-900/40 rounded-xl p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-blue-300 font-semibold text-sm">Writer Workspace</p>
            <p className="text-gray-400 text-xs mt-0.5">View assigned stories and drafts in the editorial workspace.</p>
          </div>
          <Link to="/management/editorial/writer-workspace">
            <Button size="sm" variant="outline" className="border-blue-800 text-blue-300 hover:bg-blue-900/20 gap-1.5 text-xs shrink-0">
              Open <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-gray-600 animate-spin" /></div>
      ) : submissions.length === 0 ? (
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="py-12 text-center">
            <FileText className="w-8 h-8 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No submissions yet.</p>
            <p className="text-gray-600 text-xs mt-1">
              {isContributor
                ? 'Use the New Submission button to submit a tip, pitch, or full story.'
                : 'Submit a story pitch or tip from the Outlet submission form.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {submissions.map(sub => (
            <SubmissionCard key={sub.id} sub={sub} />
          ))}
        </div>
      )}
    </div>
  );
}