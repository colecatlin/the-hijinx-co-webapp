import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ExternalLink, Plus, Trash2 } from 'lucide-react';

const DEFAULT_BLOCKS = [
  { tag: 'New Drop', title: 'Race Day', description: 'Built for the track and everywhere else.', link_url: '', accent_color: '#E5FF00' },
  { tag: 'Limited', title: 'Heritage Series', description: 'Rooted in motorsports culture.', link_url: '', accent_color: '#FF6B35' },
];

export default function ApparelSettings({ settings, queryClient }) {
  const singleton = settings.find(s => s.active) || {};

  const [values, setValues] = useState({
    apparel_shopify_url: singleton.apparel_shopify_url || 'https://www.hijinxco.com',
    apparel_cta_label: singleton.apparel_cta_label || 'Shop HIJINX CO.',
    apparel_link_strategy: singleton.apparel_link_strategy || 'shopify',
    apparel_marketing_blocks: singleton.apparel_marketing_blocks?.length
      ? singleton.apparel_marketing_blocks
      : DEFAULT_BLOCKS,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (key, val) => setValues(v => ({ ...v, [key]: val }));

  const updateBlock = (i, field, val) => {
    const blocks = [...values.apparel_marketing_blocks];
    blocks[i] = { ...blocks[i], [field]: val };
    set('apparel_marketing_blocks', blocks);
  };

  const addBlock = () => {
    set('apparel_marketing_blocks', [
      ...values.apparel_marketing_blocks,
      { tag: '', title: '', description: '', link_url: '', accent_color: '#E5FF00' },
    ]);
  };

  const removeBlock = (i) => {
    const blocks = values.apparel_marketing_blocks.filter((_, idx) => idx !== i);
    set('apparel_marketing_blocks', blocks);
  };

  const handleSave = async () => {
    setSaving(true);
    if (singleton.id) {
      await base44.entities.HomepageSettings.update(singleton.id, values);
    } else {
      await base44.entities.HomepageSettings.create({ ...values, active: true });
    }
    queryClient.invalidateQueries({ queryKey: ['homepageSettings'] });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-8">
      <div>
        <h2 className="text-lg font-bold">Apparel Section</h2>
        <p className="text-sm text-gray-500 mt-1">Configure the Apparel section links and behavior on the homepage.</p>
      </div>

      {/* Shopify URL */}
      <div className="space-y-1.5">
        <Label>Shopify Store URL</Label>
        <div className="flex gap-2">
          <Input
            value={values.apparel_shopify_url}
            onChange={e => set('apparel_shopify_url', e.target.value)}
            placeholder="https://www.hijinxco.com"
          />
          {values.apparel_shopify_url && (
            <a
              href={values.apparel_shopify_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 border border-gray-200 rounded-md text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
        <p className="text-xs text-gray-400">Fallback URL used when a block has no custom link.</p>
      </div>

      {/* CTA Label */}
      <div className="space-y-1.5">
        <Label>CTA Button Label</Label>
        <Input
          value={values.apparel_cta_label}
          onChange={e => set('apparel_cta_label', e.target.value)}
          placeholder="Shop HIJINX CO."
        />
        <p className="text-xs text-gray-400">Text shown on the main "Shop" button in the hero card.</p>
      </div>

      {/* Link Strategy */}
      <div className="space-y-2">
        <Label>Product Link Behavior</Label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'shopify', label: 'Shopify', desc: 'All product links go directly to the Shopify store.' },
            { value: 'internal', label: 'Internal Page', desc: 'Product links go to internal detail pages first.' },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => set('apparel_link_strategy', opt.value)}
              className={`text-left p-4 rounded-lg border-2 transition-all ${
                values.apparel_link_strategy === opt.value
                  ? 'border-[#232323] bg-[#232323] text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              <p className="font-semibold text-sm">{opt.label}</p>
              <p className={`text-xs mt-1 ${values.apparel_link_strategy === opt.value ? 'text-white/70' : 'text-gray-400'}`}>{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Marketing Blocks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Marketing Blocks</Label>
            <p className="text-xs text-gray-400 mt-0.5">The smaller cards shown beside the main hero. Each block can have its own link.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addBlock} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Block
          </Button>
        </div>

        {values.apparel_marketing_blocks.map((block, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Block {i + 1}</span>
              <button
                type="button"
                onClick={() => removeBlock(i)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tag / Label</Label>
                <Input
                  value={block.tag}
                  onChange={e => updateBlock(i, 'tag', e.target.value)}
                  placeholder="e.g. New Drop"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Accent Color</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={block.accent_color || '#E5FF00'}
                    onChange={e => updateBlock(i, 'accent_color', e.target.value)}
                    className="h-8 w-10 rounded border border-gray-200 cursor-pointer p-0.5"
                  />
                  <Input
                    value={block.accent_color || ''}
                    onChange={e => updateBlock(i, 'accent_color', e.target.value)}
                    placeholder="#E5FF00"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Title</Label>
              <Input
                value={block.title}
                onChange={e => updateBlock(i, 'title', e.target.value)}
                placeholder="e.g. Race Day"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Input
                value={block.description}
                onChange={e => updateBlock(i, 'description', e.target.value)}
                placeholder="Short description..."
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Link URL</Label>
              <Input
                value={block.link_url}
                onChange={e => updateBlock(i, 'link_url', e.target.value)}
                placeholder="https://... (leave blank to use Shopify URL)"
                className="h-8 text-sm"
              />
            </div>
          </div>
        ))}
      </div>

      <Button onClick={handleSave} disabled={saving} className="bg-[#232323] text-white">
        {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        {saved ? 'Saved!' : 'Save Apparel Settings'}
      </Button>
    </div>
  );
}