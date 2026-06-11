/**
 * R9CT — PermissionGate
 * Renders children only if canPerform(action) returns allowed.
 * Otherwise renders a disabled state or nothing.
 *
 * Usage:
 *   <PermissionGate canPerform={canPerform} action="publish_results" fallback={<DisabledBtn />}>
 *     <PublishButton />
 *   </PermissionGate>
 */
import React from 'react';

export default function PermissionGate({ canPerform, action, children, fallback = null, showReason = false }) {
  if (!canPerform) return children;
  const result = canPerform(action);
  if (result.allowed) return children;
  if (showReason) {
    return (
      <div className="inline-flex items-center gap-1.5 opacity-40 cursor-not-allowed" title={result.reason}>
        {fallback || children}
      </div>
    );
  }
  return fallback;
}