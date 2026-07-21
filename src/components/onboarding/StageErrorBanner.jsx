import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Inline, stage-level error banner shared across ProfileSetup stages so
 * no save failure fails silently. The banner is the B5 surface.
 */
export default function StageErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div
      className="flex items-start gap-2 p-3 rounded-xl"
      style={{
        background: 'rgba(239,68,68,0.07)',
        border: '1px solid rgba(239,68,68,0.25)',
      }}
      role="alert"
      aria-live="assertive"
    >
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
      <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.78)' }}>
        {message}
      </p>
    </div>
  );
}

/**
 * Normalize a thrown error from an SDK/updateMe call into a user-readable
 * string. Strips noisy prefixes; falls back to a generic message so the UI
 * always has something to show.
 */
export function normalizeBackendError(e) {
  let msg = null;
  if (e) {
    if (typeof e === 'string') msg = e;
    else msg = e.message || e.error || (typeof e.reason === 'string' ? e.reason : null);
  }
  if (!msg) return 'Something went wrong. Please try again.';
  return String(msg)
    .replace(/^Validation failed:?\s*/i, '')
    .replace(/^Error:?\s*/i, '')
    .replace(/^Request failed with status code \d+:?\s*/i, '')
    .trim() || 'Something went wrong. Please try again.';
}