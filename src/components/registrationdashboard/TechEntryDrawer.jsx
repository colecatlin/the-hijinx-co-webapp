import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { getTemplateForClass } from './techTemplates';

function techStatusColor(status) {
  switch (status) {
    case 'Passed': return 'bg-green-500/20 text-green-400 border-green-700';
    case 'Failed': return 'bg-red-500/20 text-red-400 border-red-700';
    case 'Recheck Required': return 'bg-yellow-500/20 text-yellow-400 border-yellow-700';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-700';
  }
}

export default function TechEntryDrawer({
  open,
  onOpenChange,
  entry,
  driverName,
  className,
  currentUser,
  saving,
  onSave,
  onSaveAndNext,
}) {
  const [techStatus, setTechStatus] = useState('Not Inspected');
  const [techNotes, setTechNotes] = useState('');
  const [checklist, setChecklist] = useState({});
  const [photoInput, setPhotoInput] = useState('');
  const [photos, setPhotos] = useState([]);

  const template = getTemplateForClass(className);

  useEffect(() => {
    if (!entry) return;
    setTechStatus(entry.tech_status || 'Not Inspected');
    setTechNotes(entry.tech_notes || entry.notes || '');
    setPhotos(entry.tech_photos || []);
    // Restore checklist from metadata if present
    const saved = entry.metadata?.tech?.checklist;
    setChecklist(saved ? { ...saved } : {});
  }, [entry?.id]);

  if (!entry) return null;

  const requiredItems = template.filter((i) => i.required);
  const requiredPassed = requiredItems.every((i) => checklist[i.id]);

  const handleSetStatus = (status) => {
    if ((status === 'Failed' || status === 'Recheck Required') && !techNotes.trim()) {
      toast.error('Add a note before marking Failed or Recheck Required');
      return;
    }
    setTechStatus(status);
  };

  const buildPayload = () => {
    const now = new Date().toISOString();
    const base = {
      tech_status: techStatus,
      tech_notes: techNotes,
      tech_timestamp: now,
      tech_inspector_name: currentUser?.full_name || '',
    };

    // Photos: use tech_photos if field exists (we attempt to set it, SDK will ignore unknown fields)
    if (photos.length > 0) {
      base.tech_photos = photos;
    }

    // Checklist + photos into metadata.tech if metadata field exists
    base.metadata = {
      ...(entry.metadata || {}),
      tech: {
        ...(entry.metadata?.tech || {}),
        checklist,
        photos,
        updated_at: now,
      },
    };

    return base;
  };

  const handleSave = () => {
    onSave(entry.id, buildPayload());
  };

  const handleSaveAndNext = () => {
    onSaveAndNext(entry.id, buildPayload());
  };

  const addPhoto = () => {
    if (!photoInput.trim()) return;
    setPhotos((p) => [...p, photoInput.trim()]);
    setPhotoInput('');
  };

  const removePhoto = (idx) => setPhotos((p) => p.filter((_, i) => i !== idx));

  const checkedCount = Object.values(checklist).filter(Boolean).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="bg-[#1A1A1A] border-gray-700 w-full sm:w-[500px] flex flex-col overflow-hidden">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="text-white flex items-center justify-between">
            <span>Tech Inspection</span>
            <Badge variant="outline" className={`text-xs ${techStatusColor(techStatus)}`}>{techStatus}</Badge>
          </SheetTitle>
          <div className="text-sm text-gray-300 mt-1">
            <span className="text-white font-medium">{driverName}</span>
            {entry.car_number && <span className="text-gray-400 ml-2">· #{entry.car_number}</span>}
            {className && className !== '—' && <span className="text-gray-500 ml-2">· {className}</span>}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-5 mt-4 pr-1">
          {/* 1. Status Buttons */}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Set Status</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                onClick={() => setTechStatus('Passed')}
                className={techStatus === 'Passed' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-transparent border border-green-800 text-green-400 hover:bg-green-900/20'}
              >
                ✓ Pass
              </Button>
              <Button
                size="sm"
                onClick={() => handleSetStatus('Failed')}
                className={techStatus === 'Failed' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-transparent border border-red-800 text-red-400 hover:bg-red-900/20'}
              >
                ✗ Fail
              </Button>
              <Button
                size="sm"
                onClick={() => handleSetStatus('Recheck Required')}
                className={techStatus === 'Recheck Required' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-transparent border border-yellow-800 text-yellow-400 hover:bg-yellow-900/20'}
              >
                ⚠ Recheck
              </Button>
              <Button
                size="sm"
                onClick={() => setTechStatus('Not Inspected')}
                variant="outline"
                className="border-gray-600 text-gray-400 hover:bg-gray-800"
              >
                Reset
              </Button>
            </div>
          </div>

          {/* 2. Checklist */}
          <div className="border-t border-gray-800 pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Checklist</p>
              <span className="text-xs text-gray-500">{checkedCount}/{template.length} checked</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {template.map((item) => (
                <label key={item.id} className="flex items-start gap-2 cursor-pointer p-2 rounded hover:bg-gray-800/40">
                  <Checkbox
                    checked={!!checklist[item.id]}
                    onCheckedChange={(v) => setChecklist((c) => ({ ...c, [item.id]: !!v }))}
                    className="mt-0.5"
                  />
                  <span className={`text-xs ${item.required ? 'text-white' : 'text-gray-300'}`}>
                    {item.label}
                    {item.required && <span className="text-red-400 ml-1">*</span>}
                  </span>
                </label>
              ))}
            </div>
            {requiredItems.length > 0 && !requiredPassed && (
              <p className="text-xs text-amber-400 mt-2">Required items not all checked</p>
            )}
          </div>

          {/* 3. Notes */}
          <div className="border-t border-gray-800 pt-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Notes</p>
            <Textarea
              value={techNotes}
              onChange={(e) => setTechNotes(e.target.value)}
              placeholder="Inspection notes, failure details…"
              rows={3}
              className="bg-[#111] border-gray-600 text-white text-xs"
            />
            {(techStatus === 'Failed' || techStatus === 'Recheck Required') && !techNotes.trim() && (
              <p className="text-xs text-red-400 mt-1">Note required for failed / recheck status</p>
            )}
          </div>

          {/* 4. Photos */}
          <div className="border-t border-gray-800 pt-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Photo URLs</p>
            <div className="flex gap-2 mb-2">
              <Input
                value={photoInput}
                onChange={(e) => setPhotoInput(e.target.value)}
                placeholder="Paste photo URL…"
                className="bg-[#111] border-gray-600 text-white h-8 text-xs flex-1"
                onKeyDown={(e) => e.key === 'Enter' && addPhoto()}
              />
              <Button size="sm" variant="outline" onClick={addPhoto} className="border-gray-600 text-gray-300 h-8">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {photos.length > 0 && (
              <div className="space-y-1">
                {photos.map((url, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-gray-900/40 rounded px-2 py-1">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 truncate flex-1 hover:underline">{url}</a>
                    <button onClick={() => removePhoto(idx)} className="text-gray-500 hover:text-red-400 flex-shrink-0">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inspector info */}
          {currentUser && (
            <div className="border-t border-gray-800 pt-3">
              <p className="text-xs text-gray-500">Inspector: <span className="text-gray-300">{currentUser.full_name || currentUser.email}</span></p>
              {entry.tech_timestamp && (
                <p className="text-xs text-gray-500 mt-0.5">Last updated: {new Date(entry.tech_timestamp).toLocaleString()}</p>
              )}
            </div>
          )}
        </div>

        <SheetFooter className="flex-shrink-0 pt-4 border-t border-gray-700 flex gap-2 flex-row">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="border-gray-700 text-gray-300">Cancel</Button>
          <Button size="sm" variant="outline" onClick={handleSaveAndNext} disabled={saving} className="border-blue-700 text-blue-300 hover:bg-blue-900/20">
            Save & Next
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 flex-1">
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}