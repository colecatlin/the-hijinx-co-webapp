import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Pencil, Trash2, Edit2 } from 'lucide-react';
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
    queryFn: () => base44.entities.Advertisement.list('-updated_date'),
    initialData: [],
  });

  const deleteAdMutation = useMutation({
    mutationFn: (id) => base44.entities.Advertisement.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advertisements'] });
      setDeleteTarget(null);
    },
  });

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

  return (
    <PageShell className="bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Manage Advertising</h1>
            <p className="text-gray-600 mt-1">View and manage advertising inquiries</p>
          </div>
        </div>

        <Tabs defaultValue="inquiries" className="space-y-6">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="inquiries">Advertising Inquiries</TabsTrigger>
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

            {isLoading ? (
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
        </Tabs>
      </div>
    </PageShell>
  );
}