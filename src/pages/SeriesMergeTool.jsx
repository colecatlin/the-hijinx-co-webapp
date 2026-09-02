import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import RaceCorePageHeader from '@/components/racecore/RaceCorePageHeader';
import { GitMerge, Search, Loader2, CheckCircle2, AlertTriangle, ArrowRight, Trophy, Link2 } from 'lucide-react';

const MOTION = 'hsl(var(--motion))';
const DANGER = 'hsl(var(--danger))';
const WARNING = 'hsl(var(--warning))';

// Fields shown in the side-by-side comparison. Admin can toggle which value wins.
const COMPARISON_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'short_name', label: 'Short Name' },
  { key: 'slug', label: 'Slug' },
  { key: 'full_name', label: 'Full Name' },
  { key: 'discipline', label: 'Discipline' },
  { key: 'geographic_scope', label: 'Geographic Scope' },
  { key: 'sanctioning_body', label: 'Sanctioning Body' },
  { key: 'visibility_status', label: 'Visibility' },
  { key: 'operational_status', label: 'Operational Status' },
  { key: 'season_year', label: 'Season Year' },
  { key: 'description', label: 'Description' },
  { key: 'tagline', label: 'Tagline' },
  { key: 'website_url', label: 'Website' },
  { key: 'logo_url', label: 'Logo URL' },
  { key: 'banner_url', label: 'Banner URL' },
  { key: 'title_sponsor_name', label: 'Title Sponsor' },
];

export default function SeriesMergeTool() {
  const queryClient = useQueryClient();
  const [allSeries, setAllSeries] = useState([]);
  const [loadingSeries, setLoadingSeries] = useState(true);
  const [searchA, setSearchA] = useState('');
  const [searchB, setSearchB] = useState('');
  const [survivorId, setSurvivorId] = useState(null);
  const [duplicateId, setDuplicateId] = useState(null);
  const [fieldChoices, setFieldChoices] = useState({}); // { field: 'survivor' | 'duplicate' }
  const [reason, setReason] = useState('');
  const [merging, setMerging] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Load all series once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingSeries(true);
      try {
        const list = await base44.entities.Series.list('-created_date', 500);
        if (!cancelled) setAllSeries(list || []);
      } catch (e) {
        if (!cancelled) setError('Failed to load series records.');
      } finally {
        if (!cancelled) setLoadingSeries(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const survivor = useMemo(() => allSeries.find((s) => s.id === survivorId) || null, [allSeries, survivorId]);
  const duplicate = useMemo(() => allSeries.find((s) => s.id === duplicateId) || null, [allSeries, duplicateId]);

  // Default field choices to 'survivor' whenever selection changes
  useEffect(() => {
    const defaults = {};
    COMPARISON_FIELDS.forEach((f) => { defaults[f.key] = 'survivor'; });
    setFieldChoices(defaults);
    setResult(null);
    setError(null);
  }, [survivorId, duplicateId]);

  // Reference counts for the duplicate (preview)
  const [refCounts, setRefCounts] = useState(null);
  const [refLoading, setRefLoading] = useState(false);
  useEffect(() => {
    if (!duplicateId) { setRefCounts(null); return; }
    let cancelled = false;
    (async () => {
      setRefLoading(true);
      try {
        const [events, classes, standings, entries, sponsorships] = await Promise.all([
          base44.entities.Event.filter({ series_id: duplicateId }, '-created_date', 5000).catch(() => []),
          base44.entities.SeriesClass.filter({ series_id: duplicateId }, '-created_date', 5000).catch(() => []),
          base44.entities.Standings.filter({ series_id: duplicateId }, '-created_date', 5000).catch(() => []),
          base44.entities.Entry.filter({ series_id: duplicateId }, '-created_date', 5000).catch(() => []),
          base44.entities.Sponsorship.filter({ target_entity_type: 'Series', target_entity_id: duplicateId }, '-created_date', 5000).catch(() => []),
        ]);
        if (!cancelled) {
          setRefCounts({
            Event: events.length,
            SeriesClass: classes.length,
            Standings: standings.length,
            Entry: entries.length,
            Sponsorship: sponsorships.length,
          });
        }
      } catch (e) {
        if (!cancelled) setRefCounts(null);
      } finally {
        if (!cancelled) setRefLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [duplicateId]);

  const canMerge = survivorId && duplicateId && survivorId !== duplicateId && reason.trim().length > 0 && !merging;

  const handleMerge = async () => {
    if (!canMerge) return;
    setMerging(true);
    setError(null);
    setResult(null);
    try {
      // Build field_overrides from admin choices (only fields where duplicate won)
      const fieldOverrides = {};
      COMPARISON_FIELDS.forEach((f) => {
        if (fieldChoices[f.key] === 'duplicate' && duplicate?.[f.key] != null) {
          fieldOverrides[f.key] = duplicate[f.key];
        }
      });
      const res = await base44.functions.invoke('mergeSeriesSafely', {
        survivor_series_id: survivorId,
        duplicate_series_id: duplicateId,
        field_overrides: fieldOverrides,
        reason: reason.trim(),
      });
      const data = res?.data || res;
      if (data?.ok) {
        setResult(data);
        queryClient.invalidateQueries({ queryKey: ['series'] });
        queryClient.invalidateQueries({ queryKey: ['searchSeries'] });
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
    return allSeries.filter((s) => !q || (s.name || '').toLowerCase().includes(q) || (s.slug || '').toLowerCase().includes(q)).slice(0, 8);
  }, [allSeries, searchA]);
  const filteredB = useMemo(() => {
    const q = searchB.toLowerCase();
    return allSeries.filter((s) => !q || (s.name || '').toLowerCase().includes(q) || (s.slug || '').toLowerCase().includes(q)).slice(0, 8);
  }, [allSeries, searchB]);

  return (
    <div className="flex flex-col h-full">
      <RaceCorePageHeader
        icon={GitMerge}
        title="Series Merge Tool"
        subtitle="Manually merge two Series records into one"
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
              The duplicate series has been deactivated and all references re-pointed to the survivor.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
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

        {/* Step 1: Selection */}
        {!result && (
          <>
            <section className="rounded-xl p-5 space-y-4" style={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--divider))' }}>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black" style={{ background: MOTION, color: 'hsl(var(--canvas))' }}>1</span>
                <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: 'hsl(var(--foreground))' }}>Select Two Series Records</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Survivor picker */}
                <SeriesPicker
                  label="Survivor (keep)"
                  accent={MOTION}
                  accentIcon={Trophy}
                  search={searchA}
                  setSearch={setSearchA}
                  filtered={filteredA}
                  selectedId={survivorId}
                  onSelect={(id) => setSurvivorId(id)}
                  loading={loadingSeries}
                  allSeries={allSeries}
                />
                {/* Duplicate picker */}
                <SeriesPicker
                  label="Duplicate (absorb & deactivate)"
                  accent={DANGER}
                  accentIcon={AlertTriangle}
                  search={searchB}
                  setSearch={setSearchB}
                  filtered={filteredB}
                  selectedId={duplicateId}
                  onSelect={(id) => setDuplicateId(id)}
                  loading={loadingSeries}
                  allSeries={allSeries}
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
                      {COMPARISON_FIELDS.map((f) => {
                        const choice = fieldChoices[f.key] || 'survivor';
                        const sVal = survivor?.[f.key];
                        const dVal = duplicate?.[f.key];
                        const same = (sVal ?? '') === (dVal ?? '');
                        return (
                          <tr key={f.key} style={{ borderBottom: '1px solid hsl(var(--divider) / 0.5)' }}>
                            <td className="py-2 px-2 text-[11px] font-bold uppercase tracking-wider align-top" style={{ color: 'hsl(var(--foreground-quiet))' }}>{f.label}</td>
                            <td className="py-2 px-2 align-top">
                              <button
                                onClick={() => setFieldChoices((p) => ({ ...p, [f.key]: 'survivor' }))}
                                className="text-left w-full rounded-md px-2 py-1.5 transition-all"
                                style={{
                                  background: choice === 'survivor' ? 'hsl(var(--motion) / 0.12)' : 'transparent',
                                  border: choice === 'survivor' ? `1px solid hsl(var(--motion) / 0.4)` : '1px solid transparent',
                                  color: choice === 'survivor' ? MOTION : 'hsl(var(--foreground-secondary))',
                                  fontWeight: choice === 'survivor' ? 700 : 400,
                                }}
                              >
                                <FieldValue value={sVal} />
                              </button>
                            </td>
                            <td className="py-2 px-2 align-top">
                              <button
                                onClick={() => setFieldChoices((p) => ({ ...p, [f.key]: 'duplicate' }))}
                                className="text-left w-full rounded-md px-2 py-1.5 transition-all"
                                style={{
                                  background: choice === 'duplicate' ? 'hsl(var(--danger) / 0.12)' : 'transparent',
                                  border: choice === 'duplicate' ? `1px solid hsl(var(--danger) / 0.4)` : '1px solid transparent',
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {Object.entries(refCounts).map(([k, v]) => (
                      <div key={k} className="rounded-lg px-3 py-3 text-center" style={{ background: 'hsl(var(--surface-interactive))', border: '1px solid hsl(var(--divider))' }}>
                        <div className="flex items-center justify-center mb-1">
                          <Link2 className="w-3.5 h-3.5" style={{ color: v > 0 ? WARNING : 'hsl(var(--foreground-quiet))' }} />
                        </div>
                        <div className="text-xl font-black" style={{ color: v > 0 ? 'hsl(var(--foreground))' : 'hsl(var(--foreground-quiet))' }}>{v}</div>
                        <div className="text-[9px] font-mono uppercase tracking-wider mt-0.5" style={{ color: 'hsl(var(--foreground-quiet))' }}>{k}</div>
                      </div>
                    ))}
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
                    <span className="font-bold" style={{ color: MOTION }}>{survivor.name || 'Survivor'}</span>
                    {' will absorb '}
                    <span className="font-bold" style={{ color: DANGER }}>{duplicate.name || 'Duplicate'}</span>
                    {'. The duplicate will be deactivated. This action is irreversible.'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'hsl(var(--foreground-quiet))' }}>Reason for merge (required)</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    placeholder="e.g. Two records created for the same series by different imports."
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

// ── Series picker sub-component ──────────────────────────────────────────────
function SeriesPicker({ label, accent, accentIcon: AccentIcon, search, setSearch, filtered, selectedId, onSelect, loading, allSeries }) {
  const selected = allSeries.find((s) => s.id === selectedId) || null;
  return (
    <div className="rounded-lg p-4 space-y-3" style={{ background: 'hsl(var(--surface-interactive))', border: `1px solid ${selectedId ? accent + '55' : 'hsl(var(--divider))'}` }}>
      <div className="flex items-center gap-2">
        <AccentIcon className="w-3.5 h-3.5" style={{ color: accent }} />
        <span className="text-[10px] font-mono uppercase tracking-wider font-bold" style={{ color: accent }}>{label}</span>
      </div>
      {selected ? (
        <div className="space-y-1">
          <div className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>{selected.name || 'Unnamed'}</div>
          <div className="text-[11px] font-mono" style={{ color: 'hsl(var(--foreground-quiet))' }}>{selected.slug || selected.id}</div>
          {selected.discipline && <div className="text-[11px]" style={{ color: 'hsl(var(--foreground-quiet))' }}>{selected.discipline}</div>}
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
              placeholder="Search series…"
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
                  <div className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{s.name || 'Unnamed'}</div>
                  <div className="text-[10px] font-mono" style={{ color: 'hsl(var(--foreground-quiet))' }}>{s.slug || s.id}</div>
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