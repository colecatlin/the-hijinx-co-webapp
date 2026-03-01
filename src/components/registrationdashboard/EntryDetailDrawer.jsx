import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, AlertCircle } from 'lucide-react';

export default function EntryDetailDrawer({ entry, onClose, onSave }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(entry);

  const { data: driver } = useQuery({
    queryKey: ['driver', entry.driver_id],
    queryFn: () => base44.entities.Driver.list({ id: entry.driver_id }),
  });

  const { data: event } = useQuery({
    queryKey: ['event', entry.event_id],
    queryFn: () => base44.entities.Event.list({ id: entry.event_id }),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Entry.update(entry.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      onSave();
    },
  });

  const getComplianceFlags = (data) => {
    const flags = [];
    if (!data.waiver_verified) flags.push('Missing Waiver');
    if (data.payment_status === 'Unpaid') flags.push('Unpaid');
    if (
      data.tech_status === 'NotInspected' ||
      data.tech_status === 'RecheckRequired'
    )
      flags.push('Tech Pending');
    if (!data.transponder_id) flags.push('Missing Transponder');
    return flags;
  };

  const flags = useMemo(() => getComplianceFlags(formData), [formData]);

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50">
      {/* Drawer overlay */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="fixed right-0 top-0 bottom-0 w-96 bg-[#0A0A0A] border-l border-gray-800 shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-100">Entry Details</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Links section */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Links
            </h3>
            <div className="space-y-2">
              {driver && driver.length > 0 && (
                <a
                  href={createPageUrl(`DriverProfile?driverId=${entry.driver_id}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-3 py-2 bg-gray-900 hover:bg-gray-800 rounded text-xs font-medium text-blue-400 transition-colors"
                >
                  Driver Profile
                </a>
              )}
              {event && event.length > 0 && (
                <a
                  href={createPageUrl(`EventProfile?eventId=${entry.event_id}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-3 py-2 bg-gray-900 hover:bg-gray-800 rounded text-xs font-medium text-blue-400 transition-colors"
                >
                  Event Profile
                </a>
              )}
            </div>
          </div>

          {/* Editable fields */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Entry Details
            </h3>

            <div>
              <label className="text-xs font-medium text-gray-400 block mb-1">
                Car Number
              </label>
              <Input
                type="text"
                value={formData.car_number}
                onChange={(e) =>
                  setFormData({ ...formData, car_number: e.target.value })
                }
                className="bg-[#262626] border-gray-700"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-400 block mb-1">
                Transponder ID
              </label>
              <Input
                type="text"
                value={formData.transponder_id || ''}
                onChange={(e) =>
                  setFormData({ ...formData, transponder_id: e.target.value })
                }
                placeholder="Optional"
                className="bg-[#262626] border-gray-700"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-400 block mb-1">
                Entry Status
              </label>
              <Select
                value={formData.entry_status}
                onValueChange={(value) =>
                  setFormData({ ...formData, entry_status: value })
                }
              >
                <SelectTrigger className="bg-[#262626] border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Registered">Registered</SelectItem>
                  <SelectItem value="CheckedIn">Checked In</SelectItem>
                  <SelectItem value="Withdrawn">Withdrawn</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-400 block mb-1">
                Payment Status
              </label>
              <Select
                value={formData.payment_status}
                onValueChange={(value) =>
                  setFormData({ ...formData, payment_status: value })
                }
              >
                <SelectTrigger className="bg-[#262626] border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-400 block mb-1">
                Tech Status
              </label>
              <Select
                value={formData.tech_status}
                onValueChange={(value) =>
                  setFormData({ ...formData, tech_status: value })
                }
              >
                <SelectTrigger className="bg-[#262626] border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NotInspected">Not Inspected</SelectItem>
                  <SelectItem value="Passed">Passed</SelectItem>
                  <SelectItem value="Failed">Failed</SelectItem>
                  <SelectItem value="RecheckRequired">Recheck Required</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3 bg-gray-900 px-3 py-2 rounded">
              <input
                type="checkbox"
                id="waiver"
                checked={formData.waiver_verified}
                onChange={(e) =>
                  setFormData({ ...formData, waiver_verified: e.target.checked })
                }
                className="w-4 h-4"
              />
              <label htmlFor="waiver" className="text-xs font-medium text-gray-300">
                Waiver Verified
              </label>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-400 block mb-1">
                Wristband Count
              </label>
              <Input
                type="number"
                value={formData.wristband_count || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    wristband_count: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                placeholder="Optional"
                className="bg-[#262626] border-gray-700"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-400 block mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Admin notes..."
                rows={4}
                className="w-full bg-[#262626] border border-gray-700 rounded px-3 py-2 text-xs text-gray-300 resize-none"
              />
            </div>
          </div>

          {/* Compliance flags */}
          {flags.length > 0 && (
            <div className="space-y-2 bg-red-900/10 border border-red-900/30 px-4 py-3 rounded">
              <h3 className="text-xs font-semibold text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Compliance Flags
              </h3>
              <div className="flex flex-wrap gap-2">
                {flags.map((flag) => (
                  <span
                    key={flag}
                    className="px-2 py-1 bg-red-900/30 border border-red-900/50 text-red-300 text-xs font-medium rounded"
                  >
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-800 px-6 py-4 flex gap-3 bg-[#0A0A0A]">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button onClick={onClose} variant="outline" className="border-gray-700">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}