import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ImageIcon, Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function UploadZone({ label, hint, value, onUpload, uploading, aspectClass, disabled }) {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) { toast.error('Unsupported format. Use JPG, PNG, or WEBP.'); return; }
    if (file.size > MAX_BYTES) { toast.error('File too large. Max 10 MB.'); return; }
    onUpload(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    handleFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-300">{label}</p>
        <p className="text-[11px] text-gray-600">{hint}</p>
      </div>

      {value ? (
        <div className={`relative ${aspectClass} rounded-lg overflow-hidden border border-gray-700`}>
          <img src={value} alt={label} className="w-full h-full object-cover" />
          {!disabled && (
            <button
              onClick={() => onUpload(null)}
              className="absolute top-2 right-2 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center hover:bg-black transition-colors"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          )}
        </div>
      ) : (
        <div
          className={`${aspectClass} rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
            dragging ? 'border-blue-500 bg-blue-900/10' : 'border-gray-700 bg-[#262626] hover:border-gray-500'
          } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
          ) : (
            <>
              <ImageIcon className="w-6 h-6 text-gray-600" />
              <div className="text-center">
                <p className="text-xs text-gray-400">Drag & drop or <span className="text-blue-400">browse</span></p>
                <p className="text-[10px] text-gray-600 mt-0.5">JPG, PNG, WEBP · max 10 MB</p>
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

export default function EventMediaSection({ logoUrl, coverUrl, onChange, disabled }) {
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const upload = async (file, field, setUploading) => {
    if (file === null) { onChange(field, ''); return; }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(field, file_url);
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <UploadZone
        label="Event Logo"
        hint="1:1 · square"
        value={logoUrl}
        onUpload={(f) => upload(f, 'event_logo_url', setUploadingLogo)}
        uploading={uploadingLogo}
        aspectClass="aspect-square max-w-[160px]"
        disabled={disabled}
      />

      <UploadZone
        label="Cover Photo"
        hint="16:9 or 2.6:1 · banner"
        value={coverUrl}
        onUpload={(f) => upload(f, 'event_cover_image_url', setUploadingCover)}
        uploading={uploadingCover}
        aspectClass="aspect-video w-full"
        disabled={disabled}
      />
    </div>
  );
}