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
import { toast } from 'sonner';

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
  Invited:   'text-gray-400 border-gray-700/40',
  Confirmed: 'text-green-300 border-green-700/40',
  Active:    'text-teal-300 border-teal-700/40',
  Withdrawn: 'text-red-300 border-red-700/40',
};

export default function EventOfficialsPanel() {
  const { selectedEvent, isAdmin, eventPermissions, wsData } = useEventWorkspace();
  const eventId = selectedEvent?.id;
  const queryClient = useQueryClient();
  const officials = wsData?.officials || [];

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ user_id: '', role: 'Race Director', notes: '' });

  const canEdit = isAdmin || !!eventPermissions?.canManageSettings;

  // Check which critical roles are missing
  const missingRoles = useMemo(() => {
    const assigned = new Set(officials.filter(o => o.status !== 'Withdrawn').map(o => o.role));
    return CRITICAL_ROLES.filter(r => !assigned.has(r));
  }, [officials]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('assignEventOfficial', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['officials', eventId] });
      toast.success('Official assigned');
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
        <Shield className="w-8 h-8 text-gray-600" />
        <p className="text-gray-400 text-sm">Admin access required to manage officials.</p>
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
          <Users className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Officials</h2>
          <span className="text-[11px] text-gray-500">{activeOfficials.length} assigned</span>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowForm(p => !p)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-teal-600/40 bg-teal-900/20 text-teal-300 text-[11px] font-semibold uppercase tracking-wider hover:bg-teal-900/40 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Assign Official
          </button>
        )}
      </div>

      {/* Missing roles alert */}
      {missingRoles.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded border border-amber-700/40 bg-amber-950/15">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[11px] font-semibold text-amber-300">Missing Critical Roles</p>
            <p className="text-[10px] text-amber-400 mt-0.5">{missingRoles.join(' · ')}</p>
          </div>
        </div>
      )}

      {/* Add official form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="p-4 rounded border border-white/[0.08] bg-white/[0.03] space-y-3"
        >
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Assign Official</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">User ID</label>
              <input
                type="text"
                value={form.user_id}
                onChange={e => setForm(p => ({ ...p, user_id: e.target.value }))}
                placeholder="user ID..."
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded text-[12px] text-gray-200 px-2 py-1.5 outline-none focus:border-teal-600/50"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Role</label>
              <select
                value={form.role}
                onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded text-[12px] text-gray-200 px-2 py-1.5 outline-none focus:border-teal-600/50"
              >
                {ROLES.map(r => <option key={r} value={r} className="bg-[#141818]">{r}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Notes (optional)</label>
            <input
              type="text"
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded text-[12px] text-gray-200 px-2 py-1.5 outline-none focus:border-teal-600/50"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 rounded border border-white/[0.08] text-[11px] text-gray-400 hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-1.5 rounded bg-teal-700/60 hover:bg-teal-600/80 border border-teal-600/40 text-[11px] font-semibold text-white transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        </form>
      )}

      {/* Officials list */}
      {activeOfficials.length === 0 && !showForm ? (
        <div className="py-8 text-center text-gray-600 text-sm">No officials assigned yet.</div>
      ) : (
        <div className="space-y-0.5">
          {activeOfficials.map(official => (
            <div
              key={official.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded border border-white/[0.06] bg-white/[0.02]"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-gray-200">{official.role}</span>
                  <span className={`text-[9px] font-bold uppercase tracking-widest border rounded px-1.5 py-0.5 ${STATUS_STYLES[official.status] || STATUS_STYLES.Invited}`}>
                    {official.status}
                  </span>
                </div>
                <p className="text-[10px] text-gray-600 truncate">{official.user_id}</p>
              </div>
              {canEdit && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  {official.status !== 'Confirmed' && (
                    <button
                      onClick={() => updateMutation.mutate({ id: official.id, status: 'Confirmed' })}
                      className="p-1 rounded text-green-400 hover:bg-green-900/20 transition-colors"
                      title="Confirm"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={() => removeMutation.mutate(official.id)}
                    className="p-1 rounded text-red-400 hover:bg-red-900/20 transition-colors"
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
        <p className="text-[10px] text-gray-700">{withdrawnOfficials.length} withdrawn official(s) hidden.</p>
      )}
    </div>
  );
}