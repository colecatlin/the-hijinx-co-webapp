import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import AdminGuard from '@/components/management/AdminGuard';
import PublishBar from '@/components/management/shared/PublishBar';
import UnsavedChangesGuard from '@/components/management/shared/UnsavedChangesGuard';
import HeroSection from '@/components/management/home1/sections/HeroSection';
import NextUpSection from '@/components/management/home1/sections/NextUpSection';
import OneBrandSection from '@/components/management/home1/sections/OneBrandSection';
import EcosystemSection from '@/components/management/home1/sections/EcosystemSection';
import WhatsHappeningSection from '@/components/management/home1/sections/WhatsHappeningSection';
import FromTheOutletSection from '@/components/management/home1/sections/FromTheOutletSection';
import FeaturedApparelSection from '@/components/management/home1/sections/FeaturedApparelSection';
import ClosingCtaSection from '@/components/management/home1/sections/ClosingCtaSection';
import { toast } from 'sonner';
import { Info } from 'lucide-react';

export default function WebsiteHome() {
  return (
    <ManagementLayout currentPage="management/website/home">
      <AdminGuard>
        <HomeEditor />
      </AdminGuard>
    </ManagementLayout>
  );
}

function HomeEditor() {
  const [draft, setDraft] = useState(null);
  const [savedDraft, setSavedDraft] = useState(null);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [publishedAt, setPublishedAt] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['home1Settings'],
    queryFn: () => base44.functions.invoke('getHome1Settings'),
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (data?.data && draft === null) {
      const d = data.data.draft;
      setDraft(d);
      setSavedDraft(JSON.parse(JSON.stringify(d)));
      setHasUnpublishedChanges(data.data.has_unpublished_changes ?? false);
      setPublishedAt(data.data.published_at || null);
      setUpdatedAt(data.data.updated_at || null);
    }
  }, [data, draft]);

  const isDirty = useMemo(
    () => draft !== null && savedDraft !== null && JSON.stringify(draft) !== JSON.stringify(savedDraft),
    [draft, savedDraft]
  );

  const saveMutation = useMutation({
    mutationFn: (payload) => base44.functions.invoke('saveHome1Draft', payload),
    onSuccess: (res) => {
      const d = res?.data;
      if (d?.ok) {
        setSavedDraft(JSON.parse(JSON.stringify(draft)));
        setHasUnpublishedChanges(d.has_unpublished_changes);
        setUpdatedAt(d.updated_at);
        toast.success('Draft saved');
        if (d.warnings?.length) d.warnings.forEach((w) => toast.warning(w));
      } else {
        toast.error(d?.error || 'Save failed');
      }
    },
    onError: (err) => toast.error('Save failed: ' + (err.message || 'Unknown error')),
  });

  const publishMutation = useMutation({
    mutationFn: () => base44.functions.invoke('publishHome1'),
    onSuccess: (res) => {
      const d = res?.data;
      if (d?.ok) {
        setHasUnpublishedChanges(false);
        setPublishedAt(d.published_at);
        toast.success('Home configuration published');
        if (d.warnings?.length) d.warnings.forEach((w) => toast.warning(w));
      } else {
        toast.error(d?.error || 'Publish failed');
      }
    },
    onError: (err) => toast.error('Publish failed: ' + (err.message || 'Unknown error')),
  });

  const setSection = (key, sectionConfig) => {
    setDraft((prev) => ({ ...prev, [key]: sectionConfig }));
  };

  const handleSave = () => saveMutation.mutate({ draft });
  const handlePublish = () => publishMutation.mutate();
  const handlePreview = () => {
    toast.info('Preview will become available when Home is connected in Phase 2B.', { duration: 5000 });
  };

  if (isLoading || draft === null) {
    return (
      <ManagementShell title="Home" subtitle="Homepage presentation configuration">
        <div className="py-12 text-center">
          <div className="w-6 h-6 border-2 border-divider border-t-motion rounded-full animate-spin mx-auto" />
          <p className="text-xs text-foreground-quiet mt-3">Loading configuration...</p>
        </div>
      </ManagementShell>
    );
  }

  return (
    <ManagementShell title="Home" subtitle="Homepage presentation configuration — draft, preview, publish">
      <UnsavedChangesGuard isDirty={isDirty} />

      <PublishBar
        isDirty={isDirty}
        isSaving={saveMutation.isPending}
        hasUnpublishedChanges={hasUnpublishedChanges}
        updatedAt={updatedAt}
        publishedAt={publishedAt}
        onSave={handleSave}
        onPublish={handlePublish}
        onPreview={handlePreview}
        isPublishing={publishMutation.isPending}
      />

      {/* Preview notice */}
      <div className="flex items-start gap-2 p-3 mb-4 rounded-lg border border-motion/20 bg-motion/5 text-xs text-foreground-secondary">
        <Info className="w-4 h-4 text-motion mt-0.5 shrink-0" />
        <p>
          This editor stores presentation configuration safely. The public homepage (Home1) is not yet
          connected to these settings — it will be wired in Phase 2B. Draft and published states are separate;
          publishing does not change the visible site until Phase 2B.
        </p>
      </div>

      {/* Sections in homepage order */}
      <div className="space-y-3">
        <HeroSection value={draft.hero} onChange={(val) => setSection('hero', val)} />
        <NextUpSection value={draft.next_up} onChange={(val) => setSection('next_up', val)} />
        <OneBrandSection value={draft.one_brand} onChange={(val) => setSection('one_brand', val)} />
        <EcosystemSection value={draft.ecosystem} onChange={(val) => setSection('ecosystem', val)} />
        <WhatsHappeningSection value={draft.whats_happening} onChange={(val) => setSection('whats_happening', val)} />
        <FromTheOutletSection value={draft.from_the_outlet} onChange={(val) => setSection('from_the_outlet', val)} />
        <FeaturedApparelSection value={draft.featured_apparel} onChange={(val) => setSection('featured_apparel', val)} />
        <ClosingCtaSection value={draft.closing_cta} onChange={(val) => setSection('closing_cta', val)} />
      </div>
    </ManagementShell>
  );
}