/**
 * REVISION R8F Part 2 — EventSettingsEditor
 * Safe core event field editor for the EventFile workspace.
 * Core fields only. No approval workflows. No collaboration logic.
 * Track/series/status are read-only. Uses Event.update() directly.
 */
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { useEventWorkspace } from '../EventWorkspaceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Save,
  Loader2,
  ExternalLink,
  Shield,
  Calendar,
  MapPin,
  Hash,
  Tag,
  Image,
  Info,
} from 'lucide-react';
import EventDayManager from '@/components/registrationdashboard/EventDayManager';

const STATUS_COLORS = {
  Draft:           'bg-gray-700 text-gray-300',
  PendingApproval: 'bg-amber-900/60 text-amber-300',
  Published:       'bg-green-900/60 text-green-300',
  Live:            'bg-blue-900/60 text-blue-300',
  Completed:       'bg-purple-900/60 text-purple-300',
  Cancelled:       'bg-red-900/60 text-red-300',
};

function SectionLabel({ label }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600 mb-3">
      {label}
    </p>
  );
}

function ReadOnlyField({ label, value, mono = false }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">{label}</p>
      <p className={`text-sm text-gray-300 ${mono ? 'font-mono' : ''}`}>
        {value || <span className="text-gray-600 italic">—</span>}
      </p>
    </div>
  );
}

function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-red-400 text-xs mt-1">{message}</p>;
}

export default function EventSettingsEditor() {
  const navigate = useNavigate();
  const {
    selectedEvent,
    selectedTrack,
    selectedSeries,
    isAdmin,
    eventPermissions,
    invalidateAfterOperation,
  } = useEventWorkspace();

  const canManageSettings = isAdmin || eventPermissions?.canManageSettings === true;

  const [formData, setFormData] = useState({
    name: '',
    event_date: '',
    end_date: '',
    season: '',
    round_number: '',
    location_note: '',
    event_logo_url: '',
    event_cover_image_url: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Sync form from selectedEvent
  useEffect(() => {
    if (!selectedEvent) return;
    // Strip TZ prefix from location_note if present
    const rawNote = selectedEvent.location_note || '';
    const strippedNote = rawNote.replace(/^TZ:[^|]+\|?/, '').trim();

    setFormData({
      name: selectedEvent.name || '',
      event_date: selectedEvent.event_date || '',
      end_date: selectedEvent.end_date || '',
      season: selectedEvent.season || '',
      round_number: selectedEvent.round_number?.toString() || '',
      location_note: strippedNote,
      event_logo_url: selectedEvent.event_logo_url || '',
      event_cover_image_url: selectedEvent.event_cover_image_url || '',
    });
    setErrors({});
    setDirty(false);
  }, [selectedEvent?.id]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setDirty(true);
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Event name is required';
    if (!formData.event_date) errs.event_date = 'Start date is required';
    if (!formData.end_date) errs.end_date = 'End date is required';
    if (formData.event_date && formData.end_date && formData.end_date < formData.event_date) {
      errs.end_date = 'End date must be on or after start date';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!canManageSettings) {
      toast.error('You do not have permission to edit event settings.');
      return;
    }
    if (!validate()) return;
    setSaving(true);
    try {
      await base44.entities.Event.update(selectedEvent.id, {
        name: formData.name.trim(),
        event_date: formData.event_date,
        end_date: formData.end_date,
        season: formData.season || null,
        round_number: formData.round_number ? parseInt(formData.round_number) : null,
        location_note: formData.location_note || null,
        event_logo_url: formData.event_logo_url || null,
        event_cover_image_url: formData.event_cover_image_url || null,
      });
      invalidateAfterOperation('event_updated', { eventId: selectedEvent.id });
      toast.success('Event updated');
      setDirty(false);
    } catch (err) {
      toast.error('Failed to save: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  if (!selectedEvent) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-xs text-gray-600">No event loaded.</p>
      </div>
    );
  }

  const fullMgmtUrl = `/RegistrationDashboard?tab=eventBuilder&eventId=${selectedEvent.id}`;

  // ── Read-only mode for non-admins ───────────────────────────────────────
  if (!canManageSettings) {
    return (
      <div className="space-y-5 max-w-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Event Settings</p>
            <p className="text-[11px] text-gray-600 mt-0.5">Core event information.</p>
          </div>
          <a
            href={fullMgmtUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors shrink-0"
          >
            <ExternalLink className="w-3 h-3" /> Full Event Management
          </a>
        </div>

        {/* Access notice */}
        <div className="flex items-start gap-2.5 p-3 bg-amber-900/20 border border-amber-800/40 rounded-lg">
          <Shield className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-400">
            Contact your administrator to edit event details.
          </p>
        </div>

        {/* Read-only display */}
        <div className="p-4 bg-[#0d0f11] border border-gray-800/60 rounded-xl space-y-4">
          <ReadOnlyField label="Event Name" value={selectedEvent.name} />
          <div className="grid grid-cols-2 gap-4">
            <ReadOnlyField label="Start Date" value={selectedEvent.event_date} />
            <ReadOnlyField label="End Date" value={selectedEvent.end_date} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <ReadOnlyField label="Season" value={selectedEvent.season} />
            <ReadOnlyField label="Round" value={selectedEvent.round_number?.toString()} />
          </div>
          <ReadOnlyField label="Track" value={selectedTrack?.name} />
          <ReadOnlyField label="Series" value={selectedSeries?.name} />
        </div>
      </div>
    );
  }

  // ── Admin editable mode ──────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-2xl">

      {/* Panel Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Event Settings</p>
          <p className="text-[11px] text-gray-600 mt-0.5">
            Edit core event information. Track, series, and approval workflows are managed separately.
          </p>
        </div>
        <a
          href={fullMgmtUrl}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-700 text-gray-400 hover:text-teal-400 hover:border-teal-800 transition-colors shrink-0"
        >
          <ExternalLink className="w-3 h-3" /> Full Event Management
        </a>
      </div>

      {/* Section 1 — Core Information */}
      <div className="p-4 bg-[#0d0f11] border border-gray-800/60 rounded-xl space-y-4">
        <SectionLabel label="Core Information" />

        <div className="space-y-1.5">
          <Label className="text-xs text-gray-400 uppercase tracking-wider">
            Event Name <span className="text-red-500">*</span>
          </Label>
          <Input
            value={formData.name}
            onChange={e => handleChange('name', e.target.value)}
            placeholder="Event name"
            className={`bg-[#161a1d] border-gray-700 text-white text-sm h-9 ${errors.name ? 'border-red-600' : ''}`}
          />
          <FieldError message={errors.name} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-400 uppercase tracking-wider">Season</Label>
            <Input
              value={formData.season}
              onChange={e => handleChange('season', e.target.value)}
              placeholder="e.g. 2025"
              className="bg-[#161a1d] border-gray-700 text-white text-sm h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-400 uppercase tracking-wider">Round #</Label>
            <Input
              type="number"
              value={formData.round_number}
              onChange={e => handleChange('round_number', e.target.value)}
              placeholder="e.g. 3"
              className="bg-[#161a1d] border-gray-700 text-white text-sm h-9"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-gray-400 uppercase tracking-wider">Location Note</Label>
          <Textarea
            value={formData.location_note}
            onChange={e => handleChange('location_note', e.target.value)}
            placeholder="Additional location details..."
            className="bg-[#161a1d] border-gray-700 text-white text-sm min-h-[72px] resize-none"
          />
        </div>
      </div>

      {/* Section 2 — Schedule */}
      <div className="p-4 bg-[#0d0f11] border border-gray-800/60 rounded-xl space-y-4">
        <SectionLabel label="Schedule" />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-400 uppercase tracking-wider">
              Start Date <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              value={formData.event_date}
              onChange={e => handleChange('event_date', e.target.value)}
              className={`bg-[#161a1d] border-gray-700 text-white text-sm h-9 ${errors.event_date ? 'border-red-600' : ''}`}
            />
            <FieldError message={errors.event_date} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-400 uppercase tracking-wider">
              End Date <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              value={formData.end_date}
              onChange={e => handleChange('end_date', e.target.value)}
              className={`bg-[#161a1d] border-gray-700 text-white text-sm h-9 ${errors.end_date ? 'border-red-600' : ''}`}
            />
            <FieldError message={errors.end_date} />
          </div>
        </div>
      </div>

      {/* Section 3 — Media */}
      <div className="p-4 bg-[#0d0f11] border border-gray-800/60 rounded-xl space-y-4">
        <SectionLabel label="Media" />
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Image className="w-3 h-3" /> Logo URL
          </Label>
          <Input
            value={formData.event_logo_url}
            onChange={e => handleChange('event_logo_url', e.target.value)}
            placeholder="https://..."
            className="bg-[#161a1d] border-gray-700 text-white text-sm h-9 font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Image className="w-3 h-3" /> Cover Image URL
          </Label>
          <Input
            value={formData.event_cover_image_url}
            onChange={e => handleChange('event_cover_image_url', e.target.value)}
            placeholder="https://..."
            className="bg-[#161a1d] border-gray-700 text-white text-sm h-9 font-mono"
          />
        </div>
        {/* Preview */}
        {(formData.event_logo_url || formData.event_cover_image_url) && (
          <div className="flex gap-3 pt-1">
            {formData.event_logo_url && (
              <div className="w-12 h-12 rounded-lg border border-gray-700 overflow-hidden bg-gray-900 flex-shrink-0">
                <img src={formData.event_logo_url} alt="Logo" className="w-full h-full object-contain" />
              </div>
            )}
            {formData.event_cover_image_url && (
              <div className="flex-1 h-12 rounded-lg border border-gray-700 overflow-hidden bg-gray-900">
                <img src={formData.event_cover_image_url} alt="Cover" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 4 — Operational Metadata (read-only) */}
      <div className="p-4 bg-[#0d0f11] border border-gray-800/60 rounded-xl space-y-4">
        <SectionLabel label="Operational Metadata" />
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          {/* Status */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">Status</p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${STATUS_COLORS[selectedEvent.status] || 'bg-gray-700 text-gray-300'}`}>
              {selectedEvent.status || '—'}
            </span>
          </div>
          {/* Track */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Track
            </p>
            <p className="text-xs text-gray-300">{selectedTrack?.name || <span className="text-gray-600 italic">—</span>}</p>
          </div>
          {/* Series */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 flex items-center gap-1">
              <Hash className="w-3 h-3" /> Series
            </p>
            <p className="text-xs text-gray-300">{selectedSeries?.name || <span className="text-gray-600 italic">None</span>}</p>
          </div>
          {/* Event ID */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">Event ID</p>
            <p className="text-[10px] font-mono text-gray-500 truncate">{selectedEvent.id}</p>
          </div>
          {/* Track acceptance */}
          {selectedEvent.track_acceptance_status && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">Track Acceptance</p>
              <p className="text-xs text-gray-400">{selectedEvent.track_acceptance_status}</p>
            </div>
          )}
          {/* Series acceptance */}
          {selectedEvent.series_acceptance_status && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">Series Acceptance</p>
              <p className="text-xs text-gray-400">{selectedEvent.series_acceptance_status}</p>
            </div>
          )}
        </div>

        {/* Approval workflow notice */}
        <div className="flex items-start gap-2 pt-2 border-t border-gray-800/60">
          <Info className="w-3.5 h-3.5 text-gray-600 shrink-0 mt-0.5" />
          <p className="text-[10px] text-gray-600 leading-relaxed">
            Approval workflows, track/series linkage, and publish controls are managed in Full Event Management.
          </p>
        </div>
      </div>

      {/* Section 5 — Event Days */}
      <div className="p-4 bg-[#0d0f11] border border-gray-800/60 rounded-xl">
        <EventDayManager event={selectedEvent} isAdmin={canManageSettings} />
      </div>

      {/* Save Bar */}
      <div className="flex items-center gap-3 pt-1">
        <Button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="gap-2 bg-teal-700 hover:bg-teal-600 disabled:opacity-40 text-white text-sm h-9"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
        {dirty && !saving && (
          <span className="text-[10px] text-amber-500 font-mono">Unsaved changes</span>
        )}
      </div>
    </div>
  );
}