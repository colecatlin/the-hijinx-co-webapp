import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SITE_ROUTES } from './siteRoutes';
import EntitySelector from './EntitySelector';

/**
 * DestinationEditor — reusable structured destination editor.
 *
 * Value shape (destination object):
 *   { type, internal_page, entity_type, entity_id, entity_slug, entity_name, external_url, open_in_new_tab }
 *
 * Destination types: internal_page | entity | external | none
 *
 * For footer links that also support reusable_link, pass allowReusableLink=true
 * and the parent component handles the reusable_link_id separately.
 */
export default function DestinationEditor({ value = {}, onChange, allowReusableLink = false, onReusableLinkChange, reusableLinkValue = '' }) {
  const d = {
    type: 'none',
    internal_page: '',
    entity_type: '',
    entity_id: '',
    entity_slug: '',
    entity_name: '',
    external_url: '',
    open_in_new_tab: false,
    ...value,
  };
  const set = (field, val) => onChange({ ...d, [field]: val });

  return (
    <div className="space-y-2">
      <div>
        <Label className="text-xs text-foreground-quiet mb-1 block">Destination type</Label>
        <Select value={d.type} onValueChange={(val) => set('type', val)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None (no link)</SelectItem>
            <SelectItem value="internal_page">Internal Page</SelectItem>
            <SelectItem value="entity">Existing Entity</SelectItem>
            <SelectItem value="external">External URL</SelectItem>
            {allowReusableLink && <SelectItem value="reusable_link">Reusable Link</SelectItem>}
          </SelectContent>
        </Select>
      </div>

      {d.type === 'internal_page' && (
        <div>
          <Label className="text-xs text-foreground-quiet mb-1 block">Page</Label>
          <Select value={d.internal_page} onValueChange={(val) => set('internal_page', val)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select a page..." /></SelectTrigger>
            <SelectContent className="max-h-72">
              {SITE_ROUTES.map((r) => (
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
            <Select value={d.entity_type} onValueChange={(val) => set('entity_type', val)}>
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
                onChange={(id) => set('entity_id', id)}
                onEntityPicked={(id, entity) => {
                  set('entity_slug', entity?.slug || '');
                  set('entity_name', entity ? (entity.name || entity.title || '') : '');
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
              onChange={(e) => set('external_url', e.target.value)}
              className="h-8 text-xs"
              placeholder="https://..."
              type="url"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={d.open_in_new_tab} onCheckedChange={(val) => set('open_in_new_tab', val)} />
            <span className="text-xs text-foreground-quiet">Open in new tab</span>
          </div>
        </div>
      )}

      {d.type === 'reusable_link' && allowReusableLink && (
        <ReusableLinkPicker
          value={reusableLinkValue}
          onChange={onReusableLinkChange || (() => {})}
        />
      )}

      {d.type === 'none' && (
        <p className="text-xs text-foreground-quiet italic">No destination — link will not be clickable</p>
      )}
    </div>
  );
}

function ReusableLinkPicker({ value, onChange }) {
  const { data: links, isLoading } = useQuery({
    queryKey: ['managedLinks', 'for-picker'],
    queryFn: () => base44.entities.ManagedLink.list('-updated_date', 200),
    staleTime: 60 * 1000,
  });

  const enabledLinks = (links || []).filter((l) => l.enabled);

  return (
    <div>
      <Label className="text-xs text-foreground-quiet mb-1 block">Reusable Link</Label>
      {isLoading ? (
        <p className="text-xs text-foreground-quiet">Loading links...</p>
      ) : enabledLinks.length === 0 ? (
        <p className="text-xs text-foreground-quiet italic">
          No enabled reusable links. Create one in Website → Links first.
        </p>
      ) : (
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select a reusable link..." />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {enabledLinks.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.title} {l.label !== l.title ? `(${l.label})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}