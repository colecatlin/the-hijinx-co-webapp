import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronUp, ChevronDown, Plus, Pencil, Trash2, X, GripVertical } from 'lucide-react';
import DestinationEditor from '@/components/management/shared/DestinationEditor';
import { routeLabel } from '@/components/management/shared/siteRoutes';

/**
 * FooterGroupEditor — edits one footer navigation group.
 *
 * Props: group, onChange, onMoveUp, onMoveDown, canMoveUp, canMoveDown
 */
export default function FooterGroupEditor({ group, onChange, onMoveUp, onMoveDown, canMoveUp, canMoveDown }) {
  const [editingLink, setEditingLink] = useState(null); // index or 'new'

  const g = {
    key: '',
    title: '',
    enabled: true,
    sort_order: 0,
    links: [],
    ...group,
  };

  const set = (field, val) => onChange({ ...g, [field]: val });
  const setLinks = (links) => set('links', links);

  const updateLink = (idx, link) => {
    const links = [...g.links];
    links[idx] = link;
    setLinks(links);
  };
  const addLink = (link) => setLinks([...g.links, link]);
  const removeLink = (idx) => setLinks(g.links.filter((_, i) => i !== idx));
  const moveLink = (idx, dir) => {
    const links = [...g.links];
    const target = idx + dir;
    if (target < 0 || target >= links.length) return;
    [links[idx], links[target]] = [links[target], links[idx]];
    setLinks(links);
  };

  const destSummary = (link) => {
    if (link.destination_type === 'reusable_link') return `Reusable Link: ${link.reusable_link_id || '—'}`;
    const d = link.destination;
    if (!d || d.type === 'none') return 'No destination';
    if (d.type === 'internal_page') return routeLabel(d.internal_page);
    if (d.type === 'external') return d.external_url || 'External URL';
    if (d.type === 'entity') return `${d.entity_type || 'Entity'}: ${d.entity_name || d.entity_id || '—'}`;
    return '—';
  };

  return (
    <div className="rounded-lg border border-divider bg-surface overflow-hidden">
      {/* Group header */}
      <div className="flex items-center gap-2 p-3 bg-surface-elevated border-b border-divider">
        <GripVertical className="w-4 h-4 text-foreground-quiet shrink-0" />
        <Input
          value={g.title}
          onChange={(e) => set('title', e.target.value)}
          className="h-8 text-xs font-semibold flex-1"
          placeholder="Group title"
        />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveUp} disabled={!canMoveUp}>
            <ChevronUp className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveDown} disabled={!canMoveDown}>
            <ChevronDown className="w-3.5 h-3.5" />
          </Button>
          <div className="flex items-center gap-1.5 ml-1">
            <Switch checked={g.enabled} onCheckedChange={(val) => set('enabled', val)} />
            <span className="text-xs text-foreground-quiet">{g.enabled ? 'On' : 'Off'}</span>
          </div>
        </div>
      </div>

      {/* Links list */}
      <div className="p-3 space-y-1.5">
        {g.links.length === 0 && (
          <p className="text-xs text-foreground-quiet italic py-2">No links in this group</p>
        )}
        {g.links.map((link, idx) => (
          <div key={link.id || idx} className="flex items-center gap-2 p-2 rounded-md bg-surface-interactive/50">
            <div className="flex flex-col">
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveLink(idx, -1)} disabled={idx === 0}>
                <ChevronUp className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveLink(idx, 1)} disabled={idx === g.links.length - 1}>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{link.label || 'Untitled'}</p>
              <p className="text-[10px] text-foreground-quiet truncate">{destSummary(link)}</p>
            </div>
            <Switch checked={link.enabled} onCheckedChange={(val) => updateLink(idx, { ...link, enabled: val })} />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingLink(editingLink === idx ? null : idx)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLink(idx)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>

            {/* Inline link editor */}
            {editingLink === idx && (
              <LinkEditor
                link={link}
                onSave={(updated) => { updateLink(idx, updated); setEditingLink(null); }}
                onCancel={() => setEditingLink(null)}
              />
            )}
          </div>
        ))}

        {/* New link editor */}
        {editingLink === 'new' && (
          <LinkEditor
            link={{ id: `link_${Date.now()}`, label: '', enabled: true, sort_order: g.links.length, destination_type: 'internal_page', destination: { type: 'internal_page' }, reusable_link_id: '', open_in_new_tab: false }}
            onSave={(link) => { addLink(link); setEditingLink(null); }}
            onCancel={() => setEditingLink(null)}
          />
        )}

        {editingLink !== 'new' && (
          <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setEditingLink('new')}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Link
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * LinkEditor — inline editor for a single footer link.
 */
function LinkEditor({ link, onSave, onCancel }) {
  const [draft, setDraft] = useState(link);
  const set = (field, val) => setDraft({ ...draft, [field]: val });

  return (
    <div className="col-span-full mt-2 p-3 rounded-lg border border-motion/30 bg-surface-elevated space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold">Edit Link</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCancel}><X className="w-3.5 h-3.5" /></Button>
      </div>
      <div>
        <Label className="text-xs text-foreground-quiet mb-1 block">Label</Label>
        <Input value={draft.label} onChange={(e) => set('label', e.target.value)} className="h-8 text-xs" placeholder="Link label" />
      </div>
      <DestinationEditor
        value={draft.destination}
        onChange={(dest) => {
          set('destination', dest);
          set('destination_type', dest.type);
          if (dest.type !== 'reusable_link') set('reusable_link_id', '');
        }}
        allowReusableLink
        reusableLinkValue={draft.reusable_link_id || ''}
        onReusableLinkChange={(id) => set('reusable_link_id', id)}
      />
      <div className="flex items-center gap-2">
        <Switch checked={draft.open_in_new_tab} onCheckedChange={(val) => set('open_in_new_tab', val)} />
        <span className="text-xs text-foreground-quiet">Open in new tab</span>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" className="text-xs" onClick={onCancel}>Cancel</Button>
        <Button size="sm" className="text-xs" onClick={() => onSave(draft)}>Save Link</Button>
      </div>
    </div>
  );
}