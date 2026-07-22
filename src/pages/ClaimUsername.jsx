import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, AtSign, ArrowLeft } from 'lucide-react';
import UsernameFieldWithCheck, { suggestUsernameCandidates } from '@/components/onboarding/UsernameFieldWithCheck';
import { resolveReturnPath } from '@/hooks/useUsernameRequired';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const TEAL = '#1DA1A1';

/**
 * ClaimUsername — the lightweight username completion flow.
 * ---------------------------------------------------------------------------
 * Single step: pick a username, see live availability, save. NOT the full
 * onboarding wizard. Reached only when a user attempts a feature that
 * requires a public identity but doesn't yet have a username.
 *
 * - `?return_to=` sends the user back to the feature they tried to use.
 * - `?feature=` is an optional human label rendered in the prompt.
 * - All validation + uniqueness goes through the existing backend
 *   `checkUsernameUnique` function via <UsernameFieldWithCheck>.
 * - On save we persist `username` + `username_slug` via auth.updateMe, then
 *   redirect to the return path.
 *
 * Users who already have a username are bounced straight to their return
 * destination — they never see this page.
 */
export default function ClaimUsername() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();

  const { data: isAuthenticated, isLoading: authLoading } = useQuery({
    queryKey: ['isAuthenticated'],
    queryFn: () => base44.auth.isAuthenticated(),
  });

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    enabled: !!isAuthenticated,
  });

  const [username, setUsername] = useState('');
  const [fieldStatus, setFieldStatus] = useState({ blank: true, checking: false, available: false, error: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const returnPath = useMemo(() => resolveReturnPath(searchParams), [searchParams]);
  const featureLabel = searchParams.get('feature') || 'this feature';

  // Pre-fill if the user somehow already has a username (defensive).
  useEffect(() => {
    if (user?.username) setUsername(user.username);
  }, [user?.username]);

  if (authLoading || (isAuthenticated && userLoading)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#060A0A' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: TEAL }} />
      </div>
    );
  }

  // Not logged in — let the platform login flow handle it.
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Already has a username — send straight back.
  if (user?.username) {
    return <Navigate to={returnPath} replace />;
  }

  const suggestions = suggestUsernameCandidates({
    firstName: user?.first_name,
    lastName: user?.last_name,
  });

  const canSubmit =
    !fieldStatus.blank &&
    !fieldStatus.checking &&
    !fieldStatus.error &&
    (fieldStatus.available || (username.trim().toLowerCase() === (user?.username || '').toLowerCase()));

  const handleSave = async (e) => {
    e?.preventDefault?.();
    setFormError('');
    const slug = username.trim().toLowerCase();
    if (!slug) {
      setFormError('Choose a username to continue.');
      return;
    }
    setSaving(true);
    try {
      // Final pre-write uniqueness re-check (mirrors the onboarding wizard).
      const check = await base44.functions.invoke('checkUsernameUnique', {
        username: slug,
        current_user_id: user?.id,
      });
      if (check?.data && check.data.available === false) {
        setFormError(check.data.reason || 'That username is already taken.');
        setSaving(false);
        return;
      }
      await base44.auth.updateMe({ username: slug, username_slug: slug });
      await qc.invalidateQueries({ queryKey: ['currentUser'] });
      navigate(returnPath);
    } catch (err) {
      setFormError(err?.message || 'Could not save your username. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{
        background: '#060A0A',
        backgroundImage:
          'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(29,161,161,0.10) 0%, transparent 60%)',
      }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <span
            className="inline-block text-[10px] font-mono tracking-[0.35em] uppercase mb-3"
            style={{ color: 'rgba(29,161,161,0.7)' }}
          >
            Choose a username
          </span>
          <h1 className="text-xl font-black text-white tracking-tight">
            Claim your public username
          </h1>
          <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
            You need a username to {featureLabel}. It's how people find you on HIJINX.
          </p>
        </div>

        <div
          className="rounded-2xl p-6"
          style={{
            background: 'rgba(8,12,14,0.85)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 48px rgba(0,0,0,0.5)',
          }}
        >
          <button
            type="button"
            onClick={() => navigate(returnPath)}
            className="flex items-center gap-1.5 text-xs font-semibold mb-4 transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Skip for now
          </button>

          {formError && (
            <div
              className="flex items-start gap-2 p-3 rounded-xl mb-4"
              style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)' }}
              role="alert"
            >
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.78)' }}>{formError}</p>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="claim-username-input" className="text-white text-xs">
                Username
              </Label>
              <UsernameFieldWithCheck
                value={username}
                onChange={setUsername}
                currentUserId={user?.id}
                suggestions={suggestions}
                idPrefix="claim-username"
                autoFocus
                onStatusChange={setFieldStatus}
              />
            </div>

            <Button
              type="submit"
              onClick={handleSave}
              disabled={!canSubmit || saving}
              className="w-full gap-2 h-11 text-sm font-bold"
              style={{
                background: canSubmit && !saving ? TEAL : 'rgba(255,255,255,0.08)',
                color: canSubmit && !saving ? '#050A0A' : 'rgba(255,255,255,0.3)',
              }}
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              ) : (
                <><AtSign className="w-4 h-4" /> Claim & continue</>
              )}
            </Button>
          </form>

          <p className="text-[11px] mt-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Your public profile will be at /u/{username.trim().toLowerCase() || 'yourhandle'}.
          </p>
        </div>
      </div>
    </div>
  );
}