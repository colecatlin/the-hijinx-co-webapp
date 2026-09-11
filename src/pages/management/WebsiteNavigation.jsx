import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import AdminGuard from '@/components/management/AdminGuard';
import PublishBar from '@/components/management/shared/PublishBar';
import UnsavedChangesGuard from '@/components/management/shared/UnsavedChangesGuard';
import NavigationDesktopEditor from '@/components/management/navigation/NavigationDesktopEditor';
import NavigationMobileEditor from '@/components/management/navigation/NavigationMobileEditor';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function WebsiteNavigation() {
  return (
    <ManagementLayout currentPage="management/website/navigation">
      <AdminGuard>
        <NavigationEditor />
      </AdminGuard>
    </ManagementLayout>
  );
}

function NavigationEditor() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(null);
  const [savedDraft, setSavedDraft] = useState(null);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [publishedAt, setPublishedAt] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['navigationSettings'],
    queryFn: () => base44.functions.invoke('getNavigationSettings'),
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
    mutationFn: (payload) => base44.functions.invoke('saveNavigationDraft', payload),
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
    mutationFn: () => base44.functions.invoke('publishNavigation'),
    onSuccess: (res) => {
      const d = res?.data;
      if (d?.ok) {
        setHasUnpublishedChanges(false);
        setPublishedAt(d.published_at);
        toast.success('Navigation configuration published');
        queryClient.invalidateQueries({ queryKey: ['navigationSettings'] });
        if (d.warnings?.length) d.warnings.forEach((w) => toast.warning(w));
      } else {
        toast.error(d?.error || 'Publish failed');
      }
    },
    onError: (err) => toast.error('Publish failed: ' + (err.message || 'Unknown error')),
  });

  const set = (key, val) => setDraft((prev) => ({ ...prev, [key]: val }));

  const handleSave = () => saveMutation.mutate({ draft });
  const handlePublish = () => publishMutation.mutate();
  const handlePreview = () => {
    if (isDirty) {
      saveMutation.mutate({ draft }, { onSuccess: () => window.open('/?preview=navigation-draft', '_blank') });
    } else {
      window.open('/?preview=navigation-draft', '_blank');
    }
  };

  if (isLoading || draft === null) {
    return (
      <ManagementShell title="Navigation" subtitle="Public site navigation configuration">
        <div className="py-12 text-center">
          <div className="w-6 h-6 border-2 border-divider border-t-motion rounded-full animate-spin mx-auto" />
          <p className="text-xs text-foreground-quiet mt-3">Loading configuration...</p>
        </div>
      </ManagementShell>
    );
  }

  return (
    <ManagementShell title="Navigation" subtitle="Public site navigation — draft, preview, publish">
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

      <div className="flex items-start gap-2 p-3 mb-4 rounded-lg border border-motion/20 bg-motion/5 text-xs text-foreground-secondary">
        <Info className="w-4 h-4 text-motion mt-0.5 shrink-0" />
        <p>
          Controls the public site navigation — desktop header, mobile drawer, and mobile bottom nav.
          The Home item is protected and always resolves to <code className="text-motion">/</code>.
          Save drafts, preview in a new tab, and publish to make changes visible.
        </p>
      </div>

      <div className="space-y-3">
        {/* Desktop & Drawer Navigation */}
        <CollapsibleSection title="Desktop & Drawer Navigation" defaultOpen>
          <NavigationDesktopEditor
            items={draft.desktop_primary?.items || []}
            onChange={(items) => set('desktop_primary', { ...(draft.desktop_primary || {}), items })}
          />
        </CollapsibleSection>

        {/* Mobile Bottom Navigation */}
        <CollapsibleSection title="Mobile Bottom Navigation">
          <NavigationMobileEditor
            items={draft.mobile_bottom?.items || []}
            onChange={(items) => set('mobile_bottom', { ...(draft.mobile_bottom || {}), items })}
          />
        </CollapsibleSection>
      </div>
    </ManagementShell>
  );
}

function CollapsibleSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border border-divider bg-surface-elevated">
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-surface-interactive/50 transition-colors">
        <span className="text-sm font-semibold">{title}</span>
        <ChevronDown className={`w-4 h-4 text-foreground-quiet transition-transform ${open ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="p-3 pt-0">{children}</CollapsibleContent>
    </Collapsible>
  );
}