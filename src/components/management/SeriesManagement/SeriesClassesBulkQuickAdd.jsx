import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Layers, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

// Bulk quick-add for series classes: paste any number of class names (one per line),
// in order of importance. Each line becomes a SeriesClass with sort_order matching
// its position (1 = most important). Details (level, vehicle, scores) can be filled
// out later via the existing edit flow. Existing classes are shown so you can see
// what's already in the series and avoid re-adding.
export default function SeriesClassesBulkQuickAdd({ seriesId, seriesName }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rawInput, setRawInput] = useState('');
  const [committing, setCommitting] = useState(false);

  // Existing classes — only fetched while the modal is open. Sorted by sort_order
  // (then by competition_level fallback), matching the series record view.
  const { data: existingClasses = [] } = useQuery({
    queryKey: ['seriesClasses', seriesId],
    queryFn: () => base44.entities.SeriesClass.filter({ series_id: seriesId }),
    enabled: !!seriesId && open,
  });

  const existingNamesLower = useMemo(
    () => new Set(existingClasses.map((c) => (c.class_name || '').trim().toLowerCase())),
    [existingClasses],
  );
  const existingSorted = useMemo(
    () => [...existingClasses].sort((a, b) => {
      const aHas = a.sort_order != null;
      const bHas = b.sort_order != null;
      if (aHas && bHas) return a.sort_order - b.sort_order;
      if (aHas) return -1;
      if (bHas) return 1;
      return (b.competition_level || 0) - (a.competition_level || 0);
    }),
    [existingClasses],
  );

  // Parse non-empty, trimmed lines — preserve entry order for sort_order.
  const parsedNames = useMemo(
    () => rawInput.split('\n').map((l) => l.trim()).filter((l) => l.length > 0),
    [rawInput],
  );
  const duplicateNames = useMemo(
    () => parsedNames.filter((n) => existingNamesLower.has(n.toLowerCase())),
    [parsedNames, existingNamesLower],
  );
  const newNames = useMemo(
    () => parsedNames.filter((n) => !existingNamesLower.has(n.toLowerCase())),
    [parsedNames, existingNamesLower],
  );

  const canSubmit = newNames.length > 0 && !committing;

  const handleCommit = async () => {
    if (!canSubmit) return;
    setCommitting(true);
    try {
      const baseOrder = 1; // start at 1 for the most important class
      const records = newNames.map((name, i) => ({
        series_id: seriesId,
        class_name: name,
        sort_order: baseOrder + i,
        active: true,
      }));
      const skipped = duplicateNames.length;
      await base44.entities.SeriesClass.bulkCreate(records);
      await queryClient.invalidateQueries({ queryKey: ['seriesClasses', seriesId] });
      toast.success(`Added ${records.length} class${records.length === 1 ? '' : 'es'}`, {
        description: [
          seriesName ? `Order saved — edit details anytime in ${seriesName}.` : 'Order saved — fill out details anytime.',
          skipped ? `Skipped ${skipped} duplicate${skipped === 1 ? '' : 's'} already in this series.` : '',
        ].filter(Boolean).join(' '),
      });
      setRawInput('');
      setOpen(false);
    } catch (err) {
      toast.error('Could not add classes', { description: err.message });
    } finally {
      setCommitting(false);
    }
  };

  const handleOpenChange = (next) => {
    if (!next) setRawInput('');
    setOpen(next);
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Layers className="w-4 h-4 mr-1" />
        Quick Add Classes
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Quick Add Classes</DialogTitle>
            <DialogDescription>
              Paste every class name, one per line, ordered by importance. The top line becomes
              your highest-priority class. You can fill out competition level, vehicle type, and
              scoring details afterwards.
            </DialogDescription>
          </DialogHeader>

          {/* Existing classes — showcase what's already in the series */}
          {existingSorted.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wide text-gray-500">
                  Already in this series ({existingSorted.length})
                </Label>
              </div>
              <div className="max-h-40 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-2 space-y-1">
                {existingSorted.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-2 text-sm">
                    <span className="font-mono text-[11px] text-gray-400 w-5 text-right">
                      {c.sort_order ?? i + 1}
                    </span>
                    <span className={c.active === false ? 'text-gray-400 line-through' : 'text-gray-700'}>
                      {c.class_name}
                    </span>
                    {c.competition_level && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">L{c.competition_level}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <Label>Class names — one per line (top = most important)</Label>
              <Textarea
                className="mt-1 font-mono text-sm"
                rows={10}
                autoFocus
                placeholder={`Pro 4\nPro 2\nPro Lite\nUTV Turbo\nUTV Naturally Aspirated`}
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">
                {newNames.length > 0
                  ? `${newNames.length} new class${newNames.length === 1 ? '' : 'es'} ready to add`
                  : 'Enter class names above'}
              </span>
              {duplicateNames.length > 0 && (
                <span className="text-amber-600">
                  {duplicateNames.length} duplicate{duplicateNames.length === 1 ? '' : 's'} — will be skipped
                </span>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={committing}>
              Cancel
            </Button>
            <Button onClick={handleCommit} disabled={!canSubmit}>
              {committing ? 'Adding…' : `Add ${newNames.length || ''} Class${newNames.length === 1 ? '' : 'es'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}