import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';

export default function TechForm({ item, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(item || {
    icon: '',
    title: '',
    description: '',
    status: 'in_concept',
    order: 0,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Title and description are required');
      return;
    }
    onSubmit(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {item ? 'Edit Tech Item' : 'Create Tech Item'}
          </h2>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Icon</label>
            <Input
              placeholder="e.g., Zap, Cpu, Wifi"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Title *</label>
            <Input
              placeholder="Tech item title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description *</label>
            <Textarea
              placeholder="Item description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="coming_soon">Coming Soon</SelectItem>
                <SelectItem value="in_concept">In Concept</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#232323] hover:bg-[#1A1A1A]"
            >
              {item ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}