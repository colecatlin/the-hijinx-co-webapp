import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

const BLANK = { title: '', body_rich_text: '', active: true };

export default function MediaWaiversPanel({ dashboardContext, selectedEvent, invalidateAfterOperation }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const queryClient = useQueryClient();

  const entityId = dashboardContext?.orgId;
  const entityType = dashboardContext?.orgType;
  const eventId = selectedEvent?.id;

  const { data: templates = [] } = useQuery({
    queryKey: ['waivers', { entityId }],
    queryFn: () => base44.entities.WaiverTemplate.filter({ entity_id: entityId }),
    enabled: !!entityId,
  });

  const { data: signatures = [] } = useQuery({
    queryKey: ['waiverSignatures', { eventId }],
    queryFn: () => base44.entities.WaiverSignature.filter({ event_id: eventId }),
    enabled: !!eventId,
  });

  const openCreate = () => { setEditing('new'); setForm({ ...BLANK }); };
  const openEdit = (t) => { setEditing(t.id); setForm({ ...t }); };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing === 'new') {
        await base44.entities.WaiverTemplate.create({ ...form, entity_id: entityId, entity_type: entityType, created_at: new Date().toISOString() });
      } else {
        await base44.entities.WaiverTemplate.update(editing, { ...form, updated_at: new Date().toISOString() });
      }
      queryClient.invalidateQueries({ queryKey: ['waivers'] });
      invalidateAfterOperation?.('waiver_updated');
      toast.success('Waiver template saved');
      setEditing(null);
    },
  });

  return (
    <Card className="bg-[#1A1A1A] border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-sm">Waiver Templates</CardTitle>
          <Button size="sm" onClick={openCreate} className="h-7 px-2 text-xs bg-blue-800 hover:bg-blue-700"><Plus className="w-3 h-3 mr-1" />Add</Button>
        </div>
      </CardHeader>
      <CardContent>
        {eventId && (
          <p className="text-xs text-gray-500 mb-3">Event signatures: {signatures.length}</p>
        )}
        {templates.length === 0 ? (
          <p className="text-gray-500 text-sm">No waiver templates yet.</p>
        ) : (
          <div className="space-y-2">
            {templates.map(t => (
              <div key={t.id} className="bg-[#262626] border border-gray-700 rounded p-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-white text-xs font-medium">{t.title}</p>
                  <p className="text-gray-500 text-xs">v{t.version || 1}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={t.active ? 'bg-green-900/60 text-green-300' : 'bg-gray-700 text-gray-400'}>{t.active ? 'Active' : 'Inactive'}</Badge>
                  <Button size="sm" variant="outline" className="h-6 px-2 text-xs border-gray-700 text-gray-300" onClick={() => openEdit(t)}>Edit</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="bg-[#262626] border-gray-700 max-w-lg">
          <DialogHeader><DialogTitle className="text-white">{editing === 'new' ? 'New Waiver Template' : 'Edit Waiver Template'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Title</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="bg-[#1A1A1A] border-gray-700 text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Body</label>
              <Textarea value={form.body_rich_text} onChange={e => setForm(f => ({ ...f, body_rich_text: e.target.value }))} rows={6} className="bg-[#1A1A1A] border-gray-700 text-white resize-none" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={!!form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} id="waiverActive" />
              <label htmlFor="waiverActive" className="text-xs text-gray-300">Active</label>
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