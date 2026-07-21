import React, { useState, useMemo } from 'react';
import { useOnboardingWizard } from '@/components/onboarding/OnboardingWizardContext';
import { getRole } from '@/config/onboardingRoles';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Search, Info, Check, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { requestRelationship } from '@/components/relationships/relationshipService';

const TEAL = '#1DA1A1';

// Map registry relationship_entity_type → base44 entity name.
const ENTITY_API = {
  Track: 'Track',
  Team: 'Team',
  Series: 'Series',
};

export default function ConnectionsStage() {
  const { user, relationships = [], refreshRelationships, saveConnections } = useOnboardingWizard();

  const selectedTypes = user?.profile_types || ['fan'];
  // Roles the user picked that require an org relationship on onboarding.
  const rolesNeedingConnection = useMemo(
    () =>
      selectedTypes
        .map((t) => getRole(t))
        .filter((r) => r && r.requires_relationship && r.relationship_required_on_onboarding),
    [selectedTypes],
  );

  const noConnectionsNeeded = rolesNeedingConnection.length === 0;

  // Pending/approved relationships for this role, sourced from EntityCollaborator.
  const pendingForRole = (roleId) =>
    (relationships || []).filter((c) => c.role_key === roleId);

  const [submitting, setSubmitting] = useState(null); // roleId currently submitting
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    setSaving(true);
    try {
      // Pending requests never block completion — connections are already
      // persisted as real EntityCollaborator records by this point.
      await saveConnections();
    } catch (e) {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl"
          style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.7)' }}>{error}</p>
        </div>
      )}

      {noConnectionsNeeded ? (
        <div className="text-center py-8 rounded-xl"
          style={{ background: 'rgba(29,161,161,0.05)', border: '1px dashed rgba(29,161,161,0.2)' }}>
          <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>
            No organization connections required for your roles.
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
            You can request access to teams, tracks, or series anytime from your garage.
          </p>
        </div>
      ) : (
        rolesNeedingConnection.map((role) => (
          <ConnectionRequestBuilder
            key={role.id}
            role={role}
            pending={pendingForRole(role.id)}
            submitting={submitting === role.id}
            onSubmitting={(v) => setSubmitting(v ? role.id : null)}
            onError={setError}
            onCreated={async () => {
              setError(null);
              await refreshRelationships();
            }}
          />
        ))
      )}

      <div className="flex items-start gap-2 p-3 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: TEAL }} />
        <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Organization access may require approval from an administrator. Pending requests won't stop
          you from finishing setup — you'll be notified once approved.
        </p>
      </div>

      <Button
        onClick={handleContinue}
        disabled={saving}
        className="w-full gap-2 h-11 text-sm font-bold"
        style={{ background: TEAL, color: '#050A0A' }}
      >
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Continue'}
      </Button>
    </div>
  );
}

function ConnectionRequestBuilder({ role, pending, submitting, onSubmitting, onError, onCreated }) {
  const mode = role.requires_approval === 'conditional' ? 'create' : 'join';
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [createFields, setCreateFields] = useState({ name: '' });
  const [localCreateEntries, setLocalCreateEntries] = useState([]);

  const supportsCreate = role.requires_approval === 'conditional'; // Team Owner
  const entityApi = ENTITY_API[role.relationship_entity_type];

  const runSearch = async (q) => {
    setQuery(q);
    if (q.trim().length < 2 || !entityApi) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const list = await base44.entities[entityApi].list('-created_date', 20);
      const lower = q.toLowerCase();
      setResults(list.filter((r) => (r.name || '').toLowerCase().includes(lower)).slice(0, 6));
    } catch (e) {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Join an existing org → create a REAL pending EntityCollaborator record.
  const selectExisting = async (entity) => {
    onSubmitting(true);
    try {
      const res = await requestRelationship({
        entityType: role.relationship_entity_type,
        entityId: entity.id,
        roleKey: role.id,
      });
      if (!res?.ok) {
        onError(res?.error || 'Could not submit request');
      } else {
        await onCreated();
      }
      setQuery('');
      setResults([]);
    } catch (e) {
      onError(e?.message || 'Could not submit request');
    } finally {
      onSubmitting(false);
    }
  };

  // Create a new org — entity creation is a separate flow (Phase 4+). Kept as
  // a session-only placeholder so it doesn't fabricate a relationship record.
  const submitCreate = () => {
    if (!createFields.name.trim()) return;
    setLocalCreateEntries((prev) => [...prev, createFields.name.trim()]);
    setCreateFields({ name: '' });
  };

  return (
    <div className="space-y-3 p-4 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-2">
        <role.icon className="w-4 h-4" style={{ color: TEAL }} />
        <span className="text-sm font-bold text-white">{role.display_name}</span>
        <span className="text-[10px] font-mono uppercase tracking-wider ml-auto px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
          {role.relationship_entity_type}
        </span>
      </div>

      {supportsCreate && (
        <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Creating a new organization is completed after launch. To join an existing one now,
          search below.
        </p>
      )}

      {mode === 'join' && entityApi ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-lg px-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Search className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <input
              value={query}
              onChange={(e) => runSearch(e.target.value)}
              placeholder={`Search for a ${role.relationship_entity_type}…`}
              className="flex h-10 flex-1 bg-transparent text-sm focus-visible:outline-none"
              style={{ color: 'rgba(255,255,255,0.9)' }}
            />
            {(searching || submitting) && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'rgba(255,255,255,0.4)' }} />}
          </div>
          {results.length > 0 && (
            <div className="space-y-1">
              {results.map((r) => (
                <button key={r.id} type="button" onClick={() => selectExisting(r)} disabled={submitting}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors disabled:opacity-50"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>{r.name}</span>
                  <Plus className="w-3.5 h-3.5" style={{ color: TEAL }} />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {mode === 'create' ? (
        <div className="space-y-2">
          <input
            value={createFields.name}
            onChange={(e) => setCreateFields({ ...createFields, name: e.target.value })}
            placeholder={`${role.relationship_entity_type} name`}
            className="w-full h-10 rounded-lg px-3 text-sm focus-visible:outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)' }}
          />
          <Button type="button" onClick={submitCreate} disabled={!createFields.name.trim()}
            className="text-xs font-bold" style={{ background: createFields.name.trim() ? TEAL : 'rgba(255,255,255,0.08)', color: createFields.name.trim() ? '#050A0A' : 'rgba(255,255,255,0.3)' }}>
            Add new {role.relationship_entity_type}
          </Button>
        </div>
      ) : null}

      {/* Server-backed pending / approved requests for this role (survives refresh). */}
      {pending.length > 0 ? (
        <div className="space-y-1.5">
          {pending.map((c) => (
            <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: 'rgba(29,161,161,0.06)', border: '1px solid rgba(29,161,161,0.2)' }}>
              <Check className="w-3.5 h-3.5" style={{ color: TEAL }} />
              <span className="text-sm flex-1" style={{ color: 'rgba(255,255,255,0.85)' }}>{c.entity_name || c.entity_type}</span>
              <span className="text-[9px] font-bold uppercase tracking-wider"
                style={{ color: c.status === 'approved' ? TEAL : 'rgba(255,255,255,0.4)' }}>
                {c.status === 'approved' ? 'Approved' : 'Pending approval'}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {/* Session-only create-new placeholders (not relationships). */}
      {localCreateEntries.length > 0 ? (
        <div className="space-y-1.5">
          {localCreateEntries.map((name, idx) => (
            <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)' }}>
              <Plus className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.4)' }} />
              <span className="text-sm flex-1" style={{ color: 'rgba(255,255,255,0.7)' }}>{name}</span>
              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>
                New · After launch
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}