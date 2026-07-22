import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
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

/**
 * QuickAddDriverDialog — bulk "quick add" grid mirroring the Add Session modal.
 * Each row captures First, Last, Number, and (optionally) Series + Class within
 * that series. Series/Class are filled only if applicable — leaving them blank
 * still creates a valid driver record. On submit all valid rows are bulk-created,
 * then the drawer opens for the first created driver for follow-up detail entry.
 */
export default function QuickAddDriverDialog({ open, onOpenChange, onCreated }) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState([{ ...EMPTY_ROW }]);
  const [creating, setCreating] = useState(false);

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
      <DialogContent className="bg-[#0b1112] border-teal-900/40 max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-white tracking-wide">Add Drivers (Bulk)</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-gray-500 -mt-2">
          Add as many drivers as you want — First, Last, and Number are the core fields.
          Series and Class are optional (only fill in if applicable). Hit Create to bulk-add them all.
        </p>

        <div className="max-h-[60vh] overflow-y-auto pr-1 -mr-1">
          {/* Header row (desktop) */}
          <div className="hidden md:grid grid-cols-[1.1fr_1.1fr_0.7fr_1.3fr_1.3fr_28px] gap-2 px-1 pb-2 text-[10px] font-mono uppercase tracking-[0.2em] text-teal-500/70">
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
                  className="md:grid md:grid-cols-[1.1fr_1.1fr_0.7fr_1.3fr_1.3fr_28px] gap-2 items-center bg-[#0a0f10] border border-white/5 rounded-lg p-2 md:p-0 md:bg-transparent md:border-0 md:rounded-none"
                >
                  <Input
                    value={row.first_name}
                    onChange={(e) => setRow(idx, 'first_name', e.target.value)}
                    className="bg-[#1A1A1A] border-white/10 text-white md:text-sm text-sm"
                    placeholder="First"
                    autoFocus={idx === 0}
                  />
                  <Input
                    value={row.last_name}
                    onChange={(e) => setRow(idx, 'last_name', e.target.value)}
                    className="bg-[#1A1A1A] border-white/10 text-white md:text-sm text-sm mt-2 md:mt-0"
                    placeholder="Last"
                  />
                  <Input
                    value={row.primary_number}
                    onChange={(e) => setRow(idx, 'primary_number', e.target.value)}
                    className="bg-[#1A1A1A] border-white/10 text-white md:text-sm text-sm mt-2 md:mt-0"
                    placeholder="#"
                  />
                  <Select
                    value={row.primary_series_id || '__none'}
                    onValueChange={(v) => handleSeriesChange(idx, v === '__none' ? '' : v)}
                  >
                    <SelectTrigger className="bg-[#1A1A1A] border-white/10 text-white md:text-sm text-sm mt-2 md:mt-0">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0b1112] border-teal-900/40 max-h-[260px]">
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
                    <SelectTrigger className="bg-[#1A1A1A] border-white/10 text-white md:text-sm text-sm mt-2 md:mt-0">
                      <SelectValue placeholder={row.primary_series_id ? '—' : 'Pick series first'} />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0b1112] border-teal-900/40 max-h-[260px]">
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
                    className="hidden md:flex h-8 w-8 items-center justify-center rounded text-gray-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Remove row"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    disabled={rows.length === 1}
                    className="md:hidden flex items-center justify-center gap-1 mt-2 text-xs text-gray-500 hover:text-red-400 disabled:opacity-30"
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
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-[0.15em] text-teal-300 hover:text-teal-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Row
          </button>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            className="border-white/10 text-gray-300 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating || validRows.length === 0}
            className="bg-teal-600 hover:bg-teal-700 text-white"
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