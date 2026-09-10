import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, Eye, UploadCloud, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

/**
 * PublishBar — save/preview/publish bar for Website configuration.
 *
 * Communicates state clearly:
 *   SAVED · UNSAVED CHANGES · UNPUBLISHED CHANGES · PUBLISHED
 */
export default function PublishBar({
  isDirty,           // unsaved form changes (draft not saved)
  isSaving,
  hasUnpublishedChanges, // saved draft differs from published
  updatedAt,
  publishedAt,
  onSave,
  onPublish,
  onPreview,
  isPublishing,
}) {
  const fmt = (ts) => {
    if (!ts) return null;
    try {
      return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    } catch {
      return null;
    }
  };

  return (
    <div className="sticky top-0 z-20 -mx-6 px-6 py-3 mb-4 bg-surface-elevated border-b border-divider flex items-center justify-between gap-4 flex-wrap">
      {/* Status indicators */}
      <div className="flex items-center gap-3 flex-wrap text-xs">
        {isDirty ? (
          <span className="inline-flex items-center gap-1 text-warning font-medium">
            <AlertCircle className="w-3.5 h-3.5" /> Unsaved changes
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-success font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> Saved
          </span>
        )}
        <span className="text-divider">|</span>
        {hasUnpublishedChanges ? (
          <span className="inline-flex items-center gap-1 text-warning font-medium">
            <AlertCircle className="w-3.5 h-3.5" /> Unpublished changes
          </span>
        ) : publishedAt ? (
          <span className="inline-flex items-center gap-1 text-success font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> Published
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-foreground-quiet font-medium">
            <Clock className="w-3.5 h-3.5" /> Never published
          </span>
        )}
        {updatedAt && !isDirty && (
          <span className="text-foreground-quiet">· draft saved {fmt(updatedAt)}</span>
        )}
        {publishedAt && !hasUnpublishedChanges && (
          <span className="text-foreground-quiet">· published {fmt(publishedAt)}</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onPreview}>
          <Eye className="w-3.5 h-3.5 mr-1.5" /> Preview
        </Button>
        <Button variant="outline" size="sm" onClick={onSave} disabled={!isDirty || isSaving}>
          <Save className="w-3.5 h-3.5 mr-1.5" />
          {isSaving ? 'Saving...' : 'Save Draft'}
        </Button>
        <Button size="sm" onClick={onPublish} disabled={isDirty || isPublishing || !hasUnpublishedChanges}>
          <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
          {isPublishing ? 'Publishing...' : 'Publish'}
        </Button>
      </div>
    </div>
  );
}