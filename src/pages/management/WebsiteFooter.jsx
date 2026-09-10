import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import AdminGuard from '@/components/management/AdminGuard';
import PublishBar from '@/components/management/shared/PublishBar';
import UnsavedChangesGuard from '@/components/management/shared/UnsavedChangesGuard';
import FooterGroupEditor from '@/components/management/footer/FooterGroupEditor';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DestinationEditor from '@/components/management/shared/DestinationEditor';
import { ChevronDown, Plus, Trash2, ChevronUp, Info, X } from 'lucide-react';
import { toast } from 'sonner';

export default function WebsiteFooter() {
  return (
    <ManagementLayout currentPage="management/website/footer">
      <AdminGuard>
        <FooterEditor />
      </AdminGuard>
    </ManagementLayout>
  );
}

function FooterEditor() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(null);
  const [savedDraft, setSavedDraft] = useState(null);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [publishedAt, setPublishedAt] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['footerSettings'],
    queryFn: () => base44.functions.invoke('getFooterSettings'),
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
    mutationFn: (payload) => base44.functions.invoke('saveFooterDraft', payload),
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
    mutationFn: () => base44.functions.invoke('publishFooter'),
    onSuccess: (res) => {
      const d = res?.data;
      if (d?.ok) {
        setHasUnpublishedChanges(false);
        setPublishedAt(d.published_at);
        toast.success('Footer configuration published');
        queryClient.invalidateQueries({ queryKey: ['footerSettings'] });
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
      saveMutation.mutate({ draft }, { onSuccess: () => window.open('/Home1?preview=footer-draft', '_blank') });
    } else {
      window.open('/Home1?preview=footer-draft', '_blank');
    }
  };

  // Group operations
  const moveGroup = (idx, dir) => {
    const groups = [...draft.groups];
    const target = idx + dir;
    if (target < 0 || target >= groups.length) return;
    [groups[idx], groups[target]] = [groups[target], groups[idx]];
    groups.forEach((g, i) => (g.sort_order = i));
    set('groups', groups);
  };
  const updateGroup = (idx, group) => {
    const groups = [...draft.groups];
    groups[idx] = group;
    set('groups', groups);
  };

  if (isLoading || draft === null) {
    return (
      <ManagementShell title="Footer" subtitle="Footer presentation configuration">
        <div className="py-12 text-center">
          <div className="w-6 h-6 border-2 border-divider border-t-motion rounded-full animate-spin mx-auto" />
          <p className="text-xs text-foreground-quiet mt-3">Loading configuration...</p>
        </div>
      </ManagementShell>
    );
  }

  return (
    <ManagementShell title="Footer" subtitle="Footer presentation configuration — draft, preview, publish">
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
        <p>Controls the global site footer. Save drafts, preview in a new tab, and publish to make changes visible. Hashtag Library is in the Company group.</p>
      </div>

      <div className="space-y-3">
        {/* Navigation Groups */}
        <CollapsibleSection title="Navigation Groups" defaultOpen>
          <div className="space-y-2">
            {draft.groups.map((g, idx) => (
              <FooterGroupEditor
                key={g.key}
                group={g}
                onChange={(group) => updateGroup(idx, group)}
                onMoveUp={() => moveGroup(idx, -1)}
                onMoveDown={() => moveGroup(idx, 1)}
                canMoveUp={idx > 0}
                canMoveDown={idx < draft.groups.length - 1}
              />
            ))}
          </div>
        </CollapsibleSection>

        {/* Legal */}
        <CollapsibleSection title="Legal / Utility">
          <LegalEditor links={draft.legal || []} onChange={(legal) => set('legal', legal)} />
        </CollapsibleSection>

        {/* Socials */}
        <CollapsibleSection title="Socials">
          <SocialsEditor socials={draft.socials || []} onChange={(socials) => set('socials', socials)} />
        </CollapsibleSection>

        {/* Brand */}
        <CollapsibleSection title="Brand / Meta">
          <BrandEditor brand={draft.brand || {}} onChange={(brand) => set('brand', brand)} />
        </CollapsibleSection>

        {/* Display */}
        <CollapsibleSection title="Display Options">
          <DisplayEditor display={draft.display || {}} onChange={(display) => set('display', display)} />
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

function LegalEditor({ links, onChange }) {
  return (
    <SimpleLinkList links={links} onChange={onChange} label="Legal Link" />
  );
}

function SimpleLinkList({ links, onChange, label }) {
  const [editing, setEditing] = useState(null);
  const update = (idx, link) => { const l = [...links]; l[idx] = link; onChange(l); };
  const add = (link) => onChange([...links, link]);
  const remove = (idx) => onChange(links.filter((_, i) => i !== idx));
  const move = (idx, dir) => {
    const l = [...links]; const t = idx + dir;
    if (t < 0 || t >= l.length) return;
    [l[idx], l[t]] = [l[t], l[idx]]; onChange(l);
  };

  return (
    <div className="space-y-1.5">
      {links.map((link, idx) => (
        <div key={link.id || idx}>
          <div className="flex items-center gap-2 p-2 rounded-md bg-surface-interactive/50">
            <div className="flex flex-col">
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => move(idx, -1)} disabled={idx === 0}><ChevronUp className="w-3 h-3" /></Button>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => move(idx, 1)} disabled={idx === links.length - 1}><ChevronDown className="w-3 h-3" /></Button>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{link.label || 'Untitled'}</p>
            </div>
            <Switch checked={link.enabled} onCheckedChange={(val) => update(idx, { ...link, enabled: val })} />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(editing === idx ? null : idx)}>+</Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(idx)}><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>
          {editing === idx && (
            <InlineLinkEditor link={link} onSave={(l) => { update(idx, l); setEditing(null); }} onCancel={() => setEditing(null)} />
          )}
        </div>
      ))}
      {editing === 'new' && (
        <InlineLinkEditor
          link={{ id: `link_${Date.now()}`, label: '', enabled: true, sort_order: links.length, destination_type: 'internal_page', destination: { type: 'internal_page' }, reusable_link_id: '', open_in_new_tab: false }}
          onSave={(l) => { add(l); setEditing(null); }} onCancel={() => setEditing(null)}
        />
      )}
      {editing !== 'new' && (
        <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setEditing('new')}><Plus className="w-3.5 h-3.5 mr-1.5" /> Add {label}</Button>
      )}
    </div>
  );
}

function InlineLinkEditor({ link, onSave, onCancel }) {
  const [d, setD] = useState(link);
  return (
    <div className="mt-1 p-3 rounded-lg border border-motion/30 bg-surface space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold">Edit</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCancel}>×</Button>
      </div>
      <div>
        <Label className="text-xs text-foreground-quiet mb-1 block">Label</Label>
        <Input value={d.label} onChange={(e) => setD({ ...d, label: e.target.value })} className="h-8 text-xs" />
      </div>
      <DestinationEditor
        value={d.destination}
        onChange={(dest) => setD({ ...d, destination: dest, destination_type: dest.type, reusable_link_id: dest.type !== 'reusable_link' ? '' : d.reusable_link_id })}
        allowReusableLink
        reusableLinkValue={d.reusable_link_id || ''}
        onReusableLinkChange={(id) => setD({ ...d, reusable_link_id: id, destination_type: 'reusable_link' })}
      />
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" className="text-xs" onClick={onCancel}>Cancel</Button>
        <Button size="sm" className="text-xs" onClick={() => onSave(d)}>Save</Button>
      </div>
    </div>
  );
}

function SocialsEditor({ socials, onChange }) {
  const [platform, setPlatform] = useState('');
  const [url, setUrl] = useState('');
  const platforms = ['Instagram', 'X (Twitter)', 'Facebook', 'YouTube', 'TikTok', 'LinkedIn', 'Threads', 'Snapchat', 'Discord'];

  const add = () => {
    if (!platform || !url) return;
    onChange([...socials, { platform, label: platform, url, enabled: true, sort_order: socials.length }]);
    setPlatform(''); setUrl('');
  };
  const remove = (idx) => onChange(socials.filter((_, i) => i !== idx));
  const toggle = (idx) => { const s = [...socials]; s[idx] = { ...s[idx], enabled: !s[idx].enabled }; onChange(s); };

  return (
    <div className="space-y-2">
      {socials.length === 0 && <p className="text-xs text-foreground-quiet italic">No social links configured</p>}
      {socials.map((s, idx) => (
        <div key={idx} className="flex items-center gap-2 p-2 rounded-md bg-surface-interactive/50">
          <span className="text-xs font-medium flex-1">{s.platform}</span>
          <span className="text-[10px] text-foreground-quiet truncate max-w-40">{s.url}</span>
          <Switch checked={s.enabled} onCheckedChange={() => toggle(idx)} />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(idx)}><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      ))}
      <div className="flex gap-2 pt-2 border-t border-divider">
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Platform..." /></SelectTrigger>
          <SelectContent>{platforms.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
        <Input value={url} onChange={(e) => setUrl(e.target.value)} className="h-8 text-xs flex-1" placeholder="https://..." type="url" />
        <Button size="sm" className="text-xs" onClick={add} disabled={!platform || !url}><Plus className="w-3.5 h-3.5" /></Button>
      </div>
    </div>
  );
}

function BrandEditor({ brand, onChange }) {
  const b = { name: '', tagline: '', copyright_text: '', built_on_purpose: '', show_newsletter: true, newsletter_label: 'STAY UPDATED', ...brand };
  const set = (field, val) => onChange({ ...b, [field]: val });
  return (
    <div className="space-y-3">
      <Field label="Brand Name"><Input value={b.name} onChange={(e) => set('name', e.target.value)} className="h-8 text-xs" /></Field>
      <Field label="Tagline"><Input value={b.tagline} onChange={(e) => set('tagline', e.target.value)} className="h-8 text-xs" /></Field>
      <Field label="Copyright Text"><Input value={b.copyright_text} onChange={(e) => set('copyright_text', e.target.value)} className="h-8 text-xs" placeholder="© {year} ..." /></Field>
      <Field label="Built on Purpose Text"><Input value={b.built_on_purpose} onChange={(e) => set('built_on_purpose', e.target.value)} className="h-8 text-xs" /></Field>
      <Field label="Newsletter Label"><Input value={b.newsletter_label} onChange={(e) => set('newsletter_label', e.target.value)} className="h-8 text-xs" /></Field>
      <div className="flex items-center gap-2">
        <Switch checked={b.show_newsletter} onCheckedChange={(val) => set('show_newsletter', val)} />
        <span className="text-xs text-foreground-quiet">Show newsletter signup</span>
      </div>
    </div>
  );
}

function DisplayEditor({ display, onChange }) {
  const d = { show_report_issue: true, report_label: 'Report an Issue', ...display };
  const set = (field, val) => onChange({ ...d, [field]: val });
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Switch checked={d.show_report_issue} onCheckedChange={(val) => set('show_report_issue', val)} />
        <span className="text-xs text-foreground-quiet">Show "Report an Issue" button</span>
      </div>
      <Field label="Report Label"><Input value={d.report_label} onChange={(e) => set('report_label', e.target.value)} className="h-8 text-xs" /></Field>
    </div>
  );
}

function Field({ label, children }) {
  return <div><Label className="text-xs text-foreground-quiet mb-1 block">{label}</Label>{children}</div>;
}