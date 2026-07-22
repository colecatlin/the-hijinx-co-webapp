/**
 * R8Z Part 2 — EventDayManager
 * Manages EventDay records for an event.
 * - Auto-generates days from event_date / end_date range
 * - Allows editing label and notes per day
 * - Safe: never deletes days that have sessions
 * - Backward compatible: events without days show generate button
 */
import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { REG_QK } from '@/components/registrationdashboard/queryKeys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CalendarDays, Plus, Edit2, Check, X, RefreshCw, AlertTriangle } from 'lucide-react';
import { format, parseISO, eachDayOfInterval } from 'date-fns';

const DAY_STATUS_COLORS = {
  Planned:   'bg-gray-700/60 text-gray-300',
  Active:    'bg-blue-900/60 text-blue-300',
  Completed: 'bg-green-900/60 text-green-300',
  Cancelled: 'bg-red-900/60 text-red-300',
};

export default function EventDayManager({ event, isAdmin }) {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editRound, setEditRound] = useState('');
  const [editRoundLabel, setEditRoundLabel] = useState('');
  const [savingId, setSavingId] = useState(null);

  const { data: eventDays = [], isLoading } = useQuery({
    queryKey: REG_QK.eventDays(event?.id),
    queryFn: () => base44.entities.EventDay.filter({ event_id: event.id }, 'sort_order', 50),
    enabled: !!event?.id,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', event?.id],
    queryFn: () => base44.entities.Session.filter({ event_id: event.id }, 'run_order', 500),
    enabled: !!event?.id,
  });

  const sessionDayIds = useMemo(() => new Set(sessions.map(s => s.event_day_id).filter(Boolean)), [sessions]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: REG_QK.eventDays(event?.id) });
  };

  // Build expected days from event date range
  const expectedDays = useMemo(() => {
    if (!event?.event_date || !event?.end_date) return [];
    try {
      const start = parseISO(event.event_date);
      const end = parseISO(event.end_date);
      if (end < start) return [];
      return eachDayOfInterval({ start, end });
    } catch {
      return [];
    }
  }, [event?.event_date, event?.end_date]);

  const missingDays = useMemo(() => {
    const existing = new Set(eventDays.map(d => d.date));
    return expectedDays.filter(d => !existing.has(format(d, 'yyyy-MM-dd')));
  }, [expectedDays, eventDays]);

  const handleGenerate = async (onlyMissing = false) => {
    const daysToCreate = onlyMissing ? missingDays : expectedDays;
    if (daysToCreate.length === 0) {
      toast.info('No days to generate');
      return;
    }

    // Safety: if regenerating all, check for days with sessions
    if (!onlyMissing && eventDays.length > 0) {
      const hasLinkedSessions = eventDays.some(d => sessionDayIds.has(d.id));
      if (hasLinkedSessions) {
        toast.error('Some days have sessions assigned — use "Add Missing Days" instead to avoid disrupting existing data.');
        return;
      }
    }

    setGenerating(true);
    try {
      const existingDates = new Set(eventDays.map(d => d.date));
      const offset = eventDays.length; // number base for day_number
      const creates = daysToCreate
        .filter(d => !existingDates.has(format(d, 'yyyy-MM-dd')))
        .map((d, idx) => ({
          event_id: event.id,
          day_number: offset + idx + 1,
          label: `Day ${offset + idx + 1}`,
          date: format(d, 'yyyy-MM-dd'),
          sort_order: offset + idx,
          status: 'Planned',
          round_number: offset + idx + 1,
        }));

      if (creates.length === 0) { toast.info('All days already exist'); return; }
      await Promise.all(creates.map(d => base44.entities.EventDay.create(d)));
      toast.success(`${creates.length} day${creates.length !== 1 ? 's' : ''} created`);
      invalidate();
    } catch (err) {
      toast.error('Failed to generate days: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const startEdit = (day) => {
    setEditingId(day.id);
    setEditLabel(day.label);
    setEditNotes(day.notes || '');
    setEditRound(day.round_number != null ? String(day.round_number) : '');
    setEditRoundLabel(day.round_label || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditLabel('');
    setEditNotes('');
    setEditRound('');
    setEditRoundLabel('');
  };

  const saveEdit = async (dayId) => {
    if (!editLabel.trim()) { toast.error('Label required'); return; }
    setSavingId(dayId);
    const roundNum = editRound.trim() === '' ? null : Number(editRound);
    try {
      await base44.entities.EventDay.update(dayId, {
        label: editLabel.trim(),
        notes: editNotes || null,
        round_number: Number.isFinite(roundNum) ? roundNum : null,
        round_label: editRoundLabel.trim() || null,
      });
      invalidate();
      cancelEdit();
      toast.success('Day updated');
    } catch (err) {
      toast.error('Failed to update day');
    } finally {
      setSavingId(null);
    }
  };

  if (!event) return null;

  const hasDateRange = event.event_date && event.end_date;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-teal-500" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Event Days</p>
          {eventDays.length > 0 && (
            <span className="text-[10px] font-mono text-gray-700 border border-gray-800 px-1.5 py-px rounded-sm">{eventDays.length}</span>
          )}
        </div>
        {isAdmin && hasDateRange && (
          <div className="flex gap-2">
            {missingDays.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleGenerate(true)}
                disabled={generating}
                className="h-7 text-xs border-teal-800/60 text-teal-400 hover:bg-teal-900/20"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add {missingDays.length} Missing
              </Button>
            )}
            {eventDays.length === 0 && (
              <Button
                size="sm"
                onClick={() => handleGenerate(false)}
                disabled={generating}
                className="h-7 text-xs bg-teal-700 hover:bg-teal-600 text-white"
              >
                {generating ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <CalendarDays className="w-3 h-3 mr-1" />}
                Generate Days
              </Button>
            )}
          </div>
        )}
      </div>

      {/* No date range warning */}
      {!hasDateRange && (
        <div className="flex items-center gap-2 p-3 bg-amber-900/20 border border-amber-800/40 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-400">Set start and end dates above to generate event days.</p>
        </div>
      )}

      {/* No days yet — prompt */}
      {hasDateRange && eventDays.length === 0 && !isLoading && (
        <div className="text-center py-6 border border-dashed border-gray-800 rounded-lg">
          <p className="text-xs text-gray-600 mb-3">No event days created yet.</p>
          {isAdmin && (
            <p className="text-[11px] text-gray-700">
              Click <span className="text-teal-500 font-mono">Generate Days</span> to auto-create {expectedDays.length} day{expectedDays.length !== 1 ? 's' : ''} from the date range.
            </p>
          )}
        </div>
      )}

      {/* Days list */}
      {eventDays.length > 0 && (
        <div className="space-y-1.5">
          {[...eventDays].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map((day) => {
            const isEditing = editingId === day.id;
            const sessionCount = sessions.filter(s => s.event_day_id === day.id).length;
            const hasLinked = sessionDayIds.has(day.id);
            let weekday = '';
            try { weekday = format(parseISO(day.date), 'EEE'); } catch {}

            return (
              <div
                key={day.id}
                className="flex items-center gap-3 p-2.5 bg-[#0d0f11] border border-gray-800/60 rounded-lg"
              >
                {/* Day number badge */}
                <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold font-mono text-gray-400">{day.day_number}</span>
                </div>

                {isEditing ? (
                  <div className="flex-1 flex items-center gap-2 flex-wrap">
                    <Input
                      value={editLabel}
                      onChange={e => setEditLabel(e.target.value)}
                      className="bg-[#161a1d] border-gray-700 text-white text-xs h-7 w-28"
                      placeholder="Label"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-gray-600">Rd</span>
                      <Input
                        type="number"
                        value={editRound}
                        onChange={e => setEditRound(e.target.value)}
                        className="bg-[#161a1d] border-gray-700 text-white text-xs h-7 w-14"
                        placeholder="—"
                      />
                    </div>
                    <Input
                      value={editRoundLabel}
                      onChange={e => setEditRoundLabel(e.target.value)}
                      className="bg-[#161a1d] border-gray-700 text-white text-xs h-7 w-32"
                      placeholder="Round label (optional)"
                    />
                    <Input
                      value={editNotes}
                      onChange={e => setEditNotes(e.target.value)}
                      className="bg-[#161a1d] border-gray-700 text-white text-xs h-7 flex-1 min-w-[120px]"
                      placeholder="Notes (optional)"
                    />
                    <button
                      onClick={() => saveEdit(day.id)}
                      disabled={savingId === day.id}
                      className="p-1 hover:bg-teal-900/30 rounded text-teal-400"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={cancelEdit} className="p-1 hover:bg-gray-700 rounded text-gray-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{day.label}</span>
                      <Badge className={`text-[10px] px-1.5 py-px ${DAY_STATUS_COLORS[day.status] || DAY_STATUS_COLORS.Planned}`}>
                        {day.status}
                      </Badge>
                      {day.round_number != null && (
                        <Badge className="text-[10px] px-1.5 py-px bg-teal-900/50 text-teal-300 border border-teal-700/40">
                          Round {day.round_number}
                        </Badge>
                      )}
                      {hasLinked && (
                        <span className="text-[9px] font-mono text-gray-600">{sessionCount} session{sessionCount !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-mono text-teal-600">{weekday}</span>
                      <span className="text-[10px] font-mono text-gray-600">{day.date}</span>
                      {day.round_label && <span className="text-[10px] text-teal-500/70 truncate">· {day.round_label}</span>}
                      {day.notes && <span className="text-[10px] text-gray-700 truncate">· {day.notes}</span>}
                    </div>
                  </div>
                )}

                {!isEditing && isAdmin && (
                  <button
                    onClick={() => startEdit(day)}
                    className="p-1.5 hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                    title="Edit day"
                  >
                    <Edit2 className="w-3 h-3 text-gray-500" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}