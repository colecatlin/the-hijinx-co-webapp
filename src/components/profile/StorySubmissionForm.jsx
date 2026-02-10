import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

export default function StorySubmissionForm({ user }) {
  const [formData, setFormData] = useState({
    name: user?.full_name || '',
    email: user?.email || '',
    title: '',
    category: 'Racing',
    pitch: '',
    writing_sample_url: '',
    photo_urls: [],
    status: 'pending',
  });

  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const submissionMutation = useMutation({
    mutationFn: (data) => base44.entities.StorySubmission.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storySubmissions'] });
      setFormData({
        name: user?.full_name || '',
        email: user?.email || '',
        title: '',
        category: 'Racing',
        pitch: '',
        writing_sample_url: '',
        photo_urls: [],
        status: 'pending',
      });
      toast.success('Story submitted for approval!');
    },
    onError: (error) => {
      toast.error(`Submission failed: ${error.message}`);
    },
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, photo_urls: [...prev.photo_urls, file_url] }));
      toast.success('File uploaded successfully!');
    } catch (error) {
      toast.error('Failed to upload file.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = (urlToRemove) => {
    setFormData(prev => ({ ...prev, photo_urls: prev.photo_urls.filter(url => url !== urlToRemove) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submissionMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Submit a Story for Approval</h2>
      <p className="text-gray-600">Fill out the form below to submit your story idea to our editorial team.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Your Name</label>
          <Input value={formData.name} onChange={(e) => handleChange('name', e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Your Email</label>
          <Input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Story Title *</label>
          <Input value={formData.title} onChange={(e) => handleChange('title', e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Category *</label>
          <Select value={formData.category} onValueChange={(val) => handleChange('category', val)} required>
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
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
          <label className="block text-sm font-medium mb-2">Story Pitch / Summary *</label>
          <Textarea value={formData.pitch} onChange={(e) => handleChange('pitch', e.target.value)} rows={5} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Writing Sample URL (optional)</label>
          <Input value={formData.writing_sample_url} onChange={(e) => handleChange('writing_sample_url', e.target.value)} placeholder="Link to your portfolio or a previous article" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Supporting Photos (optional)</label>
          <div className="space-y-3">
            {formData.photo_urls.map((url, index) => (
              <div key={index} className="flex items-center gap-2">
                <img src={url} alt={`Photo ${index + 1}`} className="w-20 h-20 object-cover rounded" />
                <span className="text-sm truncate">{url.substring(url.lastIndexOf('/') + 1)}</span>
                <Button type="button" variant="ghost" size="icon" onClick={() => handleRemovePhoto(url)}>
                  <X className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}
            <label className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded p-4 cursor-pointer hover:bg-gray-50">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-2 text-gray-600">
                <Upload className="w-4 h-4" />
                <span className="text-sm">{uploading ? 'Uploading...' : 'Click to upload supporting images'}</span>
              </div>
            </label>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-[#232323] hover:bg-[#1A3249]"
          disabled={submissionMutation.isPending || uploading}
        >
          {submissionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {submissionMutation.isSuccess && <CheckCircle2 className="w-4 h-4 mr-2" />}
          Submit for Approval
        </Button>
      </form>
    </div>
  );
}