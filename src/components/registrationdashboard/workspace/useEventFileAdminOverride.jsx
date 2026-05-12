/**
 * REVISION R8F Part 3 — useEventFileAdminOverride
 * Lightweight admin override hook for standalone EventFile.
 * Replaces the async () => true no-op with confirmation dialog + OperationLog audit entry.
 *
 * Contract matches RegistrationDashboard's requireAdminOverride:
 *   requireAdminOverride(actionName, context?) → Promise<boolean>
 *   resolves true  → user approved
 *   resolves false → user cancelled
 */
import React, { useState, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

const ACTION_LABELS = {
  reopen_locked_session:          'Reopen Locked Session',
  edit_results_official:          'Edit Official Results',
  import_results_official:        'Import Into Official Session',
  import_results_allow_duplicates: 'Allow Duplicate Results',
};

function getActionLabel(actionName) {
  return ACTION_LABELS[actionName] || actionName?.replace(/_/g, ' ') || 'Protected Operation';
}

// ── Dialog component ─────────────────────────────────────────────────────────
function OverrideDialogUI({ open, actionName, context, eventName, reason, onReasonChange, onApprove, onCancel }) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="bg-[#1a1510] border border-amber-800/50 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            Admin Override Required
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-sm mt-1">
            This action affects protected race operations inside this event file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Action + Event context */}
          <div className="bg-amber-950/30 border border-amber-800/40 rounded-lg p-3 space-y-2 text-xs font-mono">
            <div className="flex items-start justify-between gap-3">
              <span className="text-amber-500/70 uppercase tracking-wider shrink-0">Action</span>
              <span className="text-amber-200 text-right">{getActionLabel(actionName)}</span>
            </div>
            {eventName && (
              <div className="flex items-start justify-between gap-3">
                <span className="text-amber-500/70 uppercase tracking-wider shrink-0">Event</span>
                <span className="text-gray-300 text-right truncate max-w-[60%]">{eventName}</span>
              </div>
            )}
            {context?.sessionId && (
              <div className="flex items-start justify-between gap-3">
                <span className="text-amber-500/70 uppercase tracking-wider shrink-0">Session</span>
                <span className="text-gray-400 text-right font-mono text-[10px]">{context.sessionId}</span>
              </div>
            )}
            {context?.beforeStatus && context?.afterStatus && (
              <div className="flex items-start justify-between gap-3">
                <span className="text-amber-500/70 uppercase tracking-wider shrink-0">Change</span>
                <span className="text-gray-300 text-right">
                  {context.beforeStatus} → {context.afterStatus}
                </span>
              </div>
            )}
          </div>

          {/* Reason field */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 uppercase tracking-wider">
              Reason <span className="text-gray-600">(optional)</span>
            </label>
            <Textarea
              placeholder="Briefly explain why this override is necessary..."
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              className="bg-[#0d0f11] border-gray-700 text-white text-sm min-h-[72px] resize-none"
            />
          </div>

          {/* Warning notice */}
          <div className="flex items-start gap-2 text-[11px] text-amber-600/70">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>This action will be recorded in the event operation log.</span>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <Button
            variant="outline"
            onClick={onCancel}
            className="border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button
            onClick={onApprove}
            className="bg-amber-700 hover:bg-amber-600 text-white gap-2"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Approve Override
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export default function useEventFileAdminOverride({ eventId, user, selectedEvent }) {
  const [open, setOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState('');
  const [pendingContext, setPendingContext] = useState({});
  const [reason, setReason] = useState('');
  const resolverRef = useRef(null);

  const requireAdminOverride = useCallback((actionName, context = {}) => {
    return new Promise((resolve) => {
      // Store the resolver — called by approve or cancel
      resolverRef.current = resolve;
      setPendingAction(actionName);
      setPendingContext(context || {});
      setReason('');
      setOpen(true);
    });
  }, []);

  const writeAuditLog = useCallback(async (actionName, context, overrideReason) => {
    try {
      await base44.entities.OperationLog.create({
        operation_type: 'ADMIN_OVERRIDE',
        source_type: 'EventFile',
        entity_name: 'Event',
        function_name: actionName,
        event_id: eventId,
        status: 'success',
        notes: `Override approved: ${actionName}${overrideReason ? ` — ${overrideReason}` : ''}`,
        metadata: {
          action: actionName,
          reason: overrideReason || null,
          context,
          event_name: selectedEvent?.name,
          user_id: user?.id,
        },
      });
    } catch (err) {
      // Non-fatal — warn but never block the approved action
      console.warn('[EventFile] Override audit log failed:', err);
      toast.warning('Override approved, but audit log entry could not be written.');
    }
  }, [eventId, user?.id, selectedEvent?.name]);

  const handleApprove = useCallback(async () => {
    setOpen(false);
    const action = pendingAction;
    const context = pendingContext;
    const currentReason = reason;

    // Clear pending state before async work
    setPendingAction('');
    setPendingContext({});
    setReason('');

    // Write audit log (non-blocking)
    await writeAuditLog(action, context, currentReason);

    // Resolve the promise — allow the protected action
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  }, [pendingAction, pendingContext, reason, writeAuditLog]);

  const handleCancel = useCallback(() => {
    setOpen(false);
    setPendingAction('');
    setPendingContext({});
    setReason('');

    // Resolve false — cancel the protected action
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  }, []);

  const OverrideDialog = useCallback(() => (
    <OverrideDialogUI
      open={open}
      actionName={pendingAction}
      context={pendingContext}
      eventName={selectedEvent?.name}
      reason={reason}
      onReasonChange={setReason}
      onApprove={handleApprove}
      onCancel={handleCancel}
    />
  ), [open, pendingAction, pendingContext, selectedEvent?.name, reason, handleApprove, handleCancel]);

  return { requireAdminOverride, OverrideDialog };
}