import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, ArrowLeft, GripVertical } from 'lucide-react';
import PageShell from '@/components/shared/PageShell';

const EMPTY = { title: '', subtitle: '', eyebrow: '', image_url: '', video_url: '', cta_label: '', cta_url: '', cta_secondary_label: '', cta_secondary_url: '', text_position: 'left', active: true, sort_order: 0 };

function SlideForm({ slide, onSave, onCancel }) {
  const [form, setForm] = useState(slide || EMPTY);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="border border-[#262626] bg-[#0D0D0D] p-6 space-y-4">
      <h2 className="text-sm font-bold text-[#F5F5F5]">{slide ? 'Edit Slide' : 'New Hero Slide'}</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-mono text-[#555] mb-1 uppercase">Title *</label>
          <input value={form.title} onChange={e => set('title', e.target.value)}
            className="w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none" />
        </div>
        <div>
          <label className="block text-xs font-mono text-[#555] mb-1 uppercase">Eyebrow Label</label>
          <input value={form.eyebrow} onChange={e => set('eyebrow', e.target.value)}
            className="w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none" placeholder="New Collection" />
        </div>
        <div>
          <label className="block text-xs font-mono text-[#555] mb-1 uppercase">Text Position</label>
          <select value={form.text_position} onChange={e => set('text_position', e.target.value)}
            className="w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none">
            {['left','center','right'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-mono text-[#555] mb-1 uppercase">Subtitle</label>
          <textarea value={form.subtitle} onChange={e => set('subtitle', e.target.value)} rows={2}
            className="w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none resize-none" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-mono text-[#555] mb-1 uppercase">Background Image URL</label>
          <input value={form.image_url} onChange={e => set('image_url', e.target.value)}
            className="w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none" />
          {form.image_url && <img src={form.image_url} alt="" className="mt-2 h-24 object-cover border border-[#262626]" />}
        </div>
        <div>
          <label className="block text-xs font-mono text-[#555] mb-1 uppercase">CTA Label</label>
          <input value={form.cta_label} onChange={e => set('cta_label', e.target.value)}
            className="w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none" placeholder="Shop Now" />
        </div>
        <div>
          <label className="block text-xs font-mono text-[#555] mb-1 uppercase">CTA URL</label>
          <input value={form.cta_url} onChange={e => set('cta_url', e.target.value)}
            className="w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none" placeholder="/ApparelHome" />
        </div>
        <div>
          <label className="block text-xs font-mono text-[#555] mb-1 uppercase">Secondary CTA Label</label>
          <input value={form.cta_secondary_label} onChange={e => set('cta_secondary_label', e.target.value)}
            className="w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none" />
        </div>
        <div>
          <label className="block text-xs font-mono text-[#555] mb-1 uppercase">Secondary CTA URL</label>
          <input value={form.cta_secondary_url} onChange={e => set('cta_secondary_url', e.target.value)}
            className="w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none" />
        </div>
        <div>
          <label className="block text-xs font-mono text-[#555] mb-1 uppercase">Sort Order</label>
          <input type="number" value={form.sort_order} onChange={e => set('sort_order', parseInt(e.target.value))}
            className="w-full bg-[#111] border border-[#262626] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#00FFDA] outline-none" />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} className="accent-[#00FFDA]" />
        <span className="text-xs font-mono text-[#555] uppercase">Active</span>
      </label>
      <div className="flex gap-3">
        <button onClick={() => onSave(form)} className="px-5 py-2 bg-[#00FFDA] text-[#050505] text-xs font-bold uppercase hover:bg-white transition-colors">Save</button>
        <button onClick={onCancel} className="px-5 py-2 border border-[#262626] text-[#A1A1A1] text-xs font-bold uppercase hover:border-[#F5F5F5] transition-colors">Cancel</button>
      </div>
    </div>
  );
}

export default function ManageHeroSlides() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const { data: slides = [] } = useQuery({
    queryKey: ['adminHeroSlides'],
    queryFn: () => base44.entities.HeroSlide.list('sort_order', 20),
  });

  const save = useMutation({
    mutationFn: (form) => editing ? base44.entities.HeroSlide.update(editing.id, form) : base44.entities.HeroSlide.create(form),
    onSuccess: () => { qc.invalidateQueries(['adminHeroSlides']); setEditing(null); setCreating(false); },
  });
  const del = useMutation({
    mutationFn: (id) => base44.entities.HeroSlide.delete(id),
    onSuccess: () => qc.invalidateQueries(['adminHeroSlides']),
  });

  return (
    <PageShell style={{ background: '#050505', color: '#F5F5F5' }}>
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin/storefront"><ArrowLeft className="w-4 h-4 text-[#555] hover:text-[#00FFDA]" /></Link>
          <div className="flex-1">
            <span className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase block mb-1">Admin</span>
            <h1 className="text-2xl font-black text-[#F5F5F5]">Hero Slides</h1>
          </div>
          <button onClick={() => { setEditing(null); setCreating(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#00FFDA] text-[#050505] text-xs font-bold uppercase hover:bg-white transition-colors">
            <Plus className="w-3.5 h-3.5" /> New Slide
          </button>
        </div>

        {(creating || editing) && (
          <div className="mb-6">
            <SlideForm slide={editing} onSave={(f) => save.mutate(f)} onCancel={() => { setEditing(null); setCreating(false); }} />
          </div>
        )}

        <div className="space-y-3">
          {slides.map((slide) => (
            <div key={slide.id} className="border border-[#262626] bg-[#0D0D0D] p-4 flex items-center gap-4">
              <GripVertical className="w-4 h-4 text-[#333]" />
              {slide.image_url && (
                <img src={slide.image_url} alt="" className="w-20 h-12 object-cover border border-[#262626] flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#F5F5F5] truncate">{slide.title}</p>
                <p className="text-xs text-[#555]">{slide.cta_label} → {slide.cta_url}</p>
              </div>
              <span className={`text-[10px] font-mono uppercase px-2 py-1 border ${slide.active ? 'text-[#00FFDA] border-[#00FFDA]/30' : 'text-[#555] border-[#262626]'}`}>
                {slide.active ? 'Active' : 'Hidden'}
              </span>
              <div className="flex gap-2">
                <button onClick={() => { setEditing(slide); setCreating(false); }} className="text-[#555] hover:text-[#F5F5F5]"><Edit className="w-3.5 h-3.5" /></button>
                <button onClick={() => { if (confirm('Delete?')) del.mutate(slide.id); }} className="text-[#555] hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
          {slides.length === 0 && <div className="text-center py-12 text-[#555] text-sm">No slides yet.</div>}
        </div>
      </div>
    </PageShell>
  );
}