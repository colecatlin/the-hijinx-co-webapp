import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function AnnouncementForm({ announcement, onCancel }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(announcement || {
    message: '',
    link_url: '',
    link_text: '',
    background_color: 'black',
    active: true,
    priority: 0,
  });

  const mutation = useMutation({
    mutationFn: (data) =>
      announcement
        ? base44.entities.Announcement.update(announcement.id, data)
        : base44.entities.Announcement.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      onCancel();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">
        {announcement ? 'Edit Announcement' : 'New Announcement'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Message *</Label>
          <Textarea
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            placeholder="Your announcement message"
            required
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Link URL</Label>
            <Input
              value={formData.link_url}
              onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div>
            <Label>Link Text</Label>
            <Input
              value={formData.link_text}
              onChange={(e) => setFormData({ ...formData, link_text: e.target.value })}
              placeholder="Learn More"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Background Color</Label>
            <Select
              value={formData.background_color}
              onValueChange={(value) => setFormData({ ...formData, background_color: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="black">Black</SelectItem>
                <SelectItem value="white">White</SelectItem>
                <SelectItem value="blue">Blue</SelectItem>
                <SelectItem value="indigo">Indigo</SelectItem>
                <SelectItem value="purple">Purple</SelectItem>
                <SelectItem value="pink">Pink</SelectItem>
                <SelectItem value="red">Red</SelectItem>
                <SelectItem value="orange">Orange</SelectItem>
                <SelectItem value="yellow">Yellow</SelectItem>
                <SelectItem value="green">Green</SelectItem>
                <SelectItem value="teal">Teal</SelectItem>
                <SelectItem value="cyan">Cyan</SelectItem>
                <SelectItem value="gray">Gray</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Priority (Display Order)</Label>
            <Input
              type="number"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Status</Label>
            <Select
              value={formData.active ? 'active' : 'inactive'}
              onValueChange={(value) => setFormData({ ...formData, active: value === 'active' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : announcement ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </div>
  );
}