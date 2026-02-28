import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Info } from 'lucide-react';

const RESULT_FIELDS = [
  { key: 'event_name',          label: 'Event Name' },
  { key: 'event_date',          label: 'Event Date (YYYY-MM-DD)' },
  { key: 'season',              label: 'Season Year' },
  { key: 'track_name',          label: 'Track Name' },
  { key: 'track_city',          label: 'Track City' },
  { key: 'track_state',         label: 'Track State' },
  { key: 'track_country',       label: 'Track Country' },
  { key: 'series_name',         label: 'Series Name' },
  { key: 'discipline',          label: 'Discipline' },
  { key: 'class_name',          label: 'Class Name' },
  { key: 'driver_first_name',   label: 'Driver First Name' },
  { key: 'driver_last_name',    label: 'Driver Last Name' },
  { key: 'bib_number',          label: 'Bib / Car Number' },
  { key: 'session_type',        label: 'Session Type' },
  { key: 'position',            label: 'Position' },
  { key: 'status_text',         label: 'Status (Running/DNF/DNS)' },
  { key: 'points',              label: 'Points' },
  { key: 'laps_completed',      label: 'Laps Completed' },
  { key: 'best_lap_time',       label: 'Best Lap Time' },
  { key: 'notes',               label: 'Notes' },
];

function parseCSVHeaders(text) {
  const firstLine = text.split('\n')[0] || '';
  return firstLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
}

export default function SmartResultsImport({ onDone }) {
  const fileRef = useRef();
  const [step, setStep] = useState('upload');
  const [csvText, setCsvText] = useState('');
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [result, setResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      setCsvText(text);
      const hdrs = parseCSVHeaders(text);
      setHeaders(hdrs);

      // Auto-map
      const autoMap = {};
      hdrs.forEach(h => {
        const hLow = h.toLowerCase().replace(/[\s_\-\/().#]/g, '');
        const match = RESULT_FIELDS.find(f => {
          const fKey = f.key.replace(/_/g, '');
          const fLabel = f.label.toLowerCase().replace(/[\s_\-\/().#]/g, '');
          return fKey === hLow || fLabel === hLow;
        });
        if (match) autoMap[h] = match.key;
      });
      setMapping(autoMap);
      setStep('map');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const response = await base44.functions.invoke('importSeasonResults', { csvText, mapping });
      setResult(response.data);
      setStep('done');
    } catch (err) {
      setResult({ error: err.message });
      setStep('done');
    }
    setImporting(false);
  };

  if (step === 'upload') {
    return (
      <div className="space-y-5">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Smart Import</p>
            <p>Missing tracks, series, classes, events, and drivers will be <strong>created automatically</strong>. Existing records will be matched and reused.</p>
          </div>
        </div>
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-gray-400 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <FileSpreadsheet className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="font-medium text-gray-700">Upload your CSV file</p>
          <p className="text-sm text-gray-500 mt-1">Columns can be in any order — you'll map them next</p>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-600 mb-2">Supported columns:</p>
          <div className="flex flex-wrap gap-1.5">
            {RESULT_FIELDS.map(f => (
              <span key={f.key} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-600">{f.label}</span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'map') {
    const mappedCount = Object.values(mapping).filter(v => v && v !== '__skip__').length;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">Map your columns from <span className="font-medium">{fileName}</span></p>
          <span className="text-xs text-gray-500">{mappedCount} of {headers.length} mapped</span>
        </div>
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {headers.map(h => (
            <div key={h} className="flex items-center gap-3">
              <span className="w-44 text-sm font-mono bg-gray-100 px-2 py-1 rounded truncate shrink-0">{h}</span>
              <span className="text-gray-400 text-sm shrink-0">→</span>
              <Select
                value={mapping[h] || '__skip__'}
                onValueChange={v => setMapping(m => ({ ...m, [h]: v }))}
              >
                <SelectTrigger className="flex-1 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__skip__">Skip this column</SelectItem>
                  {RESULT_FIELDS.map(f => (
                    <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <div className="flex gap-2 justify-between pt-2 border-t">
          <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
          <Button
            className="bg-gray-900 text-white"
            onClick={handleImport}
            disabled={importing || mappedCount === 0}
          >
            {importing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" />Run Smart Import</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    const success = result?.success;
    const s = result?.summary || {};
    return (
      <div className="space-y-5">
        <div className="text-center py-4">
          {success ? (
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          ) : (
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          )}
          <p className="font-semibold text-lg">{success ? 'Import Complete!' : 'Import Failed'}</p>
          {result?.error && <p className="text-sm text-red-600 mt-1">{result.error}</p>}
        </div>

        {success && (
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

        {success && result?.skipped > 0 && (
          <p className="text-sm text-amber-600 text-center">
            {result.skipped} row(s) skipped (missing driver name or event date)
          </p>
        )}

        {success && result?.log?.length > 0 && (
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer hover:text-gray-700">View creation log ({result.log.length} items)</summary>
            <ul className="mt-2 space-y-0.5 max-h-40 overflow-y-auto pl-2">
              {result.log.map((l, i) => <li key={i}>• {l}</li>)}
            </ul>
          </details>
        )}

        <div className="flex gap-2 justify-center pt-2">
          <Button variant="outline" onClick={() => { setStep('upload'); setCsvText(''); setHeaders([]); setMapping({}); }}>
            Import Another File
          </Button>
          <Button className="bg-gray-900 text-white" onClick={onDone}>Done</Button>
        </div>
      </div>
    );
  }
}