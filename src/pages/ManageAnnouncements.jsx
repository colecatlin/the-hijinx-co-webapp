import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, Trash2, Plus } from 'lucide-react';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import AnnouncementForm from '@/components/management/AnnouncementForm';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

export default function ManageAnnouncements() {
  const queryClient = useQueryClient();
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => base44.entities.Announcement.list('-priority'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Announcement.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });

  const handleEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingAnnouncement(null);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingAnnouncement(null);
  };

  return (
    <ManagementLayout currentPage="ManageAnnouncements">
      <ManagementShell title="Manage Announcements" subtitle="Create rotating announcements for the top of your site">
        <div className="flex justify-end mb-6">
          {!showForm && (
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Add Announcement
            </Button>
          )}
        </div>

        {showForm && (
          <AnnouncementForm
            announcement={editingAnnouncement}
            onCancel={handleCancel}
          />
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600">No announcements yet. Create your first one!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="bg-white border border-gray-200 rounded-lg p-4 flex items-start justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        announcement.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {announcement.active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-xs text-gray-500">
                      Priority: {announcement.priority}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs text-white ${
                        announcement.background_color === 'black'
                          ? 'bg-[#232323]'
                          : `bg-${announcement.background_color}-600`
                      }`}
                    >
                      {announcement.background_color}
                    </span>
                  </div>
                  <p className="text-gray-900 font-medium mb-1">{announcement.message}</p>
                  {announcement.link_url && (
                    <p className="text-sm text-gray-600">
                      Link: {announcement.link_text || 'Link'} → {announcement.link_url}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleEdit(announcement)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (confirm('Delete this announcement?')) {
                        deleteMutation.mutate(announcement.id);
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