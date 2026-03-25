import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Upload, Check, Search, Image } from 'lucide-react';

/**
 * MediaPicker — select from tagged MediaAssets or upload new
 *
 * Props:
 *   value          - current image URL
 *   onChange       - fn(url) called on selection
 *   entityType     - e.g. 'Driver', 'Event', 'Track', 'Series', 'Team'
 *   entityId       - the entity's id
 *   contextType    - 'hero' | 'card' (used for auto-tag on upload)
 *   label          - display label
 */
export default function MediaPicker({ value, onChange, entityType, entityId, contextType = 'action', label = 'Image' }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('library'); // 'library' | 'upload'
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadContext, setUploadContext] = useState(contextType);
  const queryClient = useQueryClient();

  // Load assets tagged to this entity (plus general untagged pool)
  const { data: assets = [] } = useQuery({
    queryKey: ['mediaAssets', entityType, entityId],
    queryFn: async () => {
      const tagged = entityId
        ? await base44.entities.MediaAsset.filter({ entity_type: entityType, entity_id: entityId, media_type: 'image' }, '-created_at', 50)
        : [];
      // Also load general assets for this entity type
      const general = entityType
        ? await base44.entities.MediaAsset.filter({ entity_type: entityType, media_type: 'image' }, '-created_at', 50)
        : [];
      // Deduplicate by id
      const seen = new Set();
      return [...tagged, ...general].filter(a => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      });
    },
    enabled: open,
    staleTime: 30 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MediaAsset.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mediaAssets', entityType, entityId] }),
  });

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    // Save as a tagged MediaAsset
    await createMutation.mutateAsync({
      file_url,
      thumbnail_url: file_url,
      file_name: file.name,
      asset_type: 'photo',
      media_type: 'image',
      entity_type: entityType || null,
      entity_id: entityId || null,
      context_type: uploadContext,
      status: 'uploaded',
      public_access: true,
    });
    onChange(file_url);
    setUploading(false);
    setOpen(false);
  }

  const filtered = assets.filter(a => {
    const url = a.file_url || a.thumbnail_url || '';
    const title = (a.title || a.file_name || '').toLowerCase();
    return !search || title.includes(search.toLowerCase()) || url.includes(search.toLowerCase());
  });

  const CONTEXT_TYPES = ['hero', 'card', 'action', 'portrait', 'event', 'track', 'lifestyle', 'editorial', 'podium', 'crowd'];

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">{label}</label>

      {/* Current value preview + trigger */}
      <div className="flex items-start gap-3">
        <div
          className="relative rounded overflow-hidden border border-gray-200 bg-gray-100 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
          style={{ width: 80, height: 56 }}
          onClick={() => setOpen(true)}
        >
          {value ? (
            <img src={value} alt="" className="w-full h-full object-cover" onError={e => e.target.style.display = 'none'} />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Image className="w-5 h-5 text-gray-300" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            placeholder="Paste URL or pick from library..."
            className="w-full text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
          <button
            onClick={() => setOpen(true)}
            className="mt-1.5 text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            Browse library / Upload →
          </button>
        </div>
        {value && (
          <button onClick={() => onChange('')} className="text-gray-400 hover:text-gray-600 mt-1">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <span className="font-semibold text-sm">Select Image — {label}</span>
              <button onClick={() => setOpen(false)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b px-5">
              {['library', 'upload'].map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide border-b-2 -mb-px transition-colors ${tab === t ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                  {t === 'library' ? 'Media Library' : 'Upload New'}
                </button>
              ))}
            </div>

            {tab === 'library' && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="px-5 py-3 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search media..."
                      className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-300"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {filtered.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 text-sm">
                      No media found for this entity.<br />
                      <button onClick={() => setTab('upload')} className="mt-2 text-blue-600 font-medium">Upload new media</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {filtered.map(asset => {
                        const url = asset.file_url || asset.thumbnail_url;
                        const isSelected = value === url;
                        return (
                          <button key={asset.id}
                            onClick={() => { onChange(url); setOpen(false); }}
                            className={`relative aspect-square rounded overflow-hidden border-2 transition-all ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-gray-300'}`}
                          >
                            <img src={url} alt={asset.title || ''} className="w-full h-full object-cover" />
                            {isSelected && (
                              <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                <Check className="w-5 h-5 text-blue-600" />
                              </div>
                            )}
                            {asset.context_type && (
                              <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
                                <span className="text-[9px] text-white">{asset.context_type}</span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'upload' && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
                <div className="w-full max-w-sm space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Context Type</label>
                    <select
                      value={uploadContext}
                      onChange={e => setUploadContext(e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none"
                    >
                      {CONTEXT_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <label className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${uploading ? 'border-gray-200 bg-gray-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}`}>
                    {uploading ? (
                      <span className="text-sm text-gray-400">Uploading...</span>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-gray-300 mb-2" />
                        <span className="text-sm font-medium text-gray-500">Click to upload image</span>
                        <span className="text-xs text-gray-400 mt-1">PNG, JPG, WebP</span>
                      </>
                    )}
                    <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleUpload} />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}