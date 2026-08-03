import React, { useState, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, Upload, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const EMPTY_ROW = {
  first_name: '',
  last_name: '',
  primary_number: '',
  primary_series_id: '',
  primary_class_id: '',
};

const classesForSeries = (seriesClasses, seriesId) =>
  seriesId ? seriesClasses.filter((c) => c.series_id === seriesId) : [];

const slugBase = (first, last) =>
  `${first} ${last}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const randNumericId = () => String(Math.floor(Math.random() * 90000000) + 10000000);

const ensureUniqueNumericId = async () => {
  let attempt = 0;
  while (attempt < 5) {
    const candidate = randNumericId();
    const existing = await base44.entities.Driver.filter({ numeric_id: candidate });
    if (existing.length === 0) return candidate;
    attempt += 1;
  }
  return randNumericId(); // best-effort fallback
};

// ── CSV helpers ──────────────────────────────────────────────────────────────
// Normalize a header string for flexible column matching.
const normHeader = (h) => String(h || '').toLowerCase().trim().replace(/[\s_-]+/g, '');

const HEADER_ALIASES = {
  first_name: ['firstname', 'first', 'givenname', 'fname'],
  last_name:  ['lastname', 'last', 'surname', 'familyname', 'lname'],
  primary_number: ['number', 'num', 'carnumber', 'bibnumber', 'bib', '#', 'no'],
  series: ['series', 'seriesname', 'primaryseries'],
  class: ['class', 'classname', 'primaryclass', 'seriesclass'],
};

const matchColumn = (header) => {
  const n = normHeader(header);
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(n)) return field;
  }
  return null;
};

/**
 * Parse a CSV / Excel file into row objects using xlsx.
 * Returns an array of { first_name, last_name, primary_number, series, class }.
 */
const parseCsvFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (!json.length) { resolve([]); return; }

        // Build a column map from the first row's keys.
        const sampleKeys = Object.keys(json[0]);
        const colMap = {};
        sampleKeys.forEach((key) => {
          const field = matchColumn(key);
          if (field) colMap[field] = key;
        });

        const rows = json.map((r) => ({
          first_name:     colMap.first_name     ? String(r[colMap.first_name] || '').trim()     : '',
          last_name:      colMap.last_name      ? String(r[colMap.last_name] || '').trim()      : '',
          primary_number: colMap.primary_number ? String(r[colMap.primary_number] || '').trim() : '',
          series:         colMap.series         ? String(r[colMap.series] || '').trim()         : '',
          class:          colMap.class          ? String(r[colMap.class] || '').trim()          : '',
        }));
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });

/**
 * QuickAddDriverDialog — bulk "quick add" grid mirroring the Add Session modal.
 * Each row captures First, Last, Number, and (optionally) Series + Class within
 * that series. Series/Class are filled only if applicable — leaving them blank
 * still creates a valid driver record. On submit all valid rows are bulk-created,
 * then the drawer opens for the first created driver for follow-up detail entry.
 *
 * Also supports CSV / Excel upload: columns auto-matched by header name
 * (first_name, last_name, number, series, class — flexible aliases accepted).
 */
export default function QuickAddDriverDialog({ open, onOpenChange, onCreated }) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState([{ ...EMPTY_ROW }]);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const { data: seriesList = [] } = useQuery({
    queryKey: ['series', 'list', 'quick-add-drivers'],
    queryFn: () => base44.entities.Series.list('-created_date', 200),
    enabled: open,
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['series-classes', 'quick-add-drivers', 'all'],
    queryFn: () => base44.entities.SeriesClass.list('class_name', 1000),
    enabled: open,
  });

  const seriesById = useMemo(() => {
    const map = {};
    seriesList.forEach((s) => { map[s.id] = s; });
    return map;
  }, [seriesList]);

  const classesBySeries = useMemo(() => {
    const map = {};
    seriesClasses.forEach((c) => {
      if (!map[c.series_id]) map[c.series_id] = [];
      map[c.series_id].push(c);
    });
    return map;
  }, [seriesClasses]);

  // Lookup helpers for CSV import: resolve series / class names to IDs.
  const seriesByName = useMemo(() => {
    const map = {};
    seriesList.forEach((s) => {
      const key = s.name?.toLowerCase().trim();
      if (key) map[key] = s;
      const shortKey = s.short_name?.toLowerCase().trim();
      if (shortKey) map[shortKey] = s;
    });
    return map;
  }, [seriesList]);

  const classByNameBySeries = useMemo(() => {
    // map: seriesId -> { lowerClassName -> SeriesClass }
    const map = {};
    seriesClasses.forEach((c) => {
      if (!map[c.series_id]) map[c.series_id] = {};
      const key = c.class_name?.toLowerCase().trim();
      if (key) map[c.series_id][key] = c;
    });
    return map;
  }, [seriesClasses]);

  const setRow = (idx, field, value) =>
    setRows((prev) => prev.map((r, i) =>
      i === idx ? { ...r, [field]: value } : r
    ));

  const handleSeriesChange = (idx, value) =>
    setRows((prev) => prev.map((r, i) =>
      i === idx ? { ...r, primary_series_id: value || '', primary_class_id: '' } : r
    ));

  const addRow = () => setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  const removeRow = (idx) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const reset = () => setRows([{ ...EMPTY_ROW }]);

  const handleClose = (next) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const validRows = rows
    .map((r, idx) => ({ ...r, _idx: idx }))
    .filter((r) => r.first_name?.trim() && r.last_name?.trim());

  // ── CSV import ──────────────────────────────────────────────────────────────
  const handleCsvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const parsed = await parseCsvFile(file);
      if (!parsed.length) {
        toast.error('No rows found in the file');
        return;
      }

      // Resolve series / class names to IDs.
      const resolved = parsed.map((r) => {
        const seriesKey = r.series?.toLowerCase().trim();
        const series = seriesKey ? seriesByName[seriesKey] : null;
        const seriesId = series?.id || '';

        let classId = '';
        if (seriesId && r.class) {
          const classKey = r.class.toLowerCase().trim();
          const classMap = classByNameBySeries[seriesId] || {};
          const matched = classMap[classKey];
          if (matched) classId = matched.id;
        }

        return {
          first_name: r.first_name || '',
          last_name: r.last_name || '',
          primary_number: r.primary_number || '',
          primary_series_id: seriesId,
          primary_class_id: classId,
        };
      });

      // Only keep rows with at least a first or last name; replace the grid.
      const usable = resolved.filter((r) => r.first_name?.trim() || r.last_name?.trim());
      if (!usable.length) {
        toast.error('No valid rows — ensure columns include First Name and Last Name');
        return;
      }

      setRows(usable);
      const unmatchedSeries = resolved.filter((r) => r.series && !r.primary_series_id).length;
      const unmatchedClass  = resolved.filter((r) => r.class  && !r.primary_class_id).length;
      toast.success(
        `Imported ${usable.length} row${usable.length === 1 ? '' : 's'}` +
        (unmatchedSeries ? ` · ${unmatchedSeries} series unmatched` : '') +
        (unmatchedClass  ? ` · ${unmatchedClass} class unmatched` : '')
      );
    } catch (err) {
      toast.error(`Failed to parse file: ${err.message}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreate = async () => {
    if (validRows.length === 0) {
      toast.error('Enter at least one driver with first and last name');
      return;
    }
    setCreating(true);
    try {
      const createdIds = [];
      // Build payloads (numeric_id + slug generated per-row, with uniqueness check).
      const payloads = [];
      for (const row of validRows) {
        const numeric_id = await ensureUniqueNumericId();
        const className = row.primary_class_id
          ? classesBySeries[row.primary_series_id]?.find((c) => c.id === row.primary_class_id)?.class_name
          : undefined;
        payloads.push({
          first_name: row.first_name.trim(),
          last_name: row.last_name.trim(),
          primary_number: row.primary_number || undefined,
          primary_series_id: row.primary_series_id || undefined,
          primary_class_id: row.primary_class_id || undefined,
          // Stash class name is not a stored field on Driver, but consumers can
          // resolve via SeriesClass id later — kept lean for quick add.
          numeric_id,
          slug: `${slugBase(row.first_name, row.last_name)}-${numeric_id}`,
        });
        // className intentionally ignored at create-time — Driver schema has no
        // class_name field; class linkage lives on DriverProgram / Entry records.
        void className;
      }

      const created = await base44.entities.Driver.bulkCreate(payloads);
      createdIds.push(...created.map((r) => r.id));

      await queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success(`${createdIds.length} driver${createdIds.length === 1 ? '' : 's'} created`);
      handleClose(false);
      reset();
      if (onCreated && createdIds[0]) onCreated(createdIds[0]);
    } catch (error) {
      toast.error(`Failed to create drivers: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-surface border-divider max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-foreground tracking-wide">Add Drivers (Bulk)</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-foreground-quiet -mt-2">
          Add as many drivers as you want — First, Last, and Number are the core fields.
          Series and Class are optional (only fill in if applicable). Hit Create to bulk-add them all.
        </p>

        {/* CSV upload strip */}
        <div className="flex items-center gap-2 -mt-1 mb-1">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleCsvUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="h-7 text-[11px] font-mono border-divider text-foreground-secondary hover:text-foreground hover:bg-surface-interactive"
          >
            <Upload className="w-3 h-3" />
            {importing ? 'Importing…' : 'Upload CSV'}
          </Button>
          <span className="text-[10px] font-mono text-foreground-quiet">
            Columns: first_name, last_name, number, series, class
          </span>
        </div>

        <div className="max-h-[60vh] overflow-y-auto pr-1 -mr-1">
          {/* Header row (desktop) */}
          <div className="hidden md:grid grid-cols-[1.1fr_1.1fr_0.7fr_1.3fr_1.3fr_28px] gap-2 px-1 pb-2 text-[10px] font-mono uppercase tracking-[0.2em] text-motion/70">
            <span>First *</span>
            <span>Last *</span>
            <span>#</span>
            <span>Series (opt.)</span>
            <span>Class (opt.)</span>
            <span />
          </div>

          <div className="space-y-2">
            {rows.map((row, idx) => {
              const classOptions = classesBySeries[row.primary_series_id] || [];
              return (
                <div
                  key={idx}
                  className="md:grid md:grid-cols-[1.1fr_1.1fr_0.7fr_1.3fr_1.3fr_28px] gap-2 items-center bg-surface-interactive border border-divider rounded-lg p-2 md:p-0 md:bg-transparent md:border-0 md:rounded-none"
                >
                  <Input
                    value={row.first_name}
                    onChange={(e) => setRow(idx, 'first_name', e.target.value)}
                    className="bg-surface-elevated border-divider text-foreground md:text-sm text-sm"
                    placeholder="First"
                    autoFocus={idx === 0}
                  />
                  <Input
                    value={row.last_name}
                    onChange={(e) => setRow(idx, 'last_name', e.target.value)}
                    className="bg-surface-elevated border-divider text-foreground md:text-sm text-sm mt-2 md:mt-0"
                    placeholder="Last"
                  />
                  <Input
                    value={row.primary_number}
                    onChange={(e) => setRow(idx, 'primary_number', e.target.value)}
                    className="bg-surface-elevated border-divider text-foreground md:text-sm text-sm mt-2 md:mt-0"
                    placeholder="#"
                  />
                  <Select
                    value={row.primary_series_id || '__none'}
                    onValueChange={(v) => handleSeriesChange(idx, v === '__none' ? '' : v)}
                  >
                    <SelectTrigger className="bg-surface-elevated border-divider text-foreground md:text-sm text-sm mt-2 md:mt-0">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-elevated border-divider max-h-[260px]">
                      <SelectItem value="__none">None</SelectItem>
                      {seriesList.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={row.primary_class_id || '__none'}
                    onValueChange={(v) => setRow(idx, 'primary_class_id', v === '__none' ? '' : v)}
                    disabled={!row.primary_series_id}
                  >
                    <SelectTrigger className="bg-surface-elevated border-divider text-foreground md:text-sm text-sm mt-2 md:mt-0">
                      <SelectValue placeholder={row.primary_series_id ? '—' : 'Pick series first'} />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-elevated border-divider max-h-[260px]">
                      <SelectItem value="__none">None</SelectItem>
                      {classOptions.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.class_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    disabled={rows.length === 1}
                    className="hidden md:flex h-8 w-8 items-center justify-center rounded text-foreground-quiet hover:text-danger disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Remove row"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    disabled={rows.length === 1}
                    className="md:hidden flex items-center justify-center gap-1 mt-2 text-xs text-foreground-quiet hover:text-danger disabled:opacity-30"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={addRow}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-[0.15em] text-motion hover:text-motion-hover transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Row
          </button>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            className="border-divider text-foreground-secondary hover:text-foreground hover:bg-surface-interactive"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating || validRows.length === 0}
            className="bg-motion hover:bg-motion-hover text-white"
          >
            {creating
              ? 'Creating…'
              : `Create ${validRows.length} Driver${validRows.length === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}