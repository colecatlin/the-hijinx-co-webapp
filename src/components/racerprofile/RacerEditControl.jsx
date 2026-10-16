import React, { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import RacerProfileOwnerEditor from './RacerProfileOwnerEditor';

/**
 * RacerEditControl — small, conditional profile-management control.
 *
 * Gated ONLY by the server-provided `can_manage` flag from the experience
 * projection, which is true for an approved owner, an approved manager or an
 * admin. The backend re-authorizes every save regardless.
 *
 * The control launches the existing canonical editor unchanged; this is a
 * presentation change only.
 */
export default function RacerEditControl({ canManage, racerProfile, identity, user, routeSlug, onUpdated }) {
  const [open, setOpen] = useState(false);

  if (!canManage || !racerProfile) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 border border-divider px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground-secondary transition-colors hover:border-motion hover:text-motion"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit Profile
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] w-full max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-black uppercase tracking-tight">Edit Profile</DialogTitle>
          </DialogHeader>
          <RacerProfileOwnerEditor
            racerProfile={racerProfile}
            identity={identity}
            user={user}
            routeSlug={routeSlug}
            onUpdated={onUpdated}
            onClose={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}