import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Upload, X, Link2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import ImagePositionControl from './ImagePositionControl';

/**
 * MediaSelector — reusable media picker with upload, URL, preview, alt, and positioning.
 *
 * Value shape: { url, alt, desktop_position, mobile_position }
 *
 * "Select Existing" (browsable library) is gracefully unavailable until
 * the future Website → Media Library plugs in.
 */
export default function MediaSelector({ value = {}, onChange, label = 'Media', showPosition = true }) {
  const v = { url: '', alt: '', desktop_position: 'center center', mobile_position: 'center center', ...value };
  const [uploading, setUploading] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  const set = (field, val) => onChange({ ...v, [field]: val });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large (max 10MB)');
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set('url', file_url);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const remove = () => onChange({ url: '', alt: '', desktop_position: 'center center', mobile_position: 'center center' });

  return (
    <div className="space-y-3 p-3 rounded-lg border border-divider bg-surface">
      <Label className="text-xs font-semibold">{label}</Label>

      {/* Preview */}
      {v.url && (
        <div className="relative group rounded-lg overflow-hidden border border-divider">
          <img src={v.url} alt={v.alt || ''} className="w-full h-32 object-cover" />
          <button
            onClick={remove}
            className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Upload / URL toggle */}
      {!v.url && (
        <div className="space-y-2">
          <label className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-motion'}`}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin text-foreground-quiet" /> : <Upload className="w-4 h-4 text-foreground-quiet" />}
            <span className="text-xs text-foreground-quiet">{uploading ? 'Uploading...' : 'Click to upload image'}</span>
            <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} className="hidden" />
          </label>
          <button onClick={() => setShowUrl(!showUrl)} className="text-xs text-motion hover:underline flex items-center gap-1">
            <Link2 className="w-3 h-3" /> Paste URL instead
          </button>
          {showUrl && (
            <Input
              value={v.url}
              onChange={(e) => set('url', e.target.value)}
              placeholder="https://..."
              className="h-8 text-xs"
              type="url"
            />
          )}
        </div>
      )}

      {/* Alt text */}
      {v.url && (
        <div>
          <Label className="text-xs text-foreground-quiet mb-1 block">Alt text</Label>
          <Input value={v.alt} onChange={(e) => set('alt', e.target.value)} className="h-8 text-xs" placeholder="Describe the image..." />
        </div>
      )}

      {/* Position */}
      {v.url && showPosition && (
        <div className="space-y-2">
          <ImagePositionControl label="Desktop" value={v.desktop_position} onChange={(val) => set('desktop_position', val)} />
          <ImagePositionControl label="Mobile" value={v.mobile_position} onChange={(val) => set('mobile_position', val)} />
        </div>
      )}
    </div>
  );
}