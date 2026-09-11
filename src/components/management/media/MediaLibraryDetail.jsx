import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Copy, Archive, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { formatFileSize } from '@/lib/mediaLibraryUtils';
import { useInvalidateMediaLibrary } from '@/hooks/useMediaLibrary';

/**
 * MediaLibraryDetail — side drawer showing asset details with
 * editable metadata (title, alt_text, description, tags).
 * URL, mime_type, file_size, dimensions are read-only.
 */
export default function MediaLibraryDetail({ asset, open, onOpenChange }) {
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const invalidate = useInvalidateMediaLibrary();

  if (!asset) return null;

  const startEdit = () =>
    setEditing({
      title: asset.title || '',
      alt_text: asset.alt_text || '',
      description: asset.description || '',
      tags: (asset.tags || []).join(', '),
      category: asset.category || '',
    });

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.LibraryAsset.update(asset.id, {
        title: editing.title,
        alt_text: editing.alt_text,
        description: editing.description,
        tags: editing.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        category: editing.category,
      });
      invalidate();
      toast.success('Metadata saved');
      setEditing(null);
    } catch (err) {
      toast.error('Save failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    setArchiving(true);
    try {
      await base44.entities.LibraryAsset.update(asset.id, { is_archived: true });
      invalidate();
      toast.success('Asset archived');
      onOpenChange?.(false);
    } catch (err) {
      toast.error('Archive failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setArchiving(false);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(asset.url);
    toast.success('URL copied');
  };

  const isEditing = !!editing;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md overflow-y-auto"
        style={{ background: 'hsl(var(--surface))', borderLeft: '1px solid hsl(var(--divider))' }}
      >
        <SheetHeader>
          <SheetTitle style={{ color: 'hsl(var(--foreground))' }}>
            {isEditing ? 'Edit Asset' : 'Asset Details'}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-8">
          {/* Preview */}
          <div className="rounded-lg overflow-hidden border border-divider bg-surface-interactive">
            {asset.asset_type === 'image' ? (
              <img src={asset.url} alt={asset.alt_text || ''} className="w-full max-h-64 object-contain" />
            ) : (
              <div className="h-40 flex items-center justify-center text-foreground-quiet text-sm">
                {asset.asset_type} preview not available
              </div>
            )}
          </div>

          {/* Read-only metadata */}
          {!isEditing && (
            <div className="space-y-2">
              <DetailRow label="Filename" value={asset.filename || '—'} />
              <div>
                <Label className="text-[10px] uppercase tracking-wider" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                  URL
                </Label>
                <div className="flex items-center gap-2 mt-0.5">
                  <Input
                    readOnly
                    value={asset.url || ''}
                    className="h-8 text-xs font-mono"
                    style={{ color: 'hsl(var(--foreground-quiet))' }}
                  />
                  <Button size="icon" variant="ghost" onClick={copyUrl} className="h-8 w-8 shrink-0">
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <DetailRow label="Type" value={asset.asset_type} />
              <DetailRow label="MIME" value={asset.mime_type || '—'} />
              <DetailRow
                label="Dimensions"
                value={asset.width && asset.height ? `${asset.width}×${asset.height}` : '—'}
              />
              <DetailRow label="File size" value={formatFileSize(asset.file_size)} />
              <DetailRow
                label="Created"
                value={asset.created_date ? new Date(asset.created_date).toLocaleDateString() : '—'}
              />
              {asset.alt_text && <DetailRow label="Alt text" value={asset.alt_text} />}
              {asset.description && <DetailRow label="Description" value={asset.description} />}
              {asset.tags?.length > 0 && <DetailRow label="Tags" value={asset.tags.join(', ')} />}
            </div>
          )}

          {/* Editable metadata */}
          {isEditing && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs mb-1 block">Title</Label>
                <Input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Alt text (default)</Label>
                <Input
                  value={editing.alt_text}
                  onChange={(e) => setEditing({ ...editing, alt_text: e.target.value })}
                  className="h-8 text-xs"
                  placeholder="Describe the image for accessibility..."
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Description</Label>
                <Textarea
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="text-xs"
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Tags (comma-separated)</Label>
                <Input
                  value={editing.tags}
                  onChange={(e) => setEditing({ ...editing, tags: e.target.value })}
                  className="h-8 text-xs"
                  placeholder="crandon, racing, paddock"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Category</Label>
                <Input
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            {!isEditing ? (
              <>
                <Button size="sm" onClick={startEdit}>
                  Edit Metadata
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href={asset.url} target="_blank" rel="noreferrer">
                    <ExternalLink className="w-3.5 h-3.5" /> Open
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleArchive}
                  disabled={archiving}
                  className="text-destructive hover:text-destructive"
                >
                  {archiving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
                  Archive
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between gap-2 text-xs">
      <span className="font-semibold shrink-0" style={{ color: 'hsl(var(--foreground-quiet))' }}>
        {label}
      </span>
      <span className="text-right break-all" style={{ color: 'hsl(var(--foreground-secondary))' }}>
        {value}
      </span>
    </div>
  );
}