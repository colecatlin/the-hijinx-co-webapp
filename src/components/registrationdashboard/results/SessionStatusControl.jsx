/**
 * R9CQ — SessionStatusControl
 * Admin-only per-session public-facing status changer.
 * Routes through the existing updateSessionStatus state machine (backend
 * validates transitions + enforces admin-only rollbacks + syncs result visibility).
 */
import React, { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Mirrors backend ALLOWED_TRANSITIONS (results lifecycle subset)
const ALLOWED = {
  Draft: ['Provisional'],
  Provisional: ['Official', 'Draft'],
  Official: ['Locked', 'Provisional'],
  Locked: ['Official'],
};

export default function SessionStatusControl({ session, eventId, isAdmin }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  if (!isAdmin || !session) return null;

  const current = session.status || 'Draft';
  const targets = ALLOWED[current] || [];

  const handleChange = async (newStatus) => {
    setOpen(false);
    if (newStatus === current) return;
    if (!targets.includes(newStatus)) {
      toast.error(`Cannot move ${current} → ${newStatus} directly`);
      return;
    }
    setLoading(true);
    try {
      const res = await base44.functions.invoke('updateSessionStatus', {
        session_id: session.id,
        new_status: newStatus,
      });
      if (res?.error) throw new Error(res.error);
      await queryClient.invalidateQueries({ queryKey: ['sessions', eventId] });
      await queryClient.invalidateQueries({ queryKey: ['results', eventId] });
      toast.success(`"${session.name}" set to ${newStatus}`);
    } catch (e) {
      toast.error(`Status change failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded border border-white/[0.08] bg-white/[0.03]">
      <Shield className="w-3.5 h-3.5 text-teal-400" />
      <span className="text-[10px] uppercase tracking-wider text-gray-500">Public Status</span>
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" />
      ) : (
        <Select
          value={current}
          open={open}
          onOpenChange={setOpen}
          onValueChange={handleChange}
        >
          <SelectTrigger className="h-7 w-[120px] px-2 py-0 text-[11px] font-semibold bg-[#262626] border-gray-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#262626] border-gray-700">
            <SelectItem value={current} className="text-white opacity-60">
              {current} (current)
            </SelectItem>
            {targets.map((t) => (
              <SelectItem key={t} value={t} className="text-white">
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}