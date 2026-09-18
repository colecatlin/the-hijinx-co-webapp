import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Search, Globe, Share2, FileText, Activity, Eye } from 'lucide-react';
import MediaSelector from '@/components/management/shared/MediaSelector';
import PublishBar from '@/components/management/shared/PublishBar';
import UnsavedChangesGuard from '@/components/management/shared/UnsavedChangesGuard';
import StaticPageSeoFields from '@/components/management/seo/StaticPageSeoFields';
import SeoHealth from '@/components/management/seo/SeoHealth';
import SeoPreview from '@/components/management/seo/SeoPreview';

const STATIC_PAGES = [
  { key: 'home', label: 'Home' },
  { key: 'outlet', label: 'The Outlet' },
  { key: 'index46', label: 'INDEX46' },
  { key: 'apparel', label: 'Apparel' },
  { key: 'marketplace', label: 'Marketplace' },
  { key: 'directory', label: 'Directory' },
];

export default function SeoEditor() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(null);
  const [savedDraft, setSavedDraft] = useState(null);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [publishedAt, setPublishedAt] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [activeTab, setActiveTab] = useState('site');
  const [previewPageKey, setPreviewPageKey] = useState('home');

  const { data, isLoading } = useQuery({
    queryKey: ['seoSettings'],
    queryFn: () => base44.functions.invoke('getSeoSettings'),
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

  // ── Mutations ──────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (payload) => base44.functions.invoke('saveSeoDraft', payload),
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
    mutationFn: () => base44.functions.invoke('publishSeo'),
    onSuccess: (res) => {
      const d = res?.data;
      if (d?.ok) {
        setHasUnpublishedChanges(false);
        setPublishedAt(d.published_at);
        toast.success('SEO configuration published');
        queryClient.invalidateQueries({ queryKey: ['seoSettings'] });
      } else {
        toast.error(d?.error || 'Publish failed');
      }
    },
    onError: (err) => toast.error('Publish failed: ' + (err.message || 'Unknown error')),
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  const updateSite = (field, value) =>
    setDraft((prev) => ({ ...prev, site: { ...prev.site, [field]: value } }));

  const updateDefaults = (field, value) =>
    setDraft((prev) => ({ ...prev, defaults: { ...prev.defaults, [field]: value } }));

  const updatePage = (pageKey, pageData) =>
    setDraft((prev) => ({ ...prev, pages: { ...prev.pages, [pageKey]: pageData } }));

  const handleSave = () => saveMutation.mutate({ draft });
  const handlePublish = () => publishMutation.mutate();
  const handlePreview = () => window.open('/?preview=seo-draft', '_blank');

  if (isLoading || draft === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-divider border-t-motion rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { key: 'site', label: 'Site Defaults', icon: Globe },
    { key: 'pages', label: 'Pages', icon: FileText },
    { key: 'social', label: 'Social Sharing', icon: Share2 },
    { key: 'health', label: 'SEO Health', icon: Activity },
    { key: 'preview', label: 'Preview', icon: Eye },
  ];

  return (
    <div className="space-y-4">
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

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-divider overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-motion text-motion'
                  : 'border-transparent text-foreground-quiet hover:text-foreground'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Site Defaults ─────────────────────────────────────────────────── */}
      {activeTab === 'site' && (
        <div className="space-y-4 max-w-2xl">
          <div>
            <Label className="text-sm font-medium mb-1 block">Site Name</Label>
            <Input
              value={draft.site?.name || ''}
              onChange={(e) => updateSite('name', e.target.value)}
              className="text-sm"
            />
            <p className="text-xs text-foreground-quiet mt-1">Used in og:site_name and application-name meta tags.</p>
          </div>

          <div>
            <Label className="text-sm font-medium mb-1 block">Title Suffix</Label>
            <Input
              value={draft.site?.title_suffix || ''}
              onChange={(e) => updateSite('title_suffix', e.target.value)}
              placeholder="HIJINX"
              className="text-sm"
            />
            <p className="text-xs text-foreground-quiet mt-1">Appended to page titles as "| suffix".</p>
          </div>

          <div>
            <Label className="text-sm font-medium mb-1 block">Default Description</Label>
            <Textarea
              value={draft.site?.default_description || ''}
              onChange={(e) => updateSite('default_description', e.target.value)}
              rows={3}
              className="text-sm resize-none"
            />
            <p className="text-xs text-foreground-quiet mt-1">Used when a page has no specific description.</p>
          </div>

          <div>
            <Label className="text-sm font-medium mb-1 block">Canonical Base URL</Label>
            <Input
              value={draft.site?.canonical_base_url || ''}
              onChange={(e) => updateSite('canonical_base_url', e.target.value)}
              placeholder="https://hijinx.com"
              className="text-sm font-mono"
            />
            <p className="text-xs text-foreground-quiet mt-1">Base URL for canonical links. Must be a valid URL. Query strings are never included in canonicals.</p>
          </div>

          <div>
            <Label className="text-sm font-medium mb-1 block">Twitter / X Handle</Label>
            <Input
              value={draft.site?.twitter_handle || ''}
              onChange={(e) => updateSite('twitter_handle', e.target.value)}
              placeholder="@hijinxco"
              className="text-sm"
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-1 block">Default OG Image</Label>
            <MediaSelector
              value={{ url: draft.site?.default_og_image || '', alt: '' }}
              onChange={(m) => updateSite('default_og_image', m.url)}
              showPosition={false}
            />
            <p className="text-xs text-foreground-quiet mt-1">Fallback image for Open Graph and Twitter cards.</p>
          </div>
        </div>
      )}

      {/* ── Pages ────────────────────────────────────────────────────────── */}
      {activeTab === 'pages' && (
        <div className="space-y-4">
          <p className="text-xs text-foreground-quiet">
            Static page SEO overrides. Dynamic entity pages (drivers, stories, events, etc.) derive metadata from their content automatically.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {STATIC_PAGES.map(({ key, label }) => (
              <StaticPageSeoFields
                key={key}
                pageKey={key}
                pageData={draft.pages?.[key] || {}}
                label={label}
                onChange={(data) => updatePage(key, data)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Social Sharing ───────────────────────────────────────────────── */}
      {activeTab === 'social' && (
        <div className="space-y-4 max-w-2xl">
          <div>
            <Label className="text-sm font-medium mb-1 block">Default OG Type</Label>
            <Input
              value={draft.defaults?.og_type || ''}
              onChange={(e) => updateDefaults('og_type', e.target.value)}
              placeholder="website"
              className="text-sm"
            />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1 block">Default Twitter Card Type</Label>
            <Input
              value={draft.defaults?.twitter_card || ''}
              onChange={(e) => updateDefaults('twitter_card', e.target.value)}
              placeholder="summary_large_image"
              className="text-sm"
            />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1 block">Default Robots Directive</Label>
            <Input
              value={draft.defaults?.robots || ''}
              onChange={(e) => updateDefaults('robots', e.target.value)}
              placeholder="index, follow"
              className="text-sm font-mono"
            />
            <p className="text-xs text-foreground-quiet mt-1">Applied to public pages. Management routes always use noindex regardless of this setting.</p>
          </div>
          <div className="border border-divider rounded-lg p-3 bg-surface-interactive">
            <p className="text-xs text-foreground-quiet">
              The default OG image and Twitter handle are configured in Site Defaults. Per-page OG image overrides are in the Pages tab.
            </p>
          </div>
        </div>
      )}

      {/* ── SEO Health ───────────────────────────────────────────────────── */}
      {activeTab === 'health' && (
        <div className="max-w-2xl">
          <SeoHealth config={draft} />
        </div>
      )}

      {/* ── Preview ──────────────────────────────────────────────────────── */}
      {activeTab === 'preview' && (
        <div className="space-y-4 max-w-2xl">
          <div>
            <Label className="text-sm font-medium mb-2 block">Preview for page</Label>
            <div className="flex items-center gap-1 flex-wrap">
              {STATIC_PAGES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setPreviewPageKey(key)}
                  className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                    previewPageKey === key
                      ? 'border-motion text-motion bg-motion/5'
                      : 'border-divider text-foreground-quiet hover:text-foreground hover:border-foreground-quiet'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <SeoPreview config={draft} pageKey={previewPageKey} />
        </div>
      )}
    </div>
  );
}