/**
 * R9BR Sprint 3 — IncidentManager
 * Full incident investigation workflow: view, assign, notes, status transitions.
 * Phase 1.
 */
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useEventWorkspace } from '@/components/registrationdashboard/workspace/EventWorkspaceContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, ChevronRight, UserCheck, FileText, RefreshCw } from 'lucide-react';
import UserPickerInput from '@/components/shared/UserPickerInput';
import { toast } from 'sonner';
import { format } from 'date-fns';

const OPEN_STATUSES = ['Open', 'Under Review', 'Referred to Stewards', 'Appealed'];

const STATUS_COLOR = {
  Open: 'bg-blue-900/60 text-blue-300',
  'Under Review': 'bg-yellow-900/60 text-yellow-300',
  'Referred to Stewards': 'bg-orange-900/60 text-orange-300',
  Appealed: 'bg-purple-900/60 text-purple-300',
  Closed: 'bg-gray-700 text-gray-400',
};

const SEVERITY_COLOR = {
  Informational: 'bg-gray-700 text-gray-300',
  Minor: 'bg-yellow-900/60 text-yellow-300',
  Significant: 'bg-orange-900/60 text-orange-300',
  Major: 'bg-red-900/60 text-red-300',
  Serious: 'bg-red-600 text-white',
};

// Allowed status transitions per the spec
const TRANSITIONS = {
  Open: ['Under Review'],
  'Under Review': ['Referred to Stewards', 'Closed'],
  'Referred to Stewards': ['Closed', 'Appealed'],
  Appealed: [],
  Closed: [],
};

async function logOp(eventId, action, entityId, detail) {
  try {
    await base44.functions.invoke('createActivityFeedItemSafe', {
      event_id: eventId,
      action,
      entity_type: 'Incident',
      entity_id: entityId,
      detail,
    });
  } catch (_) { /* non-blocking */ }
}

function StatusBadge({ status }) {
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_COLOR[status] || 'bg-gray-700 text-gray-300'}`}>
      {status}
    </span>
  );
}

function SeverityBadge({ severity }) {
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${SEVERITY_COLOR[severity] || 'bg-gray-700 text-gray-300'}`}>
      {severity}
    </span>
  );
}

// ── Detail drawer for a single incident ──────────────────────────────────────
function IncidentDetailDrawer({ incident, open, onClose, eventId, onRefresh }) {
  const { isAdmin, eventPermissions } = useEventWorkspace();
  const queryClient = useQueryClient();

  const canInvestigate = isAdmin || !!eventPermissions?.canCreateIncident;

  const [assigneeId, setAssigneeId] = useState('');
  const [investigationNote, setInvestigationNote] = useState('');
  const [saving, setSaving] = useState(false);

  if (!incident) return null;

  const transitions = TRANSITIONS[incident.status] || [];

  const handleStatusChange = async (newStatus) => {
    setSaving(true);
    try {
      await base44.entities.Incident.update(incident.id, { status: newStatus });
      await logOp(eventId, 'incident_status_changed', incident.id,
        `${incident.incident_number}: ${incident.status} → ${newStatus}`);
      await queryClient.invalidateQueries({ queryKey: ['incidents', eventId] });
      toast.success(`Status updated to ${newStatus}`);
      onRefresh?.();
      onClose();
    } catch (err) {
      toast.error('Failed to update status: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async () => {
    if (!assigneeId.trim()) return;
    setSaving(true);
    try {
      await base44.entities.Incident.update(incident.id, {
        assigned_to_user_id: assigneeId.trim(),
      });
      await logOp(eventId, 'incident_assigned', incident.id,
        `${incident.incident_number} assigned to user ${assigneeId.trim()}`);
      await queryClient.invalidateQueries({ queryKey: ['incidents', eventId] });
      toast.success('Investigator assigned');
      setAssigneeId('');
    } catch (err) {
      toast.error('Failed to assign: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!investigationNote.trim()) return;
    setSaving(true);
    try {
      const existing = incident.investigation_notes || '';
      const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm');
      const updated = existing
        ? `${existing}\n\n[${timestamp}] ${investigationNote.trim()}`
        : `[${timestamp}] ${investigationNote.trim()}`;
      await base44.entities.Incident.update(incident.id, { investigation_notes: updated });
      await queryClient.invalidateQueries({ queryKey: ['incidents', eventId] });
      toast.success('Note added');
      setInvestigationNote('');
    } catch (err) {
      toast.error('Failed to add note: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-950 border-gray-800 text-white max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            {incident.incident_number || 'Incident'} — {incident.incident_type}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-1">
          {/* Header badges */}
          <div className="flex gap-2 flex-wrap">
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
            {incident.lap_number && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">Lap {incident.lap_number}</span>
            )}
            {incident.location_description && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{incident.location_description}</span>
            )}
          </div>

          {/* Description */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1.5">Description</p>
            <p className="text-sm text-gray-300 leading-relaxed">{incident.description}</p>
          </div>

          {/* Current investigator */}
          {incident.assigned_to_user_id && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">Assigned To</p>
              <p className="text-xs text-gray-400 font-mono">{incident.assigned_to_user_id}</p>
            </div>
          )}

          {/* Investigation notes */}
          {incident.investigation_notes && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1.5">Investigation Notes</p>
              <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono bg-gray-900/60 rounded-lg p-3 border border-gray-800">
                {incident.investigation_notes}
              </pre>
            </div>
          )}

          {canInvestigate && (
            <>
              {/* Assign investigator */}
              <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-lg space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
                  <UserCheck className="w-3 h-3" /> Assign Investigator
                </p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <UserPickerInput
                      value={assigneeId}
                      onChange={setAssigneeId}
                      placeholder="Search by name or email…"
                    />
                  </div>
                  <Button size="sm" disabled={saving || !assigneeId.trim()} onClick={handleAssign}
                    className="bg-teal-800 hover:bg-teal-700 text-white text-xs h-8 flex-shrink-0">
                    Assign
                  </Button>
                </div>
              </div>

              {/* Add investigation note */}
              <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-lg space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
                  <FileText className="w-3 h-3" /> Add Investigation Note
                </p>
                <Textarea
                  value={investigationNote}
                  onChange={e => setInvestigationNote(e.target.value)}
                  placeholder="Note text…"
                  className="bg-gray-900 border-gray-700 text-white text-xs h-20 resize-none"
                />
                <Button size="sm" disabled={saving || !investigationNote.trim()} onClick={handleAddNote}
                  className="bg-gray-700 hover:bg-gray-600 text-white text-xs h-8">
                  Add Note
                </Button>
              </div>

              {/* Status transitions */}
              {transitions.length > 0 && (
                <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-lg space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
                    <RefreshCw className="w-3 h-3" /> Change Status
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {transitions.map(next => (
                      <Button key={next} size="sm" disabled={saving} onClick={() => handleStatusChange(next)}
                        className={`text-xs h-8 gap-1 ${
                          next === 'Closed' ? 'bg-gray-700 hover:bg-gray-600' :
                          next === 'Under Review' ? 'bg-yellow-800 hover:bg-yellow-700' :
                          next === 'Referred to Stewards' ? 'bg-orange-800 hover:bg-orange-700' :
                          'bg-purple-800 hover:bg-purple-700'
                        } text-white`}>
                        <ChevronRight className="w-3 h-3" /> → {next}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main IncidentManager ──────────────────────────────────────────────────────
export default function IncidentManager({ eventId }) {
  const { isAdmin, eventPermissions } = useEventWorkspace();
  const canView = isAdmin || !!eventPermissions?.canViewRaceControl;

  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const { data: incidents = [], isLoading, refetch } = useQuery({
    queryKey: ['incidents', eventId],
    queryFn: () => base44.entities.Incident.filter({ event_id: eventId }, '-created_date', 100),
    enabled: !!eventId && canView,
  });

  const displayed = showAll
    ? incidents
    : incidents.filter(i => OPEN_STATUSES.includes(i.status));

  if (!canView) return null;
  if (isLoading) return <div className="text-gray-500 text-xs py-4">Loading incidents…</div>;

  return (
    <div className="space-y-2">
      {/* Toggle */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-600">{displayed.length} {showAll ? 'total' : 'open'}</span>
        <button onClick={() => setShowAll(v => !v)}
          className="text-[10px] text-teal-500 hover:text-teal-400 transition-colors">
          {showAll ? 'Show Open Only' : 'Show All'}
        </button>
      </div>

      {displayed.length === 0 && (
        <div className="text-gray-600 text-xs py-3">No {showAll ? '' : 'open '}incidents</div>
      )}

      {displayed.map(inc => (
        <button
          key={inc.id}
          onClick={() => setSelectedIncident(inc)}
          className="w-full text-left rounded-lg border border-gray-800 bg-gray-900/40 hover:border-gray-700 hover:bg-gray-900/70 p-3 transition-colors"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
              <span className="text-xs font-semibold text-gray-200">{inc.incident_number || '—'}</span>
              <span className="text-xs text-gray-400 truncate">{inc.incident_type}</span>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <SeverityBadge severity={inc.severity} />
              <StatusBadge status={inc.status} />
            </div>
          </div>
          {inc.description && (
            <p className="text-xs text-gray-500 mt-1.5 line-clamp-1">{inc.description}</p>
          )}
        </button>
      ))}

      <IncidentDetailDrawer
        incident={selectedIncident}
        open={!!selectedIncident}
        onClose={() => setSelectedIncident(null)}
        eventId={eventId}
        onRefresh={refetch}
      />
    </div>
  );
}