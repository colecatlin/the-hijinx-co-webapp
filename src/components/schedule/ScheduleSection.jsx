import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Pencil, Trash2, Share2, Copy, Check, ExternalLink, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const EMPTY_EVENT = {
  summary: '',
  description: '',
  location: '',
  start: '',
  end: '',
};

function toGCalDateTime(localDatetime) {
  if (!localDatetime) return null;
  return new Date(localDatetime).toISOString();
}

function toLocalInput(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ScheduleSection({ entityType, entityId, entityName, calendarId, onCalendarCreated, isOwner = false }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState(EMPTY_EVENT);
  const [showEmbed, setShowEmbed] = useState(false);
  const [copied, setCopied] = useState(false);

  const embedUrl = `${window.location.origin}${window.location.pathname.replace(/\/[^/]*$/, '')}/ScheduleEmbed?entity=${entityType}&id=${entityId}`;

  // Fetch events from Google Calendar
  const { data: eventsData, isLoading: loadingEvents } = useQuery({
    queryKey: ['calendarEvents', calendarId],
    queryFn: () => base44.functions.invoke('calendarEvents', {
      action: 'list',
      calendarId,
      timeMin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      timeMax: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    }).then(r => r.data),
    enabled: !!calendarId,
  });

  const createCalendarMutation = useMutation({
    mutationFn: () => base44.functions.invoke('calendarEvents', {
      action: 'createCalendar',
      eventData: {
        summary: `${entityName} — Race Schedule`,
        description: `Race schedule for ${entityName} on HIJINX`,
      },
    }).then(r => r.data),
    onSuccess: (data) => {
      if (data?.id && onCalendarCreated) {
        onCalendarCreated(data.id);
        queryClient.invalidateQueries({ queryKey: ['calendarEvents', data.id] });
      }
    },
  });

  const createEventMutation = useMutation({
    mutationFn: (eventData) => base44.functions.invoke('calendarEvents', {
      action: 'create',
      calendarId,
      eventData,
    }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents', calendarId] });
      setShowDialog(false);
      setForm(EMPTY_EVENT);
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ eventId, eventData }) => base44.functions.invoke('calendarEvents', {
      action: 'update',
      calendarId,
      eventId,
      eventData,
    }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents', calendarId] });
      setShowDialog(false);
      setEditingEvent(null);
      setForm(EMPTY_EVENT);
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (eventId) => base44.functions.invoke('calendarEvents', {
      action: 'delete',
      calendarId,
      eventId,
    }).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calendarEvents', calendarId] }),
  });

  const handleOpenAdd = () => {
    setEditingEvent(null);
    setForm(EMPTY_EVENT);
    setShowDialog(true);
  };

  const handleOpenEdit = (event) => {
    setEditingEvent(event);
    setForm({
      summary: event.summary || '',
      description: event.description || '',
      location: event.location || '',
      start: toLocalInput(event.start?.dateTime || event.start?.date),
      end: toLocalInput(event.end?.dateTime || event.end?.date),
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    const payload = {
      summary: form.summary,
      description: form.description,
      location: form.location,
      start: { dateTime: toGCalDateTime(form.start), timeZone: 'UTC' },
      end: { dateTime: toGCalDateTime(form.end), timeZone: 'UTC' },
    };
    if (editingEvent) {
      updateEventMutation.mutate({ eventId: editingEvent.id, eventData: payload });
    } else {
      createEventMutation.mutate(payload);
    }
  };

  const copyEmbed = () => {
    const iframeCode = `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0" style="border:none;"></iframe>`;
    navigator.clipboard.writeText(iframeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const events = eventsData?.items || [];
  const upcomingEvents = events.filter(e => {
    const start = e.start?.dateTime || e.start?.date;
    return start && new Date(start) >= new Date(Date.now() - 24 * 60 * 60 * 1000);
  }).sort((a, b) => {
    const aTime = new Date(a.start?.dateTime || a.start?.date);
    const bTime = new Date(b.start?.dateTime || b.start?.date);
    return aTime - bTime;
  });

  const isPending = createEventMutation.isPending || updateEventMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#232323]" />
          <h3 className="text-lg font-bold text-[#232323]">Race Schedule</h3>
          {calendarId && (
            <Badge className="bg-[#00FFDA] text-[#232323] text-xs">Synced</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {calendarId && (
            <Button variant="outline" size="sm" onClick={() => setShowEmbed(!showEmbed)}>
              <Share2 className="w-4 h-4 mr-1" />
              Embed
            </Button>
          )}

        </div>
      </div>

      {/* Embed snippet */}
      {showEmbed && calendarId && (
        <div className="bg-gray-50 border border-gray-200 rounded p-4 space-y-3">
          <div className="text-sm font-medium text-[#232323]">Embed this schedule on your website</div>
          <p className="text-xs text-gray-600">Copy the code below and paste it into any HTML page. Updates made here will automatically appear on your site.</p>
          <div className="relative">
            <code className="block bg-white border border-gray-200 rounded p-3 text-xs text-gray-700 pr-24 break-all">
              {`<iframe src="${embedUrl}" width="100%" height="600" frameborder="0" style="border:none;"></iframe>`}
            </code>
            <Button size="sm" className="absolute top-2 right-2" variant="outline" onClick={copyEmbed}>
              {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
          </div>
          <a href={embedUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[#00FFDA] hover:underline">
            <ExternalLink className="w-3 h-3" /> Preview embed page
          </a>
        </div>
      )}

      {!calendarId && !isOwner && (
        <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded">
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No schedule set up yet.</p>
        </div>
      )}

      {!calendarId && isOwner && !createCalendarMutation.isPending && (
        <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded">
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm mb-2">No schedule yet. Click "Setup Schedule" to create one.</p>
        </div>
      )}

      {calendarId && loadingEvents && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}

      {calendarId && !loadingEvents && upcomingEvents.length === 0 && (
        <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded">
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No upcoming events scheduled.</p>
        </div>
      )}

      {calendarId && !loadingEvents && upcomingEvents.length > 0 && (
        <div className="space-y-3">
          {upcomingEvents.map(event => {
            const start = event.start?.dateTime || event.start?.date;
            const end = event.end?.dateTime || event.end?.date;
            const isAllDay = !event.start?.dateTime;
            return (
              <div key={event.id} className="flex items-start justify-between border border-gray-200 p-4 hover:bg-gray-50 transition-colors">
                <div className="flex gap-4">
                  <div className="text-center min-w-[52px] bg-[#232323] text-white p-2">
                    <div className="text-xs font-mono uppercase">{format(parseISO(start), 'MMM')}</div>
                    <div className="text-2xl font-black leading-none">{format(parseISO(start), 'd')}</div>
                  </div>
                  <div>
                    <div className="font-bold text-[#232323]">{event.summary}</div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {isAllDay ? 'All day' : `${format(parseISO(start), 'h:mm a')} — ${format(parseISO(end), 'h:mm a')}`}
                    </div>
                    {event.location && (
                      <div className="text-xs text-gray-500 mt-0.5">{event.location}</div>
                    )}
                    {event.description && (
                      <div className="text-xs text-gray-600 mt-1 line-clamp-2">{event.description}</div>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={v => { if (!v) { setShowDialog(false); setEditingEvent(null); setForm(EMPTY_EVENT); } else setShowDialog(true); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'Add Event'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Event Name <span className="text-red-500">*</span></Label>
              <Input placeholder="e.g. Round 5 — Lucas Oil Off Road" value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Start <span className="text-red-500">*</span></Label>
                <Input type="datetime-local" value={form.start} onChange={e => setForm(f => ({ ...f, start: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>End <span className="text-red-500">*</span></Label>
                <Input type="datetime-local" value={form.end} onChange={e => setForm(f => ({ ...f, end: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Location</Label>
              <Input placeholder="Track name or city" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea placeholder="Additional details..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShowDialog(false); setEditingEvent(null); setForm(EMPTY_EVENT); }}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={isPending || !form.summary || !form.start || !form.end} className="bg-[#232323] text-white">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                {editingEvent ? 'Save Changes' : 'Add Event'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}