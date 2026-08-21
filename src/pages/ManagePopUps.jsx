import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, Trash2, Plus } from 'lucide-react';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import PopupForm from '@/components/management/PopupForm';

export default function ManagePopUps() {
  const queryClient = useQueryClient();
  const [editingPopup, setEditingPopup] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const { data: popups = [], isLoading } = useQuery({
    queryKey: ['sitePopups'],
    queryFn: () => base44.entities.SitePopup.list('-priority'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SitePopup.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sitePopups'] });
      queryClient.invalidateQueries({ queryKey: ['activeSitePopups'] });
    },
  });

  const handleEdit = (popup) => {
    setEditingPopup(popup);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingPopup(null);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingPopup(null);
  };

  const statusBadge = (status) => {
    const styles = {
      published: 'bg-success/15 text-success',
      draft: 'bg-foreground-quiet/15 text-foreground-quiet',
      archived: 'bg-foreground-quiet/10 text-foreground-quiet',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || styles.draft}`}>
        {status}
      </span>
    );
  };

  return (
    <ManagementLayout currentPage="ManagePopUps">
      <ManagementShell
        title="Pop-Ups"
        subtitle="Manage landing pop-ups shown to visitors on the Home page"
        actions={!showForm ? <Button onClick={handleAdd}><Plus className="w-4 h-4 mr-2" />Add Pop-Up</Button> : undefined}
      >
        {showForm && (
          <PopupForm popup={editingPopup} onCancel={handleCancel} />
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : popups.length === 0 ? (
          <div className="text-center py-12 bg-surface rounded-lg border border-divider">
            <p className="text-foreground-quiet">No pop-ups yet. Create your first one!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {popups.map((popup) => (
              <div
                key={popup.id}
                className="bg-surface-elevated border border-divider rounded-lg p-4 flex items-start justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    {statusBadge(popup.status)}
                    <span className="text-xs text-foreground-quiet">Priority: {popup.priority}</span>
                    {popup.subscribe_enabled && (
                      <span className="px-2 py-0.5 rounded text-xs bg-motion/15 text-motion">Subscribe</span>
                    )}
                    {popup.cta_text && (
                      <span className="px-2 py-0.5 rounded text-xs bg-motion/15 text-motion">CTA</span>
                    )}
                  </div>
                  <p className="text-foreground font-medium mb-1">{popup.title}</p>
                  {popup.body && (
                    <p className="text-sm text-foreground-secondary line-clamp-2">{popup.body}</p>
                  )}
                  {(popup.start_date || popup.end_date) && (
                    <p className="text-xs text-foreground-quiet mt-1">
                      {popup.start_date ? `Starts: ${new Date(popup.start_date).toLocaleDateString()}` : ''}
                      {popup.start_date && popup.end_date ? ' · ' : ''}
                      {popup.end_date ? `Ends: ${new Date(popup.end_date).toLocaleDateString()}` : ''}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 ml-4 shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleEdit(popup)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (confirm('Delete this pop-up?')) {
                        deleteMutation.mutate(popup.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ManagementShell>
    </ManagementLayout>
  );
}