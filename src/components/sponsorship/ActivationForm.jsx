import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const ACTIVATION_TYPES = [
  'EventExperience','Hospitality','FanActivation','Giveaway','Display','Booth',
  'VehicleBranding','MediaIntegration','SocialCampaign','ContentCampaign',
  'DriverAppearance','TeamAppearance','ProductSampling','Merchandise','Digital','Community','Other',
];

export default function ActivationForm({ sponsorshipId, activation, onSave, onCancel }) {
  const [form, setForm] = useState({
    activation_type: 'EventExperience',
    title: '',
    description: '',
    status: 'planned',
    start_date: '',
    end_date: '',
    location: '',
    url: '',
    budget_amount: '',
    estimated_reach: '',
    actual_reach: '',
    public_visibility: 'private',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (activation) {
      setForm({
        activation_type: activation.activation_type || 'EventExperience',
        title: activation.title || '',
        description: activation.description || '',
        status: activation.status || 'planned',
        start_date: activation.start_date ? activation.start_date.slice(0, 16) : '',
        end_date: activation.end_date ? activation.end_date.slice(0, 16) : '',
        location: activation.location || '',
        url: activation.url || '',
        budget_amount: activation.budget_amount ? String(activation.budget_amount / 100) : '',
        estimated_reach: activation.estimated_reach ? String(activation.estimated_reach) : '',
        actual_reach: activation.actual_reach ? String(activation.actual_reach) : '',
        public_visibility: activation.public_visibility || 'private',
        notes: activation.notes || '',
      });
    }
  }, [activation]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        sponsorship_id: sponsorshipId,
        activation_type: form.activation_type,
        title: form.title.trim(),
        description: form.description || undefined,
        status: form.status,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : undefined,
        end_date: form.end_date ? new Date(form.end_date).toISOString() : undefined,
        location: form.location || undefined,
        url: form.url || undefined,
        budget_amount: form.budget_amount ? Math.round(parseFloat(form.budget_amount) * 100) : undefined,
        estimated_reach: form.estimated_reach ? parseInt(form.estimated_reach, 10) : undefined,
        actual_reach: form.actual_reach ? parseInt(form.actual_reach, 10) : undefined,
        public_visibility: form.public_visibility,
        notes: form.notes || undefined,
      };
      await onSave(payload, activation?.id);
    } catch (err) {
      setError(err.message || 'Failed to save activation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'hsl(0 0% 0% / 0.6)' }}>
      <div className="w-full max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto" style={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--divider))' }}>
        <div className="flex items-center justify-between px-5 py-4 sticky top-0" style={{ borderBottom: '1px solid hsl(var(--divider))', background: 'hsl(var(--surface-elevated))' }}>
          <h3 className="text-sm font-bold tracking-wide uppercase" style={{ color: 'hsl(var(--foreground))' }}>
            {activation ? 'Edit Activation' : 'New Activation'}
          </h3>
          <button onClick={onCancel} className="p-1 rounded"><X className="w-4 h-4" style={{ color: 'hsl(var(--foreground-quiet))' }} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <Field label="Title *">
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm bg-transparent border" style={{ borderColor: 'hsl(var(--divider))', color: 'hsl(var(--foreground))' }} />
          </Field>
          <Field label="Type">
            <select value={form.activation_type} onChange={e => setForm({ ...form, activation_type: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm bg-transparent border" style={{ borderColor: 'hsl(var(--divider))', color: 'hsl(var(--foreground))' }}>
              {ACTIVATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm bg-transparent border" style={{ borderColor: 'hsl(var(--divider))', color: 'hsl(var(--foreground))' }}>
              {['planned','approved','active','completed','cancelled','archived'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Description">
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg text-sm bg-transparent border" style={{ borderColor: 'hsl(var(--divider))', color: 'hsl(var(--foreground))' }} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date"><input type="datetime-local" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm bg-transparent border" style={{ borderColor: 'hsl(var(--divider))', color: 'hsl(var(--foreground))' }} /></Field>
            <Field label="End Date"><input type="datetime-local" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm bg-transparent border" style={{ borderColor: 'hsl(var(--divider))', color: 'hsl(var(--foreground))' }} /></Field>
          </div>
          <Field label="Location"><input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm bg-transparent border" style={{ borderColor: 'hsl(var(--divider))', color: 'hsl(var(--foreground))' }} /></Field>
          <Field label="URL"><input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm bg-transparent border" style={{ borderColor: 'hsl(var(--divider))', color: 'hsl(var(--foreground))' }} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Budget (USD)"><input type="number" step="0.01" value={form.budget_amount} onChange={e => setForm({ ...form, budget_amount: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm bg-transparent border" style={{ borderColor: 'hsl(var(--divider))', color: 'hsl(var(--foreground))' }} /></Field>
            <Field label="Est. Reach"><input type="number" value={form.estimated_reach} onChange={e => setForm({ ...form, estimated_reach: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm bg-transparent border" style={{ borderColor: 'hsl(var(--divider))', color: 'hsl(var(--foreground))' }} /></Field>
            <Field label="Actual Reach"><input type="number" value={form.actual_reach} onChange={e => setForm({ ...form, actual_reach: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm bg-transparent border" style={{ borderColor: 'hsl(var(--divider))', color: 'hsl(var(--foreground))' }} /></Field>
          </div>
          <Field label="Visibility">
            <select value={form.public_visibility} onChange={e => setForm({ ...form, public_visibility: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm bg-transparent border" style={{ borderColor: 'hsl(var(--divider))', color: 'hsl(var(--foreground))' }}>
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
          </Field>
          <Field label="Notes"><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg text-sm bg-transparent border" style={{ borderColor: 'hsl(var(--divider))', color: 'hsl(var(--foreground))' }} /></Field>
          {error && <p className="text-xs" style={{ color: 'hsl(var(--danger))' }}>{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border" style={{ borderColor: 'hsl(var(--divider))', color: 'hsl(var(--foreground-secondary))' }}>Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg font-semibold" style={{ background: 'hsl(var(--motion))', color: 'hsl(var(--canvas))' }}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'hsl(var(--foreground-quiet))' }}>{label}</label>
      {children}
    </div>
  );
}