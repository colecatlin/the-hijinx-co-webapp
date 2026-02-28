import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';

const RESULT_FIELDS = [
  { key: 'position', label: 'Position' },
  { key: 'driver_first_name', label: 'Driver First Name' },
  { key: 'driver_last_name', label: 'Driver Last Name' },
  { key: 'bib_number', label: 'Bib / Car Number' },
  { key: 'team_name', label: 'Team Name' },
  { key: 'class', label: 'Class' },
  { key: 'series', label: 'Series' },
  { key: 'session_type', label: 'Session Type' },
  { key: 'status_text', label: 'Status (Running/DNF/DNS)' },
  { key: 'points', label: 'Points' },
  { key: 'laps_completed', label: 'Laps Completed' },
  { key: 'best_lap_time_ms', label: 'Best Lap Time (ms)' },
];

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = cols[i] || ''; });
    return obj;
  });
  return { headers, rows };
}

export default function ResultsBulkUpload({ onDone }) {
  const queryClient = useQueryClient();
  const fileRef = useRef();
  const [step, setStep] = useState('upload'); // upload | map | preview | done
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [eventId, setEventId] = useState('');
  const [status, setStatus] = useState(null); // { success, message }
  const [importing, setImporting] = useState(false);

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-event_date', 200),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  const { data: programs = [] } = useQuery({
    queryKey: ['driver-programs'],
    queryFn: () => base44.entities.DriverProgram.list(),
  });

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { headers, rows } = parseCSV(ev.target.result);
      setHeaders(headers);
      setRows(rows);
      // Auto-map headers that match field keys or labels
      const autoMap = {};
      headers.forEach(h => {
        const hLow = h.toLowerCase().replace(/[\s_]/g, '');
        const match = RESULT_FIELDS.find(f =>
          f.key.replace(/_/g, '') === hLow ||
          f.label.toLowerCase().replace(/[\s/()]/g, '') === hLow
        );
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
      const records = rows.map(row => {
        const rec = { event_id: eventId };
        Object.entries(mapping).forEach(([col, field]) => {
          if (field && field !== '__skip__') rec[field] = row[col];
        });
        // Convert numeric fields
        if (rec.position) rec.position = Number(rec.position) || null;
        if (rec.points) rec.points = Number(rec.points) || null;
        if (rec.laps_completed) rec.laps_completed = Number(rec.laps_completed) || null;
        if (rec.best_lap_time_ms) rec.best_lap_time_ms = Number(rec.best_lap_time_ms) || null;
        // Match driver by name or bib
        const fn = (rec.driver_first_name || '').toLowerCase().trim();
        const ln = (rec.driver_last_name || '').toLowerCase().trim();
        const bib = rec.bib_number;
        let driver = null;
        if (fn && ln) {
          driver = drivers.find(d =>
            d.first_name?.toLowerCase() === fn && d.last_name?.toLowerCase() === ln
          );
        }
        if (!driver && bib) {
          driver = drivers.find(d => d.primary_number === bib);
        }
        if (driver) {
          rec.driver_id = driver.id;
          const program = programs.find(p => p.driver_id === driver.id);
          rec.program_id = program?.id || '';
        }
        // Clean up helper fields
        delete rec.driver_first_name;
        delete rec.driver_last_name;
        delete rec.bib_number;
        return rec;
      }).filter(r => r.driver_id && r.event_id);

      await base44.entities.Results.bulkCreate(records);
      queryClient.invalidateQueries({ queryKey: ['results'] });
      setStatus({ success: true, message: `Imported ${records.length} result(s) successfully.` });
      setStep('done');
    } catch (err) {
      setStatus({ success: false, message: err.message });
    }
    setImporting(false);
  };

  if (step === 'upload') {
    return (
      <div className="space-y-6">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Event *</label>
          <Select value={eventId} onValueChange={setEventId}>
            <SelectTrigger><SelectValue placeholder="Select event for these results" /></SelectTrigger>
            <SelectContent>
              {events.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.name} ({e.event_date})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-gray-400 transition-colors"
          onClick={() => eventId && fileRef.current?.click()}
        >
          <FileSpreadsheet className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="font-medium text-gray-700">Upload CSV or Excel file</p>
          <p className="text-sm text-gray-500 mt-1">Columns can be in any order — you'll map them next</p>
          {!eventId && <p className="text-xs text-red-500 mt-3">Select an event first</p>}
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} />
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-600 mb-2">Supported columns (any order):</p>
          <div className="flex flex-wrap gap-2">
            {RESULT_FIELDS.map(f => (
              <span key={f.key} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-600">{f.label}</span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'map') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Map your file columns to result fields. Unmatched columns will be skipped.</p>
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {headers.map(h => (
            <div key={h} className="flex items-center gap-3">
              <span className="w-48 text-sm font-mono bg-gray-100 px-2 py-1 rounded truncate">{h}</span>
              <span className="text-gray-400 text-sm">→</span>
              <Select value={mapping[h] || '__skip__'} onValueChange={v => setMapping(m => ({ ...m, [h]: v }))}>
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__skip__">Skip this column</SelectItem>
                  {RESULT_FIELDS.map(f => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <div className="flex gap-2 justify-between pt-2">
          <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
          <Button className="bg-gray-900 text-white" onClick={() => setStep('preview')}>
            Preview ({rows.length} rows)
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'preview') {
    const mappedFields = RESULT_FIELDS.filter(f => Object.values(mapping).includes(f.key));
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Preview of first 5 rows:</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-gray-200 rounded">
            <thead className="bg-gray-50">
              <tr>
                {mappedFields.map(f => (
                  <th key={f.key} className="px-3 py-2 text-left font-medium text-gray-600">{f.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 5).map((row, i) => (
                <tr key={i} className="border-t border-gray-100">
                  {mappedFields.map(f => {
                    const col = Object.entries(mapping).find(([, v]) => v === f.key)?.[0];
                    return <td key={f.key} className="px-3 py-2">{col ? row[col] : '—'}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500">
          Rows that can't be matched to a driver will be skipped.
        </p>
        <div className="flex gap-2 justify-between pt-2">
          <Button variant="outline" onClick={() => setStep('map')}>Back</Button>
          <Button className="bg-gray-900 text-white" onClick={handleImport} disabled={importing}>
            <Upload className="w-4 h-4 mr-2" />
            {importing ? 'Importing...' : `Import ${rows.length} Rows`}
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="text-center py-8 space-y-4">
        {status?.success ? (
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
        ) : (
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        )}
        <p className="font-medium">{status?.message}</p>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={() => { setStep('upload'); setRows([]); setHeaders([]); }}>
            Upload Another File
          </Button>
          <Button className="bg-gray-900 text-white" onClick={onDone}>Done</Button>
        </div>
      </div>
    );
  }
}