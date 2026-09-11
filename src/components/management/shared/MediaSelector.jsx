import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Upload, X, Link2, Loader2, Library } from 'lucide-react';
import { toast } from 'sonner';
import ImagePositionControl from './ImagePositionControl';
import MediaLibraryPicker from '@/components/management/media/MediaLibraryPicker';
import { uploadAndCreateAsset, validateFile } from '@/lib/mediaLibraryUtils';
import { useInvalidateMediaLibrary } from '@/hooks/useMediaLibrary';

/**
 * MediaSelector — reusable media picker with upload, URL, browse library,
 * preview, alt, and positioning.
 *
 * Value shape: { url, alt, desktop_position, mobile_position }
 *
 * Three input modes:
 * - Browse Library (select from reusable Media Library assets)
 * - Upload (upload a new file — also creates a LibraryAsset record)
 * - Use URL (paste a direct URL)
 *
 * Alt text from a library asset is a default — the consuming editor can
 * override it per use.
 */
export default function MediaSelector({ value = {}, onChange, label = 'Media', showPosition = true }) {
  const v = { url: '', alt: '', desktop_position: 'center center', mobile_position: 'center center', ...value };
  const [uploading, setUploading] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const invalidate = useInvalidateMediaLibrary();

  const set = (field, val) => onChange({ ...v, [field]: val });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateFile(file, 10);
    if (!validation.valid) {
      toast.error(validation.error);
      e.target.value = '';
      return;
    }
    setUploading(true);
    try {
      const { file_url, asset } = await uploadAndCreateAsset(file, base44);
      // Set URL and prefill alt text from the library asset's default
      onChange({
        ...v,
        url: file_url,
        alt: asset?.alt_text || v.alt || '',
      });
      invalidate();
      toast.success('Image uploaded');
    } catch (err) {
      toast.error('Upload failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleLibrarySelect = (asset) => {
    // Select from library — set URL and prefill alt from asset's default.
    // The consuming editor can still override alt for this specific use.
    onChange({
      ...v,
      url: asset.url,
      alt: asset.alt_text || v.alt || '',
    });
    toast.success('Selected from library');
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

      {/* Browse Library / Upload / URL */}
      {!v.url && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPickerOpen(true)}
              className="flex-1 h-9 text-xs"
            >
              <Library className="w-3.5 h-3.5" /> Browse Library
            </Button>
            <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-motion'}`}>
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'hsl(var(--foreground-quiet))' }} /> : <Upload className="w-3.5 h-3.5" style={{ color: 'hsl(var(--foreground-quiet))' }} />}
              <span className="text-xs" style={{ color: 'hsl(var(--foreground-quiet))' }}>{uploading ? 'Uploading...' : 'Upload'}</span>
              <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} className="hidden" />
            </label>
          </div>
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

      {/* Library Picker */}
      <MediaLibraryPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleLibrarySelect}
      />

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