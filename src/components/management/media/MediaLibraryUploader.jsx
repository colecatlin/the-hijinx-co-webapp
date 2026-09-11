import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadAndCreateAsset, validateFile } from '@/lib/mediaLibraryUtils';
import { useInvalidateMediaLibrary } from '@/hooks/useMediaLibrary';

/**
 * MediaLibraryUploader — upload component for the Media Library page.
 * Supports single file upload. After upload, creates a LibraryAsset
 * record and invalidates the query cache so the new asset appears.
 */
export default function MediaLibraryUploader() {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const invalidate = useInvalidateMediaLibrary();

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
      invalidate();
      toast.success(asset ? 'Uploaded to Media Library' : 'File uploaded (library record pending)');
    } catch (err) {
      toast.error('Upload failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <label
      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
        uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-motion'
      }`}
      style={{ borderColor: 'hsl(var(--divider))' }}
    >
      {uploading ? (
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'hsl(var(--motion))' }} />
      ) : (
        <Upload className="w-4 h-4" style={{ color: 'hsl(var(--motion))' }} />
      )}
      <span className="text-xs font-semibold" style={{ color: 'hsl(var(--foreground-secondary))' }}>
        {uploading ? 'Uploading...' : 'Upload Media'}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*,application/pdf"
        onChange={handleUpload}
        disabled={uploading}
        className="hidden"
      />
    </label>
  );
}