import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, ArrowLeft, Tag } from 'lucide-react';
import PageShell from '@/components/shared/PageShell';
import { format } from 'date-fns';

const EMPTY = { code: '', type: 'percentage', value: 10, minimum_order_amount: 0, usage_limit: '', usage_count: 0, per_customer_limit: 1, active: true, starts_at: '', expires_at: '', notes: '' };

function DiscountForm({ discount, onSave, onCancel }) {
  const [form, setForm] = useState(discount || EMPTY);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inp = "w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none";
  return (
    <div className="border border-[#262626] bg-[#0D0D0D] p-6 space-y-4">
      <h2 className="text-sm font-bold text-[#F5F5F5]">{discount ? 'Edit Code' : 'New Discount Code'}</h2>
      <div className="grid grid-cols-3 gap-4">
        <div><label className="block text-xs font-mono text-[#555] mb-1 uppercase">Code *</label><input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} className={`${inp} font-mono uppercase`} placeholder="HIJINX20" /></div>
        <div><label className="block text-xs font-mono text-[#555] mb-1 uppercase">Type</label>
          <select value={form.type} onChange={e => set('type', e.target.value)} className={inp}>
            <option value="percentage">Percentage (%)</option>
            <option value="fixed_amount">Fixed Amount ($)</option>
            <option value="free_shipping">Free Shipping</option>
          </select>
        </div>
        <div><label className="block text-xs font-mono text-[#555] mb-1 uppercase">Value ({form.type === 'percentage' ? '%' : form.type === 'fixed_amount' ? '$' : '—'})</label><input type="number" step="0.01" value={form.value} onChange={e => set('value', parseFloat(e.target.value))} className={inp} disabled={form.type === 'free_shipping'} /></div>
        <div><label className="block text-xs font-mono text-[#555] mb-1 uppercase">Min Order ($)</label><input type="number" value={form.minimum_order_amount} onChange={e => set('minimum_order_amount', parseFloat(e.target.value))} className={inp} /></div>
        <div><label className="block text-xs font-mono text-[#555] mb-1 uppercase">Usage Limit</label><input type="number" value={form.usage_limit} onChange={e => set('usage_limit', parseInt(e.target.value) || '')} className={inp} placeholder="Unlimited" /></div>
        <div><label className="block text-xs font-mono text-[#555] mb-1 uppercase">Per Customer</label><input type="number" value={form.per_customer_limit} onChange={e => set('per_customer_limit', parseInt(e.target.value))} className={inp} /></div>
        <div><label className="block text-xs font-mono text-[#555] mb-1 uppercase">Starts At</label><input type="datetime-local" value={form.starts_at} onChange={e => set('starts_at', e.target.value)} className={inp} /></div>
        <div><label className="block text-xs font-mono text-[#555] mb-1 uppercase">Expires At</label><input type="datetime-local" value={form.expires_at} onChange={e => set('expires_at', e.target.value)} className={inp} /></div>
      </div>
      <div><label className="block text-xs font-mono text-[#555] mb-1 uppercase">Internal Notes</label><input value={form.notes} onChange={e => set('notes', e.target.value)} className={inp} /></div>
      <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} className="accent-[#00FFDA]" /><span className="text-xs font-mono text-[#555] uppercase">Active</span></label>
      <div className="flex gap-3">
        <button onClick={() => onSave(form)} className="px-5 py-2 bg-[#00FFDA] text-[#050505] text-xs font-bold uppercase hover:bg-white transition-colors">Save</button>
        <button onClick={onCancel} className="px-5 py-2 border border-[#262626] text-[#A1A1A1] text-xs font-bold uppercase hover:border-[#F5F5F5] transition-colors">Cancel</button>
      </div>
    </div>
  );
}

export default function ManageDiscounts() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const { data: codes = [] } = useQuery({ queryKey: ['adminDiscounts'], queryFn: () => base44.entities.DiscountCode.list('-created_date', 100) });
  const save = useMutation({ mutationFn: (f) => editing ? base44.entities.DiscountCode.update(editing.id, f) : base44.entities.DiscountCode.create(f), onSuccess: () => { qc.invalidateQueries(['adminDiscounts']); setEditing(null); setCreating(false); } });
  const del = useMutation({ mutationFn: (id) => base44.entities.DiscountCode.delete(id), onSuccess: () => qc.invalidateQueries(['adminDiscounts']) });

  return (
    <PageShell style={{ background: '#050505', color: '#F5F5F5' }}>
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin/storefront"><ArrowLeft className="w-4 h-4 text-[#555] hover:text-[#00FFDA]" /></Link>
          <div className="flex-1"><span className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase block mb-1">Admin</span><h1 className="text-2xl font-black text-[#F5F5F5]">Discount Codes</h1></div>
          <button onClick={() => { setEditing(null); setCreating(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-[#00FFDA] text-[#050505] text-xs font-bold uppercase hover:bg-white transition-colors"><Plus className="w-3.5 h-3.5" /> New Code</button>
        </div>
        {(creating || editing) && <div className="mb-6"><DiscountForm discount={editing} onSave={(f) => save.mutate(f)} onCancel={() => { setEditing(null); setCreating(false); }} /></div>}
        <div className="border border-[#262626] overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[#262626] bg-[#0D0D0D]">{['Code','Type','Value','Uses','Expires','Status',''].map(h => <th key={h} className="text-left px-4 py-3 text-[10px] font-mono text-[#555] uppercase tracking-wider">{h}</th>)}</tr></thead>
            <tbody>
              {codes.map(c => (
                <tr key={c.id} className="border-b border-[#1a1a1a] hover:bg-[#0D0D0D]">
                  <td className="px-4 py-3 text-[#F5F5F5] font-mono font-bold">{c.code}</td>
                  <td className="px-4 py-3 text-xs text-[#A1A1A1]">{c.type.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-xs text-[#F5F5F5]">{c.type === 'percentage' ? `${c.value}%` : c.type === 'fixed_amount' ? `$${c.value}` : '—'}</td>
                  <td className="px-4 py-3 text-xs text-[#A1A1A1]">{c.usage_count || 0}{c.usage_limit ? ` / ${c.usage_limit}` : ''}</td>
                  <td className="px-4 py-3 text-xs text-[#555]">{c.expires_at ? format(new Date(c.expires_at), 'MMM d, yyyy') : '—'}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] font-mono uppercase px-2 py-1 border ${c.active ? 'text-[#00FFDA] border-[#00FFDA]/30' : 'text-[#555] border-[#262626]'}`}>{c.active ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-4 py-3"><div className="flex gap-2 justify-end"><button onClick={() => { setEditing(c); setCreating(false); }} className="text-[#555] hover:text-[#F5F5F5]"><Edit className="w-3.5 h-3.5" /></button><button onClick={() => { if (confirm('Delete?')) del.mutate(c.id); }} className="text-[#555] hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {codes.length === 0 && <div className="text-center py-12 text-[#555] text-sm">No discount codes yet.</div>}
        </div>
      </div>
    </PageShell>
  );
}