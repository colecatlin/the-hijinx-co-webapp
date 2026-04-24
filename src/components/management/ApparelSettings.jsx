import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ExternalLink } from 'lucide-react';

export default function ApparelSettings({ settings, queryClient }) {
  const singleton = settings.find(s => s.active) || {};

  const [values, setValues] = useState({
    apparel_shopify_url: singleton.apparel_shopify_url || 'https://www.hijinxco.com',
    apparel_cta_label: singleton.apparel_cta_label || 'Shop HIJINX CO.',
    apparel_link_strategy: singleton.apparel_link_strategy || 'shopify',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (key, val) => setValues(v => ({ ...v, [key]: val }));

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
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
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
        <p className="text-xs text-gray-400">All "Shop" links on the homepage and apparel page will point here.</p>
      </div>

      {/* CTA Label */}
      <div className="space-y-1.5">
        <Label>CTA Button Label</Label>
        <Input
          value={values.apparel_cta_label}
          onChange={e => set('apparel_cta_label', e.target.value)}
          placeholder="Shop HIJINX CO."
        />
        <p className="text-xs text-gray-400">Text shown on the main "Shop" button in the homepage apparel section.</p>
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

      <Button onClick={handleSave} disabled={saving} className="bg-[#232323] text-white">
        {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        {saved ? 'Saved!' : 'Save Apparel Settings'}
      </Button>
    </div>
  );
}