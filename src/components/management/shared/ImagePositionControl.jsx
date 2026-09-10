import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

/**
 * ImagePositionControl — safe object-position editor with percentage support.
 *
 * Presets: left/center/right (horizontal), top/center/bottom (vertical).
 * Custom: percentage sliders for fine X/Y control.
 *
 * Round-trips values like "68% center", "35% center", "center 30%" unchanged.
 */
export default function ImagePositionControl({ value = 'center center', onChange, label = 'Image position' }) {
  const parts = (value || 'center center').split(' ');
  const hRaw = parts[0] || 'center';
  const vRaw = parts[1] || 'center';

  const hIsPercent = hRaw.includes('%');
  const vIsPercent = vRaw.includes('%');

  const hPresets = ['left', 'center', 'right'];
  const vPresets = ['top', 'center', 'bottom'];

  const hSelect = hIsPercent ? 'custom' : (hPresets.includes(hRaw) ? hRaw : 'center');
  const vSelect = vIsPercent ? 'custom' : (vPresets.includes(vRaw) ? vRaw : 'center');

  const hPercent = hIsPercent ? Math.round(parseFloat(hRaw)) : 50;
  const vPercent = vIsPercent ? Math.round(parseFloat(vRaw)) : 50;

  const updateH = (newH) => onChange(`${newH} ${vRaw}`);
  const updateV = (newV) => onChange(`${hRaw} ${newV}`);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-foreground-quiet mb-1 block">{label} — horizontal</Label>
          <Select value={hSelect} onValueChange={(val) => {
            if (val === 'custom') updateH(`${hPercent}%`);
            else updateH(val);
          }}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
              <SelectItem value="custom">Custom %</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-foreground-quiet mb-1 block">{label} — vertical</Label>
          <Select value={vSelect} onValueChange={(val) => {
            if (val === 'custom') updateV(`${vPercent}%`);
            else updateV(val);
          }}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="top">Top</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="bottom">Bottom</SelectItem>
              <SelectItem value="custom">Custom %</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {hSelect === 'custom' && (
        <div className="flex items-center gap-2">
          <Label className="text-xs text-foreground-quiet shrink-0">X</Label>
          <input
            type="range"
            min="0"
            max="100"
            value={hPercent}
            onChange={(e) => updateH(`${e.target.value}%`)}
            className="flex-1 h-1.5 accent-motion"
          />
          <Input
            type="number"
            min="0"
            max="100"
            value={hPercent}
            onChange={(e) => updateH(`${e.target.value}%`)}
            className="h-7 w-14 text-xs"
          />
        </div>
      )}
      {vSelect === 'custom' && (
        <div className="flex items-center gap-2">
          <Label className="text-xs text-foreground-quiet shrink-0">Y</Label>
          <input
            type="range"
            min="0"
            max="100"
            value={vPercent}
            onChange={(e) => updateV(`${e.target.value}%`)}
            className="flex-1 h-1.5 accent-motion"
          />
          <Input
            type="number"
            min="0"
            max="100"
            value={vPercent}
            onChange={(e) => updateV(`${e.target.value}%`)}
            className="h-7 w-14 text-xs"
          />
        </div>
      )}
    </div>
  );
}