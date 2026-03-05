import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

const BLANK = { title: '', requirement_type: 'other', enforcement_level: 'soft', due_rule_type: 'none', active: true, usage_rights_text: '' };

export default function MediaDeliverablesPanel({ dashboardContext, selectedEvent, invalidateAfterOperation }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const queryClient = useQueryClient();

  const entityId = dashboardContext?.orgId;
  const entityType = dashboardContext?.orgType;
  const eventId = selectedEvent?.id;

  const { data: requirements = [] } = useQuery({
    queryKey: ['deliverables', { entityId, eventId }],
    queryFn: async () => {
      const all = await base44.entities.DeliverableRequirement.list();
      return all.filter(r => r.entity_id === entityId || (eventId && r.event_id === eventId));
    },
    enabled: !!entityId,
  });

  const openCreate = () => { setEditing('new'); setForm({ ...BLANK }); };
  const openEdit = (r) => { setEditing(r.id); setForm({ ...r }); };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing === 'new') {
        await base44.entities.DeliverableRequirement.create({ ...form, entity_id: entityId, entity_type: entityType, ...(eventId && { event_id: eventId }), created_at: new Date().toISOString() });
      } else {
        await base44.entities.DeliverableRequirement.update(editing, { ...form, updated_at: new Date().toISOString() });
      }
      queryClient.invalidateQueries({ queryKey: ['deliverables'] });
      invalidateAfterOperation?.('deliverable_updated');
      toast.success('Requirement saved');
      setEditing(null);
    },
  });

  return (
    <Card className="bg-[#1A1A1A] border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-sm">Deliverable Requirements</CardTitle>
          <Button size="sm" onClick={openCreate} className="h-7 px-2 text-xs bg-blue-800 hover:bg-blue-700"><Plus className="w-3 h-3 mr-1" />Add</Button>
        </div>
      </CardHeader>
      <CardContent>
        {requirements.length === 0 ? (
          <p className="text-gray-500 text-sm">No deliverable requirements yet.</p>
        ) : (
          <div className="space-y-2">
            {requirements.map(r => (
              <div key={r.id} className="bg-[#262626] border border-gray-700 rounded p-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-white text-xs font-medium">{r.title}</p>
                  <p className="text-gray-500 text-xs">{r.requirement_type} • {r.enforcement_level}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={r.active ? 'bg-green-900/60 text-green-300' : 'bg-gray-700 text-gray-400'}>{r.active ? 'Active' : 'Off'}</Badge>
                  <Button size="sm" variant="outline" className="h-6 px-2 text-xs border-gray-700 text-gray-300" onClick={() => openEdit(r)}>Edit</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="bg-[#262626] border-gray-700 max-w-lg">
          <DialogHeader><DialogTitle className="text-white">{editing === 'new' ? 'New Requirement' : 'Edit Requirement'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Title</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="bg-[#1A1A1A] border-gray-700 text-white" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Type</label>
                <Select value={form.requirement_type} onValueChange={v => setForm(f => ({ ...f, requirement_type: v }))}>
                  <SelectTrigger className="bg-[#1A1A1A] border-gray-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-gray-700">
                    {['photo_set','video_clips','highlight_edit','raw_dump','social_recap','interview','other'].map(t => (
                      <SelectItem key={t} value={t} className="text-white">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Enforcement</label>
                <Select value={form.enforcement_level} onValueChange={v => setForm(f => ({ ...f, enforcement_level: v }))}>
                  <SelectTrigger className="bg-[#1A1A1A] border-gray-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-gray-700">
                    {['soft','conditional','hard'].map(l => (
                      <SelectItem key={l} value={l} className="text-white">{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Usage Rights Text (optional)</label>
              <Textarea value={form.usage_rights_text || ''} onChange={e => setForm(f => ({ ...f, usage_rights_text: e.target.value }))} rows={3} className="bg-[#1A1A1A] border-gray-700 text-white resize-none" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={!!form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} id="reqActive" />
              <label htmlFor="reqActive" className="text-xs text-gray-300">Active</label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" className="border-gray-700 text-gray-300" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.title} className="bg-blue-700 hover:bg-blue-600">Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}