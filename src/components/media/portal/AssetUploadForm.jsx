import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Loader2 } from 'lucide-react';
import { logAssetRightsEvent } from '@/components/media/public/mediaPublicHelpers.jsx';

export default function AssetUploadForm({ currentUser, mediaUser, onUploaded }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    asset_type: 'photo',
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file && !form.title) { setError('Please provide a title or file.'); return; }
    setUploading(true);
    setError('');
    try {
      let file_url = '';
      let file_name = form.title || 'asset';
      let mime_type = '';

      if (file) {
        const { file_url: uploadedUrl } = await base44.integrations.Core.UploadFile({ file });
        file_url = uploadedUrl;
        file_name = file.name;
        mime_type = file.type;
      }

      const asset = await base44.entities.MediaAsset.create({
        title: form.title || file_name,
        description: form.description,
        asset_type: form.asset_type,
        file_url,
        file_name,
        mime_type,
        owner_user_id: currentUser?.id || '',
        uploader_media_user_id: mediaUser?.id || '',
        creator_owned: true,
        status: 'uploaded',
        visibility_scope: 'private',
        rights_status: 'pending',
        public_access: false,
        editorial_usage_allowed: false,
        platform_promotional_usage_allowed: false,
        merchandise_usage_allowed: false,
        revenue_eligible: false,
        created_at: new Date().toISOString(),
      });

      await logAssetRightsEvent(base44, {
        operation_type: 'media_asset_public_visibility_changed',
        assetId: asset.id,
        ownerUserId: currentUser?.id,
        actedByUserId: currentUser?.id,
        newStatus: 'uploaded',
        message: `Asset uploaded by ${currentUser?.email || 'unknown'}`,
      });

      onUploaded(asset);
    } catch (err) {
      setError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#171717] border border-gray-800 rounded-lg p-4 space-y-3">
      <p className="text-white text-sm font-semibold">Upload Asset</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <Input
            placeholder="Title"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            className="bg-[#0f0f0f] border-gray-700 text-white placeholder:text-gray-600"
          />
        </div>
        <div className="sm:col-span-2">
          <Textarea
            placeholder="Description (optional)"
            value={form.description}
            onChange={e => set('description', e.target.value)}
            className="bg-[#0f0f0f] border-gray-700 text-white placeholder:text-gray-600 h-20 resize-none"
          />
        </div>
        <Select value={form.asset_type} onValueChange={v => set('asset_type', v)}>
          <SelectTrigger className="bg-[#0f0f0f] border-gray-700 text-white">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border-gray-700">
            {['photo', 'video', 'audio', 'document', 'graphic'].map(t => (
              <SelectItem key={t} value={t} className="text-gray-300 capitalize">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div>
          <input
            type="file"
            accept="image/*,video/*,audio/*,.pdf"
            onChange={e => setFile(e.target.files?.[0] || null)}
            className="w-full text-xs text-gray-500 file:bg-gray-800 file:text-gray-300 file:border-0 file:rounded file:px-3 file:py-1.5 file:mr-2 file:text-xs cursor-pointer"
          />
        </div>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <p className="text-gray-600 text-xs">
        By uploading you retain ownership. Rights are private by default and never assumed.
      </p>

      <Button type="submit" disabled={uploading} size="sm"
        className="bg-white text-black hover:bg-gray-100 gap-2">
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        {uploading ? 'Uploading...' : 'Upload Asset'}
      </Button>
    </form>
  );
}