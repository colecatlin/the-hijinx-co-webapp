import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import RaceCorePageHeader from '@/components/racecore/RaceCorePageHeader';
import { GitMerge, Search, Loader2, CheckCircle2, AlertTriangle, ArrowRight, Link2, Trophy, User, Users, MapPin, Flag } from 'lucide-react';

const MOTION = 'hsl(var(--motion))';
const DANGER = 'hsl(var(--danger))';
const WARNING = 'hsl(var(--warning))';

// ── Per-entity-type configuration ────────────────────────────────────────────
const ENTITY_CONFIG = {
  Series: {
    label: 'Series', icon: Trophy,
    fields: ['name', 'short_name', 'slug', 'full_name', 'discipline', 'geographic_scope', 'sanctioning_body', 'visibility_status', 'operational_status', 'season_year', 'description', 'tagline', 'website_url', 'logo_url', 'banner_url', 'title_sponsor_name'],
    getName: (r) => r.name || '',
    getSub: (r) => r.slug || r.id,
    references: [
      { entity: 'Event', field: 'series_id', label: 'Events' },
      { entity: 'SeriesClass', field: 'series_id', label: 'Classes' },
      { entity: 'Standings', field: 'series_id', label: 'Standings' },
      { entity: 'Entry', field: 'series_id', label: 'Entries' },
      { entity: 'Sponsorship', polymorphic: true, type: 'Series', label: 'Sponsorships' },
    ],
  },
  Driver: {
    label: 'Driver', icon: User,
    fields: ['first_name', 'last_name', 'slug', 'primary_number', 'hometown_city', 'hometown_state', 'hometown_country', 'racing_status', 'date_of_birth', 'contact_email', 'manufacturer'],
    getName: (r) => `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.slug || r.id,
    getSub: (r) => r.slug || r.id,
    references: [
      { entity: 'Results', field: 'driver_id', label: 'Results' },
      { entity: 'Entry', field: 'driver_id', label: 'Entries' },
      { entity: 'Standings', field: 'driver_id', label: 'Standings' },
      { entity: 'DriverProgram', field: 'driver_id', label: 'Programs' },
      { entity: 'DriverMedia', field: 'driver_id', label: 'Media' },
      { entity: 'Vehicle', field: 'owner_driver_id', label: 'Vehicles' },
    ],
  },
  Team: {
    label: 'Team', icon: Users,
    fields: ['name', 'slug', 'headquarters_city', 'headquarters_state', 'country', 'primary_discipline', 'racing_status', 'description', 'website_url', 'logo_url'],
    getName: (r) => r.name || '',
    getSub: (r) => r.slug || r.id,
    references: [
      { entity: 'Driver', field: 'team_id', label: 'Drivers' },
      { entity: 'Entry', field: 'team_id', label: 'Entries' },
      { entity: 'Vehicle', field: 'owner_team_id', label: 'Vehicles' },
      { entity: 'Sponsorship', polymorphic: true, type: 'Team', label: 'Sponsorships' },
    ],
  },
  Track: {
    label: 'Track', icon: MapPin,
    fields: ['name', 'slug', 'location_city', 'location_state', 'location_country', 'track_type', 'visibility_status', 'operational_status', 'description', 'website_url', 'logo_url'],
    getName: (r) => r.name || '',
    getSub: (r) => r.slug || r.id,
    references: [
      { entity: 'Event', field: 'track_id', label: 'Events' },
      { entity: 'Sponsorship', polymorphic: true, type: 'Track', label: 'Sponsorships' },
    ],
  },
  Event: {
    label: 'Event', icon: Flag,
    fields: ['name', 'slug', 'series_name', 'season', 'event_date', 'end_date', 'location_note', 'track_name', 'status', 'published_flag', 'description'],
    getName: (r) => r.name || '',
    getSub: (r) => r.slug || r.id,
    references: [
      { entity: 'Entry', field: 'event_id', label: 'Entries' },
      { entity: 'Session', field: 'event_id', label: 'Sessions' },
      { entity: 'EventClass', field: 'event_id', label: 'Classes' },
      { entity: 'Results', field: 'event_id', label: 'Results' },
      { entity: 'Sponsorship', polymorphic: true, type: 'Event', label: 'Sponsorships' },
    ],
  },
};

export default function ManualMergeTool() {
  const queryClient = useQueryClient();
  const [entityType, setEntityType] = useState('Series');
  const [allRecords, setAllRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [searchA, setSearchA] = useState('');
  const [searchB, setSearchB] = useState('');
  const [survivorId, setSurvivorId] = useState(null);
  const [duplicateId, setDuplicateId] = useState(null);
  const [fieldChoices, setFieldChoices] = useState({});
  const [reason, setReason] = useState('');
  const [merging, setMerging] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const cfg = ENTITY_CONFIG[entityType];

  // Load records whenever entity type changes
  useEffect(() => {
    let cancelled = false;
    setSurvivorId(null);
    setDuplicateId(null);
    setSearchA('');
    setSearchB('');
    setResult(null);
    setError(null);
    (async () => {
      setLoadingRecords(true);
      try {
        const list = await base44.entities[entityType].list('-created_date', 500);
        if (!cancelled) setAllRecords(list || []);
      } catch (e) {
        if (!cancelled) setError(`Failed to load ${entityType} records.`);
      } finally {
        if (!cancelled) setLoadingRecords(false);
      }
    })();
    return () => { cancelled = true; };
  }, [entityType]);

  const survivor = useMemo(() => allRecords.find((s) => s.id === survivorId) || null, [allRecords, survivorId]);
  const duplicate = useMemo(() => allRecords.find((s) => s.id === duplicateId) || null, [allRecords, duplicateId]);

  // Default field choices to 'survivor' whenever selection changes
  useEffect(() => {
    const defaults = {};
    cfg.fields.forEach((f) => { defaults[f] = 'survivor'; });
    setFieldChoices(defaults);
    setResult(null);
    setError(null);
  }, [survivorId, duplicateId, entityType]);

  // Reference counts for the duplicate (preview)
  const [refCounts, setRefCounts] = useState(null);
  const [refLoading, setRefLoading] = useState(false);
  useEffect(() => {
    if (!duplicateId) { setRefCounts(null); return; }
    let cancelled = false;
    (async () => {
      setRefLoading(true);
      try {
        const counts = {};
        await Promise.all(cfg.references.map(async (ref) => {
          const filter = ref.polymorphic
            ? { target_entity_type: ref.type, target_entity_id: duplicateId }
            : { [ref.field]: duplicateId };
          const records = await base44.entities[ref.entity].filter(filter, '-created_date', 5000).catch(() => []);
          counts[ref.label] = records.length;
        }));
        if (!cancelled) setRefCounts(counts);
      } catch (e) {
        if (!cancelled) setRefCounts(null);
      } finally {
        if (!cancelled) setRefLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [duplicateId, entityType]);

  const canMerge = survivorId && duplicateId && survivorId !== duplicateId && reason.trim().length > 0 && !merging;

  const handleMerge = async () => {
    if (!canMerge) return;
    setMerging(true);
    setError(null);
    setResult(null);
    try {
      const fieldOverrides = {};
      cfg.fields.forEach((f) => {
        if (fieldChoices[f] === 'duplicate' && duplicate?.[f] != null) {
          fieldOverrides[f] = duplicate[f];
        }
      });
      const res = await base44.functions.invoke('mergeRecordsSafely', {
        entity_type: entityType,
        survivor_id: survivorId,
        duplicate_id: duplicateId,
        field_overrides: fieldOverrides,
        reason: reason.trim(),
      });
      const data = res?.data || res;
      if (data?.ok) {
        setResult(data);
        queryClient.invalidateQueries({ queryKey: [entityType.toLowerCase()] });
      } else {
        setError(data?.error || 'Merge failed.');
      }
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Merge failed.');
    } finally {
      setMerging(false);
    }
  };

  const reset = () => {
    setSurvivorId(null);
    setDuplicateId(null);
    setSearchA('');
    setSearchB('');
    setReason('');
    setResult(null);
    setError(null);
  };

  const filteredA = useMemo(() => {
    const q = searchA.toLowerCase();
    return allRecords.filter((s) => !q || cfg.getName(s).toLowerCase().includes(q) || (s.slug || '').toLowerCase().includes(q)).slice(0, 8);
  }, [allRecords, searchA, entityType]);
  const filteredB = useMemo(() => {
    const q = searchB.toLowerCase();
    return allRecords.filter((s) => !q || cfg.getName(s).toLowerCase().includes(q) || (s.slug || '').toLowerCase().includes(q)).slice(0, 8);
  }, [allRecords, searchB, entityType]);

  return (
    <div className="flex flex-col h-full">
      <RaceCorePageHeader
        icon={GitMerge}
        title="Manual Merge Tool"
        subtitle="Merge any two duplicate records into one"
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        {error && (
          <div className="rounded-lg px-4 py-3 flex items-start gap-2 text-sm" style={{ background: 'hsl(var(--danger) / 0.1)', border: '1px solid hsl(var(--danger) / 0.3)', color: 'hsl(var(--danger))' }}>
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="rounded-xl p-5 space-y-3" style={{ background: 'hsl(var(--success) / 0.08)', border: '1px solid hsl(var(--success) / 0.3)' }}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" style={{ color: 'hsl(var(--success))' }} />
              <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: 'hsl(var(--success))' }}>Merge Complete</h3>
            </div>
            <p className="text-sm" style={{ color: 'hsl(var(--foreground-secondary))' }}>
              The duplicate {result.entity_type} has been deactivated and all references re-pointed to the survivor.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 pt-1">
              {Object.entries(result.references_repaired || {}).map(([k, v]) => (
                <div key={k} className="rounded-lg px-3 py-2 text-center" style={{ background: 'hsl(var(--surface-interactive))' }}>
                  <div className="text-lg font-black" style={{ color: MOTION }}>{v}</div>
                  <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color: 'hsl(var(--foreground-quiet))' }}>{k}</div>
                </div>
              ))}
            </div>
            <button onClick={reset} className="text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg" style={{ background: MOTION, color: 'hsl(var(--canvas))' }}>
              Start New Merge
            </button>
          </div>
        )}

        {!result && (
          <>
            {/* Entity type selector */}
            <section className="rounded-xl p-4" style={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--divider))' }}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider mr-1" style={{ color: 'hsl(var(--foreground-quiet))' }}>Entity type:</span>
                {Object.entries(ENTITY_CONFIG).map(([key, ec]) => {
                  const Icon = ec.icon;
                  const active = entityType === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setEntityType(key)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                      style={{
                        background: active ? MOTION : 'hsl(var(--surface-interactive))',
                        color: active ? 'hsl(var(--canvas))' : 'hsl(var(--foreground-secondary))',
                        border: active ? 'none' : '1px solid hsl(var(--divider))',
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {ec.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Step 1: Selection */}
            <section className="rounded-xl p-5 space-y-4" style={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--divider))' }}>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black" style={{ background: MOTION, color: 'hsl(var(--canvas))' }}>1</span>
                <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: 'hsl(var(--foreground))' }}>Select Two {cfg.label} Records</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <RecordPicker
                  label="Survivor (keep)"
                  accent={MOTION}
                  search={searchA}
                  setSearch={setSearchA}
                  filtered={filteredA}
                  selectedId={survivorId}
                  onSelect={(id) => setSurvivorId(id)}
                  loading={loadingRecords}
                  allRecords={allRecords}
                  getName={cfg.getName}
                  getSub={cfg.getSub}
                />
                <RecordPicker
                  label="Duplicate (absorb & deactivate)"
                  accent={DANGER}
                  search={searchB}
                  setSearch={setSearchB}
                  filtered={filteredB}
                  selectedId={duplicateId}
                  onSelect={(id) => setDuplicateId(id)}
                  loading={loadingRecords}
                  allRecords={allRecords}
                  getName={cfg.getName}
                  getSub={cfg.getSub}
                />
              </div>
            </section>

            {/* Step 2: Field comparison */}
            {survivor && duplicate && (
              <section className="rounded-xl p-5 space-y-4" style={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--divider))' }}>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black" style={{ background: MOTION, color: 'hsl(var(--canvas))' }}>2</span>
                  <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: 'hsl(var(--foreground))' }}>Choose Winning Field Values</h2>
                </div>
                <p className="text-xs" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                  Click a value to choose which record's data wins on the surviving record. Defaults to the survivor's existing value.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid hsl(var(--divider))' }}>
                        <th className="text-left py-2 px-2 text-[10px] font-mono uppercase tracking-wider" style={{ color: 'hsl(var(--foreground-quiet))' }}>Field</th>
                        <th className="text-left py-2 px-2 text-[10px] font-mono uppercase tracking-wider" style={{ color: MOTION }}>Survivor</th>
                        <th className="text-left py-2 px-2 text-[10px] font-mono uppercase tracking-wider" style={{ color: DANGER }}>Duplicate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cfg.fields.map((f) => {
                        const choice = fieldChoices[f] || 'survivor';
                        const sVal = survivor?.[f];
                        const dVal = duplicate?.[f];
                        const same = (sVal ?? '') === (dVal ?? '');
                        return (
                          <tr key={f} style={{ borderBottom: '1px solid hsl(var(--divider) / 0.5)' }}>
                            <td className="py-2 px-2 text-[11px] font-bold uppercase tracking-wider align-top w-32" style={{ color: 'hsl(var(--foreground-quiet))' }}>{f.replace(/_/g, ' ')}</td>
                            <td className="py-2 px-2 align-top">
                              <button
                                onClick={() => setFieldChoices((p) => ({ ...p, [f]: 'survivor' }))}
                                className="text-left w-full rounded-md px-2 py-1.5 transition-all"
                                style={{
                                  background: choice === 'survivor' ? 'hsl(var(--motion) / 0.12)' : 'transparent',
                                  border: choice === 'survivor' ? '1px solid hsl(var(--motion) / 0.4)' : '1px solid transparent',
                                  color: choice === 'survivor' ? MOTION : 'hsl(var(--foreground-secondary))',
                                  fontWeight: choice === 'survivor' ? 700 : 400,
                                }}
                              >
                                <FieldValue value={sVal} />
                              </button>
                            </td>
                            <td className="py-2 px-2 align-top">
                              <button
                                onClick={() => setFieldChoices((p) => ({ ...p, [f]: 'duplicate' }))}
                                className="text-left w-full rounded-md px-2 py-1.5 transition-all"
                                style={{
                                  background: choice === 'duplicate' ? 'hsl(var(--danger) / 0.12)' : 'transparent',
                                  border: choice === 'duplicate' ? '1px solid hsl(var(--danger) / 0.4)' : '1px solid transparent',
                                  color: choice === 'duplicate' ? DANGER : same ? 'hsl(var(--foreground-quiet))' : 'hsl(var(--foreground-secondary))',
                                  fontWeight: choice === 'duplicate' ? 700 : 400,
                                }}
                              >
                                <FieldValue value={dVal} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Step 3: References preview */}
            {survivor && duplicate && (
              <section className="rounded-xl p-5 space-y-4" style={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--divider))' }}>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black" style={{ background: MOTION, color: 'hsl(var(--canvas))' }}>3</span>
                  <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: 'hsl(var(--foreground))' }}>References to Re-point</h2>
                </div>
                <p className="text-xs" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                  These records currently point at the duplicate and will be re-pointed to the survivor on merge.
                </p>
                {refLoading ? (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                    <Loader2 className="w-4 h-4 animate-spin" /> Counting references…
                  </div>
                ) : refCounts ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {cfg.references.map((ref) => {
                      const v = refCounts[ref.label] || 0;
                      return (
                        <div key={ref.label} className="rounded-lg px-3 py-3 text-center" style={{ background: 'hsl(var(--surface-interactive))', border: '1px solid hsl(var(--divider))' }}>
                          <div className="flex items-center justify-center mb-1">
                            <Link2 className="w-3.5 h-3.5" style={{ color: v > 0 ? WARNING : 'hsl(var(--foreground-quiet))' }} />
                          </div>
                          <div className="text-xl font-black" style={{ color: v > 0 ? 'hsl(var(--foreground))' : 'hsl(var(--foreground-quiet))' }}>{v}</div>
                          <div className="text-[9px] font-mono uppercase tracking-wider mt-0.5" style={{ color: 'hsl(var(--foreground-quiet))' }}>{ref.label}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs" style={{ color: 'hsl(var(--foreground-quiet))' }}>Unable to load reference counts.</p>
                )}
              </section>
            )}

            {/* Step 4: Confirm */}
            {survivor && duplicate && (
              <section className="rounded-xl p-5 space-y-4" style={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--divider))' }}>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black" style={{ background: MOTION, color: 'hsl(var(--canvas))' }}>4</span>
                  <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: 'hsl(var(--foreground))' }}>Confirm & Execute</h2>
                </div>

                <div className="flex items-center gap-3 text-sm rounded-lg px-4 py-3" style={{ background: 'hsl(var(--warning) / 0.08)', border: '1px solid hsl(var(--warning) / 0.3)' }}>
                  <ArrowRight className="w-4 h-4 shrink-0" style={{ color: WARNING }} />
                  <span style={{ color: 'hsl(var(--foreground-secondary))' }}>
                    <span className="font-bold" style={{ color: MOTION }}>{cfg.getName(survivor)}</span>
                    {' will absorb '}
                    <span className="font-bold" style={{ color: DANGER }}>{cfg.getName(duplicate)}</span>
                    {'. The duplicate will be deactivated. This action is irreversible.'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'hsl(var(--foreground-quiet))' }}>Reason for merge (required)</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    placeholder="e.g. Two records created for the same entity by different imports."
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
                    style={{ background: 'hsl(var(--surface-interactive))', border: '1px solid hsl(var(--divider))', color: 'hsl(var(--foreground))' }}
                  />
                </div>

                <button
                  onClick={handleMerge}
                  disabled={!canMerge}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-black uppercase tracking-wider transition-all"
                  style={{
                    background: canMerge ? DANGER : 'hsl(var(--surface-interactive))',
                    color: canMerge ? 'hsl(var(--canvas))' : 'hsl(var(--foreground-quiet))',
                    border: canMerge ? 'none' : '1px solid hsl(var(--divider))',
                    cursor: canMerge ? 'pointer' : 'not-allowed',
                  }}
                >
                  {merging ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitMerge className="w-4 h-4" />}
                  {merging ? 'Merging…' : 'Confirm Merge'}
                </button>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Record picker sub-component ──────────────────────────────────────────────
function RecordPicker({ label, accent, search, setSearch, filtered, selectedId, onSelect, loading, allRecords, getName, getSub }) {
  const selected = allRecords.find((s) => s.id === selectedId) || null;
  return (
    <div className="rounded-lg p-4 space-y-3" style={{ background: 'hsl(var(--surface-interactive))', border: `1px solid ${selectedId ? accent + '55' : 'hsl(var(--divider))'}` }}>
      <span className="text-[10px] font-mono uppercase tracking-wider font-bold" style={{ color: accent }}>{label}</span>
      {selected ? (
        <div className="space-y-1">
          <div className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>{getName(selected)}</div>
          <div className="text-[11px] font-mono" style={{ color: 'hsl(var(--foreground-quiet))' }}>{getSub(selected)}</div>
          <button onClick={() => onSelect(null)} className="text-[10px] font-bold uppercase tracking-wider mt-1" style={{ color: accent }}>
            Change selection
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-md px-2.5 py-2" style={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--divider))' }}>
            <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'hsl(var(--foreground-quiet))' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: 'hsl(var(--foreground))' }}
            />
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-xs py-2" style={{ color: 'hsl(var(--foreground-quiet))' }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-xs py-2" style={{ color: 'hsl(var(--foreground-quiet))' }}>No matches.</p>
              ) : filtered.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onSelect(s.id)}
                  className="w-full text-left rounded-md px-2.5 py-2 transition-all"
                  style={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--divider))' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = accent + '66'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'hsl(var(--divider))'; }}
                >
                  <div className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{getName(s)}</div>
                  <div className="text-[10px] font-mono" style={{ color: 'hsl(var(--foreground-quiet))' }}>{getSub(s)}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Field value renderer ─────────────────────────────────────────────────────
function FieldValue({ value }) {
  if (value == null || value === '') {
    return <span className="text-xs italic" style={{ color: 'hsl(var(--foreground-quiet))' }}>— empty —</span>;
  }
  const str = typeof value === 'string' ? value : String(value);
  const display = str.length > 60 ? str.slice(0, 57) + '…' : str;
  return <span className="text-xs break-words">{display}</span>;
}