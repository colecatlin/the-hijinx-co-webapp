import React, { useState, useEffect, useRef } from 'react';
import { validateUsername } from '@/components/system/userCapabilities';
import { base44 } from '@/api/base44Client';
import { AtSign, Loader2, Check } from 'lucide-react';

/**
 * UsernameFieldWithCheck
 * ---------------------------------------------------------------------------
 * Single, reusable username input used by both the onboarding Identity stage
 * and the lightweight ClaimUsername flow. Keeps validation, reserved-word
 * checks, and the debounced server availability call in one place so the two
 * surfaces never drift.
 *
 * Props:
 *   value / onChange        — controlled input
 *   currentUserId           — passed to checkUsernameUnique so a user may keep
 *                              their own handle (optional)
 *   suggestions              — array of suggestion strings to render as chips
 *   idPrefix                 — disambiguates input ids
 *   autoFocus                — focus the input on mount
 *
 * The parent always reads `value` via onChange. All status (format error /
 * availability / checking) is rendered inline here so parents don't need to
 * re-implement feedback. The parent should disable its submit button while
 * `isChecking || hasError` (read via the ref-less callback `onStatusChange`
 * if needed — but parents typically just inspect the trimmed value).
 */
export default function UsernameFieldWithCheck({
  value,
  onChange,
  currentUserId,
  suggestions = [],
  idPrefix = 'username',
  autoFocus = false,
  onStatusChange,
}) {
  const trimmed = (value || '').trim().toLowerCase();
  const isOwn = !!(trimmed && currentUserId && trimmed === currentUserId.toLowerCase());
  const formatOk = !trimmed || (trimmed.length >= 3 && !validateUsername(trimmed));

  const [error, setError] = useState('');
  const [status, setStatus] = useState(''); // 'checking' | 'available' | ''

  // Reset transient error when the value clears.
  useEffect(() => {
    if (!trimmed) {
      setError('');
      setStatus('');
    }
  }, [trimmed]);

  // Debounced server-authoritative availability check.
  useEffect(() => {
    if (!trimmed || isOwn) {
      setError('');
      setStatus('');
      return;
    }
    if (!formatOk || trimmed.length < 3) {
      setStatus('');
      return;
    }
    let cancelled = false;
    setStatus('checking');
    setError('');
    const t = setTimeout(async () => {
      try {
        const res = await base44.functions.invoke('checkUsernameUnique', {
          username: trimmed,
          current_user_id: currentUserId,
        });
        if (cancelled) return;
        if (res?.data && res.data.available === true) {
          setStatus('available');
        } else if (res?.data && res.data.available === false) {
          setStatus('');
          setError(res.data.reason || 'That username is already taken.');
        }
      } catch {
        if (!cancelled) setStatus('');
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed, isOwn, formatOk, currentUserId]);

  //Bubble status up so parents can drive submit-button state without
  //duplicating the check logic.
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange({
        blank: !trimmed,
        checking: status === 'checking',
        available: status === 'available' || isOwn,
        error,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed, status, error, isOwn]);

  const inputRef = useRef(null);
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  return (
    <div className="space-y-2">
      <div
        className="flex items-center gap-2 rounded-lg px-3"
        style={{
          background: 'hsl(var(--surface-interactive) / 0.4)',
          border:
            '1px solid ' +
            (error
              ? 'hsl(var(--danger) / 0.4)'
              : status === 'available'
                ? 'rgba(29,161,161,0.45)'
                : 'hsl(var(--divider))'),
        }}
      >
        <AtSign className="w-4 h-4 flex-shrink-0" style={{ color: 'hsl(var(--foreground-quiet))' }} />
        <input
          ref={inputRef}
          id={`${idPrefix}-input`}
          type="text"
          value={value || ''}
          onChange={(e) => {
            onChange(e.target.value.toLowerCase());
            if (error) setError('');
            if (status) setStatus('');
          }}
          placeholder="yourhandle"
          aria-invalid={!!error}
          className="flex h-11 flex-1 bg-transparent text-sm font-mono focus-visible:outline-none"
          style={{ color: 'hsl(var(--foreground))' }}
        />
        {status === 'checking' && (
          <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'hsl(var(--foreground-quiet))' }} />
        )}
        {status === 'available' && (
          <Check className="w-4 h-4" style={{ color: 'rgba(29,161,161,0.9)' }} />
        )}
      </div>

      {error ? (
        <p className="text-xs" style={{ color: 'hsl(var(--danger))' }}>{error}</p>
      ) : status === 'available' ? (
        <p className="text-xs font-mono" style={{ color: 'rgba(29,161,161,0.85)' }}>
          Available · public URL /u/{trimmed}
        </p>
      ) : (
        <p className="text-xs" style={{ color: 'hsl(var(--foreground-quiet))' }}>
          3–24 chars · lowercase letters, numbers, underscores.
        </p>
      )}

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className="text-[11px] font-mono px-2 py-1 rounded-full transition-colors"
              style={{
                background: 'rgba(29,161,161,0.08)',
                color: 'rgba(29,161,161,0.9)',
                border: '1px solid rgba(29,161,161,0.2)',
              }}
            >
              @{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Build a set of suggestion candidates from a user's name. Pure function
 * so both onboarding and the completion flow can reuse it. Returns an
 * ordered list with duplicates removed. These are SUGGESTIONS ONLY — the
 * backend uniqueness check is never auto-applied.
 */
export function suggestUsernameCandidates({ firstName, lastName }) {
  const first = (firstName || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  const last = (lastName || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (!first && !last) return [];
  const base = [first, last].filter(Boolean).join('');
  const out = new Set();
  if (first) out.add(first);
  if (last) out.add(last);
  if (first && last) {
    out.add(`${first}${last}`);
    out.add(`${first}_${last}`);
    out.add(`${first}.${last}`);
    out.add(`${first[0]}${last}`);
  }
  if (base) {
    out.add(`${base}46`);
    out.add(`${base}_46`);
  }
  return Array.from(out).filter((s) => s.length >= 3 && s.length <= 24 && /^[a-z0-9_]+$/.test(s));
}