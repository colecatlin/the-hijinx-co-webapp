/**
 * R9CT — LifecycleTransitionButton
 * A button that validates the lifecycle transition before allowing it.
 * Shows an error toast if the transition is invalid.
 *
 * Usage:
 *   <LifecycleTransitionButton
 *     entityType="Results"
 *     fromState={result.status_state}
 *     toState="Official"
 *     onConfirm={() => publishMutation.mutate()}
 *     label="Mark Official"
 *   />
 */
import React, { useState } from 'react';
import { validateTransition } from '../../config/entityLifecycleRules';
import { toast } from 'sonner';

export default function LifecycleTransitionButton({
  entityType,
  fromState,
  toState,
  onConfirm,
  label,
  className = '',
  disabled = false,
  requireConfirm = false,
  confirmMessage,
}) {
  const [confirming, setConfirming] = useState(false);

  const handleClick = () => {
    const { allowed, reason } = validateTransition(entityType, fromState, toState);
    if (!allowed) {
      toast.error(`Lifecycle violation: ${reason}`, { duration: 5000 });
      return;
    }
    if (requireConfirm && !confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    onConfirm();
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-amber-300">
          {confirmMessage || `Confirm: ${fromState} → ${toState}?`}
        </span>
        <button
          onClick={() => { setConfirming(false); onConfirm(); }}
          className="px-2 py-1 rounded bg-teal-700/60 text-teal-200 text-[10px] font-bold uppercase tracking-wide hover:bg-teal-600/70 transition-colors"
        >
          Confirm
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-2 py-1 rounded border border-white/[0.08] text-gray-400 text-[10px] hover:text-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  // Check validity to show tooltip
  const { allowed, reason } = validateTransition(entityType, fromState, toState);

  return (
    <button
      onClick={handleClick}
      disabled={disabled || !allowed}
      title={!allowed ? reason : undefined}
      className={`${className} disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {label}
    </button>
  );
}