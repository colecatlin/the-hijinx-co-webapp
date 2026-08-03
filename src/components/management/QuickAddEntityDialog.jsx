import React, { useState, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { QUICK_ADD_CONFIGS } from './quickAddRegistry';

// ── CSV helpers ──────────────────────────────────────────────────────────────
const normHeader = (h) => String(h || '').toLowerCase().trim().replace(/[\s_-]+/g, '');

const matchColumn = (header, fields) => {
  const n = normHeader(header);
  for (const field of fields) {
    if ((field.aliases || []).includes(n) || normHeader(field.key) === n) return field.key;
  }
  return null;
};

const parseCsvFile = (file, fields) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (!json.length) { resolve([]); return; }

        const sampleKeys = Object.keys(json[0]);
        const colMap = {};
        sampleKeys.forEach((key) => {
          const field = matchColumn(key, fields);
          if (field) colMap[field] = key;
        });

        const rows = json.map((r) => {
          const row = {};
          fields.forEach((f) => {
            row[f.key] = colMap[f.key] ? String(r[colMap[f.key]] || '').trim() : '';
          });
          return row;
        });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });

// ── Component ────────────────────────────────────────────────────────────────
export default function QuickAddEntityDialog({ entityType, open, onOpenChange, onCreated }) {
  const config = QUICK_ADD_CONFIGS[entityType];
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const createEmptyRow = () => {
    const row = {};
    config.fields.forEach((f) => { row[f.key] = ''; });
    return row;
  };

  const [rows, setRows] = useState(() => [createEmptyRow()]);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);

  // ── Entity-select option queries ────────────────────────────────────────────
  const needsTracks = config.fields.some((f) => f.entityName === 'Track');
  const needsSeries = config.fields.some((f) => f.entityName === 'Series');

  const { data: tracksList = [] } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.list('-created_date', 500),
    enabled: open && needsTracks,
  });

  const { data: seriesList = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list('-created_date', 500),
    enabled: open && needsSeries,
  });

  const entityDataMap = useMemo(() => ({
    Track: tracksList,
    Series: seriesList,
  }), [tracksList, seriesList]);

  // Name → ID lookup maps for CSV import of entity-select fields.
  const entityLookupMaps = useMemo(() => {
    const maps = {};
    config.fields
      .filter((f) => f.type === 'entity-select')
      .forEach((f) => {
        const list = entityDataMap[f.entityName] || [];
        const map = {};
        list.forEach((item) => {
          const label = String(item[f.labelField || 'name'] || '').toLowerCase().trim();
          if (label) map[label] = item.id;
        });
        maps[f.key] = map;
      });
    return maps;
  }, [config, entityDataMap]);

  // ── Grid template ───────────────────────────────────────────────────────────
  const gridTemplate = config.fields.map(() => 'minmax(0, 1fr)').join(' ') + ' 28px';
  const maxWidthClass = config.fields.length > 4 ? 'max-w-5xl' : 'max-w-4xl';

  // ── Row helpers ─────────────────────────────────────────────────────────────
  const setRow = (idx, field, value) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));

  const addRow = () => setRows((prev) => [...prev, createEmptyRow()]);
  const removeRow = (idx) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const reset = () => setRows([createEmptyRow()]);

  const handleClose = (next) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const isRowValid = (row) =>
    config.fields.every((f) => !f.required || (row[f.key] || '').trim());

  const validRows = rows.filter(isRowValid);

  // ── CSV import ──────────────────────────────────────────────────────────────
  const handleCsvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const parsed = await parseCsvFile(file, config.fields);
      if (!parsed.length) {
        toast.error('No rows found in the file');
        return;
      }

      // Resolve entity-select names to IDs.
      const resolved = parsed.map((r) => {
        const row = { ...r };
        config.fields
          .filter((f) => f.type === 'entity-select')
          .forEach((f) => {
            const lookup = entityLookupMaps[f.key] || {};
            const key = (row[f.key] || '').toLowerCase().trim();
            row[f.key] = key ? (lookup[key] || '') : '';
          });
        return row;
      });

      const usable = resolved.filter((r) =>
        config.fields.some((f) => (r[f.key] || '').trim())
      );
      if (!usable.length) {
        toast.error('No valid rows — check required columns');
        return;
      }

      setRows(usable);

      // Count unmatched entity-select references for feedback.
      let unmatchedCount = 0;
      config.fields
        .filter((f) => f.type === 'entity-select')
        .forEach((f) => {
          const lookup = entityLookupMaps[f.key] || {};
          unmatchedCount += parsed.filter(
            (r) => r[f.key] && !lookup[(r[f.key] || '').toLowerCase().trim()]
          ).length;
        });

      toast.success(
        `Imported ${usable.length} row${usable.length === 1 ? '' : 's'}` +
        (unmatchedCount > 0 ? ` · ${unmatchedCount} reference${unmatchedCount === 1 ? '' : 's'} unmatched` : '')
      );
    } catch (err) {
      toast.error(`Failed to parse file: ${err.message}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Create ──────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (validRows.length === 0) {
      toast.error(`Enter at least one ${config.entityName} with all required fields`);
      return;
    }
    setCreating(true);
    try {
      // Clean payloads — strip empty strings so schema defaults apply.
      const payloads = validRows.map((row) => {
        const payload = {};
        config.fields.forEach((f) => {
          const val = (row[f.key] || '').trim();
          if (val) payload[f.key] = val;
        });
        return payload;
      });

      const created = await base44.entities[config.entityName].bulkCreate(payloads);

      await queryClient.invalidateQueries({ queryKey: config.queryKey });
      toast.success(
        `${created.length} ${config.entityName}${created.length === 1 ? '' : 's'} created`
      );
      handleClose(false);
      reset();
      if (onCreated && created[0]?.id) onCreated(created[0].id);
    } catch (error) {
      toast.error(`Failed to create: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  // ── Render field ────────────────────────────────────────────────────────────
  const renderField = (row, idx, field) => {
    const value = row[field.key] || '';
    const baseClass =
      'bg-surface-elevated border-divider text-foreground md:text-sm text-sm mt-2 md:mt-0';

    if (field.type === 'date') {
      return (
        <Input
          type="date"
          value={value}
          onChange={(e) => setRow(idx, field.key, e.target.value)}
          className={baseClass}
        />
      );
    }

    if (field.type === 'select') {
      return (
        <Select
          value={value || '__none'}
          onValueChange={(v) => setRow(idx, field.key, v === '__none' ? '' : v)}
        >
          <SelectTrigger className={baseClass}>
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent className="bg-surface-elevated border-divider max-h-[260px]">
            <SelectItem value="__none">None</SelectItem>
            {field.options.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (field.type === 'entity-select') {
      const options = entityDataMap[field.entityName] || [];
      return (
        <Select
          value={value || '__none'}
          onValueChange={(v) => setRow(idx, field.key, v === '__none' ? '' : v)}
        >
          <SelectTrigger className={baseClass}>
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent className="bg-surface-elevated border-divider max-h-[260px]">
            <SelectItem value="__none">None</SelectItem>
            {options.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item[field.labelField || 'name']}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    // Default: text
    return (
      <Input
        value={value}
        onChange={(e) => setRow(idx, field.key, e.target.value)}
        className={baseClass}
        placeholder={field.placeholder || ''}
        autoFocus={idx === 0 && field === config.fields[0]}
      />
    );
  };

  const csvColumns = config.fields.map((f) => f.key).join(', ');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={`bg-surface border-divider ${maxWidthClass}`}>
        <DialogHeader>
          <DialogTitle className="text-foreground tracking-wide">{config.title}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-foreground-quiet -mt-2">{config.description}</p>

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
          <span className="text-[10px] font-mono text-foreground-quiet truncate">
            Columns: {csvColumns}
          </span>
        </div>

        <div className="max-h-[60vh] overflow-y-auto pr-1 -mr-1">
          {/* Header row (desktop) */}
          <div
            className="hidden md:grid gap-2 px-1 pb-2 text-[10px] font-mono uppercase tracking-[0.2em] text-motion/70"
            style={{ gridTemplateColumns: gridTemplate }}
          >
            {config.fields.map((f) => (
              <span key={f.key}>{f.label}</span>
            ))}
            <span />
          </div>

          <div className="space-y-2">
            {rows.map((row, idx) => (
              <div
                key={idx}
                className="md:grid gap-2 items-center bg-surface-interactive border border-divider rounded-lg p-2 md:p-0 md:bg-transparent md:border-0 md:rounded-none"
                style={{ gridTemplateColumns: gridTemplate }}
              >
                {config.fields.map((field) => (
                  <React.Fragment key={field.key}>
                    {renderField(row, idx, field)}
                  </React.Fragment>
                ))}

                {/* Remove button (desktop) */}
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  disabled={rows.length === 1}
                  className="hidden md:flex h-8 w-8 items-center justify-center rounded text-foreground-quiet hover:text-danger disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Remove row"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* Remove button (mobile) */}
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  disabled={rows.length === 1}
                  className="md:hidden flex items-center justify-center gap-1 mt-2 text-xs text-foreground-quiet hover:text-danger disabled:opacity-30"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            ))}
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
              : `Create ${validRows.length} ${validRows.length === 1 ? config.entityName : config.plural}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}