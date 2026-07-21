import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Loader2, Boxes } from 'lucide-react';
import { ASSET_TYPES, getOrganizationType } from '@/config/organizationRegistry';
import { listAssets, createAsset, updateAsset, deleteAsset } from '@/components/organizations/organizationService';

const TEAL = '#1DA1A1';

/**
 * Assets — the generic, extensible asset framework. Vehicles aren't
 * special-cased: every asset_type flows through the same UI + CRUD. New types
 * are added to the registry enum ONLY.
 */
export default function OrganizationAssets({ orgType, entityId }) {
  const qc = useQueryClient();
  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['org_assets', orgType, entityId],
    queryFn: () => listAssets(orgType, entityId),
  });
  const [editing, setEditing] = useState(null); // null | {} existing | { new: true }
  const [saving, setSaving] = useState(null);

  const grouped = ASSET_TYPES.map((t) => ({ ...t, items: assets.filter((a) => a.asset_type === t.key) })).filter((t) => t.items.length > 0);

  const save = async (asset) => {
    setSaving(asset.id || 'new');
    try {
      if (asset.id) await updateAsset(asset);
      else await createAsset(orgType, entityId, asset);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['org_assets', orgType, entityId] });
    } finally { setSaving(null); }
  };
  const remove = async (id) => {
    setSaving(id);
    try { await deleteAsset(id); qc.invalidateQueries({ queryKey: ['org_assets', orgType, entityId] }); }
    finally { setSaving(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Assets</h3>
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{assets.length} total · extensible framework</p>
        </div>
        <button onClick={() => setEditing({ new: true, asset_type: 'vehicle', name: '', status: 'active' })}
          className="px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1"
          style={{ background: TEAL, color: '#050A0A' }}>
          <Plus className="w-3.5 h-3.5" /> Add Asset
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: TEAL }} /></div>
      ) : grouped.length === 0 ? (
        <EmptyState />
      ) : (
        grouped.map((group) => (
          <div key={group.key}>
            <h4 className="text-[10px] font-mono uppercase tracking-[0.3em] mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>{group.label}</h4>
            <div className="space-y-1.5">
              {group.items.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {a.image_url
                    ? <img src={a.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    : <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(29,161,161,0.1)' }}><Boxes className="w-4 h-4" style={{ color: TEAL }} /></div>}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-white truncate">{a.name}</div>
                    {a.description && <div className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{a.description}</div>}
                  </div>
                  <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}>{a.status}</span>
                  <button onClick={() => setEditing(a)} className="p-1.5 rounded-lg" style={{ color: 'rgba(255,255,255,0.5)' }}><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => remove(a.id)} disabled={saving === a.id} className="p-1.5 rounded-lg" style={{ color: '#ef4444' }}>
                    {saving === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {editing && <AssetEditor asset={editing} onClose={() => setEditing(null)} onSave={save} saving={saving === (editing.id || 'new')} />}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-10 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}>
      <Boxes className="w-6 h-6 mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.3)' }} />
      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>No assets yet.</p>
      <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Add vehicles, equipment, facilities, or any asset type.</p>
    </div>
  );
}

function AssetEditor({ asset, onClose, onSave, saving }) {
  const [form, setForm] = useState({ ...asset });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl p-5" style={{ background: '#0A0F0F', border: '1px solid rgba(29,161,161,0.25)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">{asset.id ? 'Edit Asset' : 'New Asset'}</h3>
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.5)' }}><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <Field label="Asset Type">
            <select value={form.asset_type} onChange={(e) => set('asset_type', e.target.value)}
              className="w-full h-9 px-2 rounded-lg text-sm" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
              {ASSET_TYPES.map((t) => <option key={t.key} value={t.key} style={{ color: '#000' }}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Name"><Input value={form.name || ''} onChange={(v) => set('name', v)} /></Field>
          <Field label="Description"><Input value={form.description || ''} onChange={(v) => set('description', v)} /></Field>
          <Field label="Image URL"><Input value={form.image_url || ''} onChange={(v) => set('image_url', v)} /></Field>
          <Field label="Location"><Input value={form.location || ''} onChange={(v) => set('location', v)} /></Field>
          <Field label="Status">
            <select value={form.status || 'active'} onChange={(e) => set('status', e.target.value)}
              className="w-full h-9 px-2 rounded-lg text-sm" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
              {['active', 'inactive', 'maintenance', 'retired'].map((s) => <option key={s} value={s} style={{ color: '#000' }}>{s}</option>)}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
            <input type="checkbox" checked={!!form.is_public} onChange={(e) => set('is_public', e.target.checked)} /> Publicly visible
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-3 py-2 rounded-lg text-xs font-bold" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}>Cancel</button>
          <button onClick={() => onSave(form)} disabled={saving || !form.name?.trim()}
            className="px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1"
            style={{ background: form.name?.trim() ? TEAL : 'rgba(255,255,255,0.1)', color: form.name?.trim() ? '#050A0A' : 'rgba(255,255,255,0.3)' }}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div><label className="text-[10px] font-mono uppercase tracking-widest mb-1 block" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</label>{children}</div>;
}
function Input({ value, onChange }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)}
    className="w-full h-9 px-3 rounded-lg text-sm"
    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />;
}