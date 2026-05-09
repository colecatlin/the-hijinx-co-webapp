import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, Star, ArrowLeft } from 'lucide-react';
import PageShell from '@/components/shared/PageShell';

const EMPTY = {
  name: '', slug: '', tagline: '', product_type: 'physical', status: 'draft',
  description: '', short_description: '', story: '', fit_and_sizing: '', material_and_care: '',
  cover_image_url: '', price: 0, compare_at_price: '', currency: 'USD', sku: '',
  category: '', tags: [], featured: false, shipping_note: '', sort_order: 0,
};

function ProductForm({ product, onSave, onCancel }) {
  const [form, setForm] = useState(product || EMPTY);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="border border-[#262626] bg-[#0D0D0D] p-8 space-y-6">
      <h2 className="text-lg font-bold text-[#F5F5F5]">{product ? 'Edit Product' : 'New Product'}</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-mono text-[#A1A1A1] mb-2 uppercase tracking-wider">Name *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)}
            className="w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none" />
        </div>
        <div>
          <label className="block text-xs font-mono text-[#A1A1A1] mb-2 uppercase tracking-wider">Slug</label>
          <input value={form.slug} onChange={e => set('slug', e.target.value)}
            className="w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-mono text-[#A1A1A1] mb-2 uppercase tracking-wider">Tagline</label>
          <input value={form.tagline} onChange={e => set('tagline', e.target.value)}
            className="w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none" />
        </div>
        <div>
          <label className="block text-xs font-mono text-[#A1A1A1] mb-2 uppercase tracking-wider">Status</label>
          <select value={form.status} onChange={e => set('status', e.target.value)}
            className="w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none">
            {['draft','active','archived','coming_soon','sold_out'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-mono text-[#A1A1A1] mb-2 uppercase tracking-wider">Category</label>
          <input value={form.category} onChange={e => set('category', e.target.value)}
            className="w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none" />
        </div>
        <div>
          <label className="block text-xs font-mono text-[#A1A1A1] mb-2 uppercase tracking-wider">Price ($)</label>
          <input type="number" step="0.01" value={form.price} onChange={e => set('price', parseFloat(e.target.value))}
            className="w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none" />
        </div>
        <div>
          <label className="block text-xs font-mono text-[#A1A1A1] mb-2 uppercase tracking-wider">Compare At Price ($)</label>
          <input type="number" step="0.01" value={form.compare_at_price} onChange={e => set('compare_at_price', parseFloat(e.target.value) || '')}
            className="w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none" />
        </div>
        <div>
          <label className="block text-xs font-mono text-[#A1A1A1] mb-2 uppercase tracking-wider">SKU</label>
          <input value={form.sku} onChange={e => set('sku', e.target.value)}
            className="w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none" />
        </div>
        <div>
          <label className="block text-xs font-mono text-[#A1A1A1] mb-2 uppercase tracking-wider">Sort Order</label>
          <input type="number" value={form.sort_order} onChange={e => set('sort_order', parseInt(e.target.value))}
            className="w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-mono text-[#A1A1A1] mb-2 uppercase tracking-wider">Cover Image URL</label>
        <input value={form.cover_image_url} onChange={e => set('cover_image_url', e.target.value)}
          className="w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none" placeholder="https://..." />
        {form.cover_image_url && <img src={form.cover_image_url} alt="" className="mt-2 h-20 object-cover border border-[#262626]" />}
      </div>

      <div>
        <label className="block text-xs font-mono text-[#A1A1A1] mb-2 uppercase tracking-wider">Short Description</label>
        <textarea value={form.short_description} onChange={e => set('short_description', e.target.value)} rows={2}
          className="w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none resize-none" />
      </div>

      <div>
        <label className="block text-xs font-mono text-[#A1A1A1] mb-2 uppercase tracking-wider">Full Description (HTML)</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={5}
          className="w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none resize-y font-mono" />
      </div>

      <div>
        <label className="block text-xs font-mono text-[#A1A1A1] mb-2 uppercase tracking-wider">Product Story (HTML)</label>
        <textarea value={form.story} onChange={e => set('story', e.target.value)} rows={5}
          className="w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none resize-y font-mono" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-mono text-[#A1A1A1] mb-2 uppercase tracking-wider">Fit & Sizing</label>
          <textarea value={form.fit_and_sizing} onChange={e => set('fit_and_sizing', e.target.value)} rows={3}
            className="w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none resize-none" />
        </div>
        <div>
          <label className="block text-xs font-mono text-[#A1A1A1] mb-2 uppercase tracking-wider">Material & Care</label>
          <textarea value={form.material_and_care} onChange={e => set('material_and_care', e.target.value)} rows={3}
            className="w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none resize-none" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-mono text-[#A1A1A1] mb-2 uppercase tracking-wider">Shipping Note</label>
        <input value={form.shipping_note} onChange={e => set('shipping_note', e.target.value)}
          className="w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none" />
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={form.featured} onChange={e => set('featured', e.target.checked)} className="accent-[#00FFDA]" />
        <span className="text-xs font-mono text-[#A1A1A1] uppercase tracking-wider">Featured product</span>
      </label>

      <div className="flex gap-3 pt-4 border-t border-[#262626]">
        <button onClick={() => onSave(form)}
          className="px-6 py-2.5 bg-[#00FFDA] text-[#050505] text-xs font-bold tracking-wider uppercase hover:bg-white transition-colors">
          Save Product
        </button>
        <button onClick={onCancel}
          className="px-6 py-2.5 border border-[#262626] text-[#A1A1A1] text-xs font-bold tracking-wider uppercase hover:border-[#F5F5F5] transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function ManageStorefrontProducts() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ['adminProducts'],
    queryFn: () => base44.entities.Product.list('-created_date', 100),
  });

  const save = useMutation({
    mutationFn: (form) => editing
      ? base44.entities.Product.update(editing.id, form)
      : base44.entities.Product.create(form),
    onSuccess: () => { qc.invalidateQueries(['adminProducts']); setEditing(null); setCreating(false); },
  });

  const del = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => qc.invalidateQueries(['adminProducts']),
  });

  const statusColors = { active: '#00FFDA', draft: '#555', archived: '#555', coming_soon: '#F59E0B', sold_out: '#EF4444' };

  return (
    <PageShell style={{ background: '#050505', color: '#F5F5F5' }}>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin/storefront" className="text-[#555] hover:text-[#00FFDA] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1">
            <span className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase block mb-1">Admin</span>
            <h1 className="text-2xl font-black text-[#F5F5F5]">Products</h1>
          </div>
          <button onClick={() => { setEditing(null); setCreating(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#00FFDA] text-[#050505] text-xs font-bold tracking-wider uppercase hover:bg-white transition-colors">
            <Plus className="w-3.5 h-3.5" /> New Product
          </button>
        </div>

        {(creating || editing) && (
          <div className="mb-8">
            <ProductForm
              product={editing}
              onSave={(form) => save.mutate(form)}
              onCancel={() => { setEditing(null); setCreating(false); }}
            />
          </div>
        )}

        <div className="border border-[#262626] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#262626] bg-[#0D0D0D]">
                <th className="text-left px-4 py-3 text-[10px] font-mono text-[#555] uppercase tracking-wider">Product</th>
                <th className="text-left px-4 py-3 text-[10px] font-mono text-[#555] uppercase tracking-wider">Category</th>
                <th className="text-left px-4 py-3 text-[10px] font-mono text-[#555] uppercase tracking-wider">Price</th>
                <th className="text-left px-4 py-3 text-[10px] font-mono text-[#555] uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 text-[10px] font-mono text-[#555] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-[#1a1a1a] hover:bg-[#0D0D0D] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.cover_image_url && (
                        <img src={p.cover_image_url} alt="" className="w-10 h-10 object-cover border border-[#262626]" />
                      )}
                      <div>
                        <p className="text-[#F5F5F5] font-medium">{p.name}</p>
                        {p.featured && <Star className="w-3 h-3 text-[#00FFDA] inline mt-0.5" />}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#A1A1A1] text-xs">{p.category}</td>
                  <td className="px-4 py-3 text-[#F5F5F5] font-mono">${(p.price || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 border"
                      style={{ color: statusColors[p.status] || '#555', borderColor: statusColors[p.status] || '#262626' }}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {p.slug && (
                        <Link to={`/product/${p.slug}`} className="text-[#555] hover:text-[#00FFDA] transition-colors">
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                      )}
                      <button onClick={() => { setEditing(p); setCreating(false); }}
                        className="text-[#555] hover:text-[#F5F5F5] transition-colors">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { if (confirm('Delete this product?')) del.mutate(p.id); }}
                        className="text-[#555] hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && (
            <div className="text-center py-16 text-[#555] text-sm">No products yet.</div>
          )}
        </div>
      </div>
    </PageShell>
  );
}