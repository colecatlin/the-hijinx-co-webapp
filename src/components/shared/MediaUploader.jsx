import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Label } from '@/components/ui/label';
import { Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function MediaUploader({
  label,
  value,
  onChange,
  accept = 'image/*',
  multiple = false,
  hint,
  maxSizeMB = 10,
}) {
  const [uploading, setUploading] = useState(false);
  const isImage = accept.includes('image');

  const validateFile = (file) => {
    if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`"${file.name}" is too large. Max size is ${maxSizeMB}MB.`);
      return false;
    }
    return true;
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    for (const file of files) {
      if (!validateFile(file)) {
        e.target.value = '';
        return;
      }
    }

    setUploading(true);
    try {
      if (multiple) {
        const urls = [];
        for (const file of files) {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          urls.push(file_url);
        }
        onChange([...(Array.isArray(value) ? value : []), ...urls]);
        toast.success(`${files.length} file(s) uploaded`);
      } else {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: files[0] });
        onChange(file_url);
        toast.success('File uploaded');
      }
    } catch (error) {
      toast.error('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemove = (index) => {
    if (multiple) {
      onChange((Array.isArray(value) ? value : []).filter((_, i) => i !== index));
    } else {
      onChange('');
    }
  };

  return (
    <div className="space-y-1.5">
      {label && <Label>{label}</Label>}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
      <div className="space-y-3">
        <label
          className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg transition-colors ${
            uploading
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50 cursor-pointer'
          }`}
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 text-gray-400" />
          )}
          <span className="text-sm text-gray-500">
            {uploading ? 'Uploading...' : 'Click to upload'}
          </span>
          <input
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>

        {/* Single file preview */}
        {!multiple && value && (
          <div className="relative group">
            {isImage ? (
              <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                <img src={value} alt="Uploaded" className="w-full h-36 object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemove(0)}
                  className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-sm text-gray-700 flex-1 truncate">{value.split('/').pop()}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(0)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Multiple files preview */}
        {multiple && Array.isArray(value) && value.length > 0 && (
          isImage ? (
            <div className="grid grid-cols-3 gap-2">
              {value.map((url, index) => (
                <div key={index} className="relative group rounded-lg overflow-hidden border border-gray-200">
                  <img src={url} alt={`Upload ${index + 1}`} className="w-full h-24 object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {value.map((url, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-sm text-gray-700 flex-1 truncate">{url.split('/').pop()}</span>
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}