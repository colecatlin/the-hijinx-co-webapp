import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Loader2, Upload } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function StoryForm({ story, onClose }) {
  const [formData, setFormData] = useState({
    title: story?.title || '',
    slug: story?.slug || '',
    subtitle: story?.subtitle || '',
    body: story?.body || '',
    author: story?.author || '',
    author_title: story?.author_title || '',
    category: story?.category || 'Racing',
    cover_image: story?.cover_image || '',
    location: story?.location || '',
    status: story?.status || 'draft',
    featured: story?.featured || false,
    tags: story?.tags || [],
  });

  const [uploading, setUploading] = useState(false);

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data) => {
      if (story) {
        return base44.entities.OutletStory.update(story.id, data);
      }
      return base44.entities.OutletStory.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = { ...formData };
    if (!submitData.slug) {
      submitData.slug = formData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
    mutation.mutate(submitData);
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    
    if (field === 'title' && !story) {
      const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData(prev => ({ ...prev, cover_image: file_url }));
    setUploading(false);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">{story ? 'Edit Story' : 'New Story'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">Title *</label>
            <Input
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Story headline"
              required
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">Subtitle</label>
            <Input
              value={formData.subtitle}
              onChange={(e) => handleChange('subtitle', e.target.value)}
              placeholder="Subheadline or deck"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Category *</label>
            <Select value={formData.category} onValueChange={(val) => handleChange('category', val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Racing">Racing</SelectItem>
                <SelectItem value="Culture">Culture</SelectItem>
                <SelectItem value="Business">Business</SelectItem>
                <SelectItem value="Gear">Gear</SelectItem>
                <SelectItem value="Travel">Travel</SelectItem>
                <SelectItem value="Opinion">Opinion</SelectItem>
                <SelectItem value="Media">Media</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Status *</label>
            <Select value={formData.status} onValueChange={(val) => handleChange('status', val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Author</label>
            <Input
              value={formData.author}
              onChange={(e) => handleChange('author', e.target.value)}
              placeholder="Author name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Author Title</label>
            <Input
              value={formData.author_title}
              onChange={(e) => handleChange('author_title', e.target.value)}
              placeholder="Senior Writer, Contributor, etc."
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">Cover Image</label>
            <div className="space-y-3">
              {formData.cover_image && (
                <div className="relative">
                  <img src={formData.cover_image} alt="Preview" className="w-full h-48 object-cover border border-gray-200 rounded" />
                  <button
                    type="button"
                    onClick={() => handleChange('cover_image', '')}
                    className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 text-xs rounded hover:bg-red-600"
                  >
                    Remove
                  </button>
                </div>
              )}
              <label className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded p-6 cursor-pointer hover:bg-gray-50">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-2 text-gray-600">
                  <Upload className="w-5 h-5" />
                  <span className="text-sm">{uploading ? 'Uploading...' : 'Click to upload or drag and drop'}</span>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Location</label>
            <Input
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="Dateline location"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">Body</label>
            <ReactQuill
              theme="snow"
              value={formData.body}
              onChange={(val) => handleChange('body', val)}
              className="bg-white"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-[#232323] hover:bg-[#1A3249]"
            disabled={mutation.isPending || mutation.isSuccess}
          >
            {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mutation.isSuccess && <CheckCircle2 className="w-4 h-4 mr-2" />}
            {story ? 'Update' : 'Create'} Story
          </Button>
        </div>
      </form>
    </div>
  );
}