import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, ImageIcon } from 'lucide-react';

const SECTIONS = [
  { key: 'apparel_bg', label: 'Apparel Section Background' },
];

export default function ManageHomepage() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState({});

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['homepageSettings'],
    queryFn: () => base44.entities.HomepageSettings.list(),
  });

  const upsertMutation = useMutation({
    mutationFn: async ({ key, label, image_url }) => {
      const existing = settings.find(s => s.key === key);
      if (existing) {
        return base44.entities.HomepageSettings.update(existing.id, { image_url });
      } else {
        return base44.entities.HomepageSettings.create({ key, label, image_url });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['homepageSettings'] }),
  });

  const getSetting = (key) => settings.find(s => s.key === key);

  const handleFileUpload = async (key, label, file) => {
    setUploading(u => ({ ...u, [key]: true }));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await upsertMutation.mutateAsync({ key, label, image_url: file_url });
    setUploading(u => ({ ...u, [key]: false }));
  };

  const handleUrlSave = async (key, label, url) => {
    await upsertMutation.mutateAsync({ key, label, image_url: url });
  };

  if (isLoading) {
    return (
      <ManagementLayout currentPage="ManageHomepage">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </ManagementLayout>
    );
  }

  return (
    <ManagementLayout currentPage="ManageHomepage">
      <ManagementShell title="Homepage" subtitle="Manage background images and visuals for homepage sections" maxWidth="max-w-3xl">
        <div className="space-y-8">
          {SECTIONS.map(({ key, label }) => {
            const setting = getSetting(key);
            return (
              <SectionEditor
                key={key}
                sectionKey={key}
                label={label}
                currentUrl={setting?.image_url || ''}
                uploading={!!uploading[key]}
                onFileUpload={(file) => handleFileUpload(key, label, file)}
                onUrlSave={(url) => handleUrlSave(key, label, url)}
              />
            );
          })}
        </div>
      </ManagementShell>
    </ManagementLayout>
  );
    }

function SectionEditor({ label, currentUrl, uploading, onFileUpload, onUrlSave }) {
  const [urlInput, setUrlInput] = useState(currentUrl);

  React.useEffect(() => {
    setUrlInput(currentUrl);
  }, [currentUrl]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
      <h2 className="text-lg font-bold">{label}</h2>

      {/* Preview */}
      <div className="w-full h-48 bg-gray-100 rounded overflow-hidden flex items-center justify-center border border-gray-200">
        {currentUrl ? (
          <img src={currentUrl} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <ImageIcon className="w-8 h-8" />
            <span className="text-sm">No image set</span>
          </div>
        )}
      </div>

      {/* Upload file */}
      <div className="space-y-1">
        <Label>Upload Image</Label>
        <label className="flex items-center gap-2 cursor-pointer border border-dashed border-gray-300 rounded px-4 py-3 hover:border-gray-500 transition-colors">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-gray-500" />}
          <span className="text-sm text-gray-600">{uploading ? 'Uploading...' : 'Choose a file to upload'}</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => e.target.files?.[0] && onFileUpload(e.target.files[0])}
          />
        </label>
      </div>

      {/* Or paste URL */}
      <div className="space-y-1">
        <Label>Or paste image URL</Label>
        <div className="flex gap-2">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://..."
          />
          <Button
            onClick={() => onUrlSave(urlInput)}
            disabled={!urlInput || urlInput === currentUrl}
            className="bg-[#232323] text-white shrink-0"
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}