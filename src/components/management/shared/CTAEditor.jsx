import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HOME1_INTERNAL_ROUTES } from '@/components/management/home1/home1Routes';
import EntitySelector from './EntitySelector';

/**
 * CTAEditor — reusable call-to-action destination editor.
 *
 * Value shape:
 *   { enabled, label, destination: { type, internal_page, entity_type, entity_id, external_url, open_in_new_tab }, style }
 *
 * Destination types: internal_page | entity | external | none
 */
export default function CTAEditor({ value = {}, onChange, ctaLabel = 'CTA' }) {
  const v = {
    enabled: false,
    label: '',
    destination: { type: 'none', internal_page: '', entity_type: '', entity_id: '', external_url: '', open_in_new_tab: false },
    style: 'solid',
    ...value,
  };
  const d = { type: 'none', internal_page: '', entity_type: '', entity_id: '', entity_slug: '', entity_name: '', external_url: '', open_in_new_tab: false, ...v.destination };
  const set = (field, val) => onChange({ ...v, [field]: val });
  const setDest = (field, val) => onChange({ ...v, destination: { ...d, [field]: val } });

  return (
    <div className="space-y-3 p-3 rounded-lg border border-divider bg-surface">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold">{ctaLabel}</Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-foreground-quiet">Enabled</span>
          <Switch checked={v.enabled} onCheckedChange={(val) => set('enabled', val)} />
        </div>
      </div>

      {v.enabled && (
        <>
          <div>
            <Label className="text-xs text-foreground-quiet mb-1 block">Label</Label>
            <Input value={v.label} onChange={(e) => set('label', e.target.value)} className="h-8 text-xs" placeholder="SHOP NOW" />
          </div>

          <div>
            <Label className="text-xs text-foreground-quiet mb-1 block">Destination type</Label>
            <Select value={d.type} onValueChange={(val) => setDest('type', val)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (no link)</SelectItem>
                <SelectItem value="internal_page">Internal Page</SelectItem>
                <SelectItem value="entity">Existing Entity</SelectItem>
                <SelectItem value="external">External URL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {d.type === 'internal_page' && (
            <div>
              <Label className="text-xs text-foreground-quiet mb-1 block">Page</Label>
              <Select value={d.internal_page} onValueChange={(val) => setDest('internal_page', val)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select a page..." /></SelectTrigger>
                <SelectContent>
                  {HOME1_INTERNAL_ROUTES.map((r) => (
                    <SelectItem key={r.path} value={r.path}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {d.type === 'entity' && (
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-foreground-quiet mb-1 block">Entity type</Label>
                <Select value={d.entity_type} onValueChange={(val) => setDest('entity_type', val)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select type..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Event">Event</SelectItem>
                    <SelectItem value="OutletStory">Outlet Story</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {d.entity_type && (
                <div>
                  <Label className="text-xs text-foreground-quiet mb-1 block">Select {d.entity_type}</Label>
                  <EntitySelector
                    entityType={d.entity_type}
                    mode="single"
                    value={d.entity_id}
                    onChange={(id) => setDest('entity_id', id)}
                    onEntityPicked={(id, entity) => {
                      setDest('entity_slug', entity?.slug || '');
                      setDest('entity_name', entity ? (entity.name || entity.title || '') : '');
                    }}
                    placeholder={`Search ${d.entity_type.toLowerCase()}s...`}
                  />
                </div>
              )}
            </div>
          )}

          {d.type === 'external' && (
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-foreground-quiet mb-1 block">URL</Label>
                <Input
                  value={d.external_url}
                  onChange={(e) => setDest('external_url', e.target.value)}
                  className="h-8 text-xs"
                  placeholder="https://..."
                  type="url"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={d.open_in_new_tab} onCheckedChange={(val) => setDest('open_in_new_tab', val)} />
                <span className="text-xs text-foreground-quiet">Open in new tab</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}