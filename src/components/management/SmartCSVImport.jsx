import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Info, Sparkles, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ENTITY_TYPES = [
  'Driver', 'Team', 'Track', 'Series', 'Event', 'Results', 'Session',
  'SeriesClass', 'DriverProgram', 'Standings', 'OutletStory', 'OutletIssue',
  'Product', 'NewsletterSubscriber', 'ContactMessage', 'Announcement',
];

function parseCSVHeaders(text) {
  const firstLine = text.split('\n')[0] || '';
  return firstLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
}

const CONFIDENCE_COLORS = {
  high: 'bg-green-50 border-green-200 text-green-800',
  medium: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  low: 'bg-red-50 border-red-200 text-red-800',
};

export default function SmartCSVImport({ onImportComplete }) {
  const fileRef = useRef();
  const [step, setStep] = useState('upload');
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [detection, setDetection] = useState(null);
  const [overrideEntity, setOverrideEntity] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [showMapping, setShowMapping] = useState(false);
  const [columnMapping, setColumnMapping] = useState({});

  // Phase 3: Identity-first driver import state
  const [seasonYear, setSeasonYear] = useState('');
  const [driverPreview, setDriverPreview] = useState(null);
  const [driverCommitResult, setDriverCommitResult] = useState(null);
  const [committing, setCommitting] = useState(false);

  const effectiveEntity = overrideEntity || detection?.entity;
  const isDriverImport = effectiveEntity === 'Driver';

  // Parse CSV and validate on mount
  useEffect(() => {
    if (csvText && csvHeaders.length === 0) {
      const headers = parseCSVHeaders(csvText);
      setCsvHeaders(headers);
      const lines = csvText.split('\n').slice(1).filter(l => l.trim());
      const rows = lines.map(line => {
        const cols = [];
        let current = '';
        let inQuotes = false;
        for (const ch of line) {
          if (ch === '"') inQuotes = !inQuotes;
          else if (ch === ',' && !inQuotes) { cols.push(current.trim()); current = ''; }
          else current += ch;
        }
        cols.push(current.trim());
        return cols.map(c => c.replace(/^"|"$/g, ''));
      });
      setCsvRows(rows);
      validateData(headers, rows);
    }
  }, [csvText, csvHeaders.length]);

  const validateData = (headers, rows) => {
    const errors = [];
    const emptyRows = rows.filter(r => r.every(cell => !cell || cell.trim() === '')).length;
    
    if (emptyRows > 0) {
      errors.push(`${emptyRows} row(s) are completely empty`);
    }

    rows.forEach((row, idx) => {
      if (row.length !== headers.length) {
        errors.push(`Row ${idx + 2}: Column count mismatch (${row.length} columns, expected ${headers.length})`);
      }
    });

    setValidationErrors(errors);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    setCsvText(text);
    setCsvHeaders([]);
    setCsvRows([]);
    setColumnMapping({});
    e.target.value = '';

    setDetecting(true);
    try {
      const res = await base44.functions.invoke('smartCSVImport', { csvText: text, action: 'detect' });
      setDetection(res.data);
      setOverrideEntity(null);
    } catch (err) {
      setDetection({ entity: 'Driver', confidence: 'low', score: 0 });
    }
    setDetecting(false);
    setStep('confirm');
  };

  // Phase 3: Parse CSV rows into importDriversBulk format
  const parseDriverRows = () => {
    const headers = csvHeaders.map(h => h.toLowerCase().trim());
    return csvRows.map(cols => {
      const row = {};
      headers.forEach((h, i) => { row[h] = cols[i] || ''; });
      return {
        first_name: row.first_name || '',
        last_name: row.last_name || '',
        number: row.number || row.primary_number || row.car_number || '',
        series: row.series || row.series_name || '',
        class: row.class || row.class_name || '',
      };
    });
  };

  const seasonYearValid = () => /^\d{4}$/.test((seasonYear || '').trim());

  // Phase 3: Driver dry-run preview
  const handleDriverPreview = async () => {
    setImporting(true);
    try {
      const rows = parseDriverRows();
      const res = await base44.functions.invoke('importDriversBulk', {
        season_year: seasonYear.trim(),
        rows,
        dry_run: true,
      });
      setDriverPreview(res.data);
      setStep('driverPreview');
    } catch (err) {
      setResult({ error: err.message });
      setStep('done');
    }
    setImporting(false);
  };

  // Phase 3: Driver commit
  const handleDriverCommit = async () => {
    setCommitting(true);
    try {
      const rows = parseDriverRows();
      const res = await base44.functions.invoke('importDriversBulk', {
        season_year: seasonYear.trim(),
        rows,
        dry_run: false,
      });
      setDriverCommitResult(res.data);
      setStep('driverDone');
      onImportComplete?.();
    } catch (err) {
      setResult({ error: err.message });
      setStep('done');
    }
    setCommitting(false);
  };

  const handleImport = async () => {
    // Phase 3: Route Driver imports through importDriversBulk
    if (isDriverImport) {
      return handleDriverPreview();
    }

    setImporting(true);
    const startTime = Date.now();
    try {
      const res = await base44.functions.invoke('smartCSVImport', {
        csvText,
        action: 'import',
        overrideEntity: overrideEntity || undefined,
      });
      const executionTime = Date.now() - startTime;
      setResult(res.data);
      
      // Log the operation (standardized)
      await base44.functions.invoke('logOperation', {
        operation_type: res.data?.error ? 'csv_import_failed' : 'csv_import_completed',
        source_type: 'csv_upload',
        entity_name: overrideEntity || detection?.entity,
        function_name: 'smartCSVImport',
        status: res.data?.error ? 'failed' : 'completed',
        total_records: csvRows.length,
        error_details: res.data?.errors || [],
        file_name: fileName,
        metadata: {
          importer_name: 'smart_csv_import',
          entity_type: overrideEntity || detection?.entity,
          is_source_entity: res.data?.isSourceEntity || false,
          imported_count: res.data?.created ?? 0,
          updated_count: res.data?.updated ?? 0,
          skipped_count: res.data?.failed ?? 0,
          duplicate_detected_count: res.data?.skipped_duplicates ?? 0,
          error_count: res.data?.errors?.length ?? 0,
          execution_time_ms: executionTime,
        },
      });
      
      setStep('done');
      onImportComplete?.();
    } catch (err) {
      const executionTime = Date.now() - startTime;
      setResult({ error: err.message });
      
      // Log the failed operation
      await base44.functions.invoke('logOperation', {
        operation_type: 'import',
        source_type: 'csv_upload',
        entity_name: overrideEntity || detection?.entity,
        function_name: 'smartCSVImport',
        status: 'failed',
        total_records: csvRows.length,
        error_details: [err.message],
        file_name: fileName,
        execution_time_ms: Date.now() - startTime,
      });
      
      setStep('done');
    }
    setImporting(false);
  };

  const reset = () => {
    setStep('upload');
    setCsvText('');
    setFileName('');
    setDetection(null);
    setOverrideEntity(null);
    setResult(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setValidationErrors([]);
    setColumnMapping({});
    setShowMapping(false);
    setSeasonYear('');
    setDriverPreview(null);
    setDriverCommitResult(null);
    setCommitting(false);
  };

  if (step === 'upload') {
    return (
      <div className="space-y-5">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Smart Import</p>
            <p>Upload any CSV and the system will automatically detect what type of data it contains and import it into the right place.</p>
          </div>
        </div>
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-gray-400 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <FileSpreadsheet className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="font-medium text-gray-700">Upload your CSV file</p>
          <p className="text-sm text-gray-500 mt-1">Entity type will be auto-detected from the column headers</p>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
        </div>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <FileSpreadsheet className="w-4 h-4" />
          <span className="font-medium">{fileName}</span>
        </div>

        {detecting ? (
          <div className="flex items-center gap-3 py-6 justify-center text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Detecting entity type…</span>
          </div>
        ) : (
          <>
            {/* Entity Detection */}
            <div className={`border rounded-lg p-4 ${CONFIDENCE_COLORS[detection?.confidence] || ''}`}>
              <p className="text-sm font-semibold mb-1">
                Detected: <span className="font-bold">{effectiveEntity}</span>
                <span className="ml-2 text-xs font-normal opacity-70">({detection?.confidence} confidence)</span>
              </p>
              <p className="text-xs opacity-80">
                {detection?.confidence === 'high'
                  ? 'Column headers strongly match this entity type.'
                  : detection?.confidence === 'medium'
                  ? 'Some headers matched — verify before importing.'
                  : 'Low match — please confirm or change entity type below.'}
              </p>
            </div>

            {/* Override Entity Type */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Override entity type (optional)</p>
              <Select
                value={overrideEntity || '__auto__'}
                onValueChange={v => setOverrideEntity(v === '__auto__' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="__auto__">Auto-detected: {detection?.entity}</SelectItem>
                  {ENTITY_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Validation Results */}
            {validationErrors.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-4 h-4" />
                    Data Validation Issues
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-xs space-y-1 text-red-600">
                    {validationErrors.map((err, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-red-400">•</span>
                        <span>{err}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Preview Data */}
            {csvHeaders.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Column Headers ({csvHeaders.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {csvHeaders.map((h, i) => (
                      <div key={i} className="text-xs bg-gray-100 rounded px-2 py-1.5 text-gray-700 truncate" title={h}>
                        {h}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    {csvRows.length} row(s) detected for import
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Toggle Mapping */}
            {csvHeaders.length > 0 && (
              <button
                onClick={() => setShowMapping(!showMapping)}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${showMapping ? 'rotate-180' : ''}`} />
                {showMapping ? 'Hide' : 'Show'} column mapping
              </button>
            )}

            {/* Column Mapping Configuration */}
            {showMapping && csvHeaders.length > 0 && (
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-blue-900">Column Mapping</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-blue-700 mb-3">
                    Auto-mapped columns based on detected entity type. Modify if needed:
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {csvHeaders.map((header, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded min-w-[120px] truncate">{header}</span>
                        <span className="text-gray-400">→</span>
                        <input
                          type="text"
                          placeholder="Entity field"
                          value={columnMapping[header] || header}
                          onChange={(e) => setColumnMapping({...columnMapping, [header]: e.target.value})}
                          className="flex-1 px-2 py-1 border rounded bg-white text-gray-700"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Phase 3: Season year input for Driver imports */}
            {isDriverImport && (
              <Card className="border-blue-300 bg-blue-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-blue-900">
                    <Info className="w-4 h-4" />
                    Season Year (Required)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-blue-700 mb-2">
                    Identity-first driver import requires an import-level season year. This applies to every row in the import. Drivers are resolved through PersonIdentity → RacerProfile → SeasonParticipation → legacy Driver.
                  </p>
                  <input
                    type="text"
                    placeholder="e.g. 2026"
                    value={seasonYear}
                    onChange={(e) => setSeasonYear(e.target.value)}
                    className="w-full px-3 py-2 border rounded bg-white text-gray-800 text-sm"
                    maxLength={4}
                  />
                  {seasonYear && !seasonYearValid() && (
                    <p className="text-xs text-red-600 mt-1">Season year must be exactly 4 digits (e.g. 2026).</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-2 justify-between pt-2 border-t">
              <Button variant="outline" onClick={reset}>Back</Button>
              <Button
                className="bg-gray-900 text-white"
                onClick={handleImport}
                disabled={importing || detecting || validationErrors.length > 0 || (isDriverImport && !seasonYearValid())}
              >
                {importing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Previewing…</>
                ) : isDriverImport ? (
                  <><Upload className="w-4 h-4 mr-2" />Preview Import</>
                ) : (
                  <><Upload className="w-4 h-4 mr-2" />Import as {effectiveEntity}</>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Phase 3: Driver dry-run preview step
  if (step === 'driverPreview') {
    const preview = driverPreview;
    const summary = preview?.summary || {};
    const rows = preview?.rows || [];
    const statusColor = (s) => {
      if (s === 'created') return 'text-green-700 bg-green-50 border-green-200';
      if (s === 'resolved') return 'text-blue-700 bg-blue-50 border-blue-200';
      if (s === 'ready') return 'text-gray-700 bg-gray-50 border-gray-200';
      if (s === 'review') return 'text-amber-700 bg-amber-50 border-amber-200';
      if (s === 'blocked') return 'text-red-700 bg-red-50 border-red-200';
      return 'text-red-700 bg-red-50 border-red-200';
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <FileSpreadsheet className="w-4 h-4" />
          <span className="font-medium">{fileName}</span>
          <span className="text-gray-400">·</span>
          <span>Season {preview?.season_year}</span>
          <span className="text-gray-400">·</span>
          <span className="font-medium text-blue-700">DRY RUN (Projected)</span>
        </div>

        {/* Summary grid */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
          {[
            { label: 'Total', val: summary.total_rows, color: 'bg-gray-50' },
            { label: 'Created', val: summary.created_rows, color: 'bg-green-50' },
            { label: 'Resolved', val: summary.resolved_rows, color: 'bg-blue-50' },
            { label: 'Review', val: summary.review_rows, color: 'bg-amber-50' },
            { label: 'Blocked', val: summary.blocked_rows, color: 'bg-red-50' },
            { label: 'Errors', val: summary.error_rows, color: 'bg-red-50' },
          ].map(item => (
            <div key={item.label} className={`${item.color} rounded-lg p-2`}>
              <p className="text-xl font-bold">{item.val}</p>
              <p className="text-[10px] text-gray-500">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
          <Info className="w-4 h-4 inline mr-1" />
          These are <strong>projected</strong> outcomes from read-only matching. Commit results may differ if concurrent changes occur.
        </div>

        {/* Row-level results */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {rows.map((row) => (
            <div key={row.row_number} className={`border rounded-lg p-3 ${statusColor(row.resolution_status)}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">Row {row.row_number}: {row.normalized_input?.first_name} {row.normalized_input?.last_name}</span>
                <span className="text-xs font-bold uppercase">{row.resolution_status}</span>
              </div>
              <div className="text-xs opacity-80">
                {row.normalized_input?.series} · {row.normalized_input?.class}
                {row.normalized_input?.number && ` · #${row.normalized_input.number}`}
              </div>
              {row.errors?.length > 0 && (
                <div className="mt-1 text-xs text-red-700">
                  {row.errors.map((e, i) => <div key={i}>⚠ {e.message}</div>)}
                </div>
              )}
              {row.warnings?.length > 0 && (
                <div className="mt-1 text-xs text-amber-700">
                  {row.warnings.map((w, i) => <div key={i}>⚠ {w.message}</div>)}
                </div>
              )}
              <div className="mt-1 flex gap-3 text-[10px] opacity-70">
                {row.created_records?.person_identity && <span>+PersonIdentity</span>}
                {row.created_records?.racer_profile && <span>+RacerProfile</span>}
                {row.created_records?.season_participation && <span>+Participation</span>}
                {row.created_records?.legacy_driver && <span>+Driver</span>}
                {row.reused_records?.person_identity && <span>↻PersonIdentity</span>}
                {row.reused_records?.racer_profile && <span>↻RacerProfile</span>}
                {row.reused_records?.season_participation && <span>↻Participation</span>}
                {row.reused_records?.legacy_driver && <span>↻Driver</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 justify-between pt-2 border-t">
          <Button variant="outline" onClick={() => setStep('confirm')}>Back</Button>
          <Button
            className="bg-gray-900 text-white"
            onClick={handleDriverCommit}
            disabled={committing}
          >
            {committing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Committing…</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" />Commit Import</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Phase 3: Driver commit done step
  if (step === 'driverDone') {
    const commit = driverCommitResult;
    const summary = commit?.summary || {};
    const rows = commit?.rows || [];
    const statusColor = (s) => {
      if (s === 'created') return 'text-green-700 bg-green-50 border-green-200';
      if (s === 'resolved') return 'text-blue-700 bg-blue-50 border-blue-200';
      if (s === 'review') return 'text-amber-700 bg-amber-50 border-amber-200';
      if (s === 'blocked') return 'text-red-700 bg-red-50 border-red-200';
      return 'text-red-700 bg-red-50 border-red-200';
    };

    return (
      <div className="space-y-4">
        <div className="text-center py-3">
          <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
          <p className="font-semibold text-lg">Driver Import Complete</p>
          <p className="text-sm text-gray-500">Season {commit?.season_year} · {summary.total_rows} rows processed</p>
        </div>

        {/* Summary grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="bg-green-50 rounded-lg p-3"><p className="text-2xl font-bold">{summary.created_rows}</p><p className="text-xs text-gray-500">Created</p></div>
          <div className="bg-blue-50 rounded-lg p-3"><p className="text-2xl font-bold">{summary.resolved_rows}</p><p className="text-xs text-gray-500">Resolved</p></div>
          <div className="bg-amber-50 rounded-lg p-3"><p className="text-2xl font-bold">{summary.review_rows}</p><p className="text-xs text-gray-500">Review</p></div>
          <div className="bg-red-50 rounded-lg p-3"><p className="text-2xl font-bold">{summary.blocked_rows + (summary.error_rows || 0)}</p><p className="text-xs text-gray-500">Blocked/Errors</p></div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
          <div className="bg-gray-50 rounded p-2"><p className="font-bold">{summary.person_identities_created}</p><p className="text-gray-500">PersonIdentities</p></div>
          <div className="bg-gray-50 rounded p-2"><p className="font-bold">{summary.racer_profiles_created}</p><p className="text-gray-500">RacerProfiles</p></div>
          <div className="bg-gray-50 rounded p-2"><p className="font-bold">{summary.season_participations_created}</p><p className="text-gray-500">Participations</p></div>
          <div className="bg-gray-50 rounded p-2"><p className="font-bold">{summary.drivers_created}</p><p className="text-gray-500">Drivers</p></div>
        </div>

        {/* Row-level results with RaceCore IDs */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {rows.map((row) => (
            <div key={row.row_number} className={`border rounded-lg p-3 ${statusColor(row.resolution_status)}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">Row {row.row_number}: {row.normalized_input?.first_name} {row.normalized_input?.last_name}</span>
                <span className="text-xs font-bold uppercase">{row.resolution_status}</span>
              </div>
              <div className="text-xs opacity-80">
                {row.normalized_input?.series} · {row.normalized_input?.class}
                {row.normalized_input?.number && ` · #${row.normalized_input.number}`}
              </div>
              {row.errors?.length > 0 && (
                <div className="mt-1 text-xs text-red-700">
                  {row.errors.map((e, i) => <div key={i}>⚠ {e.message}</div>)}
                </div>
              )}
              {row.warnings?.length > 0 && (
                <div className="mt-1 text-xs text-amber-700">
                  {row.warnings.map((w, i) => <div key={i}>⚠ {w.message}</div>)}
                </div>
              )}
              {row.cleanup_required && (
                <div className="mt-1 text-xs text-red-700 font-bold">⚠ Cleanup required — partial records created before failure</div>
              )}
              {/* RaceCore IDs (read-only) */}
              {row.resolved_ids && (row.resolved_ids.person_racecore_id || row.resolved_ids.racer_racecore_id || row.resolved_ids.participation_racecore_id || row.resolved_ids.driver_racecore_id) && (
                <div className="mt-2 pt-2 border-t border-gray-200 grid grid-cols-2 gap-1 text-[10px] font-mono">
                  {row.resolved_ids.person_racecore_id && <div>PERS: {row.resolved_ids.person_racecore_id}</div>}
                  {row.resolved_ids.racer_racecore_id && <div>RACR: {row.resolved_ids.racer_racecore_id}</div>}
                  {row.resolved_ids.participation_racecore_id && <div>PART: {row.resolved_ids.participation_racecore_id}</div>}
                  {row.resolved_ids.driver_racecore_id && <div>DRVR: {row.resolved_ids.driver_racecore_id}</div>}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2 justify-center pt-2 border-t">
          <Button variant="outline" onClick={reset}>Import Another File</Button>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    const success = result?.success !== false && !result?.error;
    const diag = result?.diagnostics || {};
    const diagStatus = diag.integrity_status || 'unknown';
    const diagStatusColor = diagStatus === 'pass' ? 'text-green-700 bg-green-50 border-green-200'
      : diagStatus === 'warn' ? 'text-amber-700 bg-amber-50 border-amber-200'
      : diagStatus === 'fail' ? 'text-red-700 bg-red-50 border-red-200'
      : 'text-gray-600 bg-gray-50 border-gray-200';

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="text-center py-3">
          {success ? (
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
          ) : (
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
          )}
          <p className="font-semibold text-lg">{success ? 'Import Complete' : 'Import Failed'}</p>
          {result?.entityName && <p className="text-sm text-gray-500 mt-0.5">Entity: <strong>{result.entityName}</strong></p>}
          {result?.error && <p className="text-sm text-red-600 mt-1">{result.error}</p>}
        </div>

        {/* Core counts */}
        {success && (
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Created', val: result?.created ?? 0, color: 'bg-green-50' },
              { label: 'Updated', val: result?.updated ?? 0, color: 'bg-blue-50' },
              { label: 'Skipped', val: result?.failed ?? 0, color: 'bg-gray-50' },
            ].map(item => (
              <div key={item.label} className={`${item.color} rounded-lg p-3`}>
                <p className="text-2xl font-bold">{item.val}</p>
                <p className="text-xs text-gray-500">{item.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Extended counts */}
        {success && (result?.skipped_duplicates > 0 || result?.identity_reviews > 0) && (
          <div className="grid grid-cols-2 gap-2 text-center">
            {result?.skipped_duplicates > 0 && (
              <div className="bg-amber-50 rounded-lg p-3">
                <p className="text-xl font-bold text-amber-700">{result.skipped_duplicates}</p>
                <p className="text-xs text-amber-600">Duplicate Warnings</p>
              </div>
            )}
            {result?.identity_reviews > 0 && (
              <div className="bg-purple-50 rounded-lg p-3">
                <p className="text-xl font-bold text-purple-700">{result.identity_reviews}</p>
                <p className="text-xs text-purple-600">Identity Reviews Required</p>
              </div>
            )}
          </div>
        )}

        {/* Post-import diagnostics */}
        <div className={`border rounded-lg p-3 text-sm ${diagStatusColor}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold uppercase tracking-wide text-xs">Post-Import Diagnostics</span>
            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
              diagStatus === 'pass' ? 'bg-green-200 text-green-800'
              : diagStatus === 'warn' ? 'bg-amber-200 text-amber-800'
              : diagStatus === 'fail' ? 'bg-red-200 text-red-800'
              : 'bg-gray-200 text-gray-700'
            }`}>{diagStatus}</span>
          </div>
          <p className="text-xs opacity-80">{diag.summary || 'No diagnostic summary available'}</p>
          {(diag.orphan_counts > 0 || diag.duplicate_warnings > 0 || diag.integrity_issues > 0) && (
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="font-bold text-base">{diag.orphan_counts ?? 0}</p>
                <p className="text-xs opacity-70">Orphans</p>
              </div>
              <div>
                <p className="font-bold text-base">{diag.duplicate_warnings ?? 0}</p>
                <p className="text-xs opacity-70">Dup Groups</p>
              </div>
              <div>
                <p className="font-bold text-base">{diag.integrity_issues ?? 0}</p>
                <p className="text-xs opacity-70">Integrity Issues</p>
              </div>
            </div>
          )}
        </div>

        {/* Errors */}
        {result?.errors?.length > 0 && (
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer hover:text-gray-700 font-medium">
              View row errors ({result.errors.length})
            </summary>
            <ul className="mt-2 space-y-0.5 max-h-40 overflow-y-auto pl-2 border-l border-red-200">
              {result.errors.slice(0, 30).map((e, i) => (
                <li key={i} className="text-red-600">Row {e.row}: {e.error}</li>
              ))}
              {result.errors.length > 30 && <li className="text-gray-400">+{result.errors.length - 30} more…</li>}
            </ul>
          </details>
        )}

        <div className="flex gap-2 justify-center pt-2 border-t">
          <Button variant="outline" onClick={reset}>Import Another File</Button>
        </div>
      </div>
    );
  }
}