/**
 * DiagnosticsDupCleanup.jsx
 *
 * Extracted duplicate cleanup panel for Series, Track, Driver, and Event entities.
 * Used by pages/Diagnostics to keep that file under the 2000-line limit.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, AlertTriangle, XCircle, Loader2, Play, Wrench } from 'lucide-react';
import { toast } from 'sonner';

// ── tiny local helpers (duplicated so this file is self-contained) ──────────

function SummaryCard({ label, count, severity, icon: Icon }) {
  const bg   = { high: 'bg-red-50 border-red-200',     medium: 'bg-yellow-50 border-yellow-200', low: 'bg-blue-50 border-blue-200', ok: 'bg-green-50 border-green-200' };
  const text = { high: 'text-red-700', medium: 'text-yellow-700', low: 'text-blue-700', ok: 'text-green-700' };
  const eff = count === 0 ? 'ok' : severity;
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-1 ${bg[eff]}`}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className={`w-4 h-4 ${text[eff]}`} />}
        <span className={`text-xs font-medium ${text[eff]}`}>{label}</span>
      </div>
      <p className={`text-3xl font-bold ${text[eff]}`}>{count ?? '—'}</p>
    </div>
  );
}

function ExpandableList({ title, items = [], severity = 'medium', renderItem }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return (
    <div className="flex items-center gap-2 py-1.5 text-sm text-green-600">
      <CheckCircle className="w-3.5 h-3.5" /> {title} — clean
    </div>
  );
  const severityClass = { high: 'bg-red-100 text-red-700 border-red-200', medium: 'bg-yellow-100 text-yellow-700 border-yellow-200', low: 'bg-blue-100 text-blue-700 border-blue-200', ok: 'bg-green-100 text-green-700 border-green-200' };
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-sm font-medium">
        <div className="flex items-center gap-2">
          <span>{title}</span>
          <span className="font-bold text-gray-600">{items.length}</span>
        </div>
        <span className={`px-2 py-0.5 text-xs rounded border font-medium ${severityClass[severity] || severityClass.ok}`}>{severity}</span>
      </button>
      {open && (
        <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
          {items.slice(0, 50).map((item, i) => (
            <div key={i} className="px-4 py-2 text-xs text-gray-700">{renderItem ? renderItem(item) : JSON.stringify(item)}</div>
          ))}
          {items.length > 50 && <div className="px-4 py-2 text-xs text-gray-500">… and {items.length - 50} more</div>}
        </div>
      )}
    </div>
  );
}

// ── Shared cleanup result renderer ──────────────────────────────────────────

function CleanupResultCard({ result, entityLabel, summaryFields, refFields }) {
  if (!result) return null;
  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
      <p className="text-sm font-semibold text-green-800 flex items-center gap-2">
        <CheckCircle className="w-4 h-4" /> {entityLabel} Cleanup Complete
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs">
        {summaryFields.map(({ label, v }) => (
          <div key={label} className="bg-white rounded border border-green-100 p-2">
            <p className="text-xl font-bold text-green-700">{v ?? 0}</p>
            <p className="text-gray-500">{label}</p>
          </div>
        ))}
      </div>
      {result.references && refFields && (
        <div className={`grid grid-cols-2 md:grid-cols-${refFields.length} gap-3 text-center text-xs pt-1`}>
          {refFields.map(({ label, v }) => (
            <div key={label} className="bg-white rounded border border-green-100 p-2">
              <p className="text-xl font-bold text-green-700">{v ?? 0}</p>
              <p className="text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      )}
      {result.repair?.warnings?.length > 0 && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
          {result.repair.warnings.length} warning(s): {result.repair.warnings.slice(0, 3).join('; ')}
        </div>
      )}
    </div>
  );
}

// ── Single cleanup section ───────────────────────────────────────────────────

function DupCleanupSection({ title, accentColor, description, entityType, repairFn, refRepairFn, refFieldConfig, warningLabel }) {
  const [dupReport, setDupReport] = useState(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const runScan = async () => {
    setRunning(true);
    setDupReport(null);
    setResult(null);
    try {
      const res = await base44.functions.invoke('findDuplicateSourceEntities', { entity_type: entityType });
      if (res.data?.error) throw new Error(res.data.error);
      setDupReport(res.data);
      toast.success(`${title} scan complete — ${res.data.duplicate_count} duplicate group(s) found`);
    } catch (err) {
      toast.error(`${title} scan failed: ${err.message}`);
    }
    setRunning(false);
  };

  const runCleanup = async () => {
    if (!window.confirm(`This will mark duplicate ${title} records as inactive and repair linked references. Proceed?`)) return;
    setRunning(true);
    try {
      const repairRes = await base44.functions.invoke(repairFn, { dry_run: false });
      if (repairRes.data?.error) throw new Error(repairRes.data.error);
      const repairData = repairRes.data;

      let refReport = null;
      if (refRepairFn && repairData.repairs?.length > 0) {
        const refRes = await base44.functions.invoke(refRepairFn, { repairs: repairData.repairs, dry_run: false });
        refReport = refRes.data || null;
      }

      setResult({ repair: repairData, references: refReport });
      toast.success(`${title} cleanup complete — ${repairData.duplicates_marked_inactive?.length || 0} duplicates marked inactive`);
      await runScan();
    } catch (err) {
      toast.error(`${title} cleanup failed: ${err.message}`);
      setRunning(false);
    }
    setRunning(false);
  };

  const summaryFields = [
    { label: 'Groups processed',   v: result?.repair?.groups_processed },
    { label: 'Survivors confirmed', v: result?.repair?.survivors?.length },
    { label: 'Marked inactive',    v: result?.repair?.duplicates_marked_inactive?.length },
    { label: warningLabel || 'Skipped groups', v: result?.repair?.skipped_groups?.length },
  ];

  const refFields = refFieldConfig
    ? refFieldConfig.map(f => ({ label: f.label, v: result?.references?.[f.key] }))
    : null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertCircle className={`w-4 h-4 ${accentColor}`} /> {title} Duplicate Cleanup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-gray-500">{description}</p>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={runScan} disabled={running} variant="outline" className={`border-gray-300 text-gray-700 hover:bg-gray-50`}>
            {running ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running…</> : <><Play className="w-4 h-4 mr-2" />Scan for {title} Duplicates</>}
          </Button>
          {dupReport && dupReport.duplicate_count > 0 && (
            <Button onClick={runCleanup} disabled={running} variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50">
              {running ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running cleanup…</> : <><Wrench className="w-4 h-4 mr-2" />Run {title} Cleanup</>}
            </Button>
          )}
        </div>

        {dupReport && !running && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <SummaryCard label={`Total ${title}`}  count={dupReport.total_records}  severity="ok"  icon={CheckCircle} />
              <SummaryCard label="Duplicate Groups"  count={dupReport.duplicate_count} severity={dupReport.duplicate_count > 0 ? 'high' : 'ok'} icon={AlertTriangle} />
              <SummaryCard label="Affected Records"  count={dupReport.duplicate_groups?.reduce((a, g) => a + g.count, 0) || 0} severity={dupReport.duplicate_count > 0 ? 'medium' : 'ok'} icon={XCircle} />
            </div>
            {dupReport.duplicate_groups?.length > 0 ? (
              <ExpandableList
                title="Duplicate groups"
                items={dupReport.duplicate_groups}
                severity="high"
                renderItem={g => `[${g.match_type}] "${g.key}" — ${g.count} records: ${g.records?.map(r => `${r.name} (${r.status || 'Active'})`).join(', ')}`}
              />
            ) : (
              <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                <CheckCircle className="w-4 h-4" /> No duplicate {title} groups detected.
              </div>
            )}
          </div>
        )}

        <CleanupResultCard
          result={result}
          entityLabel={title}
          summaryFields={summaryFields}
          refFields={refFields}
        />
      </CardContent>
    </Card>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────

export default function DiagnosticsDupCleanup() {
  return (
    <div>
      <DupCleanupSection
        title="Event"
        accentColor="text-green-600"
        description="Detect and consolidate duplicate Event records using name + date + track/series composite keys. Duplicates are marked Cancelled — no data is deleted. Sessions, Entries, Results, Standings, and EventClasses are updated to point to the survivor."
        entityType="event"
        repairFn="repairDuplicateEventRecords"
        refRepairFn="repairEventReferences"
        refFieldConfig={[
          { label: 'Sessions updated',     key: 'updated_sessions' },
          { label: 'Entries updated',      key: 'updated_entries' },
          { label: 'Results updated',      key: 'updated_results' },
          { label: 'Standings updated',    key: 'updated_standings' },
          { label: 'EventClasses updated', key: 'updated_event_classes' },
        ]}
      />

      <DupCleanupSection
        title="Driver"
        accentColor="text-purple-600"
        description="Detect and consolidate duplicate Driver records. Uses name + DOB + primary number matching. Ambiguous same-name drivers with different DOBs are skipped. Duplicates are marked Inactive — no data is deleted."
        entityType="driver"
        repairFn="repairDuplicateDriverRecords"
        refRepairFn="repairDriverReferences"
        warningLabel="Skipped (ambiguous)"
        refFieldConfig={[
          { label: 'Results updated',   key: 'updated_results' },
          { label: 'Entries updated',   key: 'updated_entries' },
          { label: 'Standings updated', key: 'updated_standings' },
          { label: 'Programs updated',  key: 'updated_driver_programs' },
          { label: 'Media updated',     key: 'updated_driver_media' },
        ]}
      />

      <DupCleanupSection
        title="Track"
        accentColor="text-blue-600"
        description="Detect and consolidate duplicate Track records. Duplicates are marked Inactive — no data is deleted."
        entityType="track"
        repairFn="repairDuplicateTrackRecords"
        refRepairFn="repairTrackReferences"
        refFieldConfig={[
          { label: 'Events updated',          key: 'updated_events' },
          { label: 'Collaborations updated',  key: 'updated_event_collaborations' },
        ]}
      />

      <DupCleanupSection
        title="Series"
        accentColor="text-amber-600"
        description="Detect and consolidate duplicate Series records. Duplicates are marked Inactive — no data is deleted."
        entityType="series"
        repairFn="repairDuplicateSeriesRecords"
        refRepairFn="repairSeriesReferences"
        refFieldConfig={[
          { label: 'Events updated',   key: 'updated_events' },
          { label: 'Drivers updated',  key: 'updated_drivers' },
          { label: 'Classes updated',  key: 'updated_series_classes' },
          { label: 'Programs updated', key: 'updated_driver_programs' },
          { label: 'Standings updated',key: 'updated_standings' },
        ]}
      />

      <DupCleanupSection
        title="Session"
        accentColor="text-sky-600"
        description="Detect and consolidate duplicate Session records using event_id + normalized_name composite keys. Duplicates are marked Locked — no data is deleted. Results, Standings, and Entries are updated to point to the survivor."
        entityType="session"
        repairFn="repairDuplicateSessionRecords"
        refRepairFn="repairSessionReferences"
        refFieldConfig={[
          { label: 'Results updated',   key: 'updated_results' },
          { label: 'Standings updated', key: 'updated_standings' },
          { label: 'Entries updated',   key: 'updated_entries' },
        ]}
      />
    </div>
  );
}