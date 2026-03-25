import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Pencil, Trash2, GripVertical, Eye, EyeOff, Upload } from 'lucide-react';

const OVERLAY_LABELS = { light: 'Light', medium: 'Medium', heavy: 'Heavy' };
const THEME_COLORS = {
  identity: 'bg-purple-100 text-purple-800',
  culture: 'bg-orange-100 text-orange-800',
  racing: 'bg-red-100 text-red-800',
  lifestyle: 'bg-green-100 text-green-800',
  movement: 'bg-blue-100 text-blue-800',
};

const EMPTY_SLIDE = {
  title: '',
  subtitle: '',
  eyebrow: '',
  description: '',
  cta_primary_label: '',
  cta_primary_url: '',
  cta_secondary_label: '',
  cta_secondary_url: '',
  media_type: 'image',
  media_url: '',
  mobile_media_url: '',
  overlay_strength: 'medium',
  text_alignment: 'left',
  sort_order: 10,
  status: 'draft',
  theme: 'identity',
  linked_entity_type: 'none',
  linked_entity_id: '',
};

export default function HeroSlideManager() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null); // null = list, object = editing
  const [uploading, setUploading] = useState(false);

  const { data: slides = [], isLoading } = useQuery({
    queryKey: ['heroSlides'],
    queryFn: () => base44.entities.HomepageHeroSlide.list('sort_order'),
  });

  const saveMutation = useMutation({
    mutationFn: (slide) => slide.id
      ? base44.entities.HomepageHeroSlide.update(slide.id, slide)
      : base44.entities.HomepageHeroSlide.create(slide),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heroSlides'] });
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.HomepageHeroSlide.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['heroSlides'] }),
  });

  const toggleStatus = (slide) => {
    const next = slide.status === 'live' ? 'draft' : 'live';
    base44.entities.HomepageHeroSlide.update(slide.id, { status: next })
      .then(() => queryClient.invalidateQueries({ queryKey: ['heroSlides'] }));
  };

  const handleUpload = async (file, field) => {
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setEditing(e => ({ ...e, [field]: file_url }));
    setUploading(false);
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>;

  // ── EDIT FORM ──────────────────────────────────────────────────────────────
  if (editing !== null) {
    const isNew = !editing.id;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">{isNew ? 'New Hero Slide' : 'Edit Hero Slide'}</h3>
          <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>← Back</Button>
        </div>

        {/* Media preview */}
        {editing.media_url && (
          <div className="w-full h-48 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 relative">
            <img src={editing.media_url} alt="Preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 flex items-end p-4">
              <div>
                {editing.eyebrow && <p className="text-[10px] text-white/60 uppercase tracking-widest mb-1">{editing.eyebrow}</p>}
                <p className="text-white font-black text-xl leading-tight">{editing.title || 'Title preview'}</p>
                {editing.subtitle && <p className="text-white/60 text-sm mt-1">{editing.subtitle}</p>}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Eyebrow (small label)">
            <Input value={editing.eyebrow || ''} onChange={e => setEditing(s => ({ ...s, eyebrow: e.target.value }))} placeholder="e.g. The Platform" />
          </Field>
          <Field label="Theme">
            <select className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm" value={editing.theme || 'identity'}
              onChange={e => setEditing(s => ({ ...s, theme: e.target.value }))}>
              {['identity','culture','racing','lifestyle','movement'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Title *" className="md:col-span-2">
            <Input value={editing.title || ''} onChange={e => setEditing(s => ({ ...s, title: e.target.value }))} placeholder="Short, punchy headline" />
          </Field>
          <Field label="Subtitle" className="md:col-span-2">
            <Input value={editing.subtitle || ''} onChange={e => setEditing(s => ({ ...s, subtitle: e.target.value }))} placeholder="One-line supporting copy" />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Primary CTA Label">
            <Input value={editing.cta_primary_label || ''} onChange={e => setEditing(s => ({ ...s, cta_primary_label: e.target.value }))} placeholder="Explore" />
          </Field>
          <Field label="Primary CTA URL">
            <Input value={editing.cta_primary_url || ''} onChange={e => setEditing(s => ({ ...s, cta_primary_url: e.target.value }))} placeholder="/MotorsportsHome" />
          </Field>
          <Field label="Secondary CTA Label">
            <Input value={editing.cta_secondary_label || ''} onChange={e => setEditing(s => ({ ...s, cta_secondary_label: e.target.value }))} placeholder="All Drivers" />
          </Field>
          <Field label="Secondary CTA URL">
            <Input value={editing.cta_secondary_url || ''} onChange={e => setEditing(s => ({ ...s, cta_secondary_url: e.target.value }))} placeholder="/DriverDirectory" />
          </Field>
        </div>

        <div className="space-y-3">
          <Field label="Desktop Media URL *">
            <div className="flex gap-2">
              <Input value={editing.media_url || ''} onChange={e => setEditing(s => ({ ...s, media_url: e.target.value }))} placeholder="https://..." />
              <label className="shrink-0 cursor-pointer">
                <Button variant="outline" size="sm" asChild><span>{uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}</span></Button>
                <input type="file" accept="image/*,video/*" className="hidden"
                  onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'media_url')} />
              </label>
            </div>
          </Field>
          <Field label="Mobile Media URL (optional)">
            <Input value={editing.mobile_media_url || ''} onChange={e => setEditing(s => ({ ...s, mobile_media_url: e.target.value }))} placeholder="https://..." />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Overlay Strength">
            <select className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm" value={editing.overlay_strength || 'medium'}
              onChange={e => setEditing(s => ({ ...s, overlay_strength: e.target.value }))}>
              {['light','medium','heavy'].map(o => <option key={o} value={o}>{OVERLAY_LABELS[o]}</option>)}
            </select>
          </Field>
          <Field label="Sort Order">
            <Input type="number" value={editing.sort_order ?? 10} onChange={e => setEditing(s => ({ ...s, sort_order: Number(e.target.value) }))} />
          </Field>
          <Field label="Status">
            <select className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm" value={editing.status || 'draft'}
              onChange={e => setEditing(s => ({ ...s, status: e.target.value }))}>
              {['draft','live','archived'].map(st => <option key={st} value={st}>{st}</option>)}
            </select>
          </Field>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          <Button className="bg-[#232323] text-white"
            disabled={saveMutation.isPending || !editing.title || !editing.media_url}
            onClick={() => saveMutation.mutate(editing)}>
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Slide'}
          </Button>
        </div>
      </div>
    );
  }

  // ── SLIDE LIST ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{slides.length} slide{slides.length !== 1 ? 's' : ''} — {slides.filter(s => s.status === 'live').length} live</p>
        </div>
        <Button size="sm" className="bg-[#232323] text-white gap-2" onClick={() => setEditing({ ...EMPTY_SLIDE })}>
          <Plus className="w-4 h-4" /> New Slide
        </Button>
      </div>

      {slides.length === 0 && (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-lg">
          <p className="text-sm text-gray-400 mb-3">No hero slides yet. Create one to get started.</p>
          <Button size="sm" variant="outline" onClick={() => setEditing({ ...EMPTY_SLIDE })}>Create First Slide</Button>
        </div>
      )}

      <div className="space-y-2">
        {slides.map(slide => (
          <div key={slide.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors">
            {/* Thumbnail */}
            <div className="w-16 h-12 rounded overflow-hidden bg-gray-100 shrink-0">
              {slide.media_url ? (
                <img src={slide.thumbnail_url || slide.media_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-200" />
              )}
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm truncate">{slide.title}</span>
                {slide.theme && <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${THEME_COLORS[slide.theme] || 'bg-gray-100 text-gray-600'}`}>{slide.theme}</span>}
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${slide.status === 'live' ? 'bg-green-100 text-green-700' : slide.status === 'archived' ? 'bg-gray-100 text-gray-500' : 'bg-yellow-100 text-yellow-700'}`}>{slide.status}</span>
              </div>
              {slide.subtitle && <p className="text-xs text-gray-400 truncate mt-0.5">{slide.subtitle}</p>}
            </div>
            {/* Sort */}
            <span className="text-xs text-gray-300 shrink-0 font-mono">#{slide.sort_order ?? '—'}</span>
            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" title={slide.status === 'live' ? 'Set to Draft' : 'Set to Live'} onClick={() => toggleStatus(slide)}>
                {slide.status === 'live' ? <Eye className="w-4 h-4 text-green-600" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing({ ...slide })}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600"
                onClick={() => { if (confirm('Delete this slide?')) deleteMutation.mutate(slide.id); }}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children, className = '' }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <Label className="text-xs text-gray-500">{label}</Label>
      {children}
    </div>
  );
}