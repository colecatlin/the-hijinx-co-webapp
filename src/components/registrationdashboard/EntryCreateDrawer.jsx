import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function EntryCreateDrawer({
  open,
  onOpenChange,
  selectedEvent,
  drivers,
  teams,
  classes,
  onCreated,
}) {
  const [formData, setFormData] = useState({
    driver_id: '',
    car_number: '',
    series_class_id: '',
    team_id: '',
    transponder_id: '',
    entry_status: 'Registered',
    payment_status: 'Unpaid',
    tech_status: 'Not Inspected',
  });
  const [saving, setSaving] = useState(false);

  const handleReset = () => {
    setFormData({
      driver_id: '',
      car_number: '',
      series_class_id: '',
      team_id: '',
      transponder_id: '',
      entry_status: 'Registered',
      payment_status: 'Unpaid',
      tech_status: 'Not Inspected',
    });
  };

  const handleOpenChange = (newOpen) => {
    if (!newOpen) handleReset();
    onOpenChange(newOpen);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.driver_id) {
      toast.error('Driver is required');
      return;
    }
    if (!formData.car_number) {
      toast.error('Car number is required');
      return;
    }

    setSaving(true);
    try {
      const res = await base44.functions.invoke('upsertOperationalEntry', {
        payload: {
          event_id: selectedEvent.id,
          driver_id: formData.driver_id,
          car_number: formData.car_number,
          series_id: selectedEvent.series_id || undefined,
          series_class_id: formData.series_class_id || undefined,
          team_id: formData.team_id || undefined,
          transponder_id: formData.transponder_id || undefined,
          entry_status: formData.entry_status,
          payment_status: formData.payment_status,
          tech_status: formData.tech_status,
        },
        source_path: 'registration_dashboard',
      });
      if (res?.data?.error) throw new Error(res.data.error);
      const entry = res.data?.record;
      const action = res.data?.action;

      toast.success(action === 'updated' ? 'Entry updated (existing registration found)' : 'Entry created');
      handleReset();
      handleOpenChange(false);
      if (onCreated) onCreated();
    } catch (err) {
      toast.error(`Failed to create entry: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-[#262626] border-gray-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Add Entry</DialogTitle>
          <DialogDescription className="text-gray-400">
            Create a new entry for this event
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Driver */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Driver *</label>
            <Select value={formData.driver_id} onValueChange={(v) => setFormData({ ...formData, driver_id: v })}>
              <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs">
                <SelectValue placeholder="Select driver..." />
              </SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700">
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.first_name} {d.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Car number */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Car Number *</label>
            <Input
              type="text"
              value={formData.car_number}
              onChange={(e) => setFormData({ ...formData, car_number: e.target.value })}
              placeholder="e.g., 42"
              className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs"
            />
          </div>

          {/* Class */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Class</label>
            <Select value={formData.series_class_id} onValueChange={(v) => setFormData({ ...formData, series_class_id: v })}>
              <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs">
                <SelectValue placeholder="Select class..." />
              </SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700">
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.class_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Team */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Team</label>
            <Select value={formData.team_id} onValueChange={(v) => setFormData({ ...formData, team_id: v })}>
              <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs">
                <SelectValue placeholder="Select team..." />
              </SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700">
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Transponder */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Transponder ID</label>
            <Input
              type="text"
              value={formData.transponder_id}
              onChange={(e) => setFormData({ ...formData, transponder_id: e.target.value })}
              placeholder="e.g., T12345"
              className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs"
            />
          </div>

          {/* Entry status */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Entry Status</label>
            <Select value={formData.entry_status} onValueChange={(v) => setFormData({ ...formData, entry_status: v })}>
              <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700">
                <SelectItem value="Registered">Registered</SelectItem>
                <SelectItem value="Checked In">Checked In</SelectItem>
                <SelectItem value="Teched">Teched</SelectItem>
                <SelectItem value="Withdrawn">Withdrawn</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment status */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Payment Status</label>
            <Select value={formData.payment_status} onValueChange={(v) => setFormData({ ...formData, payment_status: v })}>
              <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700">
                <SelectItem value="Unpaid">Unpaid</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Refunded">Refunded</SelectItem>
                <SelectItem value="Comped">Comped</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tech status */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Tech Status</label>
            <Select value={formData.tech_status} onValueChange={(v) => setFormData({ ...formData, tech_status: v })}>
              <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700">
                <SelectItem value="Not Inspected">Not Inspected</SelectItem>
                <SelectItem value="Passed">Passed</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
                <SelectItem value="Recheck Required">Recheck Required</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={saving}
              className="border-gray-700 text-gray-300 h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 h-8 text-xs"
            >
              {saving ? 'Creating...' : 'Create Entry'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}