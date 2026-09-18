import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import MediaSelector from '@/components/management/shared/MediaSelector';

/**
 * StaticPageSeoFields — editable SEO fields for one static page.
 *
 * Props:
 *   pageKey  – the page key in SeoSettings.pages
 *   pageData – the current draft page config { title, description, og_image, canonical_path, noindex }
 *   label    – display label for the page
 *   onChange – (newPageData) => void
 */
export default function StaticPageSeoFields({ pageKey, pageData, label, onChange }) {
  const update = (field, value) => onChange({ ...pageData, [field]: value });

  return (
    <div className="border border-divider rounded-lg p-4 space-y-3 bg-surface">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">{label}</h4>
        <div className="flex items-center gap-2">
          <Label htmlFor={`noindex-${pageKey}`} className="text-xs text-foreground-quiet">Noindex</Label>
          <Switch
            id={`noindex-${pageKey}`}
            checked={!!pageData.noindex}
            onCheckedChange={(v) => update('noindex', v)}
          />
        </div>
      </div>

      <div>
        <Label className="text-xs text-foreground-quiet mb-1 block">Title</Label>
        <Input
          value={pageData.title || ''}
          onChange={(e) => update('title', e.target.value)}
          placeholder="Page title"
          className="text-sm"
        />
      </div>

      <div>
        <Label className="text-xs text-foreground-quiet mb-1 block">Description</Label>
        <Textarea
          value={pageData.description || ''}
          onChange={(e) => update('description', e.target.value)}
          placeholder="Meta description"
          rows={2}
          className="text-sm resize-none"
        />
      </div>

      <div>
        <Label className="text-xs text-foreground-quiet mb-1 block">Canonical Path</Label>
        <Input
          value={pageData.canonical_path || ''}
          onChange={(e) => update('canonical_path', e.target.value)}
          placeholder="/path"
          className="text-sm font-mono"
        />
      </div>

      <div>
        <Label className="text-xs text-foreground-quiet mb-1 block">OG Image Override</Label>
        <MediaSelector
          value={{ url: pageData.og_image || '', alt: '' }}
          onChange={(m) => update('og_image', m.url)}
          showPosition={false}
        />
      </div>
    </div>
  );
}