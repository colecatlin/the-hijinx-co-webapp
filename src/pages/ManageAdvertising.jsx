import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Pencil, Trash2, Edit2, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import PageShell from '@/components/shared/PageShell';
import AdvertisementForm from '@/components/management/AdvertisementForm';

const AD_TYPES = {
  homepage: 'Homepage Feature',
  outlet: 'Outlet Sponsorship',
  newsletter: 'Newsletter Placement'
};

export default function ManageAdvertising() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [showAdForm, setShowAdForm] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const queryClient = useQueryClient();

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['contactMessages'],
    queryFn: async () => {
      const allMessages = await base44.entities.ContactMessage.list('-created_date');
      return allMessages.filter(msg => msg.subject === 'Advertising Inquiry');
    }
  });

  const { data: ads = [], isLoading: adsLoading } = useQuery({
    queryKey: ['advertisements'],
    queryFn: () => base44.entities.Advertisement.list('order'),
    initialData: [],
  });

  const deleteAdMutation = useMutation({
    mutationFn: (id) => base44.entities.Advertisement.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advertisements'] });
      setDeleteTarget(null);
    },
  });

  const updateAdOrderMutation = useMutation({
    mutationFn: ({ id, order }) => base44.entities.Advertisement.update(id, { order }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advertisements'] });
    },
  });

  const handleMoveAd = (ad, direction) => {
    const currentIndex = filteredAds.findIndex(a => a.id === ad.id);
    if (direction === 'up' && currentIndex > 0) {
      const above = filteredAds[currentIndex - 1];
      const tempOrder = ad.order;
      updateAdOrderMutation.mutate({ id: ad.id, order: above.order });
      updateAdOrderMutation.mutate({ id: above.id, order: tempOrder });
    } else if (direction === 'down' && currentIndex < filteredAds.length - 1) {
      const below = filteredAds[currentIndex + 1];
      const tempOrder = ad.order;
      updateAdOrderMutation.mutate({ id: ad.id, order: below.order });
      updateAdOrderMutation.mutate({ id: below.id, order: tempOrder });
    }
  };

  const deleteMessageMutation = useMutation({
    mutationFn: (id) => base44.entities.ContactMessage.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contactMessages'] });
    },
  });

  const updateMessageMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.ContactMessage.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contactMessages'] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      await Promise.all(ids.map(id => base44.entities.ContactMessage.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contactMessages'] });
      setSelectedMessages([]);
    },
  });

  const filteredMessages = messages.filter(msg =>
    msg.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.message?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAll = (checked) => {
    setSelectedMessages(checked ? filteredMessages.map(m => m.id) : []);
  };

  const handleSelectMessage = (id, checked) => {
    if (checked) {
      setSelectedMessages([...selectedMessages, id]);
    } else {
      setSelectedMessages(selectedMessages.filter(mid => mid !== id));
    }
  };

  const handleBulkDelete = () => {
    if (confirm(`Delete ${selectedMessages.length} inquiries?`)) {
      bulkDeleteMutation.mutate(selectedMessages);
    }
  };

  const handleDelete = (id) => {
    if (confirm('Delete this inquiry?')) {
      deleteMessageMutation.mutate(id);
    }
  };

  const handleMarkAs = (id, status) => {
    updateMessageMutation.mutate({ id, status });
  };

  const handleEditAd = (ad) => {
    setEditingAd(ad);
    setShowAdForm(true);
  };

  const handleAdFormSuccess = () => {
    setShowAdForm(false);
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
    <PageShell className="bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Manage Advertising</h1>
            <p className="text-gray-600 mt-1">View and manage advertising inquiries</p>
          </div>
        </div>

        <Tabs defaultValue="ads" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="inquiries">Advertising Inquiries</TabsTrigger>
            <TabsTrigger value="ads">Active Advertisements</TabsTrigger>
          </TabsList>

          <TabsContent value="inquiries" className="space-y-6">
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, or message..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {selectedMessages.length > 0 && (
                <Button
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete {selectedMessages.length}
                </Button>
              )}
            </div>

            {messagesLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <p className="text-gray-500">No advertising inquiries yet</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="w-12 px-4 py-3">
                        <Checkbox
                          checked={selectedMessages.length === filteredMessages.length && filteredMessages.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Name</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Email</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Ad Type</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Message</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Status</th>
                      <th className="w-32 px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMessages.map((msg) => (
                      <tr key={msg.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selectedMessages.includes(msg.id)}
                            onCheckedChange={(checked) => handleSelectMessage(msg.id, checked)}
                          />
                        </td>
                        <td className="px-4 py-3 font-medium">{msg.name}</td>
                        <td className="px-4 py-3 text-gray-600 text-sm">{msg.email}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                            {AD_TYPES[msg.ad_type] || 'General'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{msg.message}</td>
                        <td className="px-4 py-3">
                          <select
                            value={msg.status}
                            onChange={(e) => handleMarkAs(msg.id, e.target.value)}
                            className={`text-xs px-2 py-1 rounded font-medium border-0 cursor-pointer ${
                              msg.status === 'new' ? 'bg-yellow-100 text-yellow-800' :
                              msg.status === 'read' ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'
                            }`}
                          >
                            <option value="new">New</option>
                            <option value="read">Read</option>
                            <option value="replied">Replied</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(msg.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="ads" className="space-y-6">
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search advertisements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={() => {
                  setEditingAd(null);
                  setShowAdForm(true);
                }}
                className="bg-[#232323] hover:bg-[#1A3249]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Ad
              </Button>
            </div>

            {showAdForm && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">
                  {editingAd ? 'Edit Advertisement' : 'Create New Advertisement'}
                </h3>
                <AdvertisementForm
                  advertisement={editingAd}
                  onSuccess={handleAdFormSuccess}
                  onCancel={() => {
                    setShowAdForm(false);
                    setEditingAd(null);
                  }}
                />
              </div>
            )}

            {adsLoading ? (
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
                              onClick={() => handleMoveAd(ad, 'up')}
                              disabled={filteredAds[0]?.id === ad.id}
                              title="Move up"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMoveAd(ad, 'down')}
                              disabled={filteredAds[filteredAds.length - 1]?.id === ad.id}
                              title="Move down"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditAd(ad)}
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
          </TabsContent>
        </Tabs>

        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogTitle>Delete Advertisement?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.title}". This action cannot be undone.
            </AlertDialogDescription>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteAdMutation.mutate(deleteTarget.id)}
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