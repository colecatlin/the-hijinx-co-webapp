import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, Download } from 'lucide-react';

export default function EntriesBulkActions({
  selectedEntries,
  entries,
  eventClasses,
  onUpdateComplete,
}) {
  const [action, setAction] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [transponderList, setTransponderList] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const queryClient = useQueryClient();

  const updateEntryMutation = useMutation({
    mutationFn: async (updates) => {
      const selectedArray = Array.from(selectedEntries);
      const promises = selectedArray.map((id) =>
        base44.entities.Entry.update(id, updates)
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      onUpdateComplete();
      setAction('');
      setDropdownOpen(false);
    },
  });

  const handleWithdraw = async () => {
    await updateEntryMutation.mutateAsync({ entry_status: 'Withdrawn' });
    setShowDialog(false);
  };

  const handleChangeClass = async () => {
    if (!selectedClass) return;
    await updateEntryMutation.mutateAsync({ event_class_id: selectedClass });
    setShowDialog(false);
  };

  const handleAssignTransponders = async () => {
    const transponders = transponderList
      .split('\n')
      .map((t) => t.trim())
      .filter((t) => t);

    if (transponders.length !== selectedEntries.size) {
      alert(`You provided ${transponders.length} transponders but selected ${selectedEntries.size} entries.`);
      return;
    }

    const selectedArray = Array.from(selectedEntries);
    const promises = selectedArray.map((id, idx) =>
      base44.entities.Entry.update(id, { transponder_id: transponders[idx] })
    );
    await Promise.all(promises);
    setShowDialog(false);
  };

  const handleExportSelected = () => {
    const selectedArray = Array.from(selectedEntries);
    const selectedEntriesData = entries.filter((e) => selectedArray.includes(e.id));

    const csv = [
      ['Car Number', 'Transponder ID', 'Entry Status', 'Payment Status', 'Tech Status'].join(','),
      ...selectedEntriesData.map((e) =>
        [e.car_number, e.transponder_id || '', e.entry_status, e.payment_status, e.tech_status]
          .map((v) => `"${v}"`)
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'entries-selected.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  return (
    <>
      <Card className="bg-blue-900/20 border-blue-800">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white">
                {selectedEntries.size} entries selected
              </p>
            </div>

            <div className="relative">
              <Button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                variant="outline"
                size="sm"
                className="border-blue-700 hover:bg-blue-900/50"
              >
                Bulk Actions <ChevronDown className="w-4 h-4 ml-2" />
              </Button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[#171717] border border-gray-700 rounded-lg shadow-lg z-10">
                  <button
                    onClick={() => {
                      setAction('withdraw');
                      setShowDialog(true);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 border-b border-gray-700"
                  >
                    Withdraw Entries
                  </button>
                  <button
                    onClick={() => {
                      setAction('changeClass');
                      setShowDialog(true);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 border-b border-gray-700"
                  >
                    Change Class
                  </button>
                  <button
                    onClick={() => {
                      setAction('assignTransponders');
                      setShowDialog(true);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 border-b border-gray-700"
                  >
                    Assign Transponders
                  </button>
                  <button
                    onClick={handleExportSelected}
                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Export Selected
                  </button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs for bulk actions */}
      {action === 'withdraw' && (
        <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
          <AlertDialogContent className="bg-[#171717] border-gray-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Withdraw Entries</AlertDialogTitle>
              <AlertDialogDescription>
                This will mark {selectedEntries.size} entries as Withdrawn. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogCancel className="border-gray-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleWithdraw}
              className="bg-red-600 hover:bg-red-700"
            >
              Withdraw
            </AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {action === 'changeClass' && (
        <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
          <AlertDialogContent className="bg-[#171717] border-gray-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Change Class</AlertDialogTitle>
              <AlertDialogDescription>
                Move {selectedEntries.size} entries to a different event class.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="bg-gray-900 border-gray-700">
                  <SelectValue placeholder="Select new class" />
                </SelectTrigger>
                <SelectContent>
                  {eventClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.class_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <AlertDialogCancel className="border-gray-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleChangeClass}
              disabled={!selectedClass}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Move
            </AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {action === 'assignTransponders' && (
        <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
          <AlertDialogContent className="bg-[#171717] border-gray-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Assign Transponders</AlertDialogTitle>
              <AlertDialogDescription>
                Paste {selectedEntries.size} transponder IDs, one per line, in the order they should be
                assigned.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Textarea
                value={transponderList}
                onChange={(e) => setTransponderList(e.target.value)}
                placeholder={`Enter transponder IDs (one per line):\nTPDR001\nTPDR002\nTPDR003`}
                className="bg-gray-900 border-gray-700 min-h-32"
              />
            </div>
            <AlertDialogCancel className="border-gray-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAssignTransponders}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Assign
            </AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}