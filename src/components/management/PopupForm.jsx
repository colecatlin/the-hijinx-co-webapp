import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export default function PopupForm({ popup, onCancel }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(popup || {
    title: '',
    body: '',
    cover_image_url: '',
    cta_text: '',
    cta_url: '',
    subscribe_enabled: false,
    status: 'draft',
    priority: 0,
    start_date: '',
    end_date: '',
    display_order: 0,
  });

  const mutation = useMutation({
    mutationFn: (data) =>
      popup
        ? base44.entities.SitePopup.update(popup.id, data)
        : base44.entities.SitePopup.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sitePopups'] });
      queryClient.invalidateQueries({ queryKey: ['activeSitePopups'] });
      onCancel();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  // Convert ISO datetime to datetime-local input format
  const toLocalInput = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
  };

  const fromLocalInput = (val) => {
    if (!val) return '';
    return new Date(val).toISOString();
  };

  return (
    <div className="bg-surface-elevated border border-divider rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        {popup ? 'Edit Pop-Up' : 'New Pop-Up'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Title *</Label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="We're in Beta!"
            required
            style={{ background: 'hsl(var(--surface))', color: 'hsl(var(--foreground))', borderColor: 'hsl(var(--divider))' }}
          />
        </div>

        <div>
          <Label>Body</Label>
          <Textarea
            value={formData.body}
            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
            placeholder="Thanks for visiting Hijinx. We're currently in beta — please be patient as we build out the platform."
            rows={4}
            style={{ background: 'hsl(var(--surface))', color: 'hsl(var(--foreground))', borderColor: 'hsl(var(--divider))' }}
          />
        </div>

        <div>
          <Label>Cover Image URL</Label>
          <Input
            value={formData.cover_image_url}
            onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
            placeholder="https://..."
            style={{ background: 'hsl(var(--surface))', color: 'hsl(var(--foreground))', borderColor: 'hsl(var(--divider))' }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>CTA Text</Label>
            <Input
              value={formData.cta_text}
              onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
              placeholder="Learn More"
              style={{ background: 'hsl(var(--surface))', color: 'hsl(var(--foreground))', borderColor: 'hsl(var(--divider))' }}
            />
          </div>
          <div>
            <Label>CTA URL</Label>
            <Input
              value={formData.cta_url}
              onChange={(e) => setFormData({ ...formData, cta_url: e.target.value })}
              placeholder="https://..."
              style={{ background: 'hsl(var(--surface))', color: 'hsl(var(--foreground))', borderColor: 'hsl(var(--divider))' }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border border-divider bg-surface">
          <div>
            <Label className="cursor-pointer">Enable Subscribe Form</Label>
            <p className="text-xs text-foreground-quiet mt-0.5">Adds an email capture field to the pop-up</p>
          </div>
          <Switch
            checked={formData.subscribe_enabled}
            onCheckedChange={(checked) => setFormData({ ...formData, subscribe_enabled: checked })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Start Date</Label>
            <Input
              type="datetime-local"
              value={toLocalInput(formData.start_date)}
              onChange={(e) => setFormData({ ...formData, start_date: fromLocalInput(e.target.value) })}
              style={{ background: 'hsl(var(--surface))', color: 'hsl(var(--foreground))', borderColor: 'hsl(var(--divider))' }}
            />
          </div>
          <div>
            <Label>End Date</Label>
            <Input
              type="datetime-local"
              value={toLocalInput(formData.end_date)}
              onChange={(e) => setFormData({ ...formData, end_date: fromLocalInput(e.target.value) })}
              style={{ background: 'hsl(var(--surface))', color: 'hsl(var(--foreground))', borderColor: 'hsl(var(--divider))' }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Priority</Label>
            <Input
              type="number"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
              style={{ background: 'hsl(var(--surface))', color: 'hsl(var(--foreground))', borderColor: 'hsl(var(--divider))' }}
            />
          </div>
          <div>
            <Label>Display Order</Label>
            <Input
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value) })}
              style={{ background: 'hsl(var(--surface))', color: 'hsl(var(--foreground))', borderColor: 'hsl(var(--divider))' }}
            />
          </div>
          <div>
            <Label>Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger style={{ background: 'hsl(var(--surface))', color: 'hsl(var(--foreground))', borderColor: 'hsl(var(--divider))' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : popup ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </div>
  );
}