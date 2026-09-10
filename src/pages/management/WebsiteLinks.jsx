import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import AdminGuard from '@/components/management/AdminGuard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Search, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import DestinationEditor from '@/components/management/shared/DestinationEditor';
import { routeLabel } from '@/components/management/shared/siteRoutes';

export default function WebsiteLinks() {
  return (
    <ManagementLayout currentPage="management/website/links">
      <AdminGuard>
        <LinksManager />
      </AdminGuard>
    </ManagementLayout>
  );
}

function LinksManager() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | link object
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: links, isLoading } = useQuery({
    queryKey: ['managedLinks'],
    queryFn: () => base44.entities.ManagedLink.list('-updated_date', 200),
    staleTime: 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ManagedLink.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['managedLinks'] }); toast.success('Link created'); setEditing(null); },
    onError: (err) => toast.error('Create failed: ' + (err.message || 'Unknown error')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ManagedLink.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['managedLinks'] }); toast.success('Link updated'); setEditing(null); },
    onError: (err) => toast.error('Update failed: ' + (err.message || 'Unknown error')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ManagedLink.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['managedLinks'] }); toast.success('Link deleted'); setDeleteTarget(null); },
    onError: (err) => toast.error('Delete failed: ' + (err.message || 'Unknown error')),
  });

  const filtered = useMemo(() => {
    if (!links) return [];
    const q = search.toLowerCase();
    if (!q) return links;
    return links.filter((l) =>
      l.title?.toLowerCase().includes(q) || l.label?.toLowerCase().includes(q) ||
      l.category?.toLowerCase().includes(q) || l.description?.toLowerCase().includes(q)
    );
  }, [links, search]);

  const destSummary = (link) => {
    if (link.destination_type === 'internal_page') return routeLabel(link.internal_route);
    if (link.destination_type === 'external') return link.external_url;
    if (link.destination_type === 'entity') return `${link.entity_type}: ${link.entity_name || link.entity_id}`;
    return 'No destination';
  };

  return (
    <ManagementShell title="Links" subtitle="Reusable link system — managed links for footer, navigation, and future surfaces">
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-quiet" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 pl-10 text-sm" placeholder="Search links by title, label, category..." />
        </div>
        <Button size="sm" onClick={() => setEditing('new')}><Plus className="w-4 h-4 mr-1.5" /> New Link</Button>
      </div>

      {isLoading && <div className="py-12 text-center"><div className="w-6 h-6 border-2 border-divider border-t-motion rounded-full animate-spin mx-auto" /></div>}

      {!isLoading && filtered.length === 0 && (
        <div className="py-12 text-center">
          <Link2 className="w-8 h-8 text-foreground-quiet mx-auto mb-2" />
          <p className="text-sm text-foreground-quiet">{search ? 'No links match your search' : 'No reusable links yet'}</p>
          {!search && <Button size="sm" className="mt-3" onClick={() => setEditing('new')}><Plus className="w-4 h-4 mr-1.5" /> Create First Link</Button>}
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="space-y-1.5">
          {filtered.map((link) => (
            <div key={link.id} className="flex items-center gap-3 p-3 rounded-lg border border-divider bg-surface hover:bg-surface-interactive/50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{link.title}</p>
                  {link.category && <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-interactive text-foreground-quiet">{link.category}</span>}
                </div>
                <p className="text-xs text-foreground-quiet truncate">{link.label} → {destSummary(link)}</p>
              </div>
              <Switch checked={link.enabled} onCheckedChange={(val) => updateMutation.mutate({ id: link.id, data: { enabled: val } })} />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(link)}><Pencil className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteTarget(link)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Create Dialog */}
      {editing && (
        <LinkEditDialog
          link={editing === 'new' ? null : editing}
          onSave={(data) => {
            if (editing === 'new') createMutation.mutate(data);
            else updateMutation.mutate({ id: editing.id, data });
          }}
          onClose={() => setEditing(null)}
          isSaving={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <Dialog open onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete "{deleteTarget.title}"?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-foreground-secondary">
              This reusable link will be permanently deleted. If it is referenced by the Footer, the Footer will gracefully hide the broken reference.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteMutation.mutate(deleteTarget.id)}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </ManagementShell>
  );
}

function LinkEditDialog({ link, onSave, onClose, isSaving }) {
  const [form, setForm] = useState(() => {
    if (link) return {
      title: link.title || '',
      label: link.label || '',
      description: link.description || '',
      destination_type: link.destination_type || 'none',
      internal_route: link.internal_route || '',
      entity_type: link.entity_type || '',
      entity_id: link.entity_id || '',
      entity_slug: link.entity_slug || '',
      entity_name: link.entity_name || '',
      external_url: link.external_url || '',
      open_in_new_tab: link.open_in_new_tab || false,
      enabled: link.enabled !== false,
      category: link.category || '',
      sort_order: link.sort_order || 0,
    };
    return {
      title: '', label: '', description: '', destination_type: 'none',
      internal_route: '', entity_type: '', entity_id: '', entity_slug: '', entity_name: '',
      external_url: '', open_in_new_tab: false, enabled: true, category: '', sort_order: 0,
    };
  });

  const set = (field, val) => setForm((prev) => ({ ...prev, [field]: val }));
  const destValue = {
    type: form.destination_type,
    internal_page: form.internal_route,
    entity_type: form.entity_type,
    entity_id: form.entity_id,
    entity_slug: form.entity_slug,
    entity_name: form.entity_name,
    external_url: form.external_url,
    open_in_new_tab: form.open_in_new_tab,
  };

  const handleSave = () => {
    if (!form.title?.trim() || !form.label?.trim()) {
      toast.error('Title and label are required');
      return;
    }
    onSave({
      ...form,
      internal_route: form.destination_type === 'internal_page' ? destValue.internal_page : '',
      entity_type: form.destination_type === 'entity' ? form.entity_type : '',
      entity_id: form.destination_type === 'entity' ? form.entity_id : '',
      entity_slug: form.destination_type === 'entity' ? form.entity_slug : '',
      entity_name: form.destination_type === 'entity' ? form.entity_name : '',
      external_url: form.destination_type === 'external' ? form.external_url : '',
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{link ? 'Edit Link' : 'New Reusable Link'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          <Field label="Title (internal name)"><Input value={form.title} onChange={(e) => set('title', e.target.value)} className="h-9 text-sm" /></Field>
          <Field label="Label (display)"><Input value={form.label} onChange={(e) => set('label', e.target.value)} className="h-9 text-sm" /></Field>
          <Field label="Description (optional)"><Input value={form.description} onChange={(e) => set('description', e.target.value)} className="h-9 text-sm" /></Field>
          <Field label="Category (optional)"><Input value={form.category} onChange={(e) => set('category', e.target.value)} className="h-9 text-sm" placeholder="e.g. Social, Utility, Campaign" /></Field>
          <DestinationEditor
            value={destValue}
            onChange={(d) => {
              set('destination_type', d.type);
              set('internal_route', d.internal_page);
              set('entity_type', d.entity_type);
              set('entity_id', d.entity_id);
              set('entity_slug', d.entity_slug);
              set('entity_name', d.entity_name);
              set('external_url', d.external_url);
              set('open_in_new_tab', d.open_in_new_tab);
            }}
          />
          <div className="flex items-center gap-2">
            <Switch checked={form.enabled} onCheckedChange={(val) => set('enabled', val)} />
            <span className="text-sm text-foreground-quiet">Enabled</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Link'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }) {
  return <div><Label className="text-xs text-foreground-quiet mb-1 block">{label}</Label>{children}</div>;
}