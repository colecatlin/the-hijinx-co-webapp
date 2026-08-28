import React, { useState, useMemo } from 'react';
import { useOnboardingWizard } from '@/components/onboarding/OnboardingWizardContext';
import { useAuth } from '@/lib/AuthContext';
import StageErrorBanner, { normalizeBackendError } from '@/components/onboarding/StageErrorBanner';
import UsernameFieldWithCheck, { suggestUsernameCandidates } from '@/components/onboarding/UsernameFieldWithCheck';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, BadgeCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const TEAL = '#1DA1A1';

/**
 * Identity stage of the onboarding wizard.
 *
 * Username (handle) is REQUIRED here. A user cannot advance past this
 * stage without a valid, available handle. This ensures every account
 * has a public identity from day one — no hibernated accounts without
 * a handle.
 *
 * First name, last name, contact email, and handle are all required.
 *
 * If a username IS entered, every existing validation rule still apply:
 *   - lowercase normalization
 *   - allowed characters (3–24 chars, a-z / 0–9 / _)
 *   - reserved words
 *   - server-authoritative uniqueness (checkUsernameUnique)
 *   - final pre-write re-check on save
 */
export default function IdentityStage() {
  const { user: wizardUser, saveIdentity } = useOnboardingWizard();
  const { user: authUser } = useAuth();
  // Use whichever user source resolves first — AuthContext loads on app
  // startup, the wizard's own query loads when the provider mounts.
  const user = wizardUser || authUser;
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [username, setUsername] = useState(user?.username || '');
  // Email is read-only — derived directly from the auth user, not state.
  // This eliminates the race condition where useState initializes before
  // the auth query resolves and the email stays blank.
  const authEmail = user?.contact_email || user?.email || '';
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [usernameStatus, setUsernameStatus] = useState({ blank: true, checking: false, available: false, error: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const trimmedUsername = username.trim().toLowerCase();
  const isOwnUsername =
    trimmedUsername && (trimmedUsername === (user?.username || '').toLowerCase());

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authEmail.trim());

  // First + last name + handle are all required. The handle must be fully
  // validated (format + availability) to continue.
  const usernameValid =
    !!trimmedUsername &&
    (isOwnUsername || (usernameStatus.available && !usernameStatus.error && !usernameStatus.checking));

  const canContinue =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    emailValid &&
    !emailError &&
    !saving &&
    usernameValid &&
    !usernameStatus.checking;

  const suggestions = useMemo(
    () => suggestUsernameCandidates({ firstName, lastName }),
    [firstName, lastName],
  );

  const handleContinue = async (e) => {
    e?.preventDefault?.();
    setFormError('');
    let blocked = false;
    if (!firstName.trim()) { setFirstNameError('First name is required.'); blocked = true; }
    else setFirstNameError('');
    if (!lastName.trim()) { setLastNameError('Last name is required.'); blocked = true; }
    else setLastNameError('');

    // Username (handle) is required.
    if (!trimmedUsername) {
      blocked = true;
    } else if (usernameStatus.checking) {
      blocked = true; // wait for availability check
    } else if (usernameStatus.error || (!usernameStatus.available && !isOwnUsername)) {
      blocked = true;
    }

    if (!authEmail.trim()) { setEmailError('Email address is required.'); blocked = true; }
    else if (!emailValid) { setEmailError('Enter a valid email address.'); blocked = true; }
    else setEmailError('');
    if (blocked || !canContinue) return;

    setSaving(true);
    try {
      await saveIdentity({
        first_name: firstName,
        last_name: lastName,
        username,
        contact_email: authEmail,
      });
    } catch (err) {
      if (err?.code === 'username_conflict') {
        setUsernameStatus((s) => ({ ...s, available: false, error: err.message || 'That username is already taken.' }));
      } else {
        setFormError(normalizeBackendError(err));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleContinue} className="space-y-5">
      {formError && <StageErrorBanner message={formError} />}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="onb-first-name" className="text-foreground text-xs">
            First name <span style={{ color: 'hsl(var(--danger))' }}>*</span>
          </Label>
          <Input
            id="onb-first-name"
            value={firstName}
            onChange={(e) => { setFirstName(e.target.value); if (firstNameError) setFirstNameError(''); }}
            placeholder="Jordan"
            autoFocus
            aria-invalid={!!firstNameError}
            className="bg-surface-interactive/40 border-divider text-foreground placeholder:text-foreground-quiet"
          />
          {firstNameError && <p className="text-xs" style={{ color: 'hsl(var(--danger))' }}>{firstNameError}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="onb-last-name" className="text-foreground text-xs">
            Last name <span style={{ color: 'hsl(var(--danger))' }}>*</span>
          </Label>
          <Input
            id="onb-last-name"
            value={lastName}
            onChange={(e) => { setLastName(e.target.value); if (lastNameError) setLastNameError(''); }}
            placeholder="Racer"
            aria-invalid={!!lastNameError}
            className="bg-surface-interactive/40 border-divider text-foreground placeholder:text-foreground-quiet"
          />
          {lastNameError && <p className="text-xs" style={{ color: 'hsl(var(--danger))' }}>{lastNameError}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="onb-username-input" className="text-foreground text-xs flex items-center gap-1.5">
          Username <span style={{ color: 'hsl(var(--danger))' }}>*</span>
        </Label>
        <UsernameFieldWithCheck
          value={username}
          onChange={setUsername}
          currentUserId={user?.id}
          suggestions={suggestions}
          idPrefix="onb-username"
          onStatusChange={setUsernameStatus}
        />
        <p className="text-[11px]" style={{ color: 'hsl(var(--foreground-quiet))' }}>
          Your handle is your public identity on the platform — choose wisely.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="onb-email" className="text-foreground text-xs flex items-center gap-1.5">
          <Lock className="w-3 h-3" style={{ color: 'hsl(var(--foreground-quiet))' }} />
          Email address <span style={{ color: 'hsl(var(--danger))' }}>*</span>
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="onb-email"
            type="email"
            value={authEmail}
            readOnly
            onChange={() => {}}
            placeholder="Set from your login"
            aria-invalid={!!emailError}
            className="border-divider text-foreground placeholder:text-foreground-quiet cursor-not-allowed flex-1"
            style={{ background: 'hsl(var(--surface-interactive) / 0.2)', opacity: 0.7 }}
          />
          {authEmail && (
            <Badge
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap"
              style={{
                background: 'hsl(var(--success) / 0.15)',
                color: 'hsl(var(--success))',
                border: '1px solid hsl(var(--success) / 0.3)',
              }}
            >
              <BadgeCheck className="w-3 h-3" />
              Verified
            </Badge>
          )}
        </div>
        {emailError ? (
          <p className="text-xs" style={{ color: 'hsl(var(--danger))' }}>{emailError}</p>
        ) : (
          <p className="text-xs" style={{ color: 'hsl(var(--foreground-quiet))' }}>
            Verified during sign-in. This is your account's login email.
          </p>
        )}
      </div>

      <Button
        type="submit"
        onClick={handleContinue}
        disabled={!canContinue}
        className="w-full gap-2 h-11 text-sm font-bold"
        style={{ background: canContinue ? TEAL : 'hsl(var(--surface-interactive))', color: canContinue ? '#050A0A' : 'hsl(var(--foreground-quiet))' }}
      >
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Continue'}
      </Button>
    </form>
  );
}