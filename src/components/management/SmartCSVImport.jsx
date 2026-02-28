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

export default function SmartCSVImport() {
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

  const effectiveEntity = overrideEntity || detection?.entity;

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

  const handleImport = async () => {
    setImporting(true);
    try {
      const res = await base44.functions.invoke('smartCSVImport', {
        csvText,
        action: 'import',
        overrideEntity: overrideEntity || undefined,
      });
      setResult(res.data);
      setStep('done');
    } catch (err) {
      setResult({ error: err.message });
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
        )}

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

        <div className="flex gap-2 justify-between pt-2 border-t">
          <Button variant="outline" onClick={reset}>Back</Button>
          <Button
            className="bg-gray-900 text-white"
            onClick={handleImport}
            disabled={importing || detecting}
          >
            {importing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing…</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" />Import as {effectiveEntity}</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    const success = result?.success !== false && !result?.error;
    const s = result?.summary || {};
    const isResults = result?.entityName === 'Results';

    return (
      <div className="space-y-5">
        <div className="text-center py-4">
          {success ? (
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          ) : (
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          )}
          <p className="font-semibold text-lg">{success ? 'Import Complete!' : 'Import Failed'}</p>
          {result?.entityName && <p className="text-sm text-gray-500 mt-1">Imported as: <strong>{result.entityName}</strong></p>}
          {result?.error && <p className="text-sm text-red-600 mt-1">{result.error}</p>}
        </div>

        {success && isResults && (
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Results', val: s.results },
              { label: 'Drivers', val: s.drivers },
              { label: 'Events', val: s.events },
              { label: 'Tracks', val: s.tracks },
              { label: 'Series', val: s.series },
              { label: 'Classes', val: s.classes },
            ].map(item => (
              <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                <p className="text-2xl font-bold">{item.val ?? 0}</p>
                <p className="text-xs text-gray-500">{item.label} created</p>
              </div>
            ))}
          </div>
        )}

        {success && !isResults && (
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Created', val: result?.created ?? 0 },
              { label: 'Updated', val: result?.updated ?? 0 },
              { label: 'Failed', val: result?.failed ?? 0 },
            ].map(item => (
              <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                <p className="text-2xl font-bold">{item.val}</p>
                <p className="text-xs text-gray-500">{item.label}</p>
              </div>
            ))}
          </div>
        )}

        {success && result?.skipped_duplicates > 0 && (
          <p className="text-sm text-amber-600 text-center">
            {result.skipped_duplicates} row(s) skipped — duplicates already exist
          </p>
        )}
        {success && result?.skipped_invalid > 0 && (
          <p className="text-sm text-amber-600 text-center">
            {result.skipped_invalid} row(s) skipped — missing required fields
          </p>
        )}
        {result?.errors?.length > 0 && (
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer hover:text-gray-700">View errors ({result.errors.length})</summary>
            <ul className="mt-2 space-y-0.5 max-h-40 overflow-y-auto pl-2">
              {result.errors.slice(0, 20).map((e, i) => <li key={i}>Row {e.row}: {e.error}</li>)}
            </ul>
          </details>
        )}

        <div className="flex gap-2 justify-center pt-2">
          <Button variant="outline" onClick={reset}>Import Another File</Button>
        </div>
      </div>
    );
  }
}