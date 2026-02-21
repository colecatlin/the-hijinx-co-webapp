import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageShell from '@/components/shared/PageShell';
import AdvertisementForm from '@/components/management/AdvertisementForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, Edit2, Search } from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function ManageAdvertisements() {
  const [showForm, setShowForm] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const queryClient = useQueryClient();

  const { data: ads, isLoading } = useQuery({
    queryKey: ['advertisements'],
    queryFn: () => base44.entities.Advertisement.list('-updated_date'),
    initialData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Advertisement.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advertisements'] });
      setDeleteTarget(null);
    },
  });

  const handleEdit = (ad) => {
    setEditingAd(ad);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingAd(null);
  };

  const filteredAds = ads.filter(ad =>
    ad.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ad.tagline?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'archived':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Advertisements</h1>
            <p className="text-gray-500 text-sm mt-1">Create and manage advertisements</p>
          </div>
          <Button
            onClick={() => {
              setEditingAd(null);
              setShowForm(true);
            }}
            className="bg-[#232323] hover:bg-[#1A3249]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Advertisement
          </Button>
        </div>

        {showForm && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              {editingAd ? 'Edit Advertisement' : 'Create New Advertisement'}
            </h2>
            <AdvertisementForm
              advertisement={editingAd}
              onSuccess={handleFormSuccess}
              onCancel={() => {
                setShowForm(false);
                setEditingAd(null);
              }}
            />
          </div>
        )}

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search advertisements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-6 w-1/3 mb-4" />
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </Card>
            ))}
          </div>
        ) : filteredAds.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-gray-400">
              {searchQuery ? 'No advertisements found' : 'No advertisements yet. Create one to get started.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredAds.map((ad) => (
              <Card key={ad.id} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  {ad.cover_image_url && (
                    <img
                      src={ad.cover_image_url}
                      alt={ad.title}
                      className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-lg">{ad.title}</h3>
                        {ad.tagline && <p className="text-sm text-gray-500 mt-1">{ad.tagline}</p>}
                        <div className="flex items-center gap-2 mt-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(ad.status)}`}>
                            {ad.status}
                          </span>
                          {ad.start_date && (
                            <span className="text-xs text-gray-500">
                              Starts {format(new Date(ad.start_date), 'MMM d, yyyy')}
                            </span>
                          )}
                          {ad.end_date && (
                            <span className="text-xs text-gray-500">
                              Ends {format(new Date(ad.end_date), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(ad)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteTarget(ad)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogTitle>Delete Advertisement?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.title}". This action cannot be undone.
            </AlertDialogDescription>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageShell>
  );
}