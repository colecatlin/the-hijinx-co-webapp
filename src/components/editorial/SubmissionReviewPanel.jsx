// Enhanced submission review panel for management editorial tools.
// Supports filtering by source, type, trust level, editorial_status,
// convert-to-draft, and writer trust management.

import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search, Check, X, Eye, RefreshCw, FileText, Zap,
  ChevronDown, ExternalLink, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import {
  EDITORIAL_STATUS_COLORS, EDITORIAL_STATUS_LABELS,
  EDITORIAL_PRIORITY_COLORS,
  SUBMISSION_SOURCE_LABELS, SUBMISSION_TYPE_LABELS,
  canPublishDirect, buildStoryFromSubmission,
  logSubmissionEvent, WRITER_TRUST_LEVELS,
} from '@/components/editorial/editorialBridge';

const ALL_FILTERS = 'all';

export default function SubmissionReviewPanel({ currentUser }) {
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState(ALL_FILTERS);
  const [filterType, setFilterType] = useState(ALL_FILTERS);
  const [filterEditorialStatus, setFilterEditorialStatus] = useState(ALL_FILTERS);
  const [selectedSub, setSelectedSub] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [subCategory, setSubCategory] = useState('Fan Experience');

  const queryClient = useQueryClient();

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['allStorySubmissions'],
    queryFn: () => base44.entities.StorySubmission.list('-created_date', 200),
  });

  // Fetch media profiles for submitters in view
  const profileIds = [...new Set(submissions.map(s => s.submitter_profile_id).filter(Boolean))];
  const { data: profileMap } = useQuery({
    queryKey: ['submitterProfiles', profileIds.join(',')],
    queryFn: async () => {
      if (!profileIds.length) return {};
      const all = await base44.entities.MediaProfile.list('-created_date', 500);
      return Object.fromEntries(all.filter(p => profileIds.includes(p.id)).map(p => [p.id, p]));
    },
    enabled: profileIds.length > 0,
  });

  // ── Filtered list ──
  const filtered = submissions.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.title?.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q);
    const matchSource = filterSource === ALL_FILTERS || s.submission_source === filterSource || (!s.submission_source && filterSource === 'profile');
    const matchType   = filterType === ALL_FILTERS || s.submission_type === filterType || (!s.submission_type && filterType === 'full_story');
    const matchStatus = filterEditorialStatus === ALL_FILTERS || s.editorial_status === filterEditorialStatus || (!s.editorial_status && filterEditorialStatus === 'pending_review');
    return matchSearch && matchSource && matchType && matchStatus;
  });

  const pendingCount = submissions.filter(s => !s.editorial_status || s.editorial_status === 'pending_review').length;

  // ── Review mutations ──
  const reviewMutation = useMutation({
    mutationFn: async ({ id, editorial_status, notes, outletStory }) => {
      const update = { editorial_status, reviewed_by: currentUser?.email, reviewed_at: new Date().toISOString() };
      if (notes) update.review_notes = notes;
      // Sync legacy status field
      if (editorial_status === 'approved' || editorial_status === 'converted_to_draft') update.status = 'accepted';
      if (editorial_status === 'rejected') update.status = 'declined';
      if (editorial_status === 'needs_revision') update.status = 'reviewing';
      await base44.entities.StorySubmission.update(id, update);

      if (outletStory) {
        const story = await base44.entities.OutletStory.create(outletStory);
        await base44.entities.StorySubmission.update(id, {
          editorial_status: 'converted_to_draft',
          converted_draft_story_id: story.id,
          status: 'accepted',
        });
        await logSubmissionEvent('story_submission_converted_to_draft', {
          submissionId: id, outletStoryId: story.id,
          actedByUserId: currentUser?.id,
          previousStatus: selectedSub?.editorial_status,
          newStatus: 'converted_to_draft',
        });
        return { submission: update, story };
      }

      await logSubmissionEvent(`story_submission_${editorial_status}`, {
        submissionId: id, actedByUserId: currentUser?.id,
        previousStatus: selectedSub?.editorial_status, newStatus: editorial_status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allStorySubmissions'] });
      setSelectedSub(null);
      setReviewNotes('');
      toast.success('Submission updated');
    },
    onError: (err) => toast.error(err.message),
  });

  const openReview = (sub) => {
    setSelectedSub(sub);
    setReviewNotes(sub.review_notes || '');
    setSubCategory('Fan Experience');
  };

  const profile = selectedSub?.submitter_profile_id ? profileMap?.[selectedSub.submitter_profile_id] : null;
  const submitterCanPublishDirect = profile ? canPublishDirect(profile) : false;
  const trustInfo = WRITER_TRUST_LEVELS[profile?.writer_trust_level || 'none'];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">Story Submissions</h2>
          <p className="text-gray-500 text-sm">{pendingCount} pending review</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 text-sm"
          />
        </div>
        <Select value={filterEditorialStatus} onValueChange={setFilterEditorialStatus}>
          <SelectTrigger className="w-40 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTERS}>All Statuses</SelectItem>
            {Object.entries(EDITORIAL_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-40 text-xs"><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTERS}>All Sources</SelectItem>
            {Object.entries(SUBMISSION_SOURCE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTERS}>All Types</SelectItem>
            {Object.entries(SUBMISSION_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500">No submissions found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Title</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Submitter</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">Source / Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden lg:table-cell">Priority</th>
                <th className="w-16 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(sub => {
                const editorialStatus = sub.editorial_status || 'pending_review';
                const subProfile = sub.submitter_profile_id ? profileMap?.[sub.submitter_profile_id] : null;
                const isPending = editorialStatus === 'pending_review';
                return (
                  <tr key={sub.id} className={`border-b border-gray-100 hover:bg-gray-50 ${isPending ? '' : 'opacity-80'}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium truncate max-w-[200px]">{sub.title}</p>
                      {sub.category && <p className="text-xs text-gray-400">{sub.category}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <p className="text-xs">{sub.name}</p>
                      <p className="text-xs text-gray-400">{sub.email}</p>
                      {subProfile && (
                        <Badge className={`mt-0.5 text-[10px] ${WRITER_TRUST_LEVELS[subProfile.writer_trust_level || 'none'].color}`}>
                          {WRITER_TRUST_LEVELS[subProfile.writer_trust_level || 'none'].label}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-xs">{SUBMISSION_SOURCE_LABELS[sub.submission_source || 'profile']}</p>
                      <p className="text-xs text-gray-400">{SUBMISSION_TYPE_LABELS[sub.submission_type || 'full_story']}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Badge className={`text-xs ${EDITORIAL_STATUS_COLORS[editorialStatus] || 'bg-gray-100 text-gray-600'}`}>
                        {EDITORIAL_STATUS_LABELS[editorialStatus] || editorialStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <Badge className={`text-xs ${EDITORIAL_PRIORITY_COLORS[sub.editorial_priority || 'medium']}`}>
                        {sub.editorial_priority || 'medium'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" onClick={() => openReview(sub)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Review Dialog */}
      {selectedSub && (
        <Dialog open onOpenChange={() => setSelectedSub(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base">{selectedSub.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              {/* Meta row */}
              <div className="flex flex-wrap gap-2">
                <Badge className={EDITORIAL_STATUS_COLORS[selectedSub.editorial_status || 'pending_review']}>
                  {EDITORIAL_STATUS_LABELS[selectedSub.editorial_status || 'pending_review']}
                </Badge>
                <Badge className="bg-gray-100 text-gray-600">
                  {SUBMISSION_SOURCE_LABELS[selectedSub.submission_source || 'profile']}
                </Badge>
                <Badge className="bg-gray-100 text-gray-600">
                  {SUBMISSION_TYPE_LABELS[selectedSub.submission_type || 'full_story']}
                </Badge>
                {selectedSub.editorial_priority && (
                  <Badge className={EDITORIAL_PRIORITY_COLORS[selectedSub.editorial_priority]}>
                    {selectedSub.editorial_priority}
                  </Badge>
                )}
              </div>

              {/* Submitter */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-semibold text-gray-700 mb-1">Submitter</p>
                <p>{selectedSub.name} · {selectedSub.email}</p>
                {profile && (
                  <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                    <Badge className={WRITER_TRUST_LEVELS[profile.writer_trust_level || 'none'].color + ' text-xs'}>
                      {WRITER_TRUST_LEVELS[profile.writer_trust_level || 'none'].label}
                    </Badge>
                    {submitterCanPublishDirect && (
                      <Badge className="bg-teal-100 text-teal-700 text-xs flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Direct publish eligible
                      </Badge>
                    )}
                    {profile.primary_outlet_name && (
                      <span className="text-xs text-gray-500">{profile.primary_outlet_name}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Content */}
              <div>
                <p className="font-semibold text-gray-700 mb-1">
                  {selectedSub.submission_type === 'tip' ? 'Tip' : 'Pitch / Summary'}
                </p>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedSub.pitch}</p>
              </div>

              {selectedSub.body && (
                <div>
                  <p className="font-semibold text-gray-700 mb-1">Body</p>
                  <div className="max-h-40 overflow-y-auto bg-gray-50 rounded p-3 text-gray-700 text-xs whitespace-pre-wrap">
                    {selectedSub.body}
                  </div>
                </div>
              )}

              {selectedSub.writing_sample_url && (
                <div>
                  <p className="font-semibold text-gray-700 mb-1">Writing Sample</p>
                  <a href={selectedSub.writing_sample_url} target="_blank" rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-xs">{selectedSub.writing_sample_url}</a>
                </div>
              )}

              {/* Review notes */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Review Notes</label>
                <Textarea
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  placeholder="Notes for the submitter (shown on revision requests and rejections)…"
                  rows={3}
                  className="text-sm"
                />
              </div>

              {/* Sub-category for convert-to-draft */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Sub-category (for draft)</label>
                <Select value={subCategory} onValueChange={setSubCategory}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Fan Experience', 'Race Reports', 'Opinion', 'Creator Spotlight', 'Grassroots',
                      'Industry', 'Results', 'Letters', 'Behind The Lens'].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Already converted */}
              {selectedSub.converted_draft_story_id && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800">
                  Draft already created — Story ID: {selectedSub.converted_draft_story_id}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <Button
                  size="sm" variant="outline"
                  className="text-orange-600 border-orange-200 hover:bg-orange-50 gap-1"
                  onClick={() => reviewMutation.mutate({
                    id: selectedSub.id,
                    editorial_status: 'needs_revision',
                    notes: reviewNotes,
                  })}
                  disabled={reviewMutation.isPending}
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Needs Revision
                </Button>
                <Button
                  size="sm" variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50 gap-1"
                  onClick={() => reviewMutation.mutate({
                    id: selectedSub.id,
                    editorial_status: 'rejected',
                    notes: reviewNotes,
                  })}
                  disabled={reviewMutation.isPending}
                >
                  <X className="w-3.5 h-3.5" /> Reject
                </Button>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 gap-1"
                  onClick={() => {
                    if (selectedSub.converted_draft_story_id) {
                      toast.error('Draft already exists for this submission');
                      return;
                    }
                    const story = buildStoryFromSubmission(selectedSub, {
                      mediaProfile: profile,
                      publishDirect: false,
                    });
                    story.sub_category = subCategory;
                    reviewMutation.mutate({
                      id: selectedSub.id,
                      editorial_status: 'converted_to_draft',
                      notes: reviewNotes,
                      outletStory: story,
                    });
                  }}
                  disabled={reviewMutation.isPending || !!selectedSub.converted_draft_story_id}
                >
                  <FileText className="w-3.5 h-3.5" /> Convert to Draft
                </Button>
                {submitterCanPublishDirect && (
                  <Button
                    size="sm"
                    className="bg-teal-600 hover:bg-teal-700 gap-1"
                    onClick={() => {
                      if (selectedSub.converted_draft_story_id) {
                        toast.error('Draft already exists');
                        return;
                      }
                      const story = buildStoryFromSubmission(selectedSub, {
                        mediaProfile: profile,
                        publishDirect: true,
                      });
                      story.sub_category = subCategory;
                      reviewMutation.mutate({
                        id: selectedSub.id,
                        editorial_status: 'published_direct',
                        notes: reviewNotes,
                        outletStory: story,
                      });
                    }}
                    disabled={reviewMutation.isPending}
                  >
                    <Zap className="w-3.5 h-3.5" /> Fast-track Draft
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}