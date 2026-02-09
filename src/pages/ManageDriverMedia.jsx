import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, Edit2, Plus } from 'lucide-react';
import { createPageUrl } from '@/components/utils';
import { Link } from 'react-router-dom';

export default function ManageDriverMedia() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMedia, setEditingMedia] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    driver_id: '',
    headshot_url: '',
    hero_image_url: '',
    gallery_urls: [],
    highlight_video_url: '',
    social_instagram: '',
    social_x: '',
    social_youtube: '',
    social_facebook: '',
    social_threads: '',
    website_url: '',
    media_notes: '',
  });

  const queryClient = useQueryClient();

  const { data: media = [], isLoading } = useQuery({
    queryKey: ['driverMedia'],
    queryFn: () => base44.entities.DriverMedia.list('-updated_date', 500),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DriverMedia.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverMedia'] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingMedia) {
        return base44.entities.DriverMedia.update(editingMedia.id, data);
      }
      return base44.entities.DriverMedia.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverMedia'] });
      setShowForm(false);
      setEditingMedia(null);
      setFormData({
        driver_id: '',
        headshot_url: '',
        hero_image_url: '',
        gallery_urls: [],
        highlight_video_url: '',
        social_instagram: '',
        social_x: '',
        social_youtube: '',
        social_facebook: '',
        social_threads: '',
        website_url: '',
        media_notes: '',
      });
    },
  });

  const handleSubmit = () => {
    if (!formData.driver_id) {
      alert('Please select a driver');
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleEdit = (m) => {
    setEditingMedia(m);
    setFormData(m);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure?')) {
      deleteMutation.mutate(id);
    }
  };

  const filteredMedia = media.filter(m => {
    const driver = drivers.find(d => d.id === m.driver_id);
    return !driver || `${driver.first_name} ${driver.last_name}`.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (isLoading) {
    return (
      <PageShell>
        <div className="max-w-7xl mx-auto px-6 py-12">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-black">Driver Media</h1>
          <Button onClick={() => { setShowForm(true); setEditingMedia(null); }} className="bg-gray-900">
            <Plus className="w-4 h-4 mr-2" />
            Add Media
          </Button>
        </div>

        {showForm && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 space-y-4">
            <h2 className="text-xl font-bold">{editingMedia ? 'Edit' : 'New'} Media</h2>
            
            <div>
              <label className="text-sm font-medium">Driver *</label>
              <Select value={formData.driver_id} onValueChange={(value) => setFormData({...formData, driver_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.first_name} {d.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Headshot URL</label>
                <Input value={formData.headshot_url} onChange={(e) => setFormData({...formData, headshot_url: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-medium">Hero Image URL</label>
                <Input value={formData.hero_image_url} onChange={(e) => setFormData({...formData, hero_image_url: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-medium">Highlight Video URL</label>
                <Input value={formData.highlight_video_url} onChange={(e) => setFormData({...formData, highlight_video_url: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-medium">Website URL</label>
                <Input value={formData.website_url} onChange={(e) => setFormData({...formData, website_url: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-medium">Instagram</label>
                <Input value={formData.social_instagram} onChange={(e) => setFormData({...formData, social_instagram: e.target.value})} placeholder="@handle or URL" />
              </div>
              <div>
                <label className="text-sm font-medium">X / Twitter</label>
                <Input value={formData.social_x} onChange={(e) => setFormData({...formData, social_x: e.target.value})} placeholder="@handle or URL" />
              </div>
              <div>
                <label className="text-sm font-medium">YouTube</label>
                <Input value={formData.social_youtube} onChange={(e) => setFormData({...formData, social_youtube: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-medium">Facebook</label>
                <Input value={formData.social_facebook} onChange={(e) => setFormData({...formData, social_facebook: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-medium">Threads</label>
                <Input value={formData.social_threads} onChange={(e) => setFormData({...formData, social_threads: e.target.value})} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Media Notes</label>
              <Textarea value={formData.media_notes} onChange={(e) => setFormData({...formData, media_notes: e.target.value})} rows={3} />
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saveMutation.isPending} className="bg-gray-900">
                {saveMutation.isPending ? 'Saving...' : 'Save Media'}
              </Button>
            </div>
          </div>
        )}

        <div className="mb-6">
          <Input placeholder="Search by driver..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-semibold">Driver</th>
                <th className="text-left px-6 py-3 text-sm font-semibold">Images</th>
                <th className="text-left px-6 py-3 text-sm font-semibold">Socials</th>
                <th className="text-right px-6 py-3 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMedia.length > 0 ? (
                filteredMedia.map((m) => {
                  const driver = drivers.find(d => d.id === m.driver_id);
                  const hasImages = [m.headshot_url, m.hero_image_url, m.highlight_video_url].filter(Boolean).length;
                  const hasSocials = [m.social_instagram, m.social_x, m.social_youtube, m.social_facebook, m.social_threads].filter(Boolean).length;
                  return (
                    <tr key={m.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-3">
                        {driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown'}
                      </td>
                      <td className="px-6 py-3 text-sm">{hasImages} image(s)</td>
                      <td className="px-6 py-3 text-sm">{hasSocials} link(s)</td>
                      <td className="px-6 py-3 text-right space-x-2">
                        <button onClick={() => handleEdit(m)} className="text-gray-600 hover:text-gray-900">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(m.id)} className="text-red-600 hover:text-red-900">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">No media found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Link to={createPageUrl('Management')} className="inline-block mt-8">
          <Button variant="outline">Back to Management</Button>
        </Link>
      </div>
    </PageShell>
  );
}