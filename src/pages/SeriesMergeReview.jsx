import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import RaceCorePageHeader from '@/components/racecore/RaceCorePageHeader';
import { GitMerge, Search, Loader2, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';

export default function SeriesMergeReview() {
  const queryClient = useQueryClient();
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [groupRecords, setGroupRecords] = useState({}); // { groupIndex: [full series records] }
  const [eventCounts, setEventCounts] = useState({}); // { seriesId: count }
  const [mergeStatus, setMergeStatus] = useState({}); // { groupIndex: { state, result } }
  const [expandedGroup, setExpandedGroup] = useState(null);

  // ── Scan for duplicate groups ──────────────────────────────────────────────
  const handleScan = useCallback(async () => {
    setScanning(true);
    setScanResult(null);
    setGroupRecords({});
    setEventCounts({});
    setMergeStatus({});
    try {
      const res = await base44.functions.invoke('findDuplicateSeriesGroups', {});
      const data = res?.data || res;
      setScanResult(data);

      // Fetch full series records + event counts for each group
      if (data?.duplicate_groups?.length) {
        const recordsMap = {};
        const countsMap = {};
        for (let i = 0; i < data.duplicate_groups.length; i++) {
          const group = data.duplicate_groups[i];
          const records = [];
          for (const id of group.record_ids) {
            const rec = await base44.entities.Series.get(id).catch(() => null);
            if (rec) records.push(rec);
          }
          recordsMap[i] = records;
          // Fetch event counts
          for (const rec of records) {
            const evts = await base44.entities.Event.filter({ series_id: rec.id }).catch(() => []);
            countsMap[rec.id] = evts.length;
          }
        }
        setGroupRecords(recordsMap);
        setEventCounts(countsMap);
      }
    } catch (err) {
      setScanResult({ error: err.message });
    } finally {
      setScanning(false);
    }
  }, []);

  // ── Execute merge for a single group ───────────────────────────────────────
  const handleMergeGroup = useCallback(async (groupIndex) => {
    setMergeStatus(prev => ({ ...prev, [groupIndex]: { state: 'running' } }));
    try {
      // Step 1: Repair duplicate records (marks dups inactive, picks survivor)
      const repairRes = await base44.functions.invoke('repairDuplicateSeriesRecords', {
        dry_run: false,
      });
      const repairData = repairRes?.data || repairRes;

      // Step 2: Redirect references using the repairs array from step 1
      const repairs = repairData?.repairs || [];
      let refData = null;
      if (repairs.length > 0) {
        const refRes = await base44.functions.invoke('repairSeriesReferences', {
          repairs,
          dry_run: false,
        });
        refData = refRes?.data || refRes;
      }

      setMergeStatus(prev => ({
        ...prev,
        [groupIndex]: {
          state: 'done',
          repair: repairData,
          references: refData,
        },
      }));

      // Invalidate series queries so lists refresh
      queryClient.invalidateQueries({ queryKey: ['series'] });
      queryClient.invalidateQueries({ queryKey: ['series-all'] });
    } catch (err) {
      setMergeStatus(prev => ({
        ...prev,
        [groupIndex]: { state: 'error', error: err.message },
      }));
    }
  }, [queryClient]);

  // ── Dry-run preview for a single group ─────────────────────────────────────
  const handlePreviewGroup = useCallback(async (groupIndex) => {
    setMergeStatus(prev => ({ ...prev, [groupIndex]: { state: 'previewing' } }));
    try {
      const res = await base44.functions.invoke('repairDuplicateSeriesRecords', {
        dry_run: true,
      });
      const data = res?.data || res;
      setMergeStatus(prev => ({
        ...prev,
        [groupIndex]: { state: 'previewed', preview: data },
      }));
    } catch (err) {
      setMergeStatus(prev => ({
        ...prev,
        [groupIndex]: { state: 'error', error: err.message },
      }));
    }
  }, []);

  const totalGroups = scanResult?.duplicate_groups?.length || 0;

  return (
    <div className="flex flex-col h-full" style={{ background: 'hsl(var(--canvas))' }}>
      <RaceCorePageHeader
        icon={GitMerge}
        title="Series Merge Review"
        subtitle="Detect & consolidate duplicate series records"
        actions={
          <button
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest rounded border border-motion/30 bg-motion/10 text-motion hover:bg-motion/20 transition-colors disabled:opacity-50"
          >
            {scanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
            {scanning ? 'Scanning…' : 'Scan for Duplicates'}
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-5xl mx-auto w-full">
        {/* Empty state — before scan */}
        {!scanResult && !scanning && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <GitMerge className="w-10 h-10 text-foreground-quiet/40 mb-4" />
            <p className="text-sm text-foreground-secondary mb-1">No scan run yet</p>
            <p className="text-xs text-foreground-quiet max-w-md">
              Click <span className="text-motion font-semibold">Scan for Duplicates</span> to detect
              series records that may be duplicates based on name, external ID, or canonical key.
              You'll be able to review each group side-by-side and merge with one click — all linked
              events, drivers, classes, and standings are automatically redirected to the survivor.
            </p>
          </div>
        )}

        {/* Scanning state */}
        {scanning && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-motion animate-spin mb-3" />
            <p className="text-xs font-mono text-foreground-quiet uppercase tracking-widest">
              Scanning all series records…
            </p>
          </div>
        )}

        {/* Scan error */}
        {scanResult?.error && (
          <div className="p-4 rounded-lg border border-danger/30 bg-danger/10">
            <div className="flex items-center gap-2 text-danger text-sm font-semibold mb-1">
              <AlertTriangle className="w-4 h-4" />
              Scan Failed
            </div>
            <p className="text-xs text-foreground-secondary">{scanResult.error}</p>
          </div>
        )}

        {/* Scan results */}
        {scanResult && !scanResult.error && (
          <>
            {/* Summary bar */}
            <div className="flex items-center gap-4 mb-6 p-3 rounded-lg border border-divider bg-surface">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-mono font-bold text-foreground">{totalGroups}</span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-foreground-quiet">
                  duplicate groups
                </span>
              </div>
              <div className="h-6 w-px bg-divider" />
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-foreground-secondary">
                  {scanResult.total_series} total series
                </span>
              </div>
              {totalGroups === 0 && (
                <div className="flex items-center gap-2 ml-auto text-success">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-semibold">No duplicates detected</span>
                </div>
              )}
            </div>

            {/* Duplicate group cards */}
            {scanResult.duplicate_groups.map((group, gi) => {
              const records = groupRecords[gi] || [];
              const status = mergeStatus[gi] || { state: 'idle' };
              const isExpanded = expandedGroup === gi || status.state === 'done';

              return (
                <div
                  key={gi}
                  className="mb-4 rounded-lg border border-divider bg-surface overflow-hidden"
                >
                  {/* Group header */}
                  <button
                    onClick={() => setExpandedGroup(isExpanded ? null : gi)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-interactive transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-motion bg-motion/10 px-2 py-0.5 rounded shrink-0">
                        {group.match_type}
                      </span>
                      <span className="text-sm font-semibold text-foreground truncate">
                        {group.names.join('  /  ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-foreground-quiet">
                        {group.count} records
                      </span>
                      {status.state === 'done' && (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      )}
                    </div>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-divider p-4">
                      {/* Side-by-side records */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                        {records.map((rec) => {
                          const evtCount = eventCounts[rec.id] ?? 0;
                          const isRecommended = status.preview?.survivors?.some(
                            s => s.id === rec.id
                          );
                          const isSurvivor = status.result?.survivors?.some(
                            s => s.id === rec.id
                          );
                          const isMergedDup = status.result?.duplicates_marked_inactive?.some(
                            d => d.id === rec.id
                          );

                          return (
                            <div
                              key={rec.id}
                              className={`p-3 rounded-lg border ${
                                isSurvivor
                                  ? 'border-success/40 bg-success/5'
                                  : isMergedDup
                                  ? 'border-foreground-quiet/30 bg-surface-interactive/30 opacity-60'
                                  : isRecommended
                                  ? 'border-motion/40 bg-motion/5'
                                  : 'border-divider bg-surface-elevated'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <span className="text-sm font-semibold text-foreground truncate">
                                  {rec.name}
                                </span>
                                {(isRecommended || isSurvivor) && (
                                  <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-success bg-success/10 px-1.5 py-0.5 rounded shrink-0">
                                    {isSurvivor ? 'Survivor' : 'Recommended'}
                                  </span>
                                )}
                                {isMergedDup && (
                                  <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-foreground-quiet bg-surface-interactive px-1.5 py-0.5 rounded shrink-0">
                                    Merged
                                  </span>
                                )}
                              </div>
                              <div className="space-y-1 text-[11px] font-mono text-foreground-quiet">
                                <div className="flex justify-between">
                                  <span>Status</span>
                                  <span className="text-foreground-secondary">{rec.operational_status || '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Visibility</span>
                                  <span className="text-foreground-secondary">{rec.visibility_status || '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Events</span>
                                  <span className={`font-bold ${evtCount > 0 ? 'text-motion' : 'text-foreground-quiet'}`}>
                                    {evtCount}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Discipline</span>
                                  <span className="text-foreground-secondary">{rec.discipline || '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Ext UID</span>
                                  <span className="text-foreground-secondary truncate ml-2 max-w-[120px]">
                                    {rec.external_uid || '—'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Created</span>
                                  <span className="text-foreground-secondary">
                                    {rec.created_date
                                      ? new Date(rec.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                      : '—'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Norm Name</span>
                                  <span className="text-foreground-secondary truncate ml-2 max-w-[140px]">
                                    {rec.normalized_name || '—'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Match info */}
                      <div className="text-[10px] font-mono text-foreground-quiet mb-3">
                        Matched on <span className="text-motion">{group.match_type}</span>: <span className="text-foreground-secondary">{group.key}</span>
                      </div>

                      {/* Preview result */}
                      {status.state === 'previewed' && status.preview && (
                        <div className="mb-3 p-3 rounded-lg border border-motion/20 bg-motion/5">
                          <p className="text-[10px] font-mono uppercase tracking-widest text-motion mb-2">
                            Preview — what will happen
                          </p>
                          {status.preview.survivors?.map(s => (
                            <div key={s.id} className="text-xs text-foreground-secondary mb-1">
                              <span className="text-success font-semibold">Survivor:</span> {s.name} ({s.event_count} events)
                            </div>
                          ))}
                          {status.preview.duplicates_marked_inactive?.map(d => (
                            <div key={d.id} className="text-xs text-foreground-quiet">
                              <ArrowRight className="w-3 h-3 inline mr-1" />
                              {d.name} → marked Inactive, redirected to {d.survivor_name}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Merge result */}
                      {status.state === 'done' && status.result && (
                        <div className="mb-3 p-3 rounded-lg border border-success/20 bg-success/5">
                          <div className="flex items-center gap-2 text-success text-xs font-semibold mb-2">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Merge Complete
                          </div>
                          {status.result.duplicates_marked_inactive?.map(d => (
                            <div key={d.id} className="text-xs text-foreground-secondary mb-1">
                              <span className="text-foreground-quiet">{d.name}</span>
                              <ArrowRight className="w-3 h-3 inline mx-1" />
                              <span className="text-success">{d.survivor_name}</span>
                            </div>
                          ))}
                          {status.references?.report && (
                            <div className="mt-2 pt-2 border-t border-divider text-[10px] font-mono text-foreground-quiet">
                              Redirected: {status.references.report.updated_events} events,{' '}
                              {status.references.report.updated_drivers} drivers,{' '}
                              {status.references.report.updated_series_classes} classes,{' '}
                              {status.references.report.updated_standings} standings
                            </div>
                          )}
                        </div>
                      )}

                      {/* Error state */}
                      {status.state === 'error' && (
                        <div className="mb-3 p-3 rounded-lg border border-danger/20 bg-danger/5">
                          <div className="flex items-center gap-2 text-danger text-xs font-semibold mb-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Merge Failed
                          </div>
                          <p className="text-xs text-foreground-secondary">{status.error}</p>
                        </div>
                      )}

                      {/* Action buttons */}
                      {status.state !== 'done' && (
                        <div className="flex items-center gap-2">
                          {status.state !== 'previewed' && (
                            <button
                              onClick={() => handlePreviewGroup(gi)}
                              disabled={status.state === 'previewing' || status.state === 'running'}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest rounded border border-divider text-foreground-secondary hover:bg-surface-interactive transition-colors disabled:opacity-50"
                            >
                              {status.state === 'previewing' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                              Preview Merge
                            </button>
                          )}
                          <button
                            onClick={() => handleMergeGroup(gi)}
                            disabled={status.state === 'running'}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest rounded border border-motion/30 bg-motion/10 text-motion hover:bg-motion/20 transition-colors disabled:opacity-50"
                          >
                            {status.state === 'running' ? <Loader2 className="w-3 h-3 animate-spin" /> : <GitMerge className="w-3 h-3" />}
                            Execute Merge
                          </button>
                          <span className="text-[10px] text-foreground-quiet ml-1">
                            Duplicates are marked Inactive (not deleted). All linked data is redirected.
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Rescan button */}
            {totalGroups > 0 && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={handleScan}
                  disabled={scanning}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest rounded border border-divider text-foreground-quiet hover:text-foreground hover:bg-surface-interactive transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="w-3 h-3" />
                  Rescan
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}