import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, ImageIcon } from 'lucide-react';
import ActivityTab from '@/components/management/ActivityTab';
import HomepageEditorialSettings from '@/components/management/HomepageEditorialSettings';

const SOCIAL_FIELDS = [
  { key: 'social_instagram_url', label: 'Instagram', placeholder: 'https://instagram.com/hijinxco' },
  { key: 'social_x_url', label: 'X (Twitter)', placeholder: 'https://x.com/hijinxco' },
  { key: 'social_facebook_url', label: 'Facebook', placeholder: 'https://facebook.com/hijinxco' },
  { key: 'social_youtube_url', label: 'YouTube', placeholder: 'https://youtube.com/@hijinxco' },
  { key: 'social_tiktok_url', label: 'TikTok', placeholder: 'https://tiktok.com/@hijinxco' },
  { key: 'social_linkedin_url', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/hijinxco' },
  { key: 'social_threads_url', label: 'Threads', placeholder: 'https://threads.net/@hijinxco' },
  { key: 'social_snapchat_url', label: 'Snapchat', placeholder: 'https://snapchat.com/add/hijinxco' },
];

const SECTIONS = [
  { key: 'hero_bg', label: 'Homepage Hero Background' },
  { key: 'apparel_bg', label: 'Apparel Section Background' },
];

export default function ManageHomepage() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState({});
  const [activeTab, setActiveTab] = useState('overview');

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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="editorial">Editorial</TabsTrigger>
            <TabsTrigger value="data">Images</TabsTrigger>
            <TabsTrigger value="socials">Socials</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Sections Configured</p>
              <p className="text-2xl font-bold text-gray-900">{settings.length}</p>
            </div>
            <p className="text-sm text-gray-600">Manage homepage background images and visuals across {SECTIONS.length} sections.</p>
          </TabsContent>

          <TabsContent value="editorial" className="space-y-6">
            <HomepageEditorialSettings />
          </TabsContent>

          <TabsContent value="data" className="space-y-8">
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
          </TabsContent>

          <TabsContent value="socials" className="space-y-4">
            <SocialsEditor settings={settings} queryClient={queryClient} />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityTab entityName="HomepageSettings" />
          </TabsContent>
        </Tabs>
      </ManagementShell>
    </ManagementLayout>
  );
}

function SocialsEditor({ settings, queryClient }) {
  const singleton = settings.find(s => s.active) || {};
  const [values, setValues] = useState(() => {
    const init = {};
    SOCIAL_FIELDS.forEach(f => { init[f.key] = singleton[f.key] || ''; });
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const data = {};
    SOCIAL_FIELDS.forEach(f => { data[f.key] = values[f.key] || ''; });
    if (singleton.id) {
      await base44.entities.HomepageSettings.update(singleton.id, data);
    } else {
      await base44.entities.HomepageSettings.create({ ...data, active: true });
    }
    queryClient.invalidateQueries({ queryKey: ['homepageSettings'] });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold">Platform Social Links</h2>
        <p className="text-sm text-gray-500 mt-1">These will appear in the site footer for all visitors.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
          <div key={key} className="space-y-1">
            <Label>{label}</Label>
            <Input
              value={values[key]}
              onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))}
              placeholder={placeholder}
            />
          </div>
        ))}
      </div>
      <Button onClick={handleSave} disabled={saving} className="bg-[#232323] text-white">
        {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        {saved ? 'Saved!' : 'Save Social Links'}
      </Button>
    </div>
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