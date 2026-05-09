import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, ArrowLeft } from 'lucide-react';
import PageShell from '@/components/shared/PageShell';

const EMPTY = { product_id: '', sku: '', color: '', color_hex: '#000000', size: '', price: '', compare_at_price: '', image_url: '', inventory: 0, available: true, sort_order: 0 };

function VariantForm({ variant, products, onSave, onCancel }) {
  const [form, setForm] = useState(variant || EMPTY);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="border border-[#262626] bg-[#0D0D0D] p-6 space-y-4">
      <h2 className="text-sm font-bold text-[#F5F5F5]">{variant ? 'Edit Variant' : 'New Variant'}</h2>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-3">
          <label className="block text-xs font-mono text-[#555] mb-1 uppercase">Product *</label>
          <select value={form.product_id} onChange={e => set('product_id', e.target.value)}
            className="w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none">
            <option value="">Select product...</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-mono text-[#555] mb-1 uppercase">SKU *</label>
          <input value={form.sku} onChange={e => set('sku', e.target.value)}
            className="w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none" />
        </div>
        <div>
          <label className="block text-xs font-mono text-[#555] mb-1 uppercase">Color Name</label>
          <input value={form.color} onChange={e => set('color', e.target.value)}
            className="w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none" placeholder="Midnight Black" />
        </div>
        <div>
          <label className="block text-xs font-mono text-[#555] mb-1 uppercase">Color Hex</label>
          <div className="flex gap-2">
            <input type="color" value={form.color_hex} onChange={e => set('color_hex', e.target.value)}
              className="w-10 h-[38px] bg-[#111] border border-[#262626] cursor-pointer" />
            <input value={form.color_hex} onChange={e => set('color_hex', e.target.value)}
              className="flex-1 bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none font-mono" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-mono text-[#555] mb-1 uppercase">Size</label>
          <input value={form.size} onChange={e => set('size', e.target.value)}
            className="w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none" placeholder="M" />
        </div>
        <div>
          <label className="block text-xs font-mono text-[#555] mb-1 uppercase">Price Override ($)</label>
          <input type="number" step="0.01" value={form.price} onChange={e => set('price', parseFloat(e.target.value) || '')}
            className="w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none" />
        </div>
        <div>
          <label className="block text-xs font-mono text-[#555] mb-1 uppercase">Inventory</label>
          <input type="number" value={form.inventory} onChange={e => set('inventory', parseInt(e.target.value) || 0)}
            className="w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none" />
        </div>
        <div>
          <label className="block text-xs font-mono text-[#555] mb-1 uppercase">Sort Order</label>
          <input type="number" value={form.sort_order} onChange={e => set('sort_order', parseInt(e.target.value))}
            className="w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-mono text-[#555] mb-1 uppercase">Variant Image URL</label>
        <input value={form.image_url} onChange={e => set('image_url', e.target.value)}
          className="w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none" />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.available} onChange={e => set('available', e.target.checked)} className="accent-[#00FFDA]" />
        <span className="text-xs font-mono text-[#555] uppercase">Available for purchase</span>
      </label>
      <div className="flex gap-3">
        <button onClick={() => onSave(form)}
          className="px-5 py-2 bg-[#00FFDA] text-[#050505] text-xs font-bold uppercase hover:bg-white transition-colors">Save</button>
        <button onClick={onCancel}
          className="px-5 py-2 border border-[#262626] text-[#A1A1A1] text-xs font-bold uppercase hover:border-[#F5F5F5] transition-colors">Cancel</button>
      </div>
    </div>
  );
}

export default function ManageVariants() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [filterProduct, setFilterProduct] = useState('');

  const { data: variants = [] } = useQuery({
    queryKey: ['adminVariants'],
    queryFn: () => base44.entities.ProductVariant.list('-created_date', 200),
  });
  const { data: products = [] } = useQuery({
    queryKey: ['adminProductsSimple'],
    queryFn: () => base44.entities.Product.list('name', 100),
  });

  const save = useMutation({
    mutationFn: (form) => editing ? base44.entities.ProductVariant.update(editing.id, form) : base44.entities.ProductVariant.create(form),
    onSuccess: () => { qc.invalidateQueries(['adminVariants']); setEditing(null); setCreating(false); },
  });
  const del = useMutation({
    mutationFn: (id) => base44.entities.ProductVariant.delete(id),
    onSuccess: () => qc.invalidateQueries(['adminVariants']),
  });

  const filtered = filterProduct ? variants.filter(v => v.product_id === filterProduct) : variants;
  const productMap = Object.fromEntries(products.map(p => [p.id, p.name]));

  return (
    <PageShell style={{ background: '#050505', color: '#F5F5F5' }}>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin/storefront"><ArrowLeft className="w-4 h-4 text-[#555] hover:text-[#00FFDA]" /></Link>
          <div className="flex-1">
            <span className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase block mb-1">Admin</span>
            <h1 className="text-2xl font-black text-[#F5F5F5]">Product Variants</h1>
          </div>
          <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)}
            className="bg-[#111] border border-[#262626] px-3 py-2 text-xs text-[#A1A1A1] focus:border-[#00FFDA] outline-none">
            <option value="">All Products</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={() => { setEditing(null); setCreating(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#00FFDA] text-[#050505] text-xs font-bold uppercase hover:bg-white transition-colors">
            <Plus className="w-3.5 h-3.5" /> New Variant
          </button>
        </div>

        {(creating || editing) && (
          <div className="mb-6">
            <VariantForm variant={editing} products={products} onSave={(f) => save.mutate(f)} onCancel={() => { setEditing(null); setCreating(false); }} />
          </div>
        )}

        <div className="border border-[#262626] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#262626] bg-[#0D0D0D]">
                {['Product','SKU','Color','Size','Inventory','Price','Available',''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-mono text-[#555] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} className="border-b border-[#1a1a1a] hover:bg-[#0D0D0D]">
                  <td className="px-4 py-3 text-[#A1A1A1] text-xs">{productMap[v.product_id] || '—'}</td>
                  <td className="px-4 py-3 text-[#F5F5F5] font-mono text-xs">{v.sku}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {v.color_hex && <span className="w-4 h-4 rounded-full border border-[#262626]" style={{ background: v.color_hex }} />}
                      <span className="text-xs text-[#A1A1A1]">{v.color || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#A1A1A1]">{v.size || '—'}</td>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: v.inventory === 0 ? '#EF4444' : v.inventory <= 5 ? '#F59E0B' : '#00FFDA' }}>{v.inventory}</td>
                  <td className="px-4 py-3 text-xs text-[#F5F5F5] font-mono">{v.price ? `$${parseFloat(v.price).toFixed(2)}` : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-mono uppercase ${v.available ? 'text-[#00FFDA]' : 'text-[#555]'}`}>{v.available ? 'Yes' : 'No'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => { setEditing(v); setCreating(false); }} className="text-[#555] hover:text-[#F5F5F5]"><Edit className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { if (confirm('Delete?')) del.mutate(v.id); }} className="text-[#555] hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12 text-[#555] text-sm">No variants found.</div>}
        </div>
      </div>
    </PageShell>
  );
}