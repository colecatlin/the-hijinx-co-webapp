import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Layers } from 'lucide-react';
import { toast } from 'sonner';

// Bulk quick-add for series classes: paste any number of class names (one per line),
// in order of importance. Each line becomes a SeriesClass with sort_order matching
// its position (1 = most important). Details (level, vehicle, scores) can be filled
// out later via the existing edit flow.
export default function SeriesClassesBulkQuickAdd({ seriesId, seriesName }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rawInput, setRawInput] = useState('');
  const [committing, setCommitting] = useState(false);

  // Parse non-empty, trimmed lines — preserve entry order for sort_order.
  const parsedNames = useMemo(() => {
    return rawInput
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }, [rawInput]);

  const canSubmit = parsedNames.length > 0 && !committing;

  const handleCommit = async () => {
    if (!canSubmit) return;
    setCommitting(true);
    try {
      const baseOrder = 1; // start at 1 for the most important class
      const records = parsedNames.map((name, i) => ({
        series_id: seriesId,
        class_name: name,
        sort_order: baseOrder + i,
        active: true,
      }));
      await base44.entities.SeriesClass.bulkCreate(records);
      await queryClient.invalidateQueries({ queryKey: ['seriesClasses', seriesId] });
      toast.success(`Added ${records.length} class${records.length === 1 ? '' : 'es'}`, {
        description: seriesName ? `Order saved — edit details anytime in ${seriesName}.` : 'Order saved — fill out details anytime.',
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
    if (!next) {
      setRawInput('');
    }
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
                {parsedNames.length > 0
                  ? `${parsedNames.length} class${parsedNames.length === 1 ? '' : 'es'} ready to add`
                  : 'Enter class names above'}
              </span>
              {parsedNames.length > 0 && (
                <span className="text-gray-400">sort_order {1}–{parsedNames.length}</span>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={committing}>
              Cancel
            </Button>
            <Button onClick={handleCommit} disabled={!canSubmit}>
              {committing ? 'Adding…' : `Add ${parsedNames.length || ''} Class${parsedNames.length === 1 ? '' : 'es'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}