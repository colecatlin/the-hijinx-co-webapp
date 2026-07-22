import React, { useState, useMemo } from 'react';
import { useOnboardingWizard } from '@/components/onboarding/OnboardingWizardContext';
import StageErrorBanner, { normalizeBackendError } from '@/components/onboarding/StageErrorBanner';
import UsernameFieldWithCheck, { suggestUsernameCandidates } from '@/components/onboarding/UsernameFieldWithCheck';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

const TEAL = '#1DA1A1';

/**
 * Identity stage of the onboarding wizard.
 *
 * Username is OPTIONAL here. The goal is to reduce onboarding friction: a
 * user may complete setup with no username and choose one later the first
 * time they hit a public-identity feature (see ClaimUsername +
 * UsernameRequiredGuard).
 *
 * First name, last name, and contact email remain required.
 *
 * If a username IS entered, every existing validation rule still apply:
 *   - lowercase normalization
 *   - allowed characters (3–24 chars, a-z / 0–9 / _)
 *   - reserved words
 *   - server-authoritative uniqueness (checkUsernameUnique)
 *   - final pre-write re-check on save
 */
export default function IdentityStage() {
  const { user, saveIdentity } = useOnboardingWizard();
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.contact_email || user?.email || '');
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [usernameStatus, setUsernameStatus] = useState({ blank: true, checking: false, available: false, error: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const trimmedUsername = username.trim().toLowerCase();
  const isOwnUsername =
    trimmedUsername && (trimmedUsername === (user?.username || '').toLowerCase());

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // First + last name are required; username is optional. When a username is
  // entered it must be fully validated (format + availability) to continue.
  const usernameValid =
    !trimmedUsername ||
    (usernameStatus.available && !usernameStatus.error && !usernameStatus.checking) ||
    isOwnUsername;

  const canContinue =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    emailValid &&
    !emailError &&
    !saving &&
    usernameValid &&
    // If the user is typing a username, don't allow submit mid-check.
    (!trimmedUsername || !usernameStatus.checking);

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

    // Username is optional. Only validate if one was entered.
    if (trimmedUsername) {
      if (usernameStatus.checking) {
        blocked = true; // wait for availability check
      } else if (usernameStatus.error || (!usernameStatus.available && !isOwnUsername)) {
        blocked = true;
      }
    }

    if (!email.trim()) { setEmailError('Email address is required.'); blocked = true; }
    else if (!emailValid) { setEmailError('Enter a valid email address.'); blocked = true; }
    else setEmailError('');
    if (blocked || !canContinue) return;

    setSaving(true);
    try {
      await saveIdentity({
        first_name: firstName,
        last_name: lastName,
        username,
        contact_email: email,
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
          <Label htmlFor="onb-first-name" className="text-white text-xs">
            First name <span style={{ color: '#f87171' }}>*</span>
          </Label>
          <Input
            id="onb-first-name"
            value={firstName}
            onChange={(e) => { setFirstName(e.target.value); if (firstNameError) setFirstNameError(''); }}
            placeholder="Jordan"
            autoFocus
            aria-invalid={!!firstNameError}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
          />
          {firstNameError && <p className="text-xs" style={{ color: '#f87171' }}>{firstNameError}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="onb-last-name" className="text-white text-xs">
            Last name <span style={{ color: '#f87171' }}>*</span>
          </Label>
          <Input
            id="onb-last-name"
            value={lastName}
            onChange={(e) => { setLastName(e.target.value); if (lastNameError) setLastNameError(''); }}
            placeholder="Racer"
            aria-invalid={!!lastNameError}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
          />
          {lastNameError && <p className="text-xs" style={{ color: '#f87171' }}>{lastNameError}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="onb-username-input" className="text-white text-xs flex items-center gap-1.5">
          Username <span className="text-white/30 font-normal">(optional)</span>
        </Label>
        <UsernameFieldWithCheck
          value={username}
          onChange={setUsername}
          currentUserId={user?.id}
          suggestions={suggestions}
          idPrefix="onb-username"
          onStatusChange={setUsernameStatus}
        />
        <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
          You can always claim a public username later from your profile.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="onb-email" className="text-white text-xs">
          Email address <span style={{ color: '#f87171' }}>*</span>
        </Label>
        <Input
          id="onb-email"
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(''); }}
          placeholder="you@example.com"
          aria-invalid={!!emailError}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
        />
        {emailError ? (
          <p className="text-xs" style={{ color: '#f87171' }}>{emailError}</p>
        ) : (
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Used for account notifications and profile contact.
          </p>
        )}
      </div>

      <Button
        type="submit"
        onClick={handleContinue}
        disabled={!canContinue}
        className="w-full gap-2 h-11 text-sm font-bold"
        style={{ background: canContinue ? TEAL : 'rgba(255,255,255,0.08)', color: canContinue ? '#050A0A' : 'rgba(255,255,255,0.3)' }}
      >
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Continue'}
      </Button>
    </form>
  );
}