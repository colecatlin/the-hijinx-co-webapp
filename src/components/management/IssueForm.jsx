import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Loader2 } from 'lucide-react';
import DateInput from '@/components/shared/DateInput';

export default function IssueForm({ issue, onClose }) {
  const [formData, setFormData] = useState({
    title: issue?.title || '',
    volume: issue?.volume || '',
    issue_number: issue?.issue_number || '',
    cover_image: issue?.cover_image || '',
    description: issue?.description || '',
    published_date: issue?.published_date || '',
    status: issue?.status || 'draft',
  });

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data) => {
      if (issue) {
        return base44.entities.OutletIssue.update(issue.id, data);
      }
      return base44.entities.OutletIssue.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      ...formData,
      volume: parseInt(formData.volume),
      issue_number: parseInt(formData.issue_number),
    });
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">{issue ? 'Edit Issue' : 'New Issue'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">Title *</label>
            <Input
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Issue title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Volume *</label>
            <Input
              type="number"
              value={formData.volume}
              onChange={(e) => handleChange('volume', e.target.value)}
              placeholder="1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Issue Number *</label>
            <Input
              type="number"
              value={formData.issue_number}
              onChange={(e) => handleChange('issue_number', e.target.value)}
              placeholder="1"
              required
            />
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
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Published Date</label>
            <DateInput
              value={formData.published_date}
              onChange={(val) => handleChange('published_date', val)}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">Cover Image URL</label>
            <Input
              value={formData.cover_image}
              onChange={(e) => handleChange('cover_image', e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Issue description"
              rows={4}
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
            {issue ? 'Update' : 'Create'} Issue
          </Button>
        </div>
      </form>
    </div>
  );
}