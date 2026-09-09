import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

/**
 * ScheduleControl — optional start/end scheduling for a section.
 *
 * Value shape: { enabled, start_at, end_at }
 *
 * A section with no schedule (enabled=false) is always eligible to display.
 * No cron jobs — the frontend evaluates timestamps from published config.
 */
export default function ScheduleControl({ value = {}, onChange }) {
  const v = { enabled: false, start_at: '', end_at: '', ...value };
  const set = (field, val) => onChange({ ...v, [field]: val });

  const endBeforeStart = v.enabled && v.start_at && v.end_at && new Date(v.end_at) < new Date(v.start_at);

  return (
    <div className="space-y-3 p-3 rounded-lg border border-divider bg-surface">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold">Schedule</Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-foreground-quiet">Enabled</span>
          <Switch checked={v.enabled} onCheckedChange={(val) => set('enabled', val)} />
        </div>
      </div>

      {!v.enabled && (
        <p className="text-xs text-foreground-quiet italic">No schedule — this section is always eligible to display.</p>
      )}

      {v.enabled && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-foreground-quiet mb-1 block">Start (optional)</Label>
            <Input
              type="datetime-local"
              value={v.start_at ? v.start_at.slice(0, 16) : ''}
              onChange={(e) => set('start_at', e.target.value ? new Date(e.target.value).toISOString() : '')}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs text-foreground-quiet mb-1 block">End (optional)</Label>
            <Input
              type="datetime-local"
              value={v.end_at ? v.end_at.slice(0, 16) : ''}
              onChange={(e) => set('end_at', e.target.value ? new Date(e.target.value).toISOString() : '')}
              className="h-8 text-xs"
            />
          </div>
          {endBeforeStart && (
            <p className="col-span-2 text-xs text-danger">End cannot be before start.</p>
          )}
        </div>
      )}
    </div>
  );
}