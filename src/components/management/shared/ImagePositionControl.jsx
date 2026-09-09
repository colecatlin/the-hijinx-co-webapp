import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * ImagePositionControl — safe object-position editor.
 *
 * Converts horizontal (left/center/right) and vertical (top/center/bottom)
 * selections into a CSS object-position string (e.g. "68% center", "left top").
 * Avoids requiring admins to type CSS values.
 */
export default function ImagePositionControl({ value = 'center center', onChange, label = 'Image position' }) {
  const parts = value.split(' ');
  const hRaw = parts[0] || 'center';
  const vRaw = parts[1] || 'center';

  const hOptions = ['left', 'center', 'right'];
  const vOptions = ['top', 'center', 'bottom'];

  const normalize = (val, options) => (options.includes(val) ? val : 'center');

  const h = normalize(hRaw, hOptions);
  const v = normalize(vRaw, vOptions);

  const update = (newH, newV) => onChange(`${newH} ${newV}`);

  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <Label className="text-xs text-foreground-quiet mb-1 block">{label} — horizontal</Label>
        <Select value={h} onValueChange={(val) => update(val, v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Left</SelectItem>
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="right">Right</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-foreground-quiet mb-1 block">{label} — vertical</Label>
        <Select value={v} onValueChange={(val) => update(h, val)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="top">Top</SelectItem>
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="bottom">Bottom</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}