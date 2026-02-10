import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Loader2, Upload, X } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { toast } from 'sonner';

export default function StorySubmissionForm({ user }) {
  const [formData, setFormData] = useState({
    name: user?.full_name || '',
    email: user?.email || '',
    title: '',
    subtitle: '',
    body: '',
    author: user?.full_name || '',
    author_title: '',
    photo_credit: '',
    category: 'Racing',
    cover_image: '',
    location_city: '',
    location_state: '',
    location_country: '',
    tags: [],
  });

  const [uploading, setUploading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const queryClient = useQueryClient();

  const submissionMutation = useMutation({
    mutationFn: (data) => base44.entities.StorySubmission.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storySubmissions'] });
      setFormData({
        name: user?.full_name || '',
        email: user?.email || '',
        title: '',
        subtitle: '',
        body: '',
        author: user?.full_name || '',
        author_title: '',
        photo_credit: '',
        category: 'Racing',
        cover_image: '',
        location_city: '',
        location_state: '',
        location_country: '',
        tags: [],
      });
      setTagInput('');
      toast.success('Story submitted for approval!');
    },
    onError: (error) => {
      toast.error(`Submission failed: ${error.message}`);
    },
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, cover_image: file_url }));
    } catch (error) {
      toast.error('Failed to upload file.');
    } finally {
      setUploading(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submissionMutation.mutate(formData);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Submit a Story for Approval</h2>
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

          <div>
            <label className="block text-sm font-medium mb-2">Photo Credit</label>
            <Input
              value={formData.photo_credit}
              onChange={(e) => handleChange('photo_credit', e.target.value)}
              placeholder="Photographer or company name"
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
            <label className="block text-sm font-medium mb-2">Location City</label>
            <Input
              value={formData.location_city}
              onChange={(e) => handleChange('location_city', e.target.value)}
              placeholder="e.g., New York"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Location State</label>
            <Input
              value={formData.location_state}
              onChange={(e) => handleChange('location_state', e.target.value)}
              placeholder="e.g., NY"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Location Country</label>
            <Input
              value={formData.location_country}
              onChange={(e) => handleChange('location_country', e.target.value)}
              placeholder="e.g., USA"
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

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">Tags</label>
            <div className="flex gap-2 mb-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add a tag and press Enter"
              />
              <Button type="button" onClick={handleAddTag} variant="outline">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <div
                  key={tag}
                  className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="submit"
            className="bg-[#232323] hover:bg-[#1A3249]"
            disabled={submissionMutation.isPending || submissionMutation.isSuccess}
          >
            {submissionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {submissionMutation.isSuccess && <CheckCircle2 className="w-4 h-4 mr-2" />}
            Submit for Approval
          </Button>
        </div>
      </form>
    </div>
  );
}