// AssignmentCreateForm — admin/editor form to create a MediaAssignment

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  ASSIGNMENT_TYPES, ASSIGNMENT_STATUSES, logAssignmentEvent,
} from './assignmentHelpers';

const DELIVERABLE_TYPES = [
  'Photo selection', 'Edited photos', 'Video footage', 'Edited video',
  'Article draft', 'Interview transcript', 'Social media selects',
  'Event recap', 'Research notes', 'Custom',
];

export default function AssignmentCreateForm({ currentUser, onSuccess, prefill = {} }) {
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    assignment_title: prefill.title || '',
    assignment_type: prefill.assignment_type || 'story',
    priority: 'medium',
    due_date: '',
    assignment_notes: '',
    deliverable_notes: '',
    editor_notes: '',
    credential_required: false,
    linked_recommendation_id: prefill.linked_recommendation_id || '',
    linked_research_packet_id: prefill.linked_research_packet_id || '',
    linked_story_submission_id: prefill.linked_story_submission_id || '',
    linked_story_id: prefill.linked_story_id || '',
    linked_event_id: prefill.linked_event_id || '',
    assigned_to_profile_id: '',
    deliverables: [],
  });

  const [deliverableInput, setDeliverableInput] = useState({ type: 'Article draft', quantity: 1, due_at: '', required_format: '', notes: '' });

  const { data: profiles = [] } = useQuery({
    queryKey: ['mediaProfilesForAssignment'],
    queryFn: () => base44.entities.MediaProfile.list('-created_date', 200),
  });

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const addDeliverable = () => {
    if (!deliverableInput.type) return;
    set('deliverables', [...form.deliverables, { ...deliverableInput }]);
    setDeliverableInput({ type: 'Article draft', quantity: 1, due_at: '', required_format: '', notes: '' });
  };

  const removeDeliverable = (i) => {
    set('deliverables', form.deliverables.filter((_, idx) => idx !== i));
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.assignment_title.trim()) throw new Error('Assignment title is required');
      if (!form.assigned_to_profile_id) throw new Error('Please select a contributor');

      const profile = profiles.find(p => p.id === form.assigned_to_profile_id);
      const payload = {
        ...form,
        assigned_to_user_id: profile?.user_id || null,
        assigned_by_user_id: currentUser?.id,
        status: 'assigned',
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        // Clean empty string optionals
        linked_recommendation_id: form.linked_recommendation_id || null,
        linked_research_packet_id: form.linked_research_packet_id || null,
        linked_story_submission_id: form.linked_story_submission_id || null,
        linked_story_id: form.linked_story_id || null,
        linked_event_id: form.linked_event_id || null,
        linked_series_id: null,
        linked_track_id: null,
      };

      const assignment = await base44.entities.MediaAssignment.create(payload);

      await logAssignmentEvent('media_assignment_assigned', {
        assignmentId: assignment.id,
        assignedToUserId: profile?.user_id,
        assignedToProfileId: form.assigned_to_profile_id,
        actedByUserId: currentUser?.id,
        newStatus: 'assigned',
      });

      return assignment;
    },
    onSuccess: (assignment) => {
      queryClient.invalidateQueries({ queryKey: ['mediaAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['myAssignments'] });
      toast.success('Assignment created and sent to contributor');
      onSuccess?.(assignment);
    },
    onError: (err) => toast.error(err.message),
  });

  const credentialGated = ASSIGNMENT_TYPES[form.assignment_type]?.credentialGated;

  return (
    <div className="space-y-5 bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-bold text-gray-900">Create Assignment</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Title */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Assignment Title *</label>
          <Input value={form.assignment_title} onChange={e => set('assignment_title', e.target.value)}
            placeholder="e.g., Cover the NORRA 1000 — photos + recap" />
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Type *</label>
          <Select value={form.assignment_type} onValueChange={v => {
            set('assignment_type', v);
            if (ASSIGNMENT_TYPES[v]?.credentialGated) set('credential_required', true);
          }}>
            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(ASSIGNMENT_TYPES).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Priority</label>
          <Select value={form.priority} onValueChange={v => set('priority', v)}>
            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['low', 'medium', 'high', 'urgent'].map(p => (
                <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Contributor */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Assign To *</label>
          <Select value={form.assigned_to_profile_id} onValueChange={v => set('assigned_to_profile_id', v)}>
            <SelectTrigger className="text-sm"><SelectValue placeholder="Select contributor…" /></SelectTrigger>
            <SelectContent>
              {profiles.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.display_name || 'Unnamed'}{p.primary_outlet_name ? ` — ${p.primary_outlet_name}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Due date */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Due Date</label>
          <Input type="datetime-local" value={form.due_date} onChange={e => set('due_date', e.target.value)} className="text-sm" />
        </div>

        {/* Credential required */}
        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 mt-0.5">
          <div>
            <p className="text-sm font-medium text-gray-700">Credential Required</p>
            <p className="text-xs text-gray-500">{credentialGated ? 'Auto-enabled for this type' : 'Force credential gate'}</p>
          </div>
          <Switch
            checked={form.credential_required}
            onCheckedChange={v => set('credential_required', v)}
          />
        </div>
      </div>

      {/* Assignment notes */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Briefing / Assignment Notes</label>
        <Textarea value={form.assignment_notes} onChange={e => set('assignment_notes', e.target.value)}
          placeholder="Tell the contributor what you need and why…" rows={3} className="text-sm" />
      </div>

      {/* Editor notes */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Editor Notes (visible to contributor)</label>
        <Textarea value={form.editor_notes} onChange={e => set('editor_notes', e.target.value)}
          placeholder="Tips, contacts, access codes, context…" rows={2} className="text-sm" />
      </div>

      {/* Deliverables */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">Deliverables</label>
        {form.deliverables.length > 0 && (
          <ul className="space-y-1.5 mb-3">
            {form.deliverables.map((d, i) => (
              <li key={i} className="flex items-center gap-2 bg-gray-50 rounded px-3 py-2 text-sm">
                <span className="flex-1 text-gray-700">{d.quantity > 1 ? `${d.quantity}x ` : ''}{d.type}{d.required_format ? ` (${d.required_format})` : ''}{d.due_at ? ` — ${new Date(d.due_at).toLocaleDateString()}` : ''}</span>
                <button onClick={() => removeDeliverable(i)} className="text-gray-400 hover:text-red-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Select value={deliverableInput.type} onValueChange={v => setDeliverableInput(p => ({ ...p, type: v }))}>
            <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DELIVERABLE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="number" min={1} value={deliverableInput.quantity}
            onChange={e => setDeliverableInput(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
            placeholder="Qty" className="text-xs h-8" />
          <Input type="datetime-local" value={deliverableInput.due_at}
            onChange={e => setDeliverableInput(p => ({ ...p, due_at: e.target.value }))}
            className="text-xs h-8" />
          <Input value={deliverableInput.required_format}
            onChange={e => setDeliverableInput(p => ({ ...p, required_format: e.target.value }))}
            placeholder="Format (e.g. JPEG)" className="text-xs h-8" />
        </div>
        <Button size="sm" variant="outline" className="mt-2 gap-1 text-xs" onClick={addDeliverable}>
          <Plus className="w-3 h-3" /> Add Deliverable
        </Button>
      </div>

      {/* Optional link IDs */}
      <details className="text-sm">
        <summary className="cursor-pointer text-gray-500 text-xs font-medium mb-2">Link to Source Objects (optional)</summary>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          {[
            ['linked_event_id', 'Event ID'],
            ['linked_story_id', 'OutletStory ID'],
            ['linked_recommendation_id', 'Recommendation ID'],
            ['linked_research_packet_id', 'Research Packet ID'],
            ['linked_story_submission_id', 'Story Submission ID'],
          ].map(([field, label]) => (
            <div key={field}>
              <label className="block text-xs text-gray-500 mb-1">{label}</label>
              <Input value={form[field]} onChange={e => set(field, e.target.value)}
                placeholder="Paste ID…" className="text-xs h-8" />
            </div>
          ))}
        </div>
      </details>

      <div className="flex justify-end pt-2 border-t">
        <Button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="bg-[#232323] hover:bg-[#1A3249] gap-2"
        >
          {createMutation.isPending
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
            : <><CheckCircle2 className="w-4 h-4" /> Create Assignment</>
          }
        </Button>
      </div>
    </div>
  );
}