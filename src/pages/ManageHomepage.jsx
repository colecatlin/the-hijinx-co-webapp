import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import HeroSlideManagement from '@/components/management/HeroSlideManagement';

const SOCIAL_FIELDS = [
  { key: 'social_instagram_url', label: 'Instagram', placeholder: 'https://instagram.com/hijinxco' },
  { key: 'social_x_url', label: 'X (Twitter)', placeholder: 'https://x.com/hijinxco' },
  { key: 'social_facebook_url', label: 'Facebook', placeholder: 'https://facebook.com/hijinxco' },
  { key: 'social_youtube_url', label: 'YouTube', placeholder: 'https://youtube.com/@hijinxco' },
  { key: 'social_tiktok_url', label: 'TikTok', placeholder: 'https://tiktok.com/@hijinxco' },
  { key: 'social_linkedin_url', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/hijinxco' },
  { key: 'social_threads_url', label: 'Threads', placeholder: 'https://threads.net/@hijinxco' },
  { key: 'social_snapchat_url', label: 'Snapchat', placeholder: 'https://snapchat.com/add/hijinxco' },
  { key: 'social_discord_url', label: 'Discord', placeholder: 'https://discord.gg/hijinxco' },
];

export default function ManageHomepage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('hero');

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['homepageSettings'],
    queryFn: () => base44.entities.HomepageSettings.list(),
  });

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
      <ManagementShell title="Homepage" subtitle="Manage hero slides and platform social links" maxWidth="max-w-3xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="hero">Hero</TabsTrigger>
            <TabsTrigger value="socials">Socials</TabsTrigger>
          </TabsList>

          <TabsContent value="hero" className="space-y-6">
            <HeroSlideManagement />
          </TabsContent>

          <TabsContent value="socials" className="space-y-4">
            <SocialsEditor settings={settings} queryClient={queryClient} />
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