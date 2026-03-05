import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { canTransition, applyTransition, cascadeEffects } from '@/components/racecore/operationalStateEngine';
import {
  Save,
  Archive,
  Copy,
  Calendar,
  MapPin,
  Hash,
  Link,
  FileEdit,
  Shield,
  Loader2,
  Send,
  AlertTriangle,
} from 'lucide-react';
import CollaborationApprovalPanel from '@/components/registrationdashboard/CollaborationApprovalPanel';
import EventLegitimacyPanel from '@/components/registrationdashboard/EventLegitimacyPanel';
import { setupEventCollaborators } from '@/components/registrationdashboard/eventCollaboratorSetup';
import { buildInvalidateAfterOperation } from '@/components/registrationdashboard/invalidationHelper';

const STATUS_OPTIONS = [
  { value: 'Draft', label: 'Draft', color: 'bg-gray-500' },
  { value: 'PendingApproval', label: 'Pending Approval', color: 'bg-amber-500' },
  { value: 'Published', label: 'Published', color: 'bg-green-500' },
  { value: 'Live', label: 'Live', color: 'bg-blue-500' },
  { value: 'Completed', label: 'Completed', color: 'bg-purple-500' },
  { value: 'Cancelled', label: 'Cancelled', color: 'bg-red-500' },
];

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
];

function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

export default function EventBuilderForm({ selectedEventId, onEventCreated, isAdmin, isLiveMode, onArchiveAttempt, canEditEventCore = true, canApproveAsTrack = false, canApproveAsSeries = false }) {
  const queryClient = useQueryClient();
  const invalidateAfterOperation = buildInvalidateAfterOperation(queryClient);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 60000,
  });
  const [formData, setFormData] = useState({
    track_id: '',
    series_id: '',
    season: new Date().getFullYear().toString(),
    name: '',
    slug: '',
    event_date: '',
    end_date: '',
    timezone: 'America/Denver',
    status: 'Draft',
    round_number: '',
    external_uid: '',
    location_note: '',
  });
  const [trackAcceptance, setTrackAcceptance] = useState('Pending');
  const [seriesAcceptance, setSeriesAcceptance] = useState('Pending');
  const [trackPublishApproved, setTrackPublishApproved] = useState(false);
  const [seriesPublishApproved, setSeriesPublishApproved] = useState(false);
  const [errors, setErrors] = useState({});
  const [slugEditedByUser, setSlugEditedByUser] = useState(false);

  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks-active'],
    queryFn: () => base44.entities.Track.list(),
  });

  const { data: seriesList = [] } = useQuery({
    queryKey: ['series-active'],
    queryFn: () => base44.entities.Series.list(),
  });

  const { data: event, isLoading: loadingEvent } = useQuery({
    queryKey: ['event', selectedEventId],
    queryFn: () => base44.entities.Event.get(selectedEventId),
    enabled: !!selectedEventId,
  });

  const activeTracks = useMemo(
    () => tracks.filter(t => t.status !== 'Inactive' || !t.status),
    [tracks]
  );

  const activeSeries = useMemo(
    () => seriesList.filter(s => s.status !== 'Inactive' || !s.status),
    [seriesList]
  );

  useEffect(() => {
    if (event && selectedEventId) {
      const tzMatch = event.location_note?.match(/^TZ:([^|]+)/);
      setFormData({
        track_id: event.track_id || '',
        series_id: event.series_id || '',
        season: event.season || new Date().getFullYear().toString(),
        name: event.name || '',
        slug: event.slug || '',
        event_date: event.event_date || '',
        end_date: event.end_date || '',
        timezone: tzMatch ? tzMatch[1] : 'America/Denver',
        status: event.status || 'Draft',
        round_number: event.round_number?.toString() || '',
        external_uid: event.external_uid || '',
        location_note: event.location_note
          ?.replace(/^TZ:[^|]+/, '')
          .replace(/^\|/, '')
          .trim() || '',
      });
      setTrackAcceptance(event.track_acceptance_status || 'Pending');
      setSeriesAcceptance(event.series_acceptance_status || 'Pending');
      setTrackPublishApproved(event.track_publish_approved || false);
      setSeriesPublishApproved(event.series_publish_approved || false);
    } else if (!selectedEventId) {
      setFormData({
        track_id: '',
        series_id: '',
        season: new Date().getFullYear().toString(),
        name: '',
        slug: '',
        event_date: '',
        end_date: '',
        timezone: 'America/Denver',
        status: 'Draft',
        round_number: '',
        external_uid: '',
        location_note: '',
      });
      setTrackAcceptance('Pending');
      setSeriesAcceptance('Pending');
      setTrackPublishApproved(false);
      setSeriesPublishApproved(false);
      setSlugEditedByUser(false);
    }
  }, [event, selectedEventId]);

  useEffect(() => {
    if (!slugEditedByUser && formData.name) {
      setFormData(prev => ({ ...prev, slug: generateSlug(prev.name) }));
    }
  }, [formData.name, slugEditedByUser]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
    if (field === 'slug') {
      setSlugEditedByUser(true);
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.track_id) newErrors.track_id = 'Track is required';
    if (!formData.name.trim()) newErrors.name = 'Event name is required';
    if (!formData.event_date) newErrors.event_date = 'Start date is required';
    if (!formData.end_date) newErrors.end_date = 'End date is required';
    if (
      formData.end_date &&
      formData.event_date &&
      formData.end_date < formData.event_date
    ) {
      newErrors.end_date = 'End date must be after start date';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const { data: collabRecords = [] } = useQuery({
    queryKey: ['eventCollaboration', selectedEventId],
    queryFn: () => base44.entities.EventCollaboration.filter({ event_id: selectedEventId }),
    enabled: !!selectedEventId,
    staleTime: 15000,
  });
  const collaboration = collabRecords[0] || null;

  // Load EntityConfirmation for publish gating
  const { data: eventEntityList = [] } = useQuery({
    queryKey: ['entityRecord', 'event', selectedEventId],
    queryFn: () => base44.entities.Entity.filter({ entity_type: 'event', source_entity_id: selectedEventId }),
    enabled: !!selectedEventId,
    staleTime: 30000,
  });
  const eventEntityId = eventEntityList[0]?.id;
  const { data: confirmationListEB = [] } = useQuery({
    queryKey: ['entityConfirmation', eventEntityId],
    queryFn: () => base44.entities.EntityConfirmation.filter({ event_entity_id: eventEntityId }),
    enabled: !!eventEntityId,
    staleTime: 15000,
  });
  const isEntityConfirmed = confirmationListEB[0]?.effective_status === 'confirmed';

  const createCollaboration = async (eventId, trackId, seriesId) => {
    if (!seriesId) return; // Only create collaboration if both track and series exist
    
    try {
      const existing = await base44.entities.EventCollaboration.filter({ event_id: eventId });
      if (existing.length > 0) return; // already exists
      
      // Call backend function to request collaboration
      const orgType = currentUser?.role === 'admin' ? 'admin' : 'track'; // Assume track unless explicitly series
      await base44.functions.invoke('requestEventCollaboration', {
        eventId,
        trackId,
        seriesId,
        requestedByType: orgType
      });
      
      queryClient.invalidateQueries({ queryKey: ['eventCollaboration', eventId] });
    } catch (error) {
      console.warn('Collaboration creation error:', error);
    }
  };

  const triggerEntityLinks = async (eventId) => {
    try {
      await base44.functions.invoke('ensureEventEntityLinks', { event_id: eventId });
      queryClient.invalidateQueries({ queryKey: ['entityRecord', 'event', eventId] });
    } catch (_) { /* non-fatal — panel will retry on next load */ }
  };

  const createMutation = useMutation({
    mutationFn: data => base44.entities.Event.create(data),
    onSuccess: async (newEvent) => {
      // Auto-setup EntityCollaborator links (owner + track/series owners)
      await setupEventCollaborators(newEvent, currentUser?.id);
      // Create EventCollaboration record
      await createCollaboration(newEvent.id, newEvent.track_id, newEvent.series_id);
      // Ensure unified Entity records and confirmation
      await triggerEntityLinks(newEvent.id);
      invalidateAfterOperation('event_created', { eventId: newEvent.id });
      invalidateAfterOperation('event_collaboration_updated', { eventId: newEvent.id });
      toast.success('Event created successfully');
      if (onEventCreated) {
        onEventCreated(newEvent.id);
      }
    },
    onError: error => {
      toast.error('Failed to create event: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Event.update(id, data),
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', selectedEventId] });
      // Re-sync entity links (track/series may have changed)
      await triggerEntityLinks(variables.id || selectedEventId);
      invalidateAfterOperation('event_updated', { eventId: variables.id || selectedEventId });
      toast.success('Event updated successfully');
    },
    onError: error => {
      toast.error('Failed to update event: ' + error.message);
    },
  });

  const handleSave = (publish = false) => {
    if (!canEditEventCore && !isAdmin) {
      toast.error('You do not have planning rights to edit this event.');
      return;
    }
    if (!validate()) return;

    const selectedSeries = activeSeries.find(s => s.id === formData.series_id);
    const locationNoteWithTz = formData.location_note
      ? `TZ:${formData.timezone}|${formData.location_note}`
      : `TZ:${formData.timezone}`;

    // Determine target status and collaboration fields
    let targetStatus = formData.status;
    let trackAcceptanceTarget = trackAcceptance;
    let seriesAcceptanceTarget = seriesAcceptance;
    let trackPublishTarget = trackPublishApproved;
    let seriesPublishTarget = seriesPublishApproved;

    // On creation, set acceptance based on who creates it
    if (!selectedEventId) {
      const orgType = currentUser?.role === 'admin' ? null : null; // admin creates both accepted
      trackAcceptanceTarget = !selectedEventId && orgType === 'track' ? 'Accepted' : (!formData.track_id ? 'Pending' : 'Pending');
      seriesAcceptanceTarget = !selectedEventId && orgType === 'series' ? 'Accepted' : (!formData.series_id ? 'Pending' : 'Pending');
      if (isAdmin || !orgType) {
        if (formData.track_id) trackAcceptanceTarget = 'Accepted';
        if (formData.series_id) seriesAcceptanceTarget = 'Accepted';
      }
    }

    // Publish gating: can only publish if both sides accepted AND approved
    if (publish) {
      if (trackAcceptanceTarget !== 'Accepted' || seriesAcceptanceTarget !== 'Accepted') {
        toast.error('Both Track and Series must accept before publishing');
        targetStatus = 'PendingApproval';
      } else if (!trackPublishTarget || !seriesPublishTarget) {
        toast.error('Both Track and Series must approve publish before publishing');
        targetStatus = 'PendingApproval';
      } else {
        targetStatus = 'Published';
      }
    }

    const eventData = {
      track_id: formData.track_id,
      series_id: formData.series_id || null,
      series_name: selectedSeries?.name || null,
      season: formData.season,
      name: formData.name.trim(),
      slug: formData.slug || generateSlug(formData.name),
      event_date: formData.event_date,
      end_date: formData.end_date,
      status: targetStatus,
      round_number: formData.round_number ? parseInt(formData.round_number) : null,
      external_uid: formData.external_uid || null,
      location_note: locationNoteWithTz,
      created_by_entity_type: !selectedEventId ? (isAdmin ? 'admin' : 'track') : undefined,
      created_by_entity_id: !selectedEventId && formData.track_id && !isAdmin ? formData.track_id : undefined,
      track_acceptance_status: trackAcceptanceTarget,
      series_acceptance_status: seriesAcceptanceTarget,
      track_publish_approved: trackPublishTarget,
      series_publish_approved: seriesPublishTarget,
    };

    if (selectedEventId) {
      if (!collaboration) {
        createCollaboration(selectedEventId, formData.track_id, formData.series_id || null);
      }
      updateMutation.mutate({ id: selectedEventId, data: eventData });
    } else {
      createMutation.mutate(eventData);
    }
  };

  const handleArchive = () => {
    if (!selectedEventId) return;

    const archivedNote = `ARCHIVED|${formData.location_note || ''}`;
    updateMutation.mutate({
      id: selectedEventId,
      data: { status: 'Cancelled', location_note: archivedNote },
    });
  };

  const handleTrackAccept = async (accept = true) => {
    if (!selectedEventId) return;
    const newStatus = accept ? 'Accepted' : 'Rejected';
    const now = new Date().toISOString();
    await updateMutation.mutateAsync({
      id: selectedEventId,
      data: {
        track_acceptance_status: newStatus,
        track_accepted_by_user_id: currentUser?.id || '',
        track_accepted_date: newStatus !== 'Pending' ? now : null,
      },
    });
    setTrackAcceptance(newStatus);
    invalidateAfterOperation('event_updated', { eventId: selectedEventId });
  };

  const handleSeriesAccept = async (accept = true) => {
    if (!selectedEventId) return;
    const newStatus = accept ? 'Accepted' : 'Rejected';
    const now = new Date().toISOString();
    await updateMutation.mutateAsync({
      id: selectedEventId,
      data: {
        series_acceptance_status: newStatus,
        series_accepted_by_user_id: currentUser?.id || '',
        series_accepted_date: newStatus !== 'Pending' ? now : null,
      },
    });
    setSeriesAcceptance(newStatus);
    invalidateAfterOperation('event_updated', { eventId: selectedEventId });
  };

  const handleTrackPublishApproval = async () => {
    if (!selectedEventId) return;
    const newVal = !trackPublishApproved;
    const now = new Date().toISOString();
    await updateMutation.mutateAsync({
      id: selectedEventId,
      data: {
        track_publish_approved: newVal,
        track_publish_approved_by_user_id: newVal ? currentUser?.id || '' : null,
        track_publish_approved_date: newVal ? now : null,
      },
    });
    setTrackPublishApproved(newVal);
    invalidateAfterOperation('event_updated', { eventId: selectedEventId });
  };

  const handleSeriesPublishApproval = async () => {
    if (!selectedEventId) return;
    const newVal = !seriesPublishApproved;
    const now = new Date().toISOString();
    await updateMutation.mutateAsync({
      id: selectedEventId,
      data: {
        series_publish_approved: newVal,
        series_publish_approved_by_user_id: newVal ? currentUser?.id || '' : null,
        series_publish_approved_date: newVal ? now : null,
      },
    });
    setSeriesPublishApproved(newVal);
    invalidateAfterOperation('event_updated', { eventId: selectedEventId });
  };

  const handleDuplicate = () => {
    const duplicatedData = {
      track_id: formData.track_id,
      series_id: formData.series_id || null,
      series_name:
        activeSeries.find(s => s.id === formData.series_id)?.name || null,
      season: formData.season,
      name: `${formData.name} Copy`,
      slug: `${formData.slug}-copy`,
      event_date: null,
      end_date: null,
      status: 'upcoming',
      round_number: formData.round_number ? parseInt(formData.round_number) + 1 : null,
      external_uid: null,
      location_note: formData.location_note,
    };
    createMutation.mutate(duplicatedData);
  };

  const isEditing = !!selectedEventId;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const selectedTrack = activeTracks.find(t => t.id === formData.track_id);
  const selectedSeries = activeSeries.find(s => s.id === formData.series_id);
  const currentStatus = STATUS_OPTIONS.find(s => s.value === formData.status);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Form */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="bg-[#171717] border-gray-800">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="text-white flex items-center gap-2">
              <FileEdit className="w-5 h-5" />
              {isEditing ? 'Edit Event' : 'Create New Event'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Track & Series */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">
                  Track <span className="text-red-400">*</span>
                </Label>
                <Select
                  value={formData.track_id}
                  onValueChange={v => handleChange('track_id', v)}
                  disabled={!canEditEventCore || isLiveMode}
                >
                  <SelectTrigger
                    className={`bg-[#262626] border-gray-700 text-white ${
                      errors.track_id ? 'border-red-500' : ''
                    }`}
                  >
                    <SelectValue placeholder="Select track..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#262626] border-gray-700">
                    {activeTracks.map(track => (
                      <SelectItem key={track.id} value={track.id} className="text-white">
                        {track.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.track_id && (
                  <p className="text-red-400 text-xs">{errors.track_id}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Series</Label>
                <Select
                  value={formData.series_id}
                  onValueChange={v => handleChange('series_id', v)}
                  disabled={!canEditEventCore || isLiveMode}
                >
                  <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                    <SelectValue placeholder="Select series..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#262626] border-gray-700">
                    <SelectItem value={null} className="text-gray-400">
                      None
                    </SelectItem>
                    {activeSeries.map(series => (
                      <SelectItem key={series.id} value={series.id} className="text-white">
                        {series.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Season */}
            <div className="space-y-2">
              <Label className="text-gray-300">Season</Label>
              <Input
                value={formData.season}
                onChange={e => handleChange('season', e.target.value)}
                placeholder="e.g., 2024"
                disabled={!canEditEventCore || isLiveMode}
                className="bg-[#262626] border-gray-700 text-white"
              />
            </div>

            {/* Name & Slug */}
            <div className="space-y-2">
              <Label className="text-gray-300">
                Event Name <span className="text-red-400">*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="Enter event name"
                disabled={!canEditEventCore || isLiveMode}
                className={`bg-[#262626] border-gray-700 text-white ${
                  errors.name ? 'border-red-500' : ''
                }`}
              />
              {errors.name && <p className="text-red-400 text-xs">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Slug</Label>
              <Input
                value={formData.slug}
                onChange={e => handleChange('slug', e.target.value)}
                placeholder="event-slug"
                disabled={!canEditEventCore}
                className="bg-[#262626] border-gray-700 text-white font-mono text-sm"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">
                  Start Date <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="date"
                  value={formData.event_date}
                  onChange={e => handleChange('event_date', e.target.value)}
                  disabled={!canEditEventCore || isLiveMode}
                  className={`bg-[#262626] border-gray-700 text-white ${
                    errors.event_date ? 'border-red-500' : ''
                  }`}
                />
                {errors.event_date && (
                  <p className="text-red-400 text-xs">{errors.event_date}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">
                  End Date <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={e => handleChange('end_date', e.target.value)}
                  disabled={!canEditEventCore || isLiveMode}
                  className={`bg-[#262626] border-gray-700 text-white ${
                    errors.end_date ? 'border-red-500' : ''
                  }`}
                />
                {errors.end_date && (
                  <p className="text-red-400 text-xs">{errors.end_date}</p>
                )}
              </div>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label className="text-gray-300">Timezone</Label>
              <Select
                value={formData.timezone}
                onValueChange={v => handleChange('timezone', v)}
                disabled={!canEditEventCore}
              >
                <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  {TIMEZONES.map(tz => (
                    <SelectItem key={tz} value={tz} className="text-white">
                      {tz.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status & Round */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={v => handleChange('status', v)}
                  disabled={!canEditEventCore}
                >
                  <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#262626] border-gray-700">
                    {STATUS_OPTIONS.map(status => (
                      <SelectItem key={status.value} value={status.value} className="text-white">
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Round Number</Label>
                <Input
                  type="number"
                  value={formData.round_number}
                  onChange={e => handleChange('round_number', e.target.value)}
                  placeholder="e.g., 1"
                  disabled={!canEditEventCore}
                  className="bg-[#262626] border-gray-700 text-white"
                />
              </div>
            </div>

            {/* External UID */}
            <div className="space-y-2">
              <Label className="text-gray-300">External UID</Label>
              <Input
                value={formData.external_uid}
                onChange={e => handleChange('external_uid', e.target.value)}
                placeholder="UID from external calendar"
                disabled={!canEditEventCore}
                className="bg-[#262626] border-gray-700 text-white font-mono text-sm"
              />
            </div>

            {/* Location Note */}
            <div className="space-y-2">
              <Label className="text-gray-300">Location Note</Label>
              <Textarea
                value={formData.location_note}
                onChange={e => handleChange('location_note', e.target.value)}
                placeholder="Additional location details..."
                disabled={!canEditEventCore}
                className="bg-[#262626] border-gray-700 text-white min-h-[80px]"
              />
            </div>

            {/* Action Buttons */}
            {canEditEventCore && (
              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-800">
                <Button
                  onClick={() => handleSave(false)}
                  disabled={isSaving}
                  className="bg-gray-700 hover:bg-gray-600 text-white"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {isEditing ? 'Update Draft' : 'Save Draft'}
                </Button>
                {(() => {
                  const publishReady = trackAcceptance === 'Accepted' && seriesAcceptance === 'Accepted' && trackPublishApproved && seriesPublishApproved && isEntityConfirmed;
                  const publishDisabled = isSaving || !publishReady;
                  const publishTitle = !isEntityConfirmed
                    ? 'Event must be confirmed by required parties before publishing'
                    : !publishReady
                    ? 'Event awaiting dual acceptance and approval'
                    : 'Publish event';
                  return (
                    <div className="flex flex-col gap-1">
                      <Button
                        onClick={() => handleSave(true)}
                        disabled={publishDisabled}
                        className={publishReady ? "bg-green-700 hover:bg-green-600 text-white" : "bg-gray-700 text-gray-400 cursor-not-allowed"}
                        title={publishTitle}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {publishReady ? 'Publish Event' : 'Pending Approval'}
                      </Button>
                      {!isEntityConfirmed && selectedEventId && (
                        <p className="text-xs text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Event must be confirmed by required parties before publishing
                        </p>
                      )}
                    </div>
                  );
                })()}
                {isEditing && (
                  <>
                    <Button
                      onClick={handleDuplicate}
                      disabled={isSaving}
                      variant="outline"
                      className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicate
                    </Button>
                    <Button
                      onClick={() => {
                        if (isLiveMode && onArchiveAttempt) {
                          onArchiveAttempt();
                        } else {
                          handleArchive();
                        }
                      }}
                      disabled={isSaving}
                      variant="outline"
                      className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    >
                      <Archive className="w-4 h-4 mr-2" />
                      Archive
                    </Button>
                  </>
                )}
              </div>
            )}

            {!canEditEventCore && (
              <div className="pt-4 border-t border-gray-800">
                <p className="text-amber-500 text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  You do not have planning rights to edit this event
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Preview + Collaboration */}
      <div className="space-y-6">
        {selectedEventId && (
          <>
            <EventLegitimacyPanel
              selectedEventId={selectedEventId}
              event={event}
              isAdmin={isAdmin}
              currentUser={currentUser}
              invalidateAfterOperation={invalidateAfterOperation}
            />

            <CollaborationApprovalPanel
              eventId={selectedEventId}
              isAdmin={isAdmin}
              currentUser={currentUser}
            />
            
            {/* Acceptance & Publish Approval Cards */}
            {(canEditEventCore || isAdmin) && (
              <>
                <Card className="bg-blue-900/20 border-blue-800">
                  <CardHeader className="border-b border-blue-800 pb-3">
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Track Acceptance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">Status:</span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        trackAcceptance === 'Accepted' ? 'bg-green-900/50 text-green-300' :
                        trackAcceptance === 'Rejected' ? 'bg-red-900/50 text-red-300' :
                        'bg-amber-900/50 text-amber-300'
                      }`}>
                        {trackAcceptance}
                      </span>
                    </div>
                    {trackAcceptance === 'Pending' && (canEditEventCore || isAdmin) && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleTrackAccept(true)} className="flex-1 bg-green-700 hover:bg-green-600 text-white text-xs h-8">
                          Accept
                        </Button>
                        <Button size="sm" onClick={() => handleTrackAccept(false)} variant="outline" className="flex-1 border-red-700 text-red-400 hover:bg-red-900/20 text-xs h-8">
                          Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {formData.series_id && (
                  <Card className="bg-purple-900/20 border-purple-800">
                    <CardHeader className="border-b border-purple-800 pb-3">
                      <CardTitle className="text-white text-sm flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Series Acceptance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-300">Status:</span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          seriesAcceptance === 'Accepted' ? 'bg-green-900/50 text-green-300' :
                          seriesAcceptance === 'Rejected' ? 'bg-red-900/50 text-red-300' :
                          'bg-amber-900/50 text-amber-300'
                        }`}>
                          {seriesAcceptance}
                        </span>
                      </div>
                      {seriesAcceptance === 'Pending' && (canEditEventCore || isAdmin) && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSeriesAccept(true)} className="flex-1 bg-green-700 hover:bg-green-600 text-white text-xs h-8">
                            Accept
                          </Button>
                          <Button size="sm" onClick={() => handleSeriesAccept(false)} variant="outline" className="flex-1 border-red-700 text-red-400 hover:bg-red-900/20 text-xs h-8">
                            Reject
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {trackAcceptance === 'Accepted' && seriesAcceptance === 'Accepted' && (
                  <>
                    <Card className="bg-blue-900/20 border-blue-800">
                      <CardHeader className="border-b border-blue-800 pb-3">
                        <CardTitle className="text-white text-sm">Track Publish Approval</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <button
                          onClick={() => handleTrackPublishApproval()}
                          className={`w-full px-4 py-2 rounded text-sm font-medium transition-colors ${
                            trackPublishApproved
                              ? 'bg-green-900/50 text-green-300 border border-green-700'
                              : 'bg-gray-900/50 text-gray-400 border border-gray-700 hover:bg-gray-800/50'
                          }`}
                        >
                          {trackPublishApproved ? '✓ Approved' : 'Not Approved'}
                        </button>
                      </CardContent>
                    </Card>

                    {formData.series_id && (
                      <Card className="bg-purple-900/20 border-purple-800">
                        <CardHeader className="border-b border-purple-800 pb-3">
                          <CardTitle className="text-white text-sm">Series Publish Approval</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <button
                            onClick={() => handleSeriesPublishApproval()}
                            className={`w-full px-4 py-2 rounded text-sm font-medium transition-colors ${
                              seriesPublishApproved
                                ? 'bg-green-900/50 text-green-300 border border-green-700'
                                : 'bg-gray-900/50 text-gray-400 border border-gray-700 hover:bg-gray-800/50'
                            }`}
                          >
                            {seriesPublishApproved ? '✓ Approved' : 'Not Approved'}
                          </button>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
        <Card className="bg-[#171717] border-gray-800">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="text-white text-sm">Event Preview</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white">
                {formData.name || 'Untitled Event'}
              </h3>
              {currentStatus && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white mt-2 ${currentStatus.color}`}
                >
                  {currentStatus.label}
                </span>
              )}
            </div>

            <div className="space-y-3 text-sm">
              {selectedTrack && (
                <div className="flex items-start gap-2 text-gray-400">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="text-white">{selectedTrack.name}</span>
                  {selectedTrack.location_city && (
                    <span>, {selectedTrack.location_city}</span>
                  )}
                </div>
              )}

              {selectedSeries && (
                <div className="flex items-center gap-2 text-gray-400">
                  <Hash className="w-4 h-4" />
                  <span className="text-white">{selectedSeries.name}</span>
                </div>
              )}

              {formData.season && (
                <div className="flex items-center gap-2 text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span className="text-white">Season {formData.season}</span>
                </div>
              )}

              {formData.event_date && (
                <div className="flex items-center gap-2 text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span className="text-white">
                    {formData.event_date}
                    {formData.end_date && formData.end_date !== formData.event_date && (
                      <> - {formData.end_date}</>
                    )}
                  </span>
                </div>
              )}

              {formData.round_number && (
                <div className="flex items-center gap-2 text-gray-400">
                  <Hash className="w-4 h-4" />
                  <span className="text-white">Round {formData.round_number}</span>
                </div>
              )}

              {formData.external_uid && (
                <div className="flex items-center gap-2 text-gray-400">
                  <Link className="w-4 h-4" />
                  <span className="text-white font-mono text-xs">
                    {formData.external_uid}
                  </span>
                </div>
              )}
            </div>

            {formData.location_note && (
              <div className="pt-3 border-t border-gray-800">
                <p className="text-xs text-gray-500">Location Note</p>
                <p className="text-sm text-gray-300 mt-1">{formData.location_note}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}