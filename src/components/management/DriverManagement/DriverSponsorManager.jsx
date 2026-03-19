import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Star } from 'lucide-react';
import { toast } from 'sonner';

const SPONSOR_TYPES = ['Primary', 'Associate', 'Personal', 'Apparel', 'Technical'];
const BLANK = { sponsor_name: '', logo_url: '', website_url: '', sponsor_type: '', start_date: '', end_date: '' };

const TYPE_COLORS = {
  Primary: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Associate: 'bg-blue-50 text-blue-700 border-blue-200',
  Personal: 'bg-purple-50 text-purple-700 border-purple-200',
  Apparel: 'bg-pink-50 text-pink-700 border-pink-200',
  Technical: 'bg-gray-100 text-gray-700 border-gray-200',
};

function SponsorForm({ initial, driverId, onClose }) {
  const [form, setForm] = useState({ ...BLANK, ...initial });
  const qc = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        driver_id: driverId,
        sponsor_name: data.sponsor_name,
        logo_url: data.logo_url || null,
        website_url: data.website_url || null,
        sponsor_type: data.sponsor_type || null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
      };
      if (initial?.id) return base44.entities.DriverSponsor.update(initial.id, payload);
      return base44.entities.DriverSponsor.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driverSponsors', driverId] });
      toast.success(initial?.id ? 'Sponsor updated' : 'Sponsor added');
      onClose();
    },
  });

  const uploadLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(prev => ({ ...prev, logo_url: file_url }));
      toast.success('Logo uploaded');
    } catch { toast.error('Upload failed'); }
  };

  const f = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-4">
      <div>
        <Label>Sponsor Name *</Label>
        <Input className="mt-1" value={form.sponsor_name} onChange={e => f('sponsor_name', e.target.value)} placeholder="Company or brand name" required />
      </div>

      <div>
        <Label>Sponsor Type</Label>
        <Select value={form.sponsor_type || ''} onValueChange={v => f('sponsor_type', v)}>
          <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
          <SelectContent>
            {SPONSOR_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Logo</Label>
        <div className="flex items-center gap-3 mt-1">
          {form.logo_url && <img src={form.logo_url} alt="logo" className="h-10 w-16 object-contain rounded border border-gray-200" />}
          <div className="flex-1">
            <Input value={form.logo_url} onChange={e => f('logo_url', e.target.value)} placeholder="https://…" className="text-sm mb-1" />
            <label className="cursor-pointer inline-flex items-center px-2 py-1 text-xs font-medium rounded border border-gray-300 bg-white hover:bg-gray-50">
              <input type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
              Upload Logo
            </label>
          </div>
        </div>
      </div>

      <div>
        <Label>Website URL</Label>
        <Input className="mt-1" value={form.website_url} onChange={e => f('website_url', e.target.value)} placeholder="https://…" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Start Date</Label>
          <Input className="mt-1" type="date" value={form.start_date} onChange={e => f('start_date', e.target.value)} />
        </div>
        <div>
          <Label>End Date</Label>
          <Input className="mt-1" type="date" value={form.end_date} onChange={e => f('end_date', e.target.value)} />
          <p className="text-xs text-gray-400 mt-0.5">Leave blank if still active</p>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.sponsor_name} className="bg-gray-900">
          {saveMutation.isPending ? 'Saving…' : initial?.id ? 'Update Sponsor' : 'Add Sponsor'}
        </Button>
      </div>
    </div>
  );
}

export default function DriverSponsorManager({ driverId }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();

  const { data: sponsors = [], isLoading } = useQuery({
    queryKey: ['driverSponsors', driverId],
    queryFn: () => base44.entities.DriverSponsor.filter({ driver_id: driverId }),
    enabled: !!driverId && driverId !== 'new',
    staleTime: 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DriverSponsor.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driverSponsors', driverId] });
      toast.success('Sponsor removed');
    },
  });

  const openAdd = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (s) => { setEditing(s); setDialogOpen(true); };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Sponsors</CardTitle>
          <CardDescription>Driver sponsor relationships</CardDescription>
        </div>
        {driverId !== 'new' && (
          <Button size="sm" onClick={openAdd} className="bg-gray-900 ml-4 flex-shrink-0">
            <Plus className="w-3.5 h-3.5 mr-1.5" />Add Sponsor
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {driverId === 'new' ? (
          <p className="text-sm text-gray-400">Save the driver record first, then add sponsors.</p>
        ) : isLoading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : sponsors.length === 0 ? (
          <div className="py-10 text-center border-2 border-dashed border-gray-200 rounded-lg">
            <Star className="w-7 h-7 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-500">No sponsors added yet.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={openAdd}>Add First Sponsor</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sponsors.map(sponsor => (
              <div key={sponsor.id} className="flex items-center gap-4 border border-gray-200 rounded-lg p-3 hover:border-gray-400 transition-colors">
                {sponsor.logo_url ? (
                  <img src={sponsor.logo_url} alt={sponsor.sponsor_name} className="w-14 h-10 object-contain rounded border border-gray-100 flex-shrink-0" />
                ) : (
                  <div className="w-14 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs flex-shrink-0 font-bold">
                    {sponsor.sponsor_name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[#232323] text-sm">{sponsor.sponsor_name}</span>
                    {sponsor.sponsor_type && (
                      <Badge className={`text-[10px] px-1.5 py-0 h-auto border ${TYPE_COLORS[sponsor.sponsor_type] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {sponsor.sponsor_type}
                      </Badge>
                    )}
                  </div>
                  {(sponsor.start_date || sponsor.end_date) && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {sponsor.start_date ? sponsor.start_date.slice(0, 4) : '?'} – {sponsor.end_date ? sponsor.end_date.slice(0, 4) : 'Present'}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(sponsor)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => deleteMutation.mutate(sponsor.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Sponsor' : 'Add Sponsor'}</DialogTitle>
          </DialogHeader>
          <SponsorForm initial={editing} driverId={driverId} onClose={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </Card>
  );
}