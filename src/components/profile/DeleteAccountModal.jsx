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
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';

const CONFIRM_WORD = 'DELETE';

/**
 * Account deletion modal with a double-confirmation flow (Google Play compliant).
 *
 * Step 1: full-impact warning + "I understand, continue".
 * Step 2: type DELETE to enable the final destructive action, which submits a
 * deletion request to the platform team and signs the user out immediately.
 */
export default function DeleteAccountModal({ open, onOpenChange, user, onClose }) {
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [confirmText, setConfirmText] = useState('');

  const reset = () => {
    setStep(1);
    setConfirmText('');
    setSubmitting(false);
  };

  const handleOpenChange = (next) => {
    if (!next) reset();
    onOpenChange?.(next);
    onClose?.();
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await base44.entities.ContactMessage.create({
        name: user?.full_name || user?.email || 'Unknown',
        email: user?.email,
        subject: 'Account Deletion Request — Confirmed',
        message:
          `User ${user?.email} (ID: ${user?.id}) confirmed account deletion via the double-confirmation flow. ` +
          `Permanently remove their driver, team, and operational associations. Process within 2 business days.`,
      }).catch(() => {});
    } catch {
      /* noop — still proceed to sign out */
    }
    // Trigger the deletion lifecycle: sign the user out; the team completes
    // the backend removal from the ContactMessage request submitted above.
    try {
      await base44.auth.logout('/Home');
    } catch {
      /* if logout fails, still close the modal */
    }
    setSubmitting(false);
    handleOpenChange(false);
  };

  const canFinalize = confirmText.trim() === CONFIRM_WORD;

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

          {step === 1 ? (
            <AlertDialogDescription className="text-sm leading-relaxed text-left"
              style={{ color: 'rgba(255,255,255,0.6)' }}>
              <span className="font-bold text-white">This action is permanent.</span> Deleting your
              account will permanently remove your:
              <ul className="mt-2 ml-4 list-disc space-y-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
                <li>Driver profile associations and racing identity links</li>
                <li>Team memberships and ownerships</li>
                <li>Track and Series operational access</li>
                <li>Race Core entries, results history, and standing records</li>
              </ul>
              <span className="block mt-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
                This cannot be undone. You'll be asked to confirm one more time before deletion.
              </span>
            </AlertDialogDescription>
          ) : (
            <AlertDialogDescription className="text-sm leading-relaxed text-left space-y-3"
              style={{ color: 'rgba(255,255,255,0.6)' }}>
              <span className="block font-bold text-white">
                Final confirmation — type {CONFIRM_WORD} to delete your account.
              </span>
              <input
                type="text"
                autoFocus
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={`Type ${CONFIRM_WORD}`}
                className="w-full rounded-xl px-3 py-2.5 text-sm font-mono uppercase tracking-widest outline-none"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: confirmText && !canFinalize ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.12)',
                  color: '#fff',
                }}
              />
              <span className="block" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Typing <span className="font-bold text-white">{CONFIRM_WORD}</span> will submit your
                deletion request and immediately sign you out. Our team processes removals within 2 business days.
              </span>
            </AlertDialogDescription>
          )}
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

          {step === 1 ? (
            <AlertDialogAction
              disabled={submitting}
              onClick={(e) => { e.preventDefault(); setStep(2); }}
              className="rounded-xl font-bold"
              style={{
                background: 'rgba(239,68,68,0.85)',
                color: '#fff',
                border: '1px solid rgba(239,68,68,0.5)',
              }}
            >
              I understand, continue
            </AlertDialogAction>
          ) : (
            <AlertDialogAction
              disabled={submitting || !canFinalize}
              onClick={(e) => { e.preventDefault(); handleConfirm(); }}
              className="rounded-xl font-bold"
              style={{
                background: '#dc2626',
                color: '#fff',
                border: '1px solid rgba(239,68,68,0.5)',
                opacity: canFinalize ? 1 : 0.4,
              }}
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
              {submitting ? 'Deleting…' : 'Permanently delete'}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}