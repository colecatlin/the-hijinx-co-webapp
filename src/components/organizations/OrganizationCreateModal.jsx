import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, ArrowRight } from 'lucide-react';
import { ORGANIZATION_TYPES, getOrganizationType } from '@/config/organizationRegistry';

/**
 * OrganizationCreateModal — the reusable creation flow. Rendered full-page by
 * OrganizationCreate and embeddable in a dialog elsewhere. Calls the backend
 * createOrganization function, which creates the record + owner relationship +
 * settings overlay + approval event in one transaction.
 */
export default function OrganizationCreateModal({ onClose }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [type, setType] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', website_url: '', logo_url: '', location_city: '', location_country: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSubmitting(true); setError(null);
    try {
      const base44 = (await import('@/api/base44Client')).base44;
      const res = await base44.functions.invoke('createOrganization', {
        entity_type: type,
        fields: { ...form },
      });
      const data = res?.data || res;
      if (!data?.ok && data?.error) throw new Error(data.error);
      const org = data.organization;
      qc.invalidateQueries({ queryKey: ['org_context'] });
      navigate(`/organization/${type}/${org.id}`);
      onClose?.();
    } catch (e) { setError(e?.message || 'Creation failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Create an Organization</h2>
        <p className="text-[11px] mt-1 text-foreground-quiet">
          Every organization type shares the same platform: people, assets, relationships, activity, and settings.
        </p>
      </div>

      {!type ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(ORGANIZATION_TYPES).map(([key, spec]) => {
            const Icon = spec.icon;
            return (
              <button key={key} onClick={() => setType(key)}
                className="p-4 rounded-xl text-left transition-all bg-surface-elevated border border-divider hover:border-motion/40 hover:bg-surface-interactive">
                <Icon className="w-5 h-5 mb-2 text-motion" />
                <div className="text-sm font-bold text-foreground">{spec.label}</div>
                <div className="text-[10px] mt-1 text-foreground-quiet">
                  {spec.generic ? 'Generic org record' : 'Dedicated entity'}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          <button onClick={() => setType(null)} className="text-[11px] text-motion hover:text-motion-hover">← Change type</button>
          <div className="space-y-3 p-5 rounded-xl bg-surface-elevated border border-divider">
            <Field label="Name"><Input value={form.name} onChange={(v) => set('name', v)} placeholder={`${getOrganizationType(type).label} name`} /></Field>
            <Field label="Description"><Textarea value={form.description} onChange={(v) => set('description', v)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Website URL"><Input value={form.website_url} onChange={(v) => set('website_url', v)} /></Field>
              <Field label="Logo URL"><Input value={form.logo_url} onChange={(v) => set('logo_url', v)} /></Field>
            </div>
            {getOrganizationType(type).supportsLocation && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="City"><Input value={form.location_city} onChange={(v) => set('location_city', v)} /></Field>
                <Field label="Country"><Input value={form.location_country} onChange={(v) => set('location_country', v)} /></Field>
              </div>
            )}
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <button onClick={submit} disabled={submitting || !form.name.trim()}
            className="w-full px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:bg-surface-interactive disabled:text-foreground-quiet bg-motion text-primary-foreground hover:bg-motion-hover">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create {getOrganizationType(type).label} <ArrowRight className="w-4 h-4" /></>}
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) { return <div><label className="text-[10px] font-mono uppercase tracking-widest mb-1 block text-foreground-quiet">{label}</label>{children}</div>; }
function Input({ value, onChange, placeholder }) { return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full h-9 px-3 rounded-lg text-sm bg-surface-interactive border border-divider text-foreground placeholder:text-foreground-quiet focus:border-motion focus:outline-none" />; }
function Textarea({ value, onChange }) { return <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="w-full p-3 rounded-lg text-sm bg-surface-interactive border border-divider text-foreground placeholder:text-foreground-quiet focus:border-motion focus:outline-none" />; }