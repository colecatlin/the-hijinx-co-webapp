import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, X } from 'lucide-react';

export default function AdvertisementForm({ advertisement, onSuccess, onCancel }) {
  const [formData, setFormData] = useState(advertisement || {
    title: '',
    tagline: '',
    cover_image_url: '',
    body: '',
    call_to_action_text: '',
    call_to_action_url: '',
    background_color: '#FAFAFA',
    text_color: '#0A0A0A',
    status: 'draft',
    start_date: '',
    end_date: '',
  });

  const [imagePreview, setImagePreview] = useState(advertisement?.cover_image_url || '');
  const [uploading, setUploading] = useState(false);

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Advertisement.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advertisements'] });
      onSuccess?.();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Advertisement.update(advertisement.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advertisements'] });
      onSuccess?.();
    },
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImagePreview(file_url);
      setFormData(prev => ({ ...prev, cover_image_url: file_url }));
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (advertisement?.id) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg border border-gray-200">
      <div>
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          placeholder="Advertisement headline"
          required
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="tagline">Tagline</Label>
        <Input
          id="tagline"
          name="tagline"
          value={formData.tagline}
          onChange={handleInputChange}
          placeholder="Short, catchy phrase"
          className="mt-1"
        />
      </div>

      <div>
        <Label>Cover Image</Label>
        <div className="mt-2 flex gap-4">
          <div className="flex-1">
            <label className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-gray-600">Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Click to upload</span>
                </>
              )}
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>
          {imagePreview && (
            <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200">
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setImagePreview('');
                  setFormData(prev => ({ ...prev, cover_image_url: '' }));
                }}
                className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl-lg"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="body">Body</Label>
        <Textarea
          id="body"
          name="body"
          value={formData.body}
          onChange={handleInputChange}
          placeholder="Detailed description or content"
          className="mt-1 min-h-24"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="call_to_action_text">CTA Text *</Label>
          <Input
            id="call_to_action_text"
            name="call_to_action_text"
            value={formData.call_to_action_text}
            onChange={handleInputChange}
            placeholder="e.g., Learn More"
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="call_to_action_url">CTA URL *</Label>
          <Input
            id="call_to_action_url"
            name="call_to_action_url"
            value={formData.call_to_action_url}
            onChange={handleInputChange}
            placeholder="https://..."
            type="url"
            required
            className="mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="background_color">Background Color</Label>
          <div className="flex gap-2 mt-1">
            <Input
              id="background_color"
              name="background_color"
              type="color"
              value={formData.background_color}
              onChange={handleInputChange}
              className="w-12 h-10 p-1"
            />
            <Input
              name="background_color"
              value={formData.background_color}
              onChange={handleInputChange}
              placeholder="#FAFAFA"
              className="flex-1"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="text_color">Text Color</Label>
          <div className="flex gap-2 mt-1">
            <Input
              id="text_color"
              name="text_color"
              type="color"
              value={formData.text_color}
              onChange={handleInputChange}
              className="w-12 h-10 p-1"
            />
            <Input
              name="text_color"
              value={formData.text_color}
              onChange={handleInputChange}
              placeholder="#0A0A0A"
              className="flex-1"
            />
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="status">Status *</Label>
        <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start_date">Start Date</Label>
          <Input
            id="start_date"
            name="start_date"
            type="datetime-local"
            value={formData.start_date}
            onChange={handleInputChange}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="end_date">End Date</Label>
          <Input
            id="end_date"
            name="end_date"
            type="datetime-local"
            value={formData.end_date}
            onChange={handleInputChange}
            className="mt-1"
          />
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="bg-[#232323] hover:bg-[#1A3249]">
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {advertisement ? 'Update' : 'Create'} Advertisement
        </Button>
      </div>
    </form>
  );
}