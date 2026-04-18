import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import ImageCropModal from '@/components/shared/ImageCropModal';
import {
  Plus, Pencil, Trash2, Loader2, Upload, ChevronUp, ChevronDown,
  ImageIcon, X, Check, Crop
} from 'lucide-react';

const EMPTY_SLIDE = {
  headline_line1: '',
  headline_line2: '',
  subtext: '',
  media_type: 'image',
  background_url: '',
  cta1_label: '',
  cta1_url: '',
  cta2_label: '',
  cta2_url: '',
  sort_order: 0,
  is_active: true,
};

export default function HeroSlideManagement() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null); // null = none, 'new' = new slide
  const [form, setForm] = useState(EMPTY_SLIDE);
  const [uploading, setUploading] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState(null);

  const { data: slides = [], isLoading } = useQuery({
    queryKey: ['heroSlides'],
    queryFn: () => base44.entities.HeroSlide.list('sort_order'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.HeroSlide.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['heroSlides'] }); setEditingId(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.HeroSlide.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['heroSlides'] }); setEditingId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.HeroSlide.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['heroSlides'] }),
  });

  const handleEdit = (slide) => {
    setForm({ ...EMPTY_SLIDE, ...slide });
    setEditingId(slide.id);
  };

  const handleNew = () => {
    setForm({ ...EMPTY_SLIDE, sort_order: slides.length });
    setEditingId('new');
  };

  const handleCancel = () => setEditingId(null);

  const handleSave = () => {
    if (editingId === 'new') {
      createMutation.mutate(form);
    } else {
      updateMutation.mutate({ id: editingId, data: form });
    }
  };

  const handleDelete = (id) => {
    if (confirm('Delete this slide?')) deleteMutation.mutate(id);
  };

  const handleMove = (slide, direction) => {
    const sorted = [...slides].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex(s => s.id === slide.id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const sibling = sorted[swapIdx];
    updateMutation.mutate({ id: slide.id, data: { sort_order: sibling.sort_order } });
    updateMutation.mutate({ id: sibling.id, data: { sort_order: slide.sort_order } });
  };

  const handleFileUpload = async (file) => {
    // For images, open crop modal. For videos, upload directly.
    if (file.type.startsWith('image/')) {
      const objectUrl = URL.createObjectURL(file);
      setCropImageUrl(objectUrl);
      setCropOpen(true);
    } else {
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, background_url: file_url }));
      setUploading(false);
    }
  };

  const handleCropSave = (croppedUrl) => {
    setForm(f => ({ ...f, background_url: croppedUrl }));
    if (cropImageUrl) URL.revokeObjectURL(cropImageUrl);
    setCropImageUrl(null);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const sorted = [...slides].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Hero Slides</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage the rotating hero carousel on the homepage.</p>
        </div>
        {editingId === null && (
          <Button onClick={handleNew} className="bg-[#232323] text-white gap-2">
            <Plus className="w-4 h-4" /> Add Slide
          </Button>
        )}
      </div>

      {/* New / Edit Form */}
      {editingId !== null && (
        <SlideForm
          form={form}
          setForm={setForm}
          uploading={uploading}
          isSaving={isSaving}
          isNew={editingId === 'new'}
          onSave={handleSave}
          onCancel={handleCancel}
          onFileUpload={handleFileUpload}
          onCropClick={() => setCropOpen(true)}
        />
      )}

      <ImageCropModal
        open={cropOpen}
        onClose={() => { setCropOpen(false); if (cropImageUrl) { URL.revokeObjectURL(cropImageUrl); setCropImageUrl(null); } }}
        imageUrl={cropImageUrl || form.background_url}
        onSave={handleCropSave}
        aspectRatio={16 / 9}
      />

      {/* Slide List */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
          No slides yet. Add your first slide above.
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((slide, idx) => (
            <SlideRow
              key={slide.id}
              slide={slide}
              isFirst={idx === 0}
              isLast={idx === sorted.length - 1}
              isEditing={editingId === slide.id}
              onEdit={() => handleEdit(slide)}
              onDelete={() => handleDelete(slide.id)}
              onMoveUp={() => handleMove(slide, -1)}
              onMoveDown={() => handleMove(slide, 1)}
              onToggleActive={(val) => updateMutation.mutate({ id: slide.id, data: { is_active: val } })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SlideRow({ slide, isFirst, isLast, isEditing, onEdit, onDelete, onMoveUp, onMoveDown, onToggleActive }) {
  return (
    <div className={`bg-white border rounded-lg p-4 flex items-center gap-4 transition-all ${isEditing ? 'border-blue-400 ring-1 ring-blue-200' : 'border-gray-200'} ${!slide.is_active ? 'opacity-50' : ''}`}>
      {/* Thumbnail */}
      <div className="w-16 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
        {slide.background_url ? (
          <img src={slide.background_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImageIcon className="w-5 h-5 text-gray-300" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900 truncate">
          {slide.headline_line1}{slide.headline_line2 ? ` / ${slide.headline_line2}` : ''}
        </p>
        <p className="text-xs text-gray-400 truncate mt-0.5">{slide.subtext || 'No subtext'}</p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Switch checked={!!slide.is_active} onCheckedChange={onToggleActive} />
        <button onClick={onMoveUp} disabled={isFirst} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20">
          <ChevronUp className="w-4 h-4" />
        </button>
        <button onClick={onMoveDown} disabled={isLast} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20">
          <ChevronDown className="w-4 h-4" />
        </button>
        <button onClick={onEdit} className="p-1.5 text-gray-500 hover:text-blue-600 transition-colors">
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function SlideForm({ form, setForm, uploading, isSaving, isNew, onSave, onCancel, onFileUpload, onCropClick }) {
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800">{isNew ? 'New Slide' : 'Edit Slide'}</h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
      </div>

      {/* Background Media */}
      <div className="space-y-3">
        <Label className="font-semibold">Background Media</Label>
        <div className="flex gap-3">
          {['image', 'video'].map(t => (
            <button
              key={t}
              onClick={() => set('media_type', t)}
              className={`px-4 py-1.5 text-xs font-medium rounded border transition-all capitalize ${form.media_type === t ? 'bg-[#232323] text-white border-[#232323]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Preview */}
        {form.background_url && (
          <div className="relative w-full h-40 bg-gray-200 rounded overflow-hidden group">
            {form.media_type === 'video' ? (
              <video src={form.background_url} className="w-full h-full object-cover" muted />
            ) : (
              <>
                <img src={form.background_url} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={onCropClick}
                  className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-medium"
                >
                  <Crop className="w-4 h-4" /> Crop & Adjust
                </button>
              </>
            )}
          </div>
        )}

        {/* Upload */}
        <label className="flex items-center gap-2 cursor-pointer border border-dashed border-gray-300 rounded px-4 py-3 hover:border-gray-500 transition-colors bg-white">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-gray-500" />}
          <span className="text-sm text-gray-600">{uploading ? 'Uploading...' : 'Upload file'}</span>
          <input
            type="file"
            accept={form.media_type === 'video' ? 'video/*' : 'image/*'}
            className="hidden"
            disabled={uploading}
            onChange={(e) => e.target.files?.[0] && onFileUpload(e.target.files[0])}
          />
        </label>

        <div className="space-y-1">
          <Label>Or paste URL</Label>
          <Input value={form.background_url} onChange={e => set('background_url', e.target.value)} placeholder="https://..." />
        </div>
      </div>

      {/* Headline */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Headline Line 1 <span className="text-red-500">*</span></Label>
          <Input value={form.headline_line1} onChange={e => set('headline_line1', e.target.value)} placeholder="IN MOTION." />
        </div>
        <div className="space-y-1">
          <Label>Headline Line 2</Label>
          <Input value={form.headline_line2} onChange={e => set('headline_line2', e.target.value)} placeholder="ON PURPOSE." />
        </div>
      </div>

      {/* Subtext */}
      <div className="space-y-1">
        <Label>Subtext</Label>
        <Input value={form.subtext} onChange={e => set('subtext', e.target.value)} placeholder="Not just moving, moving with intent." />
      </div>

      {/* CTAs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Primary CTA Label</Label>
          <Input value={form.cta1_label} onChange={e => set('cta1_label', e.target.value)} placeholder="Enter HIJINX" />
        </div>
        <div className="space-y-1">
          <Label>Primary CTA URL</Label>
          <Input value={form.cta1_url} onChange={e => set('cta1_url', e.target.value)} placeholder="/OutletHome" />
        </div>
        <div className="space-y-1">
          <Label>Secondary CTA Label</Label>
          <Input value={form.cta2_label} onChange={e => set('cta2_label', e.target.value)} placeholder="Optional" />
        </div>
        <div className="space-y-1">
          <Label>Secondary CTA URL</Label>
          <Input value={form.cta2_url} onChange={e => set('cta2_url', e.target.value)} placeholder="/MotorsportsHome" />
        </div>
      </div>

      {/* Active toggle */}
      <div className="flex items-center gap-3">
        <Switch checked={!!form.is_active} onCheckedChange={val => set('is_active', val)} />
        <Label>Active (visible on homepage)</Label>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button onClick={onSave} disabled={!form.headline_line1 || isSaving} className="bg-[#232323] text-white gap-2">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {isNew ? 'Create Slide' : 'Save Changes'}
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}