// MediaRequestCreateForm — used by admin and entity reps to create a new MediaRequest

import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  REQUEST_TYPES, REQUESTER_ENTITY_TYPES, logRequestEvent,
} from './requestHelpers';

const EMPTY_DELIVERABLE = { type: '', quantity: 1, required_format: '', notes: '' };

function DeliverableRow({ d, onChange, onRemove }) {
  return (
    <div className="flex gap-2 items-start">
      <Input
        className="flex-1 text-sm"
        placeholder="Type (e.g. photos, article)"
        value={d.type}
        onChange={e => onChange({ ...d, type: e.target.value })}
      />
      <Input
        className="w-16 text-sm"
        type="number"
        min={1}
        value={d.quantity}
        onChange={e => onChange({ ...d, quantity: parseInt(e.target.value) || 1 })}
      />
      <Input
        className="flex-1 text-sm"
        placeholder="Format / notes"
        value={d.notes}
        onChange={e => onChange({ ...d, notes: e.target.value })}
      />
      <Button size="icon" variant="ghost" className="text-gray-400 hover:text-red-500 shrink-0" onClick={onRemove}>
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

export default function MediaRequestCreateForm({ currentUser, onCreated, onCancel, dark = false }) {
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    request_title: '',
    request_type: '',
    request_description: '',
    priority: 'medium',
    requested_by_entity_type: currentUser?.role === 'admin' ? 'admin' : '',
    requested_by_entity_id: '',
    requested_by_entity_name: '',
    target_creator_profile_id: '',
    target_creator_user_id: '',
    target_creator_name: '',
    target_outlet_id: '',
    open_to_applicants: false,
    linked_event_id: '',
    linked_event_name: '',
    linked_series_id: '',
    linked_track_id: '',
    location: '',
    start_date: '',
    end_date: '',
    deadline: '',
    credential_required: false,
    budget_range: '',
    deliverables: [],
    admin_notes: '',
  });

  // Load creators for targeting
  const { data: profiles = [] } = useQuery({
    queryKey: ['mediaProfiles-for-request'],
    queryFn: () => base44.entities.MediaProfile.filter({ profile_status: 'active' }, '-created_date', 200),
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const addDeliverable = () => set('deliverables', [...form.deliverables, { ...EMPTY_DELIVERABLE }]);
  const updateDeliverable = (i, d) => set('deliverables', form.deliverables.map((x, idx) => idx === i ? d : x));
  const removeDeliverable = (i) => set('deliverables', form.deliverables.filter((_, idx) => idx !== i));

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        request_status: form.target_creator_profile_id ? 'sent_to_creator' : 'open',
        requested_by_user_id: currentUser?.id,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
        end_date:   form.end_date   ? new Date(form.end_date).toISOString()   : null,
        deadline:   form.deadline   ? new Date(form.deadline).toISOString()   : null,
      };
      // strip empty strings to null
      Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
      const rec = await base44.entities.MediaRequest.create(payload);
      await logRequestEvent('media_request_created', {
        requestId: rec.id,
        targetCreatorProfileId: rec.target_creator_profile_id,
        targetOutletId: rec.target_outlet_id,
        linkedEventId: rec.linked_event_id,
        requestedByEntityType: rec.requested_by_entity_type,
        requestedByEntityId: rec.requested_by_entity_id,
        actedByUserId: currentUser?.id,
        newStatus: rec.request_status,
      });
      if (rec.target_creator_profile_id) {
        await logRequestEvent('media_request_sent_to_creator', {
          requestId: rec.id,
          targetCreatorProfileId: rec.target_creator_profile_id,
          actedByUserId: currentUser?.id,
          previousStatus: 'draft',
          newStatus: 'sent_to_creator',
        });
      }
      return rec;
    },
    onSuccess: (rec) => {
      queryClient.invalidateQueries({ queryKey: ['mediaRequests'] });
      queryClient.invalidateQueries({ queryKey: ['myIncomingRequests'] });
      toast.success('Request created');
      onCreated?.(rec);
    },
    onError: (err) => toast.error(err.message),
  });

  const labelCls = dark ? 'text-gray-400 text-xs mb-1 block' : 'text-gray-600 text-xs mb-1 block font-medium';
  const inputCls = dark ? 'bg-[#232323] border-gray-700 text-white placeholder:text-gray-600 text-sm' : 'text-sm';

  return (
    <div className="space-y-5">
      {/* Title + type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Request Title *</label>
          <Input className={inputCls} placeholder="e.g. Baja 500 Photography Coverage" value={form.request_title}
            onChange={e => set('request_title', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Request Type *</label>
          <Select value={form.request_type} onValueChange={v => set('request_type', v)}>
            <SelectTrigger className={inputCls}><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              {Object.entries(REQUEST_TYPES).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className={labelCls}>Description</label>
        <Textarea className={inputCls} rows={3} placeholder="Describe the work needed…"
          value={form.request_description} onChange={e => set('request_description', e.target.value)} />
      </div>

      {/* Priority + Entity Type */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Priority</label>
          <Select value={form.priority} onValueChange={v => set('priority', v)}>
            <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
            <SelectContent>
              {['low', 'medium', 'high', 'urgent'].map(p => (
                <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className={labelCls}>Requesting As</label>
          <Select value={form.requested_by_entity_type} onValueChange={v => set('requested_by_entity_type', v)}>
            <SelectTrigger className={inputCls}><SelectValue placeholder="Entity type" /></SelectTrigger>
            <SelectContent>
              {REQUESTER_ENTITY_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className={labelCls}>Requesting Entity Name</label>
          <Input className={inputCls} placeholder="e.g. Team Havoc" value={form.requested_by_entity_name}
            onChange={e => set('requested_by_entity_name', e.target.value)} />
        </div>
      </div>

      {/* Creator targeting */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={labelCls + ' !mb-0'}>Target Creator (optional — leave blank for open request)</label>
        </div>
        <Select value={form.target_creator_profile_id || '__open__'} onValueChange={v => {
          if (v === '__open__') {
            set('target_creator_profile_id', '');
            set('target_creator_user_id', '');
            set('target_creator_name', '');
          } else {
            const p = profiles.find(x => x.id === v);
            set('target_creator_profile_id', v);
            set('target_creator_user_id', p?.user_id || '');
            set('target_creator_name', p?.display_name || '');
          }
        }}>
          <SelectTrigger className={inputCls}><SelectValue placeholder="Leave open or select creator" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__open__">Open Request (any eligible creator)</SelectItem>
            {profiles.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.display_name} {p.credentialed_media ? '✓' : ''} — {p.availability_status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Open to applicants toggle */}
      {!form.target_creator_profile_id && (
        <div className="flex items-center gap-3">
          <Switch checked={form.open_to_applicants} onCheckedChange={v => set('open_to_applicants', v)} />
          <span className={dark ? 'text-gray-300 text-sm' : 'text-gray-700 text-sm'}>
            Visible to eligible creators in MediaPortal
          </span>
        </div>
      )}

      {/* Linked event */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Linked Event Name (optional)</label>
          <Input className={inputCls} placeholder="Event name" value={form.linked_event_name}
            onChange={e => set('linked_event_name', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Location</label>
          <Input className={inputCls} placeholder="City, State" value={form.location}
            onChange={e => set('location', e.target.value)} />
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Start Date</label>
          <Input className={inputCls} type="date" value={form.start_date}
            onChange={e => set('start_date', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>End Date</label>
          <Input className={inputCls} type="date" value={form.end_date}
            onChange={e => set('end_date', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Response Deadline</label>
          <Input className={inputCls} type="date" value={form.deadline}
            onChange={e => set('deadline', e.target.value)} />
        </div>
      </div>

      {/* Credential required */}
      <div className="flex items-center gap-3">
        <Switch checked={form.credential_required} onCheckedChange={v => set('credential_required', v)} />
        <span className={dark ? 'text-gray-300 text-sm' : 'text-gray-700 text-sm'}>
          Requires valid media credential for this event/series
        </span>
      </div>

      {/* Deliverables */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={labelCls + ' !mb-0'}>Deliverables</label>
          <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={addDeliverable}>
            <Plus className="w-3 h-3" /> Add
          </Button>
        </div>
        {form.deliverables.length === 0 && (
          <p className={dark ? 'text-gray-600 text-xs' : 'text-gray-400 text-xs'}>No deliverables added.</p>
        )}
        <div className="space-y-2">
          {form.deliverables.map((d, i) => (
            <DeliverableRow key={i} d={d} onChange={v => updateDeliverable(i, v)} onRemove={() => removeDeliverable(i)} />
          ))}
        </div>
      </div>

      {/* Admin notes */}
      <div>
        <label className={labelCls}>Internal Notes</label>
        <Textarea className={inputCls} rows={2} placeholder="Admin/editorial notes (not shown to creator)"
          value={form.admin_notes} onChange={e => set('admin_notes', e.target.value)} />
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-2">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} className={dark ? 'text-gray-400' : ''}>Cancel</Button>
        )}
        <Button
          disabled={!form.request_title || !form.request_type || mutation.isPending}
          onClick={() => mutation.mutate()}
          className={dark ? 'bg-white text-black hover:bg-gray-100' : 'bg-[#232323] hover:bg-[#1A3249] text-white'}
        >
          {mutation.isPending ? 'Creating…' : 'Create Request'}
        </Button>
      </div>
    </div>
  );
}