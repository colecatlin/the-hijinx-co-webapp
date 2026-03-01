import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Pencil, Trash2, ChevronDown, Sparkles, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ManagementLayout from '@/components/management/ManagementLayout';
import StoryForm from '@/components/management/StoryForm';
import StorySubmissionsReview from '@/components/management/StorySubmissionsReview';
import { createPageUrl } from '@/components/utils';

const PRIMARY_CATEGORIES = ['Racing', 'Business', 'Culture', 'Tech', 'Media', 'Marketplace'];
const SUB_CATEGORY_MAP = {
  Racing: ['Race Reports', 'Results', 'Standings', 'Championship Watch', 'Track Profiles'],
  Business: ['Sponsorship', 'Industry', 'Deals', 'Ownership', 'Expansion'],
  Culture: ['Grassroots', 'Legacy', 'Fan Experience', 'Opinion', 'Letters'],
  Tech: ['Engineering', 'Data', 'Setup', 'Safety', 'Rules'],
  Media: ['Photo Essays', 'Film Room', 'Behind The Lens', 'Broadcast', 'Creator Spotlight'],
  Marketplace: ['Classifieds', 'Rent A Ride', 'Auctions', 'Gear', 'Builds'],
};

export default function ManageStories() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingStory, setEditingStory] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedStories, setSelectedStories] = useState([]);
  const [sortBy, setSortBy] = useState('newest');
  const [filterPrimaryCategory, setFilterPrimaryCategory] = useState('all');
  const [filterSubCategory, setFilterSubCategory] = useState('all');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'by_category'

  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const isAdmin = user?.role === 'admin';

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

  const filteredAndSortedStories = useMemo(() => {
    let result = stories.filter(story =>
      (story.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       story.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       story.primary_category?.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (filterPrimaryCategory === 'all' || story.primary_category === filterPrimaryCategory) &&
      (filterSubCategory === 'all' || story.sub_category === filterSubCategory)
    );

    result = [...result].sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.published_date || b.created_date) - new Date(a.published_date || a.created_date);
      if (sortBy === 'oldest') return new Date(a.published_date || a.created_date) - new Date(b.published_date || b.created_date);
      if (sortBy === 'category') return (a.primary_category || '').localeCompare(b.primary_category || '');
      if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
      return 0;
    });

    return result;
  }, [stories, searchQuery, filterPrimaryCategory, filterSubCategory, sortBy]);

  // Group by primary_category for "by category" view
  const storiesByCategory = useMemo(() => {
    const grouped = {};
    PRIMARY_CATEGORIES.forEach(cat => {
      const catStories = filteredAndSortedStories.filter(s => s.primary_category === cat);
      if (catStories.length > 0) grouped[cat] = catStories;
    });
    return grouped;
  }, [filteredAndSortedStories]);

  const handleSelectAll = (checked) => {
    setSelectedStories(checked ? filteredAndSortedStories.map(s => s.id) : []);
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

  const [isCategorizingAll, setIsCategorizingAll] = useState(false);
  const handleCategorizeAll = async () => {
    if (!confirm('Use AI to auto-categorize all stories based on their title and body? This will overwrite existing categories.')) return;
    setIsCategorizingAll(true);
    try {
      const response = await base44.functions.invoke('categorizeStories');
      const { updated, skipped, errors } = response.data;
      toast.success(`Done! Updated ${updated} stories.${skipped > 0 ? ` Skipped ${skipped}.` : ''}`);
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      if (errors?.length > 0) {
        console.warn('Categorization errors:', errors);
      }
    } catch (err) {
      toast.error('Failed to categorize stories: ' + err.message);
    } finally {
      setIsCategorizingAll(false);
    }
  };

  return (
    <ManagementLayout currentPage="ManageStories">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Link to={createPageUrl('Management')} className="inline-flex items-center gap-1 text-xs font-mono text-gray-400 hover:text-[#232323] mb-4 transition-colors">
          <ArrowLeft className="w-3 h-3" /> Back to Management
        </Link>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Manage Stories</h1>
            <p className="text-gray-600 mt-1">Create, edit, and review outlet stories</p>
          </div>
          {!showForm && (
            <div className="flex gap-2">
              <Button onClick={handleCategorizeAll} disabled={isCategorizingAll} variant="outline">
                <Sparkles className="w-4 h-4 mr-2" />
                {isCategorizingAll ? 'Categorizing...' : 'AI Categorize All'}
              </Button>
              <Button onClick={handleAdd} className="bg-[#232323] hover:bg-[#1A3249]">
                <Plus className="w-4 h-4 mr-2" />
                Add Story
              </Button>
            </div>
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
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search stories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="category">By Category</SelectItem>
                  <SelectItem value="title">By Title (A–Z)</SelectItem>
                </SelectContent>
              </Select>

              {/* Primary Category Filter */}
              <Select value={filterPrimaryCategory} onValueChange={(val) => { setFilterPrimaryCategory(val); setFilterSubCategory('all'); }}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {PRIMARY_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sub Category Filter */}
              {filterPrimaryCategory !== 'all' && (
                <Select value={filterSubCategory} onValueChange={setFilterSubCategory}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="All Sub-Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sub-Categories</SelectItem>
                    {(SUB_CATEGORY_MAP[filterPrimaryCategory] || []).map(sub => (
                      <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* View Mode */}
              <div className="flex rounded-md border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 text-xs font-medium transition-colors ${viewMode === 'list' ? 'bg-[#232323] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  List
                </button>
                <button
                  onClick={() => setViewMode('by_category')}
                  className={`px-3 py-2 text-xs font-medium transition-colors ${viewMode === 'by_category' ? 'bg-[#232323] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  By Category
                </button>
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
            ) : filteredAndSortedStories.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <p className="text-gray-500">No stories found</p>
              </div>
            ) : viewMode === 'by_category' ? (
              <div className="space-y-6">
                {Object.entries(storiesByCategory).map(([cat, catStories]) => (
                  <div key={cat} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                      <span className="font-semibold text-sm text-gray-800">{cat}</span>
                      <span className="text-xs text-gray-500 bg-gray-200 rounded-full px-2 py-0.5">{catStories.length}</span>
                    </div>
                    <StoryTable stories={catStories} selectedStories={selectedStories} onSelect={handleSelectStory} onEdit={handleEdit} onDelete={handleDelete} deleteIsPending={deleteStoryMutation.isPending} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="w-12 px-4 py-3">
                        <Checkbox
                          checked={selectedStories.length === filteredAndSortedStories.length && filteredAndSortedStories.length > 0}
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
                    {filteredAndSortedStories.map((story) => (
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
    </ManagementLayout>
  );
}

function StoryTable({ stories, selectedStories, onSelect, onEdit, onDelete, deleteIsPending }) {
  return (
    <table className="w-full">
      <thead className="bg-gray-50 border-b border-gray-200">
        <tr>
          <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Title</th>
          <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Author</th>
          <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Status</th>
          <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Date</th>
          <th className="w-32 px-4 py-3"></th>
        </tr>
      </thead>
      <tbody>
        {stories.map((story) => (
          <tr key={story.id} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-4 py-3 font-medium">{story.title}</td>
            <td className="px-4 py-3 text-gray-600">{story.author || '-'}</td>
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
                <Button size="sm" variant="ghost" onClick={() => onEdit(story)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(story.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}