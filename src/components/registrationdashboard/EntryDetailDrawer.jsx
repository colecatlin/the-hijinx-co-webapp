import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Check, LogOut, Trash2 } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function EntryDetailDrawer({
  open,
  onOpenChange,
  entry,
  drivers = [],
  teams = [],
  seriesClasses = [],
  onSave,
  onDelete,
  saving = false,
}) {
  const [form, setForm] = useState({});

  useEffect(() => {
    if (entry) setForm({ ...entry });
  }, [entry]);

  if (!entry) return null;

  const driver = drivers.find((d) => d.id === entry.driver_id);
  const team = teams.find((t) => t.id === entry.team_id);

  const patch = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleQuickAction = (updates) => {
    const merged = { ...form, ...updates };
    setForm(merged);
    onSave(entry.id, updates);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="bg-[#1A1A1A] border-gray-700 w-full sm:w-[460px] overflow-y-auto flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-white">Entry Details</SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-5 mt-4 overflow-y-auto pr-1">
          {/* Links */}
          <div className="flex gap-2 flex-wrap">
            {driver && (
              <a
                href={createPageUrl(`DriverProfile?${driver.slug ? `slug=${driver.slug}` : `id=${driver.id}`}`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="outline" className="border-blue-700 text-blue-400 hover:bg-blue-900/20">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  {driver.first_name} {driver.last_name}
                </Button>
              </a>
            )}
            {team && (
              <a
                href={createPageUrl(`TeamProfile?id=${team.id}`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  {team.name}
                </Button>
              </a>
            )}
          </div>

          {/* Quick toggles */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-green-700 text-green-400 hover:bg-green-900/20"
              onClick={() => handleQuickAction({ entry_status: 'Checked In' })}
              disabled={form.entry_status === 'Checked In'}
            >
              <Check className="w-3 h-3 mr-1" /> Check In
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-emerald-700 text-emerald-400 hover:bg-emerald-900/20"
              onClick={() => handleQuickAction({ payment_status: 'Paid' })}
              disabled={form.payment_status === 'Paid'}
            >
              <Check className="w-3 h-3 mr-1" /> Mark Paid
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-purple-700 text-purple-400 hover:bg-purple-900/20"
              onClick={() => handleQuickAction({ tech_status: 'Passed' })}
              disabled={form.tech_status === 'Passed'}
            >
              <Check className="w-3 h-3 mr-1" /> Mark Teched
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-yellow-700 text-yellow-400 hover:bg-yellow-900/20"
              onClick={() => handleQuickAction({ entry_status: 'Withdrawn' })}
              disabled={form.entry_status === 'Withdrawn'}
            >
              <LogOut className="w-3 h-3 mr-1" /> Withdraw
            </Button>
          </div>

          {/* Editable fields */}
          <div className="space-y-3 border-t border-gray-700 pt-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Car #</label>
              <Input value={form.car_number || ''} onChange={(e) => patch('car_number', e.target.value)} className="bg-[#111] border-gray-600 text-white h-8" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Transponder ID</label>
              <Input value={form.transponder_id || ''} onChange={(e) => patch('transponder_id', e.target.value)} className="bg-[#111] border-gray-600 text-white h-8" />
            </div>
            {seriesClasses.length > 0 && (
              <div>
                <label className="text-xs text-gray-400 block mb-1">Class</label>
                <Select value={form.series_class_id || ''} onValueChange={(v) => patch('series_class_id', v)}>
                  <SelectTrigger className="bg-[#111] border-gray-600 text-white h-8"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent className="bg-[#262626] border-gray-700">
                    <SelectItem value={null}>Unassigned</SelectItem>
                    {seriesClasses.map((sc) => <SelectItem key={sc.id} value={sc.id}>{sc.class_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Entry Status</label>
              <Select value={form.entry_status || ''} onValueChange={(v) => patch('entry_status', v)}>
                <SelectTrigger className="bg-[#111] border-gray-600 text-white h-8"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  <SelectItem value="Registered">Registered</SelectItem>
                  <SelectItem value="Checked In">Checked In</SelectItem>
                  <SelectItem value="Teched">Teched</SelectItem>
                  <SelectItem value="Withdrawn">Withdrawn</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Payment Status</label>
              <Select value={form.payment_status || ''} onValueChange={(v) => patch('payment_status', v)}>
                <SelectTrigger className="bg-[#111] border-gray-600 text-white h-8"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Tech Status</label>
              <Select value={form.tech_status || ''} onValueChange={(v) => patch('tech_status', v)}>
                <SelectTrigger className="bg-[#111] border-gray-600 text-white h-8"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  <SelectItem value="Not Inspected">Not Inspected</SelectItem>
                  <SelectItem value="Passed">Passed</SelectItem>
                  <SelectItem value="Failed">Failed</SelectItem>
                  <SelectItem value="Recheck Required">Recheck Required</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Flags (comma-separated)</label>
              <Input value={form.flags || ''} onChange={(e) => patch('flags', e.target.value)} className="bg-[#111] border-gray-600 text-white h-8" placeholder="e.g. missing_transponder" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Notes</label>
              <Textarea value={form.notes || ''} onChange={(e) => patch('notes', e.target.value)} className="bg-[#111] border-gray-600 text-white" rows={3} />
            </div>
          </div>
        </div>

        <SheetFooter className="pt-4 border-t border-gray-700 flex items-center justify-between gap-2 flex-row">
          <Button onClick={() => onDelete(entry.id)} variant="ghost" size="sm" className="text-red-400 hover:bg-red-900/20">
            <Trash2 className="w-4 h-4" />
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="border-gray-700 text-gray-300">Cancel</Button>
            <Button size="sm" onClick={() => onSave(entry.id, form)} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}