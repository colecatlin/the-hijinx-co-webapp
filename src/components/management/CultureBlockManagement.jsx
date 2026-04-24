import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Plus, Pencil, Trash2, Loader2, Upload,
  ChevronUp, ChevronDown, ImageIcon, X, Check
} from 'lucide-react';

const PRESET_BLOCKS = [
  {
    title: 'On Track',
    label: 'On Track',
    description: '',
    image_url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=900&q=90&fit=crop',
    link_label: 'Race Core',
    link_url: '/MotorsportsHome',
    sort_order: 0,
    is_active: true,
  },
  {
    title: 'Built',
    label: 'Built',
    description: '',
    image_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=700&q=90&fit=crop',
    link_label: '',
    link_url: '/MotorsportsHome',
    sort_order: 1,
    is_active: true,
  },
  {
    title: 'Crew',
    label: 'Crew',
    description: '',
    image_url: 'https://images.unsplash.com/photo-1541447271487-09612b3f49f7?w=700&q=90&fit=crop',
    link_label: '',
    link_url: '/MotorsportsHome',
    sort_order: 2,
    is_active: true,
  },
  {
    title: 'Worn',
    label: 'Worn',
    description: '',
    image_url: 'https://images.unsplash.com/photo-1524069290683-0457abfe42c3?w=700&q=90&fit=crop',
    link_label: 'Shop Apparel',
    link_url: '/ApparelHome',
    sort_order: 3,
    is_active: true,
  },
  {
    title: 'Behind the Scenes',
    label: 'Behind the Scenes',
    description: '',
    image_url: 'https://images.unsplash.com/photo-1590650046871-92c887180603?w=700&q=90&fit=crop',
    link_label: '',
    link_url: '/MotorsportsHome',
    sort_order: 4,
    is_active: true,
  },
  {
    title: 'Culture',
    label: 'Culture',
    description: 'Born from the garage. Built for the track. Worn everywhere else. Where motorsports culture meets real life.',
    image_url: '',
    link_label: 'Shop Apparel',
    link_url: '/ApparelHome',
    sort_order: 5,
    is_active: true,
  },
  {
    title: 'Editorial',
    label: 'Editorial',
    description: 'We document what others overlook.',
    image_url: '',
    link_label: 'Read the Outlet',
    link_url: '/OutletHome',
    sort_order: 6,
    is_active: true,
  },
];

const EMPTY_BLOCK = {
  title: '',
  label: '',
  description: '',
  image_url: '',
  link_url: '',
  link_label: '',
  accent_color: '#00FFDA',
  sort_order: 0,
  is_active: true,
};

const DESCRIPTION_LIMIT = 120;

const ACCENT_PRESETS = [
  '#00FFDA', '#FF6B00', '#FF2D55', '#E5FF00',
  '#A78BFA', '#38BDF8', '#4ADE80', '#FB923C',
];

export default function CultureBlockManagement() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_BLOCK);
  const [uploading, setUploading] = useState(false);

  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ['cultureBlocks'],
    queryFn: () => base44.entities.CultureBlock.list('sort_order'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CultureBlock.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cultureBlocks'] }); setEditingId(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CultureBlock.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cultureBlocks'] }); setEditingId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CultureBlock.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cultureBlocks'] }),
  });

  const handleSeedPresets = async () => {
    for (const block of PRESET_BLOCKS) {
      await base44.entities.CultureBlock.create(block);
    }
    queryClient.invalidateQueries({ queryKey: ['cultureBlocks'] });
  };

  const handleEdit = (block) => {
    setForm({ ...EMPTY_BLOCK, ...block });
    setEditingId(block.id);
  };

  const handleNew = () => {
    setForm({ ...EMPTY_BLOCK, sort_order: blocks.length });
    setEditingId('new');
  };

  const handleSave = () => {
    if (editingId === 'new') {
      createMutation.mutate(form);
    } else {
      updateMutation.mutate({ id: editingId, data: form });
    }
  };

  const handleMove = (block, direction) => {
    const sorted = [...blocks].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex(s => s.id === block.id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const sibling = sorted[swapIdx];
    updateMutation.mutate({ id: block.id, data: { sort_order: sibling.sort_order } });
    updateMutation.mutate({ id: sibling.id, data: { sort_order: block.sort_order } });
  };

  const handleFileUpload = async (file) => {
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, image_url: file_url }));
    setUploading(false);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const sorted = [...blocks].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Culture & Identity Blocks</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage the editorial grid blocks on the homepage.</p>
        </div>
        <div className="flex gap-2">
          {blocks.length === 0 && (
            <Button variant="outline" onClick={handleSeedPresets} className="gap-2 text-sm">
              Load Presets
            </Button>
          )}
          {editingId === null && (
            <Button onClick={handleNew} className="bg-[#232323] text-white gap-2">
              <Plus className="w-4 h-4" /> Add Block
            </Button>
          )}
        </div>
      </div>

      {/* Edit / New Form */}
      {editingId !== null && (
        <BlockForm
          form={form}
          setForm={setForm}
          uploading={uploading}
          isSaving={isSaving}
          isNew={editingId === 'new'}
          onSave={handleSave}
          onCancel={() => setEditingId(null)}
          onFileUpload={handleFileUpload}
        />
      )}

      {/* Block List */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
          No blocks yet. Click "Load Presets" to start with the default layout, or add manually.
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((block, idx) => (
            <BlockRow
              key={block.id}
              block={block}
              number={idx + 1}
              isFirst={idx === 0}
              isLast={idx === sorted.length - 1}
              isEditing={editingId === block.id}
              onEdit={() => handleEdit(block)}
              onDelete={() => { if (confirm('Delete this block?')) deleteMutation.mutate(block.id); }}
              onMoveUp={() => handleMove(block, -1)}
              onMoveDown={() => handleMove(block, 1)}
              onToggleActive={(val) => updateMutation.mutate({ id: block.id, data: { is_active: val } })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BlockRow({ block, number, isFirst, isLast, isEditing, onEdit, onDelete, onMoveUp, onMoveDown, onToggleActive }) {
  return (
    <div className={`bg-white border rounded-lg p-4 flex items-center gap-4 transition-all ${isEditing ? 'border-blue-400 ring-1 ring-blue-200' : 'border-gray-200'} ${!block.is_active ? 'opacity-50' : ''}`}>
      {/* Number badge */}
      <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
        {number}
      </div>

      {/* Thumbnail */}
      <div className="w-16 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
        {block.image_url ? (
          <img src={block.image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImageIcon className="w-5 h-5 text-gray-300" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900 truncate" style={{ fontFamily: "'Playfair Display', serif" }}>{block.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {block.label && <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">{block.label}</span>}
          {block.link_label && <span className="text-[10px] text-gray-400">· CTA: <em>{block.link_label}</em></span>}
          {!block.image_url && <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 rounded px-1.5 py-0.5 font-medium">No image (glass card)</span>}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Switch checked={!!block.is_active} onCheckedChange={onToggleActive} />
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

function BlockForm({ form, setForm, uploading, isSaving, isNew, onSave, onCancel, onFileUpload }) {
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800">{isNew ? 'New Block' : 'Edit Block'}</h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
      </div>

      {/* Live mini preview */}
      {(form.image_url || form.title) && (
        <div className="rounded-xl overflow-hidden" style={{ height: 160, background: form.image_url ? '#111' : 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,0,0,0.08)', position: 'relative' }}>
          {form.image_url && (
            <img src={form.image_url} alt="Preview" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'contrast(1.18) saturate(0.45) brightness(0.65)' }} />
          )}
          <div className="absolute inset-0" style={{ background: form.image_url ? 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)' : undefined }} />
          <div className="absolute top-3 left-3">
            <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.4em', textTransform: 'uppercase', color: form.image_url ? 'rgba(255,255,255,0.5)' : '#999' }}>{form.label || form.title}</span>
          </div>
          <div className="absolute bottom-3 left-3 right-3">
            <p style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontStyle: 'italic', fontSize: '1rem', color: form.image_url ? '#fff' : '#0A0A0A', lineHeight: 1.2, marginBottom: 4 }}>{form.title || 'Block Title'}</p>
            {form.link_label && <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: form.accent_color || '#00FFDA' }}>{form.link_label} →</span>}
          </div>
        </div>
      )}

      {/* Image */}
      <div className="space-y-3">
        <Label className="font-semibold">Background Image</Label>
        {form.image_url && (
          <div className="w-full h-36 bg-gray-200 rounded overflow-hidden">
            <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" />
          </div>
        )}
        <label className="flex items-center gap-2 cursor-pointer border border-dashed border-gray-300 rounded px-4 py-3 hover:border-gray-500 transition-colors bg-white">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-gray-500" />}
          <span className="text-sm text-gray-600">{uploading ? 'Uploading...' : 'Upload image'}</span>
          <input type="file" accept="image/*" className="hidden" disabled={uploading}
            onChange={(e) => e.target.files?.[0] && onFileUpload(e.target.files[0])} />
        </label>
        <div className="space-y-1">
          <Label>Or paste URL</Label>
          <Input value={form.image_url} onChange={e => set('image_url', e.target.value)} placeholder="https://..." />
        </div>
      </div>

      {/* Title & Label */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Title <span className="text-red-500">*</span></Label>
          <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Culture" />
        </div>
        <div className="space-y-1">
          <Label>Label <span className="text-gray-400 font-normal">(small top label)</span></Label>
          <Input value={form.label} onChange={e => set('label', e.target.value)} placeholder="Culture" />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label>Description <span className="text-gray-400 font-normal">(optional)</span></Label>
          <span className={`text-xs font-mono ${(form.description || '').length > DESCRIPTION_LIMIT ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
            {(form.description || '').length}/{DESCRIPTION_LIMIT}
          </span>
        </div>
        <Input
          value={form.description}
          onChange={e => set('description', e.target.value.slice(0, DESCRIPTION_LIMIT))}
          placeholder="Short description text..."
          className={(form.description || '').length >= DESCRIPTION_LIMIT ? 'border-red-300 focus-visible:ring-red-300' : ''}
        />
        {(form.description || '').length >= DESCRIPTION_LIMIT && (
          <p className="text-xs text-red-500">Character limit reached (120 max)</p>
        )}
      </div>

      {/* Accent Color */}
      <div className="space-y-2">
        <Label>Hover Glow Color</Label>
        <div className="flex items-center gap-3 flex-wrap">
          {ACCENT_PRESETS.map(color => (
            <button
              key={color}
              type="button"
              onClick={() => set('accent_color', color)}
              className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
              style={{
                background: color,
                borderColor: form.accent_color === color ? '#232323' : 'transparent',
                boxShadow: form.accent_color === color ? `0 0 0 2px white, 0 0 0 4px #232323` : 'none',
              }}
              title={color}
            />
          ))}
          <div className="flex items-center gap-2 ml-1">
            <input
              type="color"
              value={form.accent_color || '#00FFDA'}
              onChange={e => set('accent_color', e.target.value)}
              className="w-7 h-7 rounded cursor-pointer border border-gray-200"
              title="Custom color"
            />
            <span className="text-xs font-mono text-gray-500">{form.accent_color || '#00FFDA'}</span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Link Label</Label>
          <Input value={form.link_label} onChange={e => set('link_label', e.target.value)} placeholder="Shop Apparel" />
        </div>
        <div className="space-y-1">
          <Label>Link URL</Label>
          <Input value={form.link_url} onChange={e => set('link_url', e.target.value)} placeholder="/ApparelHome" />
        </div>
      </div>

      {/* Active */}
      <div className="flex items-center gap-3">
        <Switch checked={!!form.is_active} onCheckedChange={val => set('is_active', val)} />
        <Label>Active (visible on homepage)</Label>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button onClick={onSave} disabled={!form.title || isSaving || (form.description || '').length > DESCRIPTION_LIMIT} className="bg-[#232323] text-white gap-2">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {isNew ? 'Create Block' : 'Save Changes'}
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}