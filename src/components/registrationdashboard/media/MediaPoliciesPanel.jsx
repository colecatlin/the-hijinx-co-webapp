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

const BLANK = { policy_type: 'general', title: '', body_rich_text: '', active: true };

export default function MediaPoliciesPanel({ dashboardContext, invalidateAfterOperation }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const queryClient = useQueryClient();

  const entityId = dashboardContext?.orgId;
  const entityType = dashboardContext?.orgType;

  const { data: policies = [] } = useQuery({
    queryKey: ['policies', { entityId }],
    queryFn: () => base44.entities.Policy.filter({ entity_id: entityId }),
    enabled: !!entityId,
  });

  const openCreate = () => { setEditing('new'); setForm({ ...BLANK, entity_id: entityId, entity_type: entityType }); };
  const openEdit = (p) => { setEditing(p.id); setForm({ ...p }); };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing === 'new') {
        // Auto-increment version per entity+type
        const sameType = policies.filter(p => p.policy_type === form.policy_type);
        const maxVer = sameType.reduce((m, p) => Math.max(m, p.version || 1), 0);
        await base44.entities.Policy.create({ ...form, entity_id: entityId, entity_type: entityType, version: maxVer + 1, created_at: new Date().toISOString() });
      } else {
        await base44.entities.Policy.update(editing, { ...form, updated_at: new Date().toISOString() });
      }
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      invalidateAfterOperation?.('policy_updated');
      toast.success('Policy saved');
      setEditing(null);
    },
  });

  return (
    <Card className="bg-[#1A1A1A] border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-sm">Policies</CardTitle>
          <Button size="sm" onClick={openCreate} className="h-7 px-2 text-xs bg-blue-800 hover:bg-blue-700"><Plus className="w-3 h-3 mr-1" />Add</Button>
        </div>
      </CardHeader>
      <CardContent>
        {policies.length === 0 ? (
          <p className="text-gray-500 text-sm">No policies yet.</p>
        ) : (
          <div className="space-y-2">
            {policies.map(p => (
              <div key={p.id} className="bg-[#262626] border border-gray-700 rounded p-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-white text-xs font-medium">{p.title}</p>
                  <p className="text-gray-500 text-xs">{p.policy_type} • v{p.version}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={p.active ? 'bg-green-900/60 text-green-300' : 'bg-gray-700 text-gray-400'}>{p.active ? 'Active' : 'Inactive'}</Badge>
                  <Button size="sm" variant="outline" className="h-6 px-2 text-xs border-gray-700 text-gray-300" onClick={() => openEdit(p)}>Edit</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="bg-[#262626] border-gray-700 max-w-lg">
          <DialogHeader><DialogTitle className="text-white">{editing === 'new' ? 'New Policy' : 'Edit Policy'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Type</label>
              <Select value={form.policy_type} onValueChange={v => setForm(f => ({ ...f, policy_type: v }))}>
                <SelectTrigger className="bg-[#1A1A1A] border-gray-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-gray-700">
                  {['general','liability','insurance','conduct','operational','media_rules'].map(t => (
                    <SelectItem key={t} value={t} className="text-white">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Title</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="bg-[#1A1A1A] border-gray-700 text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Body</label>
              <Textarea value={form.body_rich_text} onChange={e => setForm(f => ({ ...f, body_rich_text: e.target.value }))} rows={5} className="bg-[#1A1A1A] border-gray-700 text-white resize-none" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={!!form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} id="policyActive" />
              <label htmlFor="policyActive" className="text-xs text-gray-300">Active</label>
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