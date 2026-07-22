import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import LocationFieldsWithPicker from '@/components/shared/LocationFieldsWithPicker';
import DateInput from '@/components/shared/DateInput';

const DISCIPLINES = ['Off Road', 'Snowmobile', 'Asphalt Oval', 'Road Racing', 'Rallycross', 'Drag Racing', 'Mixed'];
const CAREER_STATUSES = ['Novice', 'Amateur', 'Semi-Professional', 'Professional'];

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  date_of_birth: '',
  contact_email: '',
  hometown_city: '',
  hometown_state: '',
  hometown_country: 'USA',
  primary_number: '',
  primary_discipline: '',
  career_status: '',
};

/**
 * QuickAddDriverDialog — focused "off the get go" creation modal mirroring the
 * Add Session dialog. Captures just enough to create a real driver record, then
 * hands off to the full driver drawer (via onCreated(id)) for images + details.
 */
export default function QuickAddDriverDialog({ open, onOpenChange, onCreated }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const setHometown = (field, value) => setForm((prev) => ({ ...prev, [`hometown_${field}`]: value }));

  const reset = () => setForm(EMPTY_FORM);

  const handleClose = (next) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const generateUniqueNumericId = async () => {
    let numericId;
    let isUnique = false;
    while (!isUnique) {
      numericId = String(Math.floor(Math.random() * 90000000) + 10000000);
      const existing = await base44.entities.Driver.filter({ numeric_id: numericId });
      isUnique = existing.length === 0;
    }
    return numericId;
  };

  const handleCreate = async () => {
    if (!form.first_name?.trim() || !form.last_name?.trim()) {
      toast.error('First and last name are required');
      return;
    }
    setCreating(true);
    try {
      const numericId = await generateUniqueNumericId();
      const slugBase = `${form.first_name} ${form.last_name}`
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const record = await base44.entities.Driver.create({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        date_of_birth: form.date_of_birth || undefined,
        contact_email: form.contact_email || undefined,
        hometown_city: form.hometown_city || undefined,
        hometown_state: form.hometown_state || undefined,
        hometown_country: form.hometown_country || 'USA',
        primary_number: form.primary_number || undefined,
        primary_discipline: form.primary_discipline || undefined,
        career_status: form.career_status || undefined,
        numeric_id: numericId,
        slug: `${slugBase}-${numericId}`,
      });
      await queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Driver created');
      handleClose(false);
      reset();
      if (onCreated) onCreated(record.id);
    } catch (error) {
      toast.error(`Failed to create driver: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#262626] border-gray-700 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">Add Driver</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-gray-500 -mt-2">
          Quick-create with the essentials — you can upload photos and add the rest right after.
        </p>
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          {/* First / Last name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 uppercase block mb-1">First Name *</label>
              <Input
                value={form.first_name}
                onChange={(e) => setField('first_name', e.target.value)}
                className="bg-[#1A1A1A] border-gray-600 text-white"
                placeholder="First name"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase block mb-1">Last Name *</label>
              <Input
                value={form.last_name}
                onChange={(e) => setField('last_name', e.target.value)}
                className="bg-[#1A1A1A] border-gray-600 text-white"
                placeholder="Last name"
              />
            </div>
          </div>

          {/* DOB */}
          <div>
            <label className="text-xs text-gray-400 uppercase block mb-1">Date of Birth</label>
            <DateInput
              value={form.date_of_birth}
              onChange={(value) => setField('date_of_birth', value)}
            />
          </div>

          {/* Hometown */}
          <div>
            <label className="text-xs text-gray-400 uppercase block mb-1">Hometown</label>
            <LocationFieldsWithPicker
              values={{
                city: form.hometown_city,
                state: form.hometown_state,
                country: form.hometown_country,
              }}
              onFieldChange={setHometown}
              showCoordinates={false}
            />
          </div>

          {/* Car # + Discipline */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 uppercase block mb-1">Car / Bib Number</label>
              <Input
                value={form.primary_number}
                onChange={(e) => setField('primary_number', e.target.value)}
                className="bg-[#1A1A1A] border-gray-600 text-white"
                placeholder="e.g. 44"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase block mb-1">Primary Discipline</label>
              <Select
                value={form.primary_discipline || '__none'}
                onValueChange={(v) => setField('primary_discipline', v === '__none' ? '' : v)}
              >
                <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white">
                  <SelectValue placeholder="Select discipline" />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  <SelectItem value="__none">None</SelectItem>
                  {DISCIPLINES.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Career status + email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 uppercase block mb-1">Career Status</label>
              <Select
                value={form.career_status || '__none'}
                onValueChange={(v) => setField('career_status', v === '__none' ? '' : v)}
              >
                <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  <SelectItem value="__none">None</SelectItem>
                  {CAREER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase block mb-1">Contact Email</label>
              <Input
                type="email"
                value={form.contact_email}
                onChange={(e) => setField('contact_email', e.target.value)}
                className="bg-[#1A1A1A] border-gray-600 text-white"
                placeholder="Email (optional)"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            className="border-gray-700 text-gray-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {creating ? 'Creating…' : 'Create Driver'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}