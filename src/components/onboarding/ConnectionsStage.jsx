import React, { useState, useMemo } from 'react';
import { useOnboardingWizard } from '@/components/onboarding/OnboardingWizardContext';
import { getRole } from '@/config/onboardingRoles';
import {
  getRelationshipStatusMeta,
} from '@/components/onboarding/relationshipStatus';
import StageErrorBanner, { normalizeBackendError } from '@/components/onboarding/StageErrorBanner';
import { base44 } from '@/api/base44Client';
import {
  requestRelationship,
  createTeamOwnerOrganization,
} from '@/components/relationships/relationshipService';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Search, Info } from 'lucide-react';

const TEAL = '#1DA1A1';

const ENTITY_API = {
  Track: 'Track',
  Team: 'Team',
  Series: 'Series',
};

export default function ConnectionsStage() {
  const { user, relationships = [], refreshRelationships, saveConnections, selectedRoleIds } =
    useOnboardingWizard();

  // Granular role ids drive which organization connections are required.
  // Fallback to best-effort reconstruction from capabilities so a mid-flow
  // refresh still renders the likely required connection (B1/B6).
  const roleIds = useMemo(() => {
    const ids = selectedRoleIds && selectedRoleIds.length
      ? selectedRoleIds
      : [];
    return ids;
  }, [selectedRoleIds]);

  const rolesNeedingConnection = useMemo(
    () =>
      roleIds
        .map((t) => getRole(t))
        .filter((r) => r && r.requires_relationship && r.relationship_required_on_onboarding)
        .filter((r, i, arr) => arr.findIndex((x) => x.id === r.id) === i),
    [roleIds],
  );

  const noConnectionsNeeded = rolesNeedingConnection.length === 0;

  const pendingForRole = (roleId) => (relationships || []).filter((c) => c.role_key === roleId);

  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleContinue = async (e) => {
    e?.preventDefault?.();
    setError(null);
    setSaving(true);
    try {
      // Pending requests never block completion — connections are already
      // persisted as real EntityCollaborator records by this point.
      await saveConnections();
    } catch (err) {
      setError(normalizeBackendError(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleContinue} className="space-y-5">
      {error && <StageErrorBanner message={error} />}

      {noConnectionsNeeded ? (
        <div className="text-center py-8 rounded-xl"
          style={{ background: 'rgba(29,161,161,0.05)', border: '1px dashed rgba(29,161,161,0.2)' }}>
          <p className="text-sm font-medium" style={{ color: 'hsl(var(--foreground-secondary))' }}>
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
            user={user}
            pending={pendingForRole(role.id)}
            setError={setError}
            onCreated={async () => { setError(null); await refreshRelationships(); }}
          />
        ))
      )}

      <div className="flex items-start gap-2 p-3 rounded-xl"
        style={{ background: 'hsl(var(--surface-interactive) / 0.3)', border: '1px solid hsl(var(--divider))' }}>
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: TEAL }} />
        <p className="text-[11px]" style={{ color: 'hsl(var(--foreground-secondary))' }}>
          Organization access may require approval from an administrator. Pending requests won't stop
          you from finishing setup — you'll be notified once approved.
        </p>
      </div>

      <Button
        type="submit"
        onClick={handleContinue}
        disabled={saving}
        className="w-full gap-2 h-11 text-sm font-bold"
        style={{ background: TEAL, color: '#050A0A' }}
      >
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Continue'}
      </Button>
    </form>
  );
}

function ConnectionRequestBuilder({ role, user, pending, setError, onCreated }) {
  const supportsCreate = role.requires_approval === 'conditional'; // Team Owner
  const entityApi = ENTITY_API[role.relationship_entity_type];

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Create-new fields (B2: real persistence via createOrganization).
  const [createName, setCreateName] = useState('');
  const [creating, setCreating] = useState(false);

  // Orgs this user already has a relationship with for this role (any status).
  // Surfaced as suggestions and excluded from search results so they aren't
  // offered twice (B11).
  const alreadyLinkedEntityIds = useMemo(
    () => new Set(pending.map((c) => c.entity_id)),
    [pending],
  );

  const runSearch = async (q) => {
    setQuery(q);
    if (q.trim().length < 2 || !entityApi) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setSearching(true);
    setHasSearched(true);
    try {
      const list = await base44.entities[entityApi].list('-created_date', 40);
      const lower = q.toLowerCase();
      setResults(
        list
          .filter((r) => (r.name || '').toLowerCase().includes(lower))
          .filter((r) => !alreadyLinkedEntityIds.has(r.id))
          .slice(0, 6),
      );
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const selectExisting = async (entity) => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await requestRelationship({
        entityType: role.relationship_entity_type,
        entityId: entity.id,
        roleKey: role.id,
      });
      if (!res?.ok) {
        setError(res?.error || 'Could not submit request');
      } else {
        setQuery('');
        setResults([]);
        setHasSearched(false);
        await onCreated();
      }
    } catch (e) {
      setError(normalizeBackendError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const submitCreate = async (e) => {
    e?.preventDefault?.();
    if (creating || !createName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await createTeamOwnerOrganization({ name: createName.trim() });
      if (!res?.ok && res?.error) throw new Error(res.error);
      setCreateName('');
      await onCreated();
    } catch (e) {
      setError(normalizeBackendError(e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-3 p-4 rounded-xl"
      style={{ background: 'hsl(var(--surface-interactive) / 0.3)', border: '1px solid hsl(var(--divider))' }}>
      <div className="flex items-center gap-2">
        <role.icon className="w-4 h-4" style={{ color: TEAL }} />
        <span className="text-sm font-bold text-foreground">{role.display_name}</span>
        <span className="text-[10px] font-mono uppercase tracking-wider ml-auto px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'hsl(var(--foreground-secondary))' }}>
          {role.relationship_entity_type}
        </span>
      </div>

      {/* Existing relationships for this role, with their TRUE status (B4). */}
      {pending.length > 0 ? (
        <div className="space-y-1.5">
          {pending.map((c) => {
            const meta = getRelationshipStatusMeta(c.status);
            return (
              <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
                <span className="text-sm flex-1" style={{ color: 'hsl(var(--foreground))' }}>
                  {c.entity_name || c.entity_type}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: meta.color }}>
                  {meta.label}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Join an existing organization (search). Always available for joinable types. */}
      {entityApi ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-lg px-3"
            style={{ background: 'hsl(var(--surface-interactive) / 0.4)', border: '1px solid hsl(var(--divider))' }}>
            <Search className="w-4 h-4" style={{ color: 'hsl(var(--foreground-quiet))' }} />
            <input
              value={query}
              onChange={(e) => runSearch(e.target.value)}
              placeholder={`Join an existing ${role.relationship_entity_type}…`}
              className="flex h-10 flex-1 bg-transparent text-sm focus-visible:outline-none focus:border-[#1DA1A1]"
              style={{ color: 'hsl(var(--foreground))' }}
            />
            {(searching || submitting) && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'hsl(var(--foreground-secondary))' }} />}
          </div>
          {results.length > 0 ? (
            <div className="space-y-1">
              {results.map((r) => (
                <button key={r.id} type="button" onClick={() => selectExisting(r)} disabled={submitting}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors disabled:opacity-50"
                  style={{ background: 'hsl(var(--surface-interactive) / 0.3)', border: '1px solid hsl(var(--divider))' }}>
                  <span className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>{r.name}</span>
                  <Plus className="w-3.5 h-3.5" style={{ color: TEAL }} />
                </button>
              ))}
            </div>
          ) : hasSearched && !searching ? (
            <p className="text-xs px-1" style={{ color: 'hsl(var(--foreground-quiet))' }}>No matches found.</p>
          ) : null}
        </div>
      ) : null}

      {/* Create a brand-new organization (Team Owner only) — REAL persistence (B2). */}
      {supportsCreate ? (
        <div className="space-y-2 pt-1" style={{ borderTop: '1px dashed rgba(255,255,255,0.08)' }}>
          <p className="text-[11px]" style={{ color: 'hsl(var(--foreground-secondary))' }}>
            Or create a new {role.relationship_entity_type}. You'll become the owner immediately.
          </p>
          <div className="flex items-center gap-2">
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder={`${role.relationship_entity_type} name`}
              className="flex-1 h-10 rounded-lg px-3 text-sm focus-visible:outline-none focus:border-[#1DA1A1]"
              style={{ background: 'hsl(var(--surface-interactive) / 0.4)', border: '1px solid hsl(var(--divider))', color: 'hsl(var(--foreground))' }}
            />
            <Button type="button" onClick={submitCreate} disabled={creating || !createName.trim()}
              className="text-xs font-bold gap-1.5"
              style={{ background: createName.trim() ? TEAL : 'rgba(255,255,255,0.08)', color: createName.trim() ? '#050A0A' : 'hsl(var(--foreground-quiet))' }}>
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Create
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}