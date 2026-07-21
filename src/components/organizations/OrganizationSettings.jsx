import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, ShieldCheck } from 'lucide-react';
import { VERIFICATION_STATES } from '@/config/organizationRegistry';
import { saveSettings, setVerificationStatus } from '@/components/organizations/organizationService';

const TEAL = '#1DA1A1';

/** Settings — the single standardized management surface for any org. */
export default function OrganizationSettings({ orgType, entityId, settings, record, isAdmin, onSaved }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(settings || {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => { if (settings) setForm(settings); }, [settings]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onSave = async () => {
    setSaving(true); setError(null);
    try {
      await saveSettings({ ...form, entity_type: orgType, entity_id: entityId });
      qc.invalidateQueries({ queryKey: ['org_settings', orgType, entityId] });
      qc.invalidateQueries({ queryKey: ['org_context', orgType, entityId] });
      onSaved?.();
    } catch (e) { setError(e?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const onVerify = async (status) => {
    setSaving(true); setError(null);
    try {
      await setVerificationStatus({ ...form }, status);
      qc.invalidateQueries({ queryKey: ['org_settings', orgType, entityId] });
    } catch (e) { setError(e?.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <Card title="Branding & Profile">
        <Field label="Tagline"><Input value={form.tagline || ''} onChange={(v) => set('tagline', v)} /></Field>
        <Field label="Banner Image URL"><Input value={form.banner_url || ''} onChange={(v) => set('banner_url', v)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Primary Color"><ColorInput value={form.primary_color || '#1DA1A1'} onChange={(v) => set('primary_color', v)} /></Field>
          <Field label="Secondary Color"><ColorInput value={form.secondary_color || '#0A0F0F'} onChange={(v) => set('secondary_color', v)} /></Field>
        </div>
        <Field label="Website URL"><Input value={form.website_url || record?.website_url || ''} onChange={(v) => set('website_url', v)} /></Field>
      </Card>

      <Card title="Contact">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email"><Input value={form.contact_email || ''} onChange={(v) => set('contact_email', v)} /></Field>
          <Field label="Phone"><Input value={form.contact_phone || ''} onChange={(v) => set('contact_phone', v)} /></Field>
        </div>
      </Card>

      <Card title="Social Links">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Instagram"><Input value={form.social_instagram || ''} onChange={(v) => set('social_instagram', v)} /></Field>
          <Field label="X (Twitter)"><Input value={form.social_x || ''} onChange={(v) => set('social_x', v)} /></Field>
          <Field label="Facebook"><Input value={form.social_facebook || ''} onChange={(v) => set('social_facebook', v)} /></Field>
          <Field label="YouTube"><Input value={form.social_youtube || ''} onChange={(v) => set('social_youtube', v)} /></Field>
          <Field label="LinkedIn"><Input value={form.social_linkedin || ''} onChange={(v) => set('social_linkedin', v)} /></Field>
          <Field label="TikTok"><Input value={form.social_tiktok || ''} onChange={(v) => set('social_tiktok', v)} /></Field>
        </div>
      </Card>

      <Card title="Visibility & Verification">
        <Field label="Visibility">
          <select value={form.visibility || 'public'} onChange={(e) => set('visibility', e.target.value)}
            className="w-full h-9 px-2 rounded-lg text-sm" style={inputStyle}>
            <option value="public" style={{ color: '#000' }}>Public</option>
            <option value="private" style={{ color: '#000' }}>Private</option>
          </select>
        </Field>
        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest mb-2 block" style={{ color: 'rgba(255,255,255,0.4)' }}>Verification Status</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(VERIFICATION_STATES).map(([key, cfg]) => (
              <button key={key} disabled={!isAdmin || saving} onClick={() => onVerify(key)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                style={{
                  background: form.verification_status === key ? `${cfg.color}22` : 'rgba(255,255,255,0.04)',
                  color: form.verification_status === key ? cfg.color : 'rgba(255,255,255,0.5)',
                  border: `1px solid ${form.verification_status === key ? cfg.color : 'rgba(255,255,255,0.08)'}`,
                  opacity: isAdmin ? 1 : 0.5,
                }}>
                <ShieldCheck className="w-3.5 h-3.5" /> {cfg.label}
              </button>
            ))}
          </div>
          {!isAdmin && <p className="text-[10px] mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Only organization administrators can change verification.</p>}
        </div>
      </Card>

      <Card title="Invitation Settings">
        <label className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
          <input type="checkbox" checked={form.allow_invitations !== false} onChange={(e) => set('allow_invitations', e.target.checked)} /> Allow invitations
        </label>
        <label className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
          <input type="checkbox" checked={form.approval_required !== false} onChange={(e) => set('approval_required', e.target.checked)} /> Require admin approval for join requests
        </label>
        <Field label="Default Role Template (role key granted on approval)"><Input value={form.default_permission_template_id || 'staff'} onChange={(v) => set('default_permission_template_id', v)} /></Field>
        <Field label="Access Code (optional gate)"><Input value={form.access_code || ''} onChange={(v) => set('access_code', v)} /></Field>
      </Card>

      {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
      <button onClick={onSave} disabled={saving}
        className="px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2"
        style={{ background: TEAL, color: '#050A0A' }}>
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Settings
      </button>
    </div>
  );
}

const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' };

function Card({ title, children }) {
  return (
    <div className="p-5 rounded-xl" style={{ background: 'rgba(4,8,8,0.72)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <h4 className="text-[10px] font-mono uppercase tracking-[0.3em] mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>{title}</h4>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
function Field({ label, children }) {
  return <div><label className="text-[10px] font-mono uppercase tracking-widest mb-1 block" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</label>{children}</div>;
}
function Input({ value, onChange }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-9 px-3 rounded-lg text-sm" style={inputStyle} />;
}
function ColorInput({ value, onChange }) {
  return <div className="flex items-center gap-2">
    <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-9 h-9 rounded p-0 border-0 bg-transparent" />
    <input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 h-9 px-3 rounded-lg text-sm font-mono" style={inputStyle} />
  </div>;
}