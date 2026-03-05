import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';

const BLANK_ASSET = { file_name: '', drive_file_id: '', mime_type: 'image/jpeg', asset_type: 'photo', title: '', description: '' };

export default function MediaUploadsPanel({ dashboardContext, selectedEvent, currentUser, invalidateAfterOperation }) {
  const [form, setForm] = useState({ ...BLANK_ASSET });
  const [holderId, setHolderId] = useState('');
  const [linkSubjectType, setLinkSubjectType] = useState('event');
  const [linkSubjectId, setLinkSubjectId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const entityId = dashboardContext?.orgId;
  const entityType = dashboardContext?.orgType;
  const eventId = selectedEvent?.id;

  const { data: mediaUsers = [] } = useQuery({
    queryKey: ['media_users'],
    queryFn: () => base44.entities.MediaUser.list(),
  });

  const { data: recentAssets = [] } = useQuery({
    queryKey: ['mediaAssets', { entityId, eventId }],
    queryFn: async () => {
      const all = await base44.entities.MediaAsset.list('-created_date', 20);
      return all;
    },
    enabled: !!entityId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const asset = await base44.entities.MediaAsset.create({
        ...form,
        uploader_media_user_id: holderId,
        created_at: now,
        updated_at: now,
      });

      // Create AssetLink
      if (linkSubjectId) {
        await base44.entities.AssetLink.create({
          asset_id: asset.id,
          subject_type: linkSubjectType,
          subject_id: linkSubjectId,
          primary: true,
          created_at: now,
        });
      }

      // Create AssetReview
      await base44.entities.AssetReview.create({
        asset_id: asset.id,
        entity_type: entityType,
        entity_id: entityId,
        status: 'in_review',
        created_at: now,
        updated_at: now,
      });

      queryClient.invalidateQueries({ queryKey: ['mediaAssets'] });
      queryClient.invalidateQueries({ queryKey: ['assetReviews'] });
      invalidateAfterOperation?.('media_asset_uploaded');
      toast.success('Asset logged and queued for review');
      setForm({ ...BLANK_ASSET });
      setHolderId('');
      setLinkSubjectId('');
      setShowForm(false);
    },
  });

  return (
    <Card className="bg-[#1A1A1A] border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-sm">Upload / Log Assets</CardTitle>
          <Button size="sm" onClick={() => setShowForm(v => !v)} className="h-7 px-2 text-xs bg-blue-800 hover:bg-blue-700">
            <Plus className="w-3 h-3 mr-1" />Log Asset
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="bg-[#262626] border border-gray-700 rounded p-4 mb-4 space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Holder (Media User)</label>
              <Select value={holderId} onValueChange={setHolderId}>
                <SelectTrigger className="bg-[#1A1A1A] border-gray-700 text-white"><SelectValue placeholder="Select media user..." /></SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-gray-700">
                  {mediaUsers.map(u => <SelectItem key={u.id} value={u.id} className="text-white">{u.full_name || u.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">File Name</label>
                <Input value={form.file_name} onChange={e => setForm(f => ({ ...f, file_name: e.target.value }))} className="bg-[#1A1A1A] border-gray-700 text-white" placeholder="photo.jpg" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Asset Type</label>
                <Select value={form.asset_type} onValueChange={v => setForm(f => ({ ...f, asset_type: v }))}>
                  <SelectTrigger className="bg-[#1A1A1A] border-gray-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-gray-700">
                    {['photo','video','audio','document'].map(t => <SelectItem key={t} value={t} className="text-white">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Drive File ID / URL</label>
              <Input value={form.drive_file_id} onChange={e => setForm(f => ({ ...f, drive_file_id: e.target.value }))} className="bg-[#1A1A1A] border-gray-700 text-white" placeholder="Drive file ID or URL" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Title</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="bg-[#1A1A1A] border-gray-700 text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Description</label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="bg-[#1A1A1A] border-gray-700 text-white resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Tag Subject Type</label>
                <Select value={linkSubjectType} onValueChange={setLinkSubjectType}>
                  <SelectTrigger className="bg-[#1A1A1A] border-gray-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-gray-700">
                    {['driver','team','track','series','event','session'].map(t => <SelectItem key={t} value={t} className="text-white">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Subject ID</label>
                <Input value={linkSubjectId} onChange={e => setLinkSubjectId(e.target.value)} className="bg-[#1A1A1A] border-gray-700 text-white" placeholder={eventId || 'paste id...'} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" className="border-gray-700 text-gray-300" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.file_name || !holderId} className="bg-blue-700 hover:bg-blue-600">
                <Upload className="w-3 h-3 mr-1" />{createMutation.isPending ? 'Logging...' : 'Log Asset'}
              </Button>
            </div>
          </div>
        )}

        {recentAssets.length === 0 ? (
          <p className="text-gray-500 text-sm">No assets logged yet.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recentAssets.map(a => (
              <div key={a.id} className="bg-[#262626] border border-gray-700 rounded p-2 flex items-center justify-between gap-2">
                <div>
                  <p className="text-white text-xs">{a.title || a.file_name}</p>
                  <p className="text-gray-500 text-xs">{a.asset_type}</p>
                </div>
                <Badge className="bg-gray-700 text-gray-300 text-xs">{a.asset_type}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}