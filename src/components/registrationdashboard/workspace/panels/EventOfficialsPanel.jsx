/**
 * R9CR — EventOfficialsPanel
 * Assign, remove, and manage event officials.
 * Reads from workspace context (no local fetches).
 */
import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useEventWorkspace } from '../EventWorkspaceContext';
import { Shield, UserPlus, Check, X, AlertCircle, Users } from 'lucide-react';
import UserPickerInput from '@/components/shared/UserPickerInput';
import { toast } from 'sonner';
import OfficialsEnforcement from '../../../governance/OfficialsEnforcement';
import { useAuditWriter } from '../../../../hooks/useAuditWriter';
import { useUserDisplayMap } from '../../../../hooks/useUserDisplayMap';

const ROLES = [
  'Race Director',
  'Competition Director',
  'Chief Steward',
  'Steward',
  'Technical Director',
  'Technical Inspector',
  'Registration Manager',
  'Timing and Scoring',
  'Announcer',
  'Media Director',
  'Safety Director',
  'Gate Staff',
];

const CRITICAL_ROLES = ['Race Director', 'Chief Steward', 'Steward'];

const STATUS_STYLES = {
  Invited:   'text-foreground-quiet border-divider/40',
  Confirmed: 'text-success border-success/40',
  Active:    'text-motion border-motion/40',
  Withdrawn: 'text-danger border-danger/40',
};

export default function EventOfficialsPanel() {
  const { selectedEvent, isAdmin, eventPermissions, wsData, user } = useEventWorkspace();
  const eventId = selectedEvent?.id;
  const queryClient = useQueryClient();
  const { writeAudit } = useAuditWriter(user);
  const officials = wsData?.officials || [];
  const { getUserName, getUser } = useUserDisplayMap();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ user_id: '', role: 'Race Director', notes: '' });

  // Check for duplicate role assignments
  const assignedRoles = officials.filter(o => o.status !== 'Withdrawn').map(o => o.role);
  const isDuplicateRole = form.role && assignedRoles.includes(form.role) && !['Steward', 'Technical Inspector', 'Gate Staff'].includes(form.role);

  const canEdit = isAdmin || !!eventPermissions?.canManageSettings;

  // Check which critical roles are missing
  const missingRoles = useMemo(() => {
    const assigned = new Set(officials.filter(o => o.status !== 'Withdrawn').map(o => o.role));
    return CRITICAL_ROLES.filter(r => !assigned.has(r));
  }, [officials]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('assignEventOfficial', data),
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: ['officials', eventId] });
      toast.success('Official assigned');
      writeAudit({ entity_type: 'EventOfficial', entity_id: eventId, action: 'created', event_id: eventId, notes: `${vars.role} assigned` });
      setShowForm(false);
      setForm({ user_id: '', role: 'Race Director', notes: '' });
    },
    onError: () => toast.error('Failed to assign official'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.EventOfficial.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['officials', eventId] });
      toast.success('Status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const removeMutation = useMutation({
    mutationFn: (id) => base44.entities.EventOfficial.update(id, { status: 'Withdrawn' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['officials', eventId] });
      toast.success('Official removed');
    },
    onError: () => toast.error('Failed to remove official'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.user_id.trim()) { toast.error('User ID required'); return; }
    createMutation.mutate({ event_id: eventId, ...form });
  };

  if (!canEdit && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <Shield className="w-8 h-8 text-foreground-quiet" />
        <p className="text-foreground-quiet text-sm">Admin access required to manage officials.</p>
      </div>
    );
  }

  const activeOfficials = officials.filter(o => o.status !== 'Withdrawn');
  const withdrawnOfficials = officials.filter(o => o.status === 'Withdrawn');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-foreground-quiet" />
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Officials</h2>
          <span className="text-[11px] text-foreground-quiet">{activeOfficials.length} assigned</span>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowForm(p => !p)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-motion/40 bg-motion/10 text-motion text-[11px] font-semibold uppercase tracking-wider hover:bg-motion/20 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Assign Official
          </button>
        )}
      </div>

      {/* Required officials enforcement panel */}
      <OfficialsEnforcement officials={officials} />

      {/* Add official form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="p-4 rounded border border-divider bg-surface-interactive/50 space-y-3"
        >
          <p className="text-[11px] font-bold uppercase tracking-widest text-foreground-quiet">Assign Official</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-foreground-quiet mb-1 uppercase tracking-wider">User</label>
              <UserPickerInput
                value={form.user_id}
                onChange={uid => setForm(p => ({ ...p, user_id: uid }))}
                placeholder="Search by name or email…"
              />
            </div>
            <div>
              <label className="block text-[10px] text-foreground-quiet mb-1 uppercase tracking-wider">Role</label>
              <select
                value={form.role}
                onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                className="w-full bg-surface-interactive border border-divider rounded text-[12px] text-foreground-secondary px-2 py-1.5 outline-none focus:border-motion/50"
              >
                {ROLES.map(r => <option key={r} value={r} className="bg-surface-elevated">{r}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-foreground-quiet mb-1 uppercase tracking-wider">Notes (optional)</label>
            <input
              type="text"
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              className="w-full bg-surface-interactive border border-divider rounded text-[12px] text-foreground-secondary px-2 py-1.5 outline-none focus:border-motion/50"
            />
          </div>
          {isDuplicateRole && (
            <p className="text-[10px] text-warning">⚠ {form.role} is already assigned. Proceeding will create a second assignment.</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 rounded border border-white/[0.08] text-[11px] text-foreground-quiet hover:text-foreground-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || !form.user_id}
              className="px-4 py-1.5 rounded bg-motion/60 hover:bg-motion-hover/80 border border-motion/40 text-[11px] font-semibold text-foreground transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        </form>
      )}

      {/* Officials list */}
      {activeOfficials.length === 0 && !showForm ? (
        <div className="py-8 text-center text-foreground-quiet text-sm">No officials assigned yet.</div>
      ) : (
        <div className="space-y-0.5">
          {activeOfficials.map(official => (
            <div
              key={official.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded border border-divider/60 bg-surface-interactive/30"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-foreground-secondary">{official.role}</span>
                  <span className={`text-[9px] font-bold uppercase tracking-widest border rounded px-1.5 py-0.5 ${STATUS_STYLES[official.status] || STATUS_STYLES.Invited}`}>
                    {official.status}
                  </span>
                </div>
                <p className="text-[11px] text-foreground-secondary font-medium truncate">{getUserName(official.user_id)}</p>
                {getUser(official.user_id)?.email && (
                  <p className="text-[10px] text-foreground-quiet truncate">{getUser(official.user_id).email}</p>
                )}
              </div>
              {canEdit && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  {official.status !== 'Confirmed' && (
                    <button
                      onClick={() => updateMutation.mutate({ id: official.id, status: 'Confirmed' })}
                      className="p-1 rounded text-success hover:bg-success/10 transition-colors"
                      title="Confirm"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={() => removeMutation.mutate(official.id)}
                    className="p-1 rounded text-danger hover:bg-danger/10 transition-colors"
                    title="Remove"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {withdrawnOfficials.length > 0 && (
        <p className="text-[10px] text-foreground-quiet">{withdrawnOfficials.length} withdrawn official(s) hidden.</p>
      )}
    </div>
  );
}