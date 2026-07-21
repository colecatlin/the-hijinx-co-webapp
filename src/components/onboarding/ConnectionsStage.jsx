import React, { useState, useMemo } from 'react';
import { useOnboardingWizard } from '@/components/onboarding/OnboardingWizardContext';
import { getRole } from '@/config/onboardingRoles';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Search, Info, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const TEAL = '#1DA1A1';

// Map registry relationship_entity_type → base44 entity name.
const ENTITY_API = {
  Track: 'Track',
  Team: 'Team',
  Series: 'Series',
};

export default function ConnectionsStage() {
  const { user, pendingConnections, setPendingConnections, saveConnections } = useOnboardingWizard();

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

  const addConnection = (entry) => {
    // Avoid duplicates per role+entity.
    setPendingConnections((prev) => {
      if (prev.some((c) => c.roleId === entry.roleId && c.entityId === entry.entityId && c.mode === entry.mode)) {
        return prev;
      }
      return [...prev, entry];
    });
  };

  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    setSaving(true);
    try {
      // Phase 2: connection requests are collected here; EntityCollaborator
      // creation is wired in Phase 3/4. Pending requests never block completion.
      await saveConnections();
    } catch (e) {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
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
            existing={pendingConnections.filter((c) => c.roleId === role.id)}
            onAdd={addConnection}
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

function ConnectionRequestBuilder({ role, existing, onAdd }) {
  const [mode, setMode] = useState(role.requires_approval === 'conditional' ? 'create' : 'join');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [createFields, setCreateFields] = useState({ name: '' });

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

  const selectExisting = (entity) => {
    onAdd({
      roleId: role.id,
      roleKey: role.id,
      mode: 'join',
      entityType: role.relationship_entity_type,
      entityId: entity.id,
      entityName: entity.name,
    });
    setQuery('');
    setResults([]);
  };

  const submitCreate = () => {
    if (!createFields.name.trim()) return;
    onAdd({
      roleId: role.id,
      roleKey: role.id,
      mode: 'create',
      entityType: role.relationship_entity_type,
      entityId: null,
      entityName: createFields.name.trim(),
      createFields: { ...createFields },
    });
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

      {supportsCreate ? (
        <div className="flex gap-2">
          <button type="button" onClick={() => setMode('create')}
            className="flex-1 py-2 text-xs font-bold rounded-lg transition-all"
            style={mode === 'create'
              ? { background: 'rgba(29,161,161,0.15)', color: TEAL, border: '1px solid rgba(29,161,161,0.3)' }
              : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
            Create new
          </button>
          <button type="button" onClick={() => setMode('join')}
            className="flex-1 py-2 text-xs font-bold rounded-lg transition-all"
            style={mode === 'join'
              ? { background: 'rgba(29,161,161,0.15)', color: TEAL, border: '1px solid rgba(29,161,161,0.3)' }
              : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
            Join existing
          </button>
        </div>
      ) : null}

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
            {searching && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'rgba(255,255,255,0.4)' }} />}
          </div>
          {results.length > 0 && (
            <div className="space-y-1">
              {results.map((r) => (
                <button key={r.id} type="button" onClick={() => selectExisting(r)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors"
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

      {existing.length > 0 ? (
        <div className="space-y-1.5">
          {existing.map((c, idx) => (
            <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: 'rgba(29,161,161,0.06)', border: '1px solid rgba(29,161,161,0.2)' }}>
              <Check className="w-3.5 h-3.5" style={{ color: TEAL }} />
              <span className="text-sm flex-1" style={{ color: 'rgba(255,255,255,0.85)' }}>{c.entityName}</span>
              <span className="text-[9px] font-bold uppercase tracking-wider"
                style={{ color: c.mode === 'create' ? TEAL : 'rgba(255,255,255,0.4)' }}>
                {c.mode === 'create' ? 'New · No approval' : 'Needs approval'}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}