import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageShell from '@/components/shared/PageShell';
import StoryForm from '@/components/management/StoryForm';
import StorySubmissionsReview from '@/components/management/StorySubmissionsReview';

export default function ManageStories() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingStory, setEditingStory] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedStories, setSelectedStories] = useState([]);

  const queryClient = useQueryClient();

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ['stories'],
    queryFn: () => base44.entities.OutletStory.list('-created_date'),
  });

  const deleteStoryMutation = useMutation({
    mutationFn: (id) => base44.entities.OutletStory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      await Promise.all(ids.map(id => base44.entities.OutletStory.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      setSelectedStories([]);
    },
  });

  const filteredStories = stories.filter(story =>
    story.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    story.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    story.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAll = (checked) => {
    setSelectedStories(checked ? filteredStories.map(s => s.id) : []);
  };

  const handleSelectStory = (id, checked) => {
    if (checked) {
      setSelectedStories([...selectedStories, id]);
    } else {
      setSelectedStories(selectedStories.filter(sid => sid !== id));
    }
  };

  const handleBulkDelete = () => {
    if (confirm(`Delete ${selectedStories.length} stories?`)) {
      bulkDeleteMutation.mutate(selectedStories);
    }
  };

  const handleDelete = (id) => {
    if (confirm('Delete this story?')) {
      deleteStoryMutation.mutate(id);
    }
  };

  const handleEdit = (story) => {
    setEditingStory(story);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingStory(null);
    setShowForm(true);
  };

  return (
    <PageShell className="bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Manage Stories</h1>
            <p className="text-gray-600 mt-1">Create, edit, and review outlet stories</p>
          </div>
          {!showForm && (
            <Button onClick={handleAdd} className="bg-[#232323] hover:bg-[#1A3249]">
              <Plus className="w-4 h-4 mr-2" />
              Add Story
            </Button>
          )}
        </div>

        {showForm ? (
          <StoryForm
            story={editingStory}
            onClose={() => {
              setShowForm(false);
              setEditingStory(null);
            }}
          />
        ) : (
          <Tabs defaultValue="stories" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="stories">Stories</TabsTrigger>
              <TabsTrigger value="submissions">Submissions</TabsTrigger>
            </TabsList>

            <TabsContent value="stories" className="space-y-6">
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search stories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {selectedStories.length > 0 && (
                <Button
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete {selectedStories.length}
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : filteredStories.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <p className="text-gray-500">No stories found</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="w-12 px-4 py-3">
                        <Checkbox
                          checked={selectedStories.length === filteredStories.length && filteredStories.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Title</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Author</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Category</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Status</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Date</th>
                      <th className="w-32 px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStories.map((story) => (
                      <tr key={story.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selectedStories.includes(story.id)}
                            onCheckedChange={(checked) => handleSelectStory(story.id, checked)}
                          />
                        </td>
                        <td className="px-4 py-3 font-medium">{story.title}</td>
                        <td className="px-4 py-3 text-gray-600">{story.author || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-xs rounded bg-gray-100">{story.category}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded ${
                            story.status === 'published' ? 'bg-green-100 text-green-800' :
                            story.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {story.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {story.published_date ? new Date(story.published_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(story)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(story.id)}
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

            <TabsContent value="submissions">
              <StorySubmissionsReview />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PageShell>
  );
}