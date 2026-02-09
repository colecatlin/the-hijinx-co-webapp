import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function MediaUploader({ label, value, onChange, accept = 'image/*', multiple = false }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    try {
      if (multiple) {
        const urls = [];
        for (let i = 0; i < files.length; i++) {
          const { file_url } = await base44.integrations.Core.UploadFile({ file: files[i] });
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
      onChange(value.filter((_, i) => i !== index));
    } else {
      onChange('');
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-3">
        <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <Upload className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">{uploading ? 'Uploading...' : 'Click to upload'}</span>
          <input type="file" accept={accept} multiple={multiple} onChange={handleUpload} disabled={uploading} className="hidden" />
        </label>

        {!multiple && value && (
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <Check className="w-4 h-4 text-green-600" />
            <span className="text-sm text-gray-700 flex-1 truncate">{value.split('/').pop()}</span>
            <button onClick={() => handleRemove(0)} className="text-gray-500 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {multiple && Array.isArray(value) && value.length > 0 && (
          <div className="space-y-2">
            {value.map((url, index) => (
              <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-sm text-gray-700 flex-1 truncate">{url.split('/').pop()}</span>
                <button onClick={() => handleRemove(index)} className="text-gray-500 hover:text-red-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}