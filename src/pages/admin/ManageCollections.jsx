import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, ArrowLeft } from 'lucide-react';
import PageShell from '@/components/shared/PageShell';

const EMPTY = { name: '', slug: '', description: '', cover_image_url: '', hero_image_url: '', featured: false, active: true, sort_order: 0 };

function CollectionForm({ collection, onSave, onCancel }) {
  const [form, setForm] = useState(collection || EMPTY);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inp = "w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none";
  return (
    <div className="border border-[#262626] bg-[#0D0D0D] p-6 space-y-4">
      <h2 className="text-sm font-bold text-[#F5F5F5]">{collection ? 'Edit Collection' : 'New Collection'}</h2>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-xs font-mono text-[#555] mb-1 uppercase">Name *</label><input value={form.name} onChange={e => set('name', e.target.value)} className={inp} /></div>
        <div><label className="block text-xs font-mono text-[#555] mb-1 uppercase">Slug</label><input value={form.slug} onChange={e => set('slug', e.target.value)} className={inp} /></div>
        <div><label className="block text-xs font-mono text-[#555] mb-1 uppercase">Cover Image URL</label><input value={form.cover_image_url} onChange={e => set('cover_image_url', e.target.value)} className={inp} /></div>
        <div><label className="block text-xs font-mono text-[#555] mb-1 uppercase">Hero Image URL</label><input value={form.hero_image_url} onChange={e => set('hero_image_url', e.target.value)} className={inp} /></div>
        <div><label className="block text-xs font-mono text-[#555] mb-1 uppercase">Sort Order</label><input type="number" value={form.sort_order} onChange={e => set('sort_order', parseInt(e.target.value))} className={inp} /></div>
      </div>
      <div><label className="block text-xs font-mono text-[#555] mb-1 uppercase">Description</label><textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} className={`${inp} resize-none`} /></div>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} className="accent-[#00FFDA]" /><span className="text-xs font-mono text-[#555] uppercase">Active</span></label>
        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.featured} onChange={e => set('featured', e.target.checked)} className="accent-[#00FFDA]" /><span className="text-xs font-mono text-[#555] uppercase">Featured</span></label>
      </div>
      <div className="flex gap-3">
        <button onClick={() => onSave(form)} className="px-5 py-2 bg-[#00FFDA] text-[#050505] text-xs font-bold uppercase hover:bg-white transition-colors">Save</button>
        <button onClick={onCancel} className="px-5 py-2 border border-[#262626] text-[#A1A1A1] text-xs font-bold uppercase hover:border-[#F5F5F5] transition-colors">Cancel</button>
      </div>
    </div>
  );
}

export default function ManageCollections() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const { data: collections = [] } = useQuery({ queryKey: ['adminCollections'], queryFn: () => base44.entities.Collection.list('sort_order', 50) });
  const save = useMutation({ mutationFn: (f) => editing ? base44.entities.Collection.update(editing.id, f) : base44.entities.Collection.create(f), onSuccess: () => { qc.invalidateQueries(['adminCollections']); setEditing(null); setCreating(false); } });
  const del = useMutation({ mutationFn: (id) => base44.entities.Collection.delete(id), onSuccess: () => qc.invalidateQueries(['adminCollections']) });

  return (
    <PageShell style={{ background: '#050505', color: '#F5F5F5' }}>
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin/storefront"><ArrowLeft className="w-4 h-4 text-[#555] hover:text-[#00FFDA]" /></Link>
          <div className="flex-1"><span className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase block mb-1">Admin</span><h1 className="text-2xl font-black text-[#F5F5F5]">Collections</h1></div>
          <button onClick={() => { setEditing(null); setCreating(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-[#00FFDA] text-[#050505] text-xs font-bold uppercase hover:bg-white transition-colors"><Plus className="w-3.5 h-3.5" /> New Collection</button>
        </div>
        {(creating || editing) && <div className="mb-6"><CollectionForm collection={editing} onSave={(f) => save.mutate(f)} onCancel={() => { setEditing(null); setCreating(false); }} /></div>}
        <div className="space-y-3">
          {collections.map(col => (
            <div key={col.id} className="border border-[#262626] bg-[#0D0D0D] p-4 flex items-center gap-4">
              {col.cover_image_url && <img src={col.cover_image_url} alt="" className="w-16 h-12 object-cover border border-[#262626] flex-shrink-0" />}
              <div className="flex-1">
                <p className="text-sm font-bold text-[#F5F5F5]">{col.name}</p>
                <p className="text-xs text-[#555]">{col.description?.substring(0, 80)}</p>
              </div>
              <span className={`text-[10px] font-mono uppercase px-2 py-1 border ${col.active ? 'text-[#00FFDA] border-[#00FFDA]/30' : 'text-[#555] border-[#262626]'}`}>{col.active ? 'Active' : 'Hidden'}</span>
              <div className="flex gap-2">
                <button onClick={() => { setEditing(col); setCreating(false); }} className="text-[#555] hover:text-[#F5F5F5]"><Edit className="w-3.5 h-3.5" /></button>
                <button onClick={() => { if (confirm('Delete?')) del.mutate(col.id); }} className="text-[#555] hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
          {collections.length === 0 && <div className="text-center py-12 text-[#555] text-sm">No collections yet.</div>}
        </div>
      </div>
    </PageShell>
  );
}