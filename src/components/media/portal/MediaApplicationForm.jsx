import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { APPLICATION_TYPES } from '@/components/media/mediaPermissions';
import { Loader2, Send } from 'lucide-react';

const AFFILIATION_OPTIONS = [
  { value: 'independent', label: 'Independent' },
  { value: 'outlet', label: 'Media Outlet' },
  { value: 'team_media', label: 'Team Media' },
  { value: 'series_media', label: 'Series Media' },
  { value: 'track_media', label: 'Track / Venue Media' },
];

export default function MediaApplicationForm({ user, onSubmitted }) {
  const [form, setForm] = useState({
    display_name: user?.display_name || user?.full_name || '',
    bio: '',
    application_type: [],
    primary_affiliation_type: 'independent',
    primary_outlet_name: '',
    website_url: '',
    reason_for_applying: '',
    location_city: user?.city || '',
    location_state: user?.state || '',
    location_country: user?.country || '',
    terms_accepted: false,
    usage_rights_accepted: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const toggleAppType = (val) => {
    setForm(f => ({
      ...f,
      application_type: f.application_type.includes(val)
        ? f.application_type.filter(v => v !== val)
        : [...f.application_type, val],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.application_type.length === 0) {
      toast.error('Please select at least one application type.');
      return;
    }
    if (!form.terms_accepted) {
      toast.error('Please accept the terms to continue.');
      return;
    }
    if (!form.reason_for_applying.trim()) {
      toast.error('Please tell us why you are applying.');
      return;
    }

    setSubmitting(true);
    try {
      const application = await base44.entities.MediaApplication.create({
        user_id: user.id,
        user_email: user.email,
        display_name: form.display_name,
        bio: form.bio,
        application_type: form.application_type,
        primary_affiliation_type: form.primary_affiliation_type,
        primary_outlet_name: form.primary_outlet_name,
        website_url: form.website_url,
        reason_for_applying: form.reason_for_applying,
        location_city: form.location_city,
        location_state: form.location_state,
        location_country: form.location_country,
        terms_accepted: form.terms_accepted,
        usage_rights_accepted: form.usage_rights_accepted,
        status: 'pending',
      });

      // Log the submission
      await base44.entities.OperationLog.create({
        operation_type: 'media_application_submitted',
        entity_type: 'MediaApplication',
        entity_id: application.id,
        user_email: user.email,
        status: 'success',
        message: `Media application submitted by ${user.email}`,
        metadata: { user_id: user.id, media_application_id: application.id },
      }).catch(() => {});

      toast.success('Application submitted! We will review it shortly.');
      onSubmitted?.(application);
    } catch (err) {
      toast.error('Failed to submit application. Please try again.');
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Application Types */}
      <div>
        <Label className="text-sm font-semibold text-gray-800 mb-3 block">
          I am applying as a… <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {APPLICATION_TYPES.map(at => (
            <label key={at.value}
              className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors text-sm ${
                form.application_type.includes(at.value)
                  ? 'border-[#232323] bg-gray-50 font-medium'
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
              <Checkbox
                checked={form.application_type.includes(at.value)}
                onCheckedChange={() => toggleAppType(at.value)}
                className="shrink-0"
              />
              {at.label}
            </label>
          ))}
        </div>
      </div>

      {/* Display name & affiliation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium mb-1 block">Display / Professional Name</Label>
          <Input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} placeholder="Your name or byline" />
        </div>
        <div>
          <Label className="text-sm font-medium mb-1 block">Primary Affiliation</Label>
          <Select value={form.primary_affiliation_type} onValueChange={v => setForm(f => ({ ...f, primary_affiliation_type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {AFFILIATION_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Outlet name & website */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium mb-1 block">Outlet / Organization Name</Label>
          <Input value={form.primary_outlet_name} onChange={e => setForm(f => ({ ...f, primary_outlet_name: e.target.value }))} placeholder="e.g. Racer Magazine" />
        </div>
        <div>
          <Label className="text-sm font-medium mb-1 block">Website / Portfolio URL</Label>
          <Input value={form.website_url} onChange={e => setForm(f => ({ ...f, website_url: e.target.value }))} placeholder="https://" />
        </div>
      </div>

      {/* Bio */}
      <div>
        <Label className="text-sm font-medium mb-1 block">Short Bio</Label>
        <Textarea
          value={form.bio}
          onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
          placeholder="Brief professional background…"
          className="min-h-[80px]"
        />
      </div>

      {/* Reason */}
      <div>
        <Label className="text-sm font-medium mb-1 block">Why are you applying? <span className="text-red-500">*</span></Label>
        <Textarea
          value={form.reason_for_applying}
          onChange={e => setForm(f => ({ ...f, reason_for_applying: e.target.value }))}
          placeholder="Tell us about your coverage interest and experience…"
          className="min-h-[100px]"
          required
        />
      </div>

      {/* Terms */}
      <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox checked={form.terms_accepted} onCheckedChange={v => setForm(f => ({ ...f, terms_accepted: v }))} className="mt-0.5" />
          <span className="text-sm text-gray-700">
            I agree to the platform terms of use and media contributor guidelines. <span className="text-red-500">*</span>
          </span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox checked={form.usage_rights_accepted} onCheckedChange={v => setForm(f => ({ ...f, usage_rights_accepted: v }))} className="mt-0.5" />
          <span className="text-sm text-gray-700">
            I understand the usage rights and content ownership policies.
          </span>
        </label>
      </div>

      <Button type="submit" disabled={submitting} className="bg-[#232323] hover:bg-black text-white gap-2 w-full sm:w-auto">
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {submitting ? 'Submitting…' : 'Submit Application'}
      </Button>
    </form>
  );
}