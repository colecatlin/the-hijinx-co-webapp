import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DestinationEditor from '@/components/management/shared/DestinationEditor';
import { ChevronUp, ChevronDown, Plus, Trash2 } from 'lucide-react';

/**
 * NavigationDesktopEditor — editor for desktop_primary navigation items.
 *
 * Props:
 *   items    - array of top-level nav items
 *   onChange - (items) => void
 */
export default function NavigationDesktopEditor({ items, onChange }) {
  const [expanded, setExpanded] = useState(null);

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
      id: `nav_${Date.now()}`,
      enabled: true,
      label: 'New Item',
      sort_order: items.length,
      destination: { type: 'none', internal_page: '', entity_type: '', entity_id: '', entity_slug: '', entity_name: '', external_url: '', open_in_new_tab: false },
      reusable_link_id: '',
      is_protected_home: false,
      children: [],
    };
    onChange([...items, newItem]);
    setExpanded(items.length);
  };

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <DesktopItemEditor
          key={item.id}
          item={item}
          onChange={(updated) => update(idx, updated)}
          onRemove={() => remove(idx)}
          onMoveUp={() => move(idx, -1)}
          onMoveDown={() => move(idx, 1)}
          canMoveUp={idx > 0}
          canMoveDown={idx < items.length - 1}
          expanded={expanded === idx}
          onToggleExpand={() => setExpanded(expanded === idx ? null : idx)}
        />
      ))}
      <Button variant="outline" size="sm" className="w-full text-xs" onClick={add}>
        <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Navigation Item
      </Button>
    </div>
  );
}

function DesktopItemEditor({ item, onChange, onRemove, onMoveUp, onMoveDown, canMoveUp, canMoveDown, expanded, onToggleExpand }) {
  const set = (field, val) => onChange({ ...item, [field]: val });

  return (
    <div className="rounded-lg border border-divider bg-surface-elevated overflow-hidden">
      {/* Item header row */}
      <div className="flex items-center gap-2 p-2.5 bg-surface-interactive/30">
        <div className="flex flex-col">
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onMoveUp} disabled={!canMoveUp}><ChevronUp className="w-3 h-3" /></Button>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onMoveDown} disabled={!canMoveDown}><ChevronDown className="w-3 h-3" /></Button>
        </div>
        <Switch checked={item.enabled} onCheckedChange={(val) => set('enabled', val)} />
        <button onClick={onToggleExpand} className="flex-1 text-left min-w-0">
          <p className="text-sm font-semibold truncate">{item.label || 'Untitled'}</p>
          <p className="text-[10px] text-foreground-quiet truncate">
            {item.is_protected_home ? '🔒 Protected Home — /' : destLabel(item.destination)}
            {item.children?.length > 0 ? ` · ${item.children.length} children` : ''}
          </p>
        </button>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onToggleExpand}>
          {expanded ? 'Collapse' : 'Edit'}
        </Button>
        {!item.is_protected_home && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove}><Trash2 className="w-3.5 h-3.5" /></Button>
        )}
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="p-3 space-y-3 border-t border-divider">
          {/* Label */}
          <div>
            <Label className="text-xs text-foreground-quiet mb-1 block">Label</Label>
            <Input value={item.label} onChange={(e) => set('label', e.target.value)} className="h-8 text-xs" />
          </div>

          {/* Destination */}
          <div>
            <Label className="text-xs text-foreground-quiet mb-1 block">
              {item.is_protected_home ? 'Destination (locked — Home must resolve to /)' : 'Destination'}
            </Label>
            {item.is_protected_home ? (
              <div className="p-2 rounded-md bg-surface-interactive/50 text-xs text-foreground-quiet">
                Internal page: <code className="text-motion">/</code>
              </div>
            ) : (
              <DestinationEditor
                value={item.destination}
                onChange={(dest) => set('destination', dest)}
                allowReusableLink
                reusableLinkValue={item.reusable_link_id || ''}
                onReusableLinkChange={(id) => set('reusable_link_id', id)}
              />
            )}
          </div>

          {/* Children */}
          {!item.is_protected_home && (
            <ChildrenEditor
              children={item.children || []}
              onChange={(children) => set('children', children)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ChildrenEditor({ children, onChange }) {
  const [editingChild, setEditingChild] = useState(null);

  const update = (idx, child) => {
    const next = [...children];
    next[idx] = child;
    onChange(next);
  };
  const remove = (idx) => onChange(children.filter((_, i) => i !== idx));
  const move = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= children.length) return;
    const next = [...children];
    [next[idx], next[target]] = [next[target], next[idx]];
    next.forEach((c, i) => (c.sort_order = i));
    onChange(next);
  };
  const add = (type) => {
    const newChild = {
      id: `child_${Date.now()}`,
      enabled: true,
      label: type === 'header' ? 'Section Header' : 'New Link',
      sort_order: children.length,
      type,
      destination: type === 'header'
        ? { type: 'none', internal_page: '', entity_type: '', entity_id: '', entity_slug: '', entity_name: '', external_url: '', open_in_new_tab: false }
        : { type: 'internal_page', internal_page: '/', entity_type: '', entity_id: '', entity_slug: '', entity_name: '', external_url: '', open_in_new_tab: false },
      reusable_link_id: '',
    };
    onChange([...children, newChild]);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-xs text-foreground-quiet">Dropdown Children</Label>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => add('link')}>
            <Plus className="w-3 h-3 mr-1" /> Link
          </Button>
          <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => add('header')}>
            <Plus className="w-3 h-3 mr-1" /> Header
          </Button>
        </div>
      </div>
      <div className="space-y-1">
        {children.length === 0 && <p className="text-[10px] text-foreground-quiet italic px-2">No dropdown children — top-level link only</p>}
        {children.map((child, idx) => (
          <div key={child.id}>
            <div className="flex items-center gap-1.5 p-1.5 rounded-md bg-surface-interactive/40">
              <div className="flex flex-col">
                <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => move(idx, -1)} disabled={idx === 0}><ChevronUp className="w-2.5 h-2.5" /></Button>
                <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => move(idx, 1)} disabled={idx === children.length - 1}><ChevronDown className="w-2.5 h-2.5" /></Button>
              </div>
              <Switch checked={child.enabled} onCheckedChange={(val) => update(idx, { ...child, enabled: val })} />
              <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-surface-interactive text-foreground-quiet">{child.type === 'header' ? 'HDR' : 'LNK'}</span>
              <button onClick={() => setEditingChild(editingChild === idx ? null : idx)} className="flex-1 text-left min-w-0">
                <p className="text-xs font-medium truncate">{child.label || 'Untitled'}</p>
              </button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingChild(editingChild === idx ? null : idx)}>+</Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => remove(idx)}><Trash2 className="w-3 h-3" /></Button>
            </div>
            {editingChild === idx && (
              <ChildDetailEditor child={child} onSave={(c) => { update(idx, c); setEditingChild(null); }} onCancel={() => setEditingChild(null)} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChildDetailEditor({ child, onSave, onCancel }) {
  const [d, setD] = useState(child);

  return (
    <div className="mt-1 p-3 rounded-lg border border-motion/30 bg-surface space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold">Edit Child</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCancel}>×</Button>
      </div>
      <div>
        <Label className="text-xs text-foreground-quiet mb-1 block">Label</Label>
        <Input value={d.label} onChange={(e) => setD({ ...d, label: e.target.value })} className="h-8 text-xs" />
      </div>
      <div>
        <Label className="text-xs text-foreground-quiet mb-1 block">Type</Label>
        <Select value={d.type} onValueChange={(val) => setD({ ...d, type: val })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="link">Link (clickable)</SelectItem>
            <SelectItem value="header">Header (section divider)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {d.type === 'link' && (
        <DestinationEditor
          value={d.destination}
          onChange={(dest) => setD({ ...d, destination: dest })}
          allowReusableLink
          reusableLinkValue={d.reusable_link_id || ''}
          onReusableLinkChange={(id) => setD({ ...d, reusable_link_id: id })}
        />
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" className="text-xs" onClick={onCancel}>Cancel</Button>
        <Button size="sm" className="text-xs" onClick={() => onSave(d)}>Save</Button>
      </div>
    </div>
  );
}

function destLabel(dest) {
  if (!dest) return 'No destination';
  if (dest.type === 'internal_page') return `Internal: ${dest.internal_page || '—'}`;
  if (dest.type === 'external') return `External: ${dest.external_url || '—'}`;
  if (dest.type === 'entity') return `Entity: ${dest.entity_name || dest.entity_id || '—'}`;
  if (dest.type === 'reusable_link') return 'Reusable link';
  return 'No destination';
}