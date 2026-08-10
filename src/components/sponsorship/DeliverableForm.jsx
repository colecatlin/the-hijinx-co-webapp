import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const DELIVERABLE_TYPES = [
  'LogoPlacement','SocialPost','VideoIntegration','MediaArticle','Newsletter',
  'LivestreamMention','EventSignage','VehicleBranding','HospitalityPass','VIPExperience',
  'DriverAppearance','TeamAppearance','ProductDisplay','ProductSampling','Giveaway',
  'MerchandiseInclusion','Booth','PhotoContent','VideoContent','PodcastIntegration',
  'DigitalPlacement','Other',
];

export default function DeliverableForm({ sponsorshipId, activationId, deliverable, onSave, onCancel }) {
  const [form, setForm] = useState({
    deliverable_type: 'LogoPlacement',
    title: '',
    description: '',
    status: 'planned',
    quantity_required: '1',
    due_date: '',
    public_visibility: 'private',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (deliverable) {
      setForm({
        deliverable_type: deliverable.deliverable_type || 'LogoPlacement',
        title: deliverable.title || '',
        description: deliverable.description || '',
        status: deliverable.status || 'planned',
        quantity_required: deliverable.quantity_required ? String(deliverable.quantity_required) : '1',
        due_date: deliverable.due_date ? deliverable.due_date.slice(0, 16) : '',
        public_visibility: deliverable.public_visibility || 'private',
        notes: deliverable.notes || '',
      });
    }
  }, [deliverable]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        sponsorship_id: sponsorshipId,
        activation_id: activationId || undefined,
        deliverable_type: form.deliverable_type,
        title: form.title.trim(),
        description: form.description || undefined,
        status: form.status,
        quantity_required: parseInt(form.quantity_required, 10) || 1,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : undefined,
        public_visibility: form.public_visibility,
        notes: form.notes || undefined,
      };
      await onSave(payload, deliverable?.id);
    } catch (err) {
      setError(err.message || 'Failed to save deliverable');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'hsl(0 0% 0% / 0.6)' }}>
      <div className="w-full max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto" style={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--divider))' }}>
        <div className="flex items-center justify-between px-5 py-4 sticky top-0" style={{ borderBottom: '1px solid hsl(var(--divider))', background: 'hsl(var(--surface-elevated))' }}>
          <h3 className="text-sm font-bold tracking-wide uppercase" style={{ color: 'hsl(var(--foreground))' }}>
            {deliverable ? 'Edit Deliverable' : 'New Deliverable'}
          </h3>
          <button onClick={onCancel} className="p-1 rounded"><X className="w-4 h-4" style={{ color: 'hsl(var(--foreground-quiet))' }} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <Field label="Title *">
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm bg-transparent border" style={{ borderColor: 'hsl(var(--divider))', color: 'hsl(var(--foreground))' }} />
          </Field>
          <Field label="Type">
            <select value={form.deliverable_type} onChange={e => setForm({ ...form, deliverable_type: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm bg-transparent border" style={{ borderColor: 'hsl(var(--divider))', color: 'hsl(var(--foreground))' }}>
              {DELIVERABLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm bg-transparent border" style={{ borderColor: 'hsl(var(--divider))', color: 'hsl(var(--foreground))' }}>
              {['planned','in_progress','submitted','approved','completed','cancelled','archived'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Description">
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg text-sm bg-transparent border" style={{ borderColor: 'hsl(var(--divider))', color: 'hsl(var(--foreground))' }} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity Required"><input type="number" min="1" value={form.quantity_required} onChange={e => setForm({ ...form, quantity_required: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm bg-transparent border" style={{ borderColor: 'hsl(var(--divider))', color: 'hsl(var(--foreground))' }} /></Field>
            <Field label="Due Date"><input type="datetime-local" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm bg-transparent border" style={{ borderColor: 'hsl(var(--divider))', color: 'hsl(var(--foreground))' }} /></Field>
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