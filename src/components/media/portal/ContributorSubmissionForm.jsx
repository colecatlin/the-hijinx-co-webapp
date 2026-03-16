// Contributor submission form — used inside MediaPortal (mediaportal source)
// Supports tip, pitch, and full_story types for approved contributors.

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2, X, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { canPublishDirect, logSubmissionEvent, WRITER_TRUST_LEVELS } from '@/components/editorial/editorialBridge';

export default function ContributorSubmissionForm({ currentUser, mediaProfile, mediaOutlet, onSuccess }) {
  const [formData, setFormData] = useState({
    submission_type: 'pitch',
    title: '',
    pitch: '',
    body: '',
    category: 'Racing',
    editorial_priority: 'medium',
  });

  const queryClient = useQueryClient();
  const directPublishEligible = canPublishDirect(mediaProfile);
  const trustInfo = WRITER_TRUST_LEVELS[mediaProfile?.writer_trust_level || 'none'];

  const submitMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        name: mediaProfile?.display_name || currentUser?.full_name || currentUser?.email,
        email: currentUser?.email,
        submission_source: 'mediaportal',
        submitter_user_id: currentUser?.id,
        submitter_profile_id: mediaProfile?.id || null,
        submitter_outlet_id: mediaOutlet?.id || null,
        submitter_media_roles: mediaProfile?.role_tags || [],
        editorial_status: 'pending_review',
        // Legacy status for backward compat
        status: 'pending',
      };
      const submission = await base44.entities.StorySubmission.create(payload);
      await logSubmissionEvent('story_submission_created', {
        submissionId: submission.id,
        submitterUserId: currentUser?.id,
        mediaProfileId: mediaProfile?.id,
        mediaOutletId: mediaOutlet?.id,
        actedByUserId: currentUser?.id,
        newStatus: 'pending_review',
      });
      return submission;
    },
    onSuccess: (sub) => {
      queryClient.invalidateQueries({ queryKey: ['myContributorSubmissions'] });
      queryClient.invalidateQueries({ queryKey: ['myStorySubmissions'] });
      toast.success(
        formData.submission_type === 'tip'
          ? 'Tip submitted — editorial team notified.'
          : directPublishEligible
          ? 'Story submitted — eligible for direct publish.'
          : 'Story submitted for editorial review.'
      );
      setFormData({ submission_type: 'pitch', title: '', pitch: '', body: '', category: 'Racing', editorial_priority: 'medium' });
      onSuccess?.(sub);
    },
    onError: (err) => toast.error(`Submission failed: ${err.message}`),
  });

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) { toast.error('Title is required'); return; }
    if (!formData.pitch.trim()) { toast.error('Summary / pitch is required'); return; }
    submitMutation.mutate(formData);
  };

  return (
    <div className="bg-[#171717] border border-gray-800 rounded-xl p-5 space-y-5">
      {/* Trust level indicator */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-white font-semibold text-sm">New Submission</p>
          <p className="text-gray-500 text-xs mt-0.5">Submitting as contributor via MediaPortal</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={trustInfo.color + ' text-xs'}>{trustInfo.label}</Badge>
          {directPublishEligible && (
            <Badge className="bg-teal-900/40 text-teal-300 text-xs flex items-center gap-1">
              <Zap className="w-3 h-3" /> Direct Publish Eligible
            </Badge>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type + Priority */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Type *</label>
            <Select value={formData.submission_type} onValueChange={v => set('submission_type', v)}>
              <SelectTrigger className="bg-[#0A0A0A] border-gray-700 text-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tip">Tip</SelectItem>
                <SelectItem value="pitch">Pitch</SelectItem>
                <SelectItem value="full_story">Full Story</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Priority</label>
            <Select value={formData.editorial_priority} onValueChange={v => set('editorial_priority', v)}>
              <SelectTrigger className="bg-[#0A0A0A] border-gray-700 text-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Title *</label>
          <Input
            value={formData.title}
            onChange={e => set('title', e.target.value)}
            placeholder="Story headline or tip headline"
            className="bg-[#0A0A0A] border-gray-700 text-white placeholder:text-gray-600"
            required
          />
        </div>

        {/* Category */}
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Category</label>
          <Select value={formData.category} onValueChange={v => set('category', v)}>
            <SelectTrigger className="bg-[#0A0A0A] border-gray-700 text-white text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['Racing', 'Culture', 'Business', 'Gear', 'Travel', 'Opinion', 'Media'].map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Pitch / Summary */}
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">
            {formData.submission_type === 'tip' ? 'Tip Details *' : 'Pitch / Summary *'}
          </label>
          <Textarea
            value={formData.pitch}
            onChange={e => set('pitch', e.target.value)}
            placeholder={
              formData.submission_type === 'tip'
                ? 'What\'s the tip? Be specific about what you saw or know.'
                : 'Describe the story angle, why it matters, and who the audience is.'
            }
            rows={4}
            className="bg-[#0A0A0A] border-gray-700 text-white placeholder:text-gray-600 resize-none"
            required
          />
        </div>

        {/* Body (full story only) */}
        {formData.submission_type === 'full_story' && (
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Story Body</label>
            <Textarea
              value={formData.body}
              onChange={e => set('body', e.target.value)}
              placeholder="Full story text. Markdown supported."
              rows={10}
              className="bg-[#0A0A0A] border-gray-700 text-white placeholder:text-gray-600 resize-none font-mono text-sm"
            />
          </div>
        )}

        {/* Direct publish notice */}
        {directPublishEligible && formData.submission_type === 'full_story' && (
          <div className="bg-teal-900/10 border border-teal-900/40 rounded-lg p-3">
            <p className="text-teal-300 text-xs font-medium flex items-center gap-1.5">
              <Zap className="w-3 h-3" />
              As a verified writer, your full story submission is eligible for fast-track review and direct publish.
            </p>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={submitMutation.isPending}
            className="bg-white text-black hover:bg-gray-100 font-semibold text-sm gap-2"
          >
            {submitMutation.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
              : submitMutation.isSuccess
              ? <><CheckCircle2 className="w-4 h-4" /> Submitted</>
              : formData.submission_type === 'tip' ? 'Submit Tip'
              : formData.submission_type === 'pitch' ? 'Submit Pitch'
              : 'Submit Story'
            }
          </Button>
        </div>
      </form>
    </div>
  );
}