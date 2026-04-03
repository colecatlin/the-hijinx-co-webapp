import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export const EMPTY_FORM = {
  name: '', slug: '', product_type: 'physical', status: 'draft',
  description: '', short_description: '', cover_image_url: '',
  price: '', currency: 'USD', sku: '', category: '', tags: '',
  featured: false, external_fulfillment_url: '', digital_asset_url: '',
};

export default function AdminProductForm({ open, onClose, form, setForm, onSubmit, isPending, editId }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editId ? 'Edit Product' : 'New Product'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="auto-generated" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Type *</Label>
              <Select value={form.product_type} onValueChange={v => set('product_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="physical">Physical</SelectItem>
                  <SelectItem value="digital">Digital</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category *</Label>
              <Input value={form.category} onChange={e => set('category', e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Price *</Label>
              <Input type="number" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} required />
            </div>
            <div>
              <Label>Currency</Label>
              <Input value={form.currency} onChange={e => set('currency', e.target.value)} />
            </div>
            <div>
              <Label>SKU</Label>
              <Input value={form.sku} onChange={e => set('sku', e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Short Description</Label>
            <Input value={form.short_description} onChange={e => set('short_description', e.target.value)} />
          </div>

          <div>
            <Label>Description</Label>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px] resize-y focus:outline-none focus:ring-1 focus:ring-ring"
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          <div>
            <Label>Cover Image URL</Label>
            <Input value={form.cover_image_url} onChange={e => set('cover_image_url', e.target.value)} placeholder="https://…" />
          </div>

          {form.product_type === 'physical' && (
            <div>
              <Label>External Fulfillment URL</Label>
              <Input value={form.external_fulfillment_url} onChange={e => set('external_fulfillment_url', e.target.value)} placeholder="https://…" />
            </div>
          )}

          {form.product_type === 'digital' && (
            <div>
              <Label>Digital Asset URL *</Label>
              <Input value={form.digital_asset_url} onChange={e => set('digital_asset_url', e.target.value)} placeholder="https://…" required={form.product_type === 'digital'} />
            </div>
          )}

          <div>
            <Label>Tags (comma-separated)</Label>
            <Input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="racing, apparel, limited" />
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={form.featured} onCheckedChange={v => set('featured', v)} id="featured" />
            <Label htmlFor="featured">Featured product</Label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-[#232323] hover:bg-black text-white">
              {isPending ? 'Saving…' : editId ? 'Update Product' : 'Create Product'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}