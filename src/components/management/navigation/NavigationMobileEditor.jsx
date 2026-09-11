import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DestinationEditor from '@/components/management/shared/DestinationEditor';
import { ChevronUp, ChevronDown, Plus, Trash2 } from 'lucide-react';

const ICON_OPTIONS = [
  { key: 'home', label: 'Home' },
  { key: 'directory', label: 'Directory (Compass)' },
  { key: 'search', label: 'Search' },
  { key: 'dashboard', label: 'Dashboard (Grid)' },
  { key: 'menu', label: 'Menu' },
];

/**
 * NavigationMobileEditor — editor for mobile_bottom navigation items.
 *
 * Props:
 *   items    - array of mobile bottom nav items
 *   onChange - (items) => void
 */
export default function NavigationMobileEditor({ items, onChange }) {
  const [editing, setEditing] = useState(null);

  const update = (idx, item) => {
    const next = [...items];
    next[idx] = item;
    onChange(next);
  };
  const remove = (idx) => onChange(items.filter((_, i) => i !== idx));
  const move = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[idx], next[target]] = [next[target], next[idx]];
    next.forEach((it, i) => (it.sort_order = i));
    onChange(next);
  };
  const add = () => {
    const newItem = {
      id: `mb_${Date.now()}`,
      enabled: true,
      label: 'New Tab',
      sort_order: items.length,
      type: 'route',
      destination: { type: 'internal_page', internal_page: '/', entity_type: '', entity_id: '', entity_slug: '', entity_name: '', external_url: '', open_in_new_tab: false },
      icon_key: 'home',
      auth_only: false,
      emphasized: false,
    };
    onChange([...items, newItem]);
    setEditing(items.length);
  };

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={item.id}>
          <div className="flex items-center gap-2 p-2 rounded-md bg-surface-interactive/40">
            <div className="flex flex-col">
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => move(idx, -1)} disabled={idx === 0}><ChevronUp className="w-3 h-3" /></Button>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => move(idx, 1)} disabled={idx === items.length - 1}><ChevronDown className="w-3 h-3" /></Button>
            </div>
            <Switch checked={item.enabled} onCheckedChange={(val) => update(idx, { ...item, enabled: val })} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{item.label || 'Untitled'}</p>
              <p className="text-[10px] text-foreground-quiet truncate">
                {item.type === 'route' ? `→ ${item.destination?.internal_page || '—'}` : item.type === 'search' ? '🔍 Search action' : '☰ Menu action'}
                {item.auth_only ? ' · auth only' : ''}
                {item.emphasized ? ' · emphasized' : ''}
              </p>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditing(editing === idx ? null : idx)}>
              {editing === idx ? 'Close' : 'Edit'}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(idx)}><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>
          {editing === idx && (
            <MobileItemDetailEditor item={item} onSave={(updated) => { update(idx, updated); setEditing(null); }} onCancel={() => setEditing(null)} />
          )}
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full text-xs" onClick={add}>
        <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Mobile Tab
      </Button>
    </div>
  );
}

function MobileItemDetailEditor({ item, onSave, onCancel }) {
  const [d, setD] = useState(item);
  const set = (field, val) => setD({ ...d, [field]: val });

  return (
    <div className="mt-1 p-3 rounded-lg border border-motion/30 bg-surface space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold">Edit Mobile Tab</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCancel}>×</Button>
      </div>

      <div>
        <Label className="text-xs text-foreground-quiet mb-1 block">Label</Label>
        <Input value={d.label} onChange={(e) => set('label', e.target.value)} className="h-8 text-xs" />
      </div>

      <div>
        <Label className="text-xs text-foreground-quiet mb-1 block">Type</Label>
        <Select value={d.type} onValueChange={(val) => set('type', val)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="route">Route (navigate to URL)</SelectItem>
            <SelectItem value="search">Search (open search overlay)</SelectItem>
            <SelectItem value="menu">Menu (open drawer)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {d.type === 'route' && (
        <div>
          <Label className="text-xs text-foreground-quiet mb-1 block">Destination</Label>
          <DestinationEditor
            value={d.destination}
            onChange={(dest) => set('destination', dest)}
            allowReusableLink
            reusableLinkValue={d.reusable_link_id || ''}
            onReusableLinkChange={(id) => set('reusable_link_id', id)}
          />
        </div>
      )}

      <div>
        <Label className="text-xs text-foreground-quiet mb-1 block">Icon</Label>
        <Select value={d.icon_key} onValueChange={(val) => set('icon_key', val)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ICON_OPTIONS.map((opt) => <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch checked={d.auth_only} onCheckedChange={(val) => set('auth_only', val)} />
          <span className="text-xs text-foreground-quiet">Auth only (hide for logged-out)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch checked={d.emphasized} onCheckedChange={(val) => set('emphasized', val)} />
          <span className="text-xs text-foreground-quiet">Emphasized (center button)</span>
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" className="text-xs" onClick={onCancel}>Cancel</Button>
        <Button size="sm" className="text-xs" onClick={() => onSave(d)}>Save</Button>
      </div>
    </div>
  );
}