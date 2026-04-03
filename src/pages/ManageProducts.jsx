import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Star, Package, Download, Check, Shirt } from 'lucide-react';
import { toast } from 'sonner';
import AdminProductForm, { EMPTY_FORM } from '@/components/products/AdminProductForm';

export default function ManageProducts() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [filter, setFilter] = useState('all');

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['admin_products'],
    queryFn: () => base44.entities.Product.list('-created_date', 200),
  });

  const save = useMutation({
    mutationFn: (data) => editId
      ? base44.entities.Product.update(editId, data)
      : base44.entities.Product.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin_products']);
      toast.success(editId ? 'Product updated' : 'Product created');
      setOpen(false);
      setForm(EMPTY_FORM);
      setEditId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const quickUpdate = (id, data) => {
    base44.entities.Product.update(id, data).then(() => queryClient.invalidateQueries(['admin_products']));
  };

  const handleEdit = (p) => {
    setEditId(p.id);
    setForm({ ...EMPTY_FORM, ...p, tags: (p.tags || []).join(', '), price: p.price?.toString() || '' });
    setOpen(true);
  };

  const handleOpen = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const slug = form.slug || form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    save.mutate({
      ...form,
      slug,
      price: parseFloat(form.price) || 0,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    });
  };

  const displayed = filter === 'all' ? products
    : filter === 'physical' ? products.filter(p => p.product_type === 'physical')
    : filter === 'digital' ? products.filter(p => p.product_type === 'digital')
    : products.filter(p => p.status === filter);

  const statusColor = { active: 'bg-green-100 text-green-700', draft: 'bg-gray-100 text-gray-600', inactive: 'bg-red-100 text-red-600' };

  return (
    <PageShell className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage apparel and digital downloads</p>
          </div>
          <Button onClick={handleOpen} className="gap-2 bg-[#232323] hover:bg-black text-white">
            <Plus className="w-4 h-4" /> Add Product
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['all', 'physical', 'digital', 'active', 'draft', 'inactive'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors capitalize ${filter === f ? 'bg-[#232323] text-white border-[#232323]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
              {f}
            </button>
          ))}
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total', val: products.length, icon: Package },
            { label: 'Physical', val: products.filter(p => p.product_type === 'physical').length, icon: Shirt },
            { label: 'Digital', val: products.filter(p => p.product_type === 'digital').length, icon: Download },
            { label: 'Active', val: products.filter(p => p.status === 'active').length, icon: Check },
          ].map(({ label, val, icon: Icon }) => (
            <div key={label} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-3">
              <Icon className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-lg font-bold text-gray-900">{val}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Product list */}
        {isLoading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : displayed.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-xl p-12 text-center">
            <Package className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No products. Add one to get started.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            {displayed.map((p, i) => (
              <div key={p.id} className={`flex items-center gap-4 px-5 py-4 ${i !== displayed.length - 1 ? 'border-b border-gray-100' : ''}`}>
                {p.cover_image_url
                  ? <img src={p.cover_image_url} alt={p.name} className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
                  : <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      {p.product_type === 'digital' ? <Download className="w-5 h-5 text-gray-400" /> : <Shirt className="w-5 h-5 text-gray-400" />}
                    </div>
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 text-sm truncate">{p.name}</p>
                    {p.featured && <Star className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge className={`text-xs px-1.5 py-0 ${p.product_type === 'physical' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                      {p.product_type}
                    </Badge>
                    <Badge className={`text-xs px-1.5 py-0 ${statusColor[p.status] || 'bg-gray-100 text-gray-600'}`}>{p.status}</Badge>
                    <span className="text-xs text-gray-400">{p.category}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="text-sm font-bold text-gray-900">${p.price?.toFixed(2)}</span>
                  <button onClick={() => quickUpdate(p.id, { featured: !p.featured })}
                    className={`p-1.5 rounded-lg transition-colors ${p.featured ? 'bg-amber-50 text-amber-500' : 'text-gray-300 hover:text-gray-500'}`}>
                    <Star className="w-4 h-4" />
                  </button>
                  <Select value={p.status} onValueChange={(v) => quickUpdate(p.id, { status: v })}>
                    <SelectTrigger className="h-7 text-xs w-24 border-gray-200"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(p)} className="h-7 px-2">
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AdminProductForm
        open={open}
        onClose={() => setOpen(false)}
        form={form}
        setForm={setForm}
        onSubmit={handleSubmit}
        isPending={save.isPending}
        editId={editId}
      />
    </PageShell>
  );
}