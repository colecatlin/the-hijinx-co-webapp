import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import PageShell from '@/components/shared/PageShell';

const DEFAULTS = {
  store_name: 'HIJINX', store_tagline: '', logo_url: '', primary_accent_color: '#00FFDA',
  announcement_bar_text: '', announcement_bar_active: false, free_shipping_threshold: 75,
  default_currency: 'USD', shipping_note: '', returns_policy_url: '', size_guide_url: '',
  instagram_url: '', twitter_url: '', maintenance_mode: false,
};

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-mono text-[#555] mb-2 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

export default function ManageStorefrontSettings() {
  const qc = useQueryClient();
  const [form, setForm] = useState(DEFAULTS);
  const [settingId, setSettingId] = useState(null);
  const [saved, setSaved] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { data: settings = [] } = useQuery({
    queryKey: ['adminStorefrontSettings'],
    queryFn: () => base44.entities.StorefrontSettings.list(),
  });

  useEffect(() => {
    if (settings.length > 0) {
      setForm({ ...DEFAULTS, ...settings[0] });
      setSettingId(settings[0].id);
    }
  }, [settings]);

  const save = useMutation({
    mutationFn: (data) => settingId
      ? base44.entities.StorefrontSettings.update(settingId, data)
      : base44.entities.StorefrontSettings.create(data),
    onSuccess: (result) => {
      if (!settingId && result?.id) setSettingId(result.id);
      qc.invalidateQueries(['adminStorefrontSettings']);
      qc.invalidateQueries(['storefrontSettings']);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const inputCls = "w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none";

  return (
    <PageShell style={{ background: '#050505', color: '#F5F5F5' }}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-10">
          <Link to="/admin/storefront"><ArrowLeft className="w-4 h-4 text-[#555] hover:text-[#00FFDA]" /></Link>
          <div className="flex-1">
            <span className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase block mb-1">Admin</span>
            <h1 className="text-2xl font-black text-[#F5F5F5]">Storefront Settings</h1>
          </div>
          <button
            onClick={() => save.mutate(form)}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase transition-colors ${saved ? 'bg-green-500 text-white' : 'bg-[#00FFDA] text-[#050505] hover:bg-white'}`}
          >
            <Save className="w-3.5 h-3.5" /> {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>

        <div className="space-y-8">
          {/* Brand */}
          <section>
            <p className="text-xs font-mono text-[#00FFDA] uppercase tracking-[0.3em] mb-5 pb-2 border-b border-[#1a1a1a]">Brand</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Store Name"><input value={form.store_name} onChange={e => set('store_name', e.target.value)} className={inputCls} /></Field>
              <Field label="Store Tagline"><input value={form.store_tagline} onChange={e => set('store_tagline', e.target.value)} className={inputCls} /></Field>
              <Field label="Logo URL (full width)"><input value={form.logo_url} onChange={e => set('logo_url', e.target.value)} className={inputCls} /></Field>
              <Field label="Accent Color">
                <div className="flex gap-2">
                  <input type="color" value={form.primary_accent_color} onChange={e => set('primary_accent_color', e.target.value)} className="w-10 h-[38px] border border-[#262626] bg-[#111] cursor-pointer" />
                  <input value={form.primary_accent_color} onChange={e => set('primary_accent_color', e.target.value)} className={`${inputCls} flex-1 font-mono`} />
                </div>
              </Field>
            </div>
          </section>

          {/* Announcement Bar */}
          <section>
            <p className="text-xs font-mono text-[#00FFDA] uppercase tracking-[0.3em] mb-5 pb-2 border-b border-[#1a1a1a]">Announcement Bar</p>
            <div className="space-y-3">
              <Field label="Announcement Text"><input value={form.announcement_bar_text} onChange={e => set('announcement_bar_text', e.target.value)} className={inputCls} placeholder="Free shipping on orders over $75" /></Field>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.announcement_bar_active} onChange={e => set('announcement_bar_active', e.target.checked)} className="accent-[#00FFDA]" />
                <span className="text-xs font-mono text-[#555] uppercase">Active</span>
              </label>
            </div>
          </section>

          {/* Commerce */}
          <section>
            <p className="text-xs font-mono text-[#00FFDA] uppercase tracking-[0.3em] mb-5 pb-2 border-b border-[#1a1a1a]">Commerce</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Free Shipping Threshold ($)"><input type="number" value={form.free_shipping_threshold} onChange={e => set('free_shipping_threshold', parseFloat(e.target.value))} className={inputCls} /></Field>
              <Field label="Default Currency"><input value={form.default_currency} onChange={e => set('default_currency', e.target.value)} className={inputCls} /></Field>
              <div className="col-span-2">
                <Field label="Default Shipping Note"><input value={form.shipping_note} onChange={e => set('shipping_note', e.target.value)} className={inputCls} placeholder="Usually ships in 3-5 business days" /></Field>
              </div>
              <Field label="Returns Policy URL"><input value={form.returns_policy_url} onChange={e => set('returns_policy_url', e.target.value)} className={inputCls} /></Field>
              <Field label="Size Guide URL"><input value={form.size_guide_url} onChange={e => set('size_guide_url', e.target.value)} className={inputCls} /></Field>
            </div>
          </section>

          {/* Social */}
          <section>
            <p className="text-xs font-mono text-[#00FFDA] uppercase tracking-[0.3em] mb-5 pb-2 border-b border-[#1a1a1a]">Social Links</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Instagram URL"><input value={form.instagram_url} onChange={e => set('instagram_url', e.target.value)} className={inputCls} /></Field>
              <Field label="Twitter / X URL"><input value={form.twitter_url} onChange={e => set('twitter_url', e.target.value)} className={inputCls} /></Field>
            </div>
          </section>

          {/* Advanced */}
          <section>
            <p className="text-xs font-mono text-[#00FFDA] uppercase tracking-[0.3em] mb-5 pb-2 border-b border-[#1a1a1a]">Advanced</p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.maintenance_mode} onChange={e => set('maintenance_mode', e.target.checked)} className="accent-red-500" />
              <span className="text-xs font-mono text-[#A1A1A1] uppercase">Maintenance Mode (blocks public storefront)</span>
            </label>
          </section>
        </div>
      </div>
    </PageShell>
  );
}