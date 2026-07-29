import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Trash2 } from 'lucide-react';

/**
 * Account deletion confirmation modal.
 * Warns the user that deletion permanently removes their driver, team,
 * and operational associations. Submits a ContactMessage request to the
 * platform team for handling (same mechanism as the existing deletion flow).
 */
export default function DeleteAccountModal({ open, onOpenChange, user, onClose }) {
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await base44.entities.ContactMessage.create({
        name: user?.full_name || user?.email || 'Unknown',
        email: user?.email,
        subject: 'Account Deletion Request — Confirmed',
        message:
          `User ${user?.email} (ID: ${user?.id}) has confirmed account deletion via the mobile-compatible Profile page. ` +
          `This will permanently remove their driver, team, and operational associations. Please process within 2 business days.`,
      }).catch(() => {});
    } catch {
      /* noop */
    } finally {
      setSubmitting(false);
      onOpenChange?.(false);
      onClose?.();
      alert('Deletion confirmed. Our team will process your request within 2 business days.');
    }
  };

  const handleOpenChange = (next) => {
    onOpenChange?.(next);
    if (!next) onClose?.();
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent
        className="rounded-2xl"
        style={{
          background: 'rgba(8, 12, 14, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(239,68,68,0.3)',
          color: 'rgba(255,255,255,0.85)',
        }}
      >
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <AlertTriangle className="w-5 h-5" style={{ color: '#f87171' }} />
            </div>
            <AlertDialogTitle className="text-lg font-black text-white m-0 p-0">
              Delete my account
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm leading-relaxed text-left"
            style={{ color: 'rgba(255,255,255,0.6)' }}>
            <span className="font-bold text-white">This action is permanent.</span> Deleting your
            account will permanently remove your:
            <ul className="mt-2 ml-4 list-disc space-y-1"
              style={{ color: 'rgba(255,255,255,0.55)' }}>
              <li>Driver profile associations and racing identity links</li>
              <li>Team memberships and ownerships</li>
              <li>Track and Series operational access</li>
              <li>Race Core entries, results history, and standing records</li>
            </ul>
            <span className="block mt-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
              This cannot be undone. Our team will process your request within 2 business days.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 pt-2">
          <AlertDialogCancel
            disabled={submitting}
            className="rounded-xl"
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={submitting}
            onClick={(e) => { e.preventDefault(); handleConfirm(); }}
            className="rounded-xl font-bold"
            style={{
              background: '#dc2626',
              color: '#fff',
              border: '1px solid rgba(239,68,68,0.5)',
            }}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            {submitting ? 'Submitting…' : 'Yes, delete my account'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}