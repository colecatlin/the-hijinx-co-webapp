/**
 * Entry Detail Drawer
 * View and edit entry details, manage status and compliance
 */
import React, { useState, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Trash2, Save } from 'lucide-react';

export default function EntryDetailDrawer({
  open,
  onOpenChange,
  entry,
  driver,
  team,
  onSave,
  onDelete,
}) {
  const [formData, setFormData] = useState(entry || {});

  // Sync form when entry changes
  React.useEffect(() => {
    if (entry) {
      setFormData(entry);
    }
  }, [entry, open]);

  if (!entry) return null;

  const handleSave = async () => {
    try {
      // Build patch with only fields that exist on original entry
      const patch = {};
      const fieldsToCheck = [
        'car_number',
        'transponder_id',
        'entry_status',
        'payment_status',
        'tech_status',
        'notes',
        'flags',
      ];

      fieldsToCheck.forEach((field) => {
        if (field in entry || field in formData) {
          patch[field] = formData[field] ?? entry[field];
        }
      });

      await onSave(patch);
      toast.success('Entry updated');
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving entry:', err);
      toast.error('Failed to save entry');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    try {
      await onDelete();
      toast.success('Entry deleted');
      onOpenChange(false);
    } catch (err) {
      console.error('Error deleting entry:', err);
      toast.error('Failed to delete entry');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-[#262626] border-gray-700 w-full sm:w-[450px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-white">
            {driver?.first_name} {driver?.last_name}
          </SheetTitle>
          <SheetDescription className="text-gray-400">
            Car #{formData.car_number || 'N/A'}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Driver and Team Info */}
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">
                Driver
              </label>
              <p className="text-sm text-gray-300">
                {driver?.first_name} {driver?.last_name}
              </p>
            </div>
            {team && (
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">
                  Team
                </label>
                <p className="text-sm text-gray-300">{team.name}</p>
              </div>
            )}
          </div>

          <Separator className="bg-gray-700" />

          {/* Editable Fields */}
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">
                Car Number
              </label>
              <Input
                value={formData.car_number || ''}
                onChange={(e) =>
                  setFormData({ ...formData, car_number: e.target.value })
                }
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">
                Transponder ID
              </label>
              <Input
                value={formData.transponder_id || ''}
                onChange={(e) =>
                  setFormData({ ...formData, transponder_id: e.target.value })
                }
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">
                Entry Status
              </label>
              <Select
                value={formData.entry_status || 'Registered'}
                onValueChange={(value) =>
                  setFormData({ ...formData, entry_status: value })
                }
              >
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  <SelectItem value="Registered" className="text-white">
                    Registered
                  </SelectItem>
                  <SelectItem value="Checked In" className="text-white">
                    Checked In
                  </SelectItem>
                  <SelectItem value="Teched" className="text-white">
                    Teched
                  </SelectItem>
                  <SelectItem value="Withdrawn" className="text-white">
                    Withdrawn
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">
                Payment Status
              </label>
              <Select
                value={formData.payment_status || 'Unpaid'}
                onValueChange={(value) =>
                  setFormData({ ...formData, payment_status: value })
                }
              >
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  <SelectItem value="Unpaid" className="text-white">
                    Unpaid
                  </SelectItem>
                  <SelectItem value="Paid" className="text-white">
                    Paid
                  </SelectItem>
                  <SelectItem value="Refunded" className="text-white">
                    Refunded
                  </SelectItem>
                  <SelectItem value="Comped" className="text-white">
                    Comped
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">
                Tech Status
              </label>
              <Select
                value={formData.tech_status || 'Not Inspected'}
                onValueChange={(value) =>
                  setFormData({ ...formData, tech_status: value })
                }
              >
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  <SelectItem value="Not Inspected" className="text-white">
                    Not Inspected
                  </SelectItem>
                  <SelectItem value="Failed" className="text-white">
                    Failed
                  </SelectItem>
                  <SelectItem value="Passed" className="text-white">
                    Passed
                  </SelectItem>
                  <SelectItem value="Recheck Required" className="text-white">
                    Recheck Required
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">
                Notes
              </label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="bg-gray-900 border-gray-700 text-white h-24"
              />
            </div>
          </div>

          <Separator className="bg-gray-700" />

          {/* Actions */}
          <div className="flex gap-2 justify-between">
            <Button
              onClick={handleDelete}
              variant="destructive"
              size="sm"
              className="bg-red-900/40 text-red-300 hover:bg-red-900/60 border border-red-700"
            >
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
            <div className="flex gap-2">
              <Button
                onClick={() => onOpenChange(false)}
                variant="outline"
                size="sm"
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="w-4 h-4 mr-1" /> Save
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}