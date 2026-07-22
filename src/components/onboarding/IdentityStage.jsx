import React, { useState, useEffect } from 'react';
import { useOnboardingWizard } from '@/components/onboarding/OnboardingWizardContext';
import { validateUsername } from '@/components/system/userCapabilities';
import StageErrorBanner, { normalizeBackendError } from '@/components/onboarding/StageErrorBanner';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AtSign } from 'lucide-react';

const TEAL = '#1DA1A1';

export default function IdentityStage() {
  const { user, saveIdentity } = useOnboardingWizard();
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.contact_email || user?.email || '');
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [usernameError, setUsernameError] = useState(''); // format OR conflict
  const [emailError, setEmailError] = useState('');
  const [usernameStatus, setUsernameStatus] = useState(''); // 'checking' | 'available' | ''
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const trimmedUsername = username.trim().toLowerCase();
  const isOwnUsername =
    trimmedUsername && (trimmedUsername === (user?.username || '').toLowerCase());

  const usernameFormatOk =
    !trimmedUsername ||
    (trimmedUsername.length >= 3 && !validateUsername(trimmedUsername));

  // Debounced server-authoritative availability check (B3 UX layer).
  useEffect(() => {
    if (!trimmedUsername || isOwnUsername) {
      setUsernameError('');
      setUsernameStatus('');
      return;
    }
    if (!usernameFormatOk || trimmedUsername.length < 3) {
      setUsernameStatus('');
      return;
    }
    let cancelled = false;
    setUsernameStatus('checking');
    setUsernameError('');
    const t = setTimeout(async () => {
      try {
        const res = await base44.functions.invoke('checkUsernameUnique', {
          username: trimmedUsername,
          current_user_id: user?.id,
        });
        if (cancelled) return;
        if (res?.data && res.data.available === true) {
          setUsernameStatus('available');
        } else if (res?.data && res.data.available === false) {
          setUsernameStatus('');
          setUsernameError(res.data.reason || 'That username is already taken.');
        }
      } catch {
        if (!cancelled) setUsernameStatus('');
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmedUsername, isOwnUsername, usernameFormatOk, user?.id]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canContinue =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    trimmedUsername.length > 0 &&
    usernameFormatOk &&
    !usernameError &&
    usernameStatus !== 'checking' &&
    emailValid &&
    !emailError &&
    !saving;

  const handleContinue = async (e) => {
    e?.preventDefault?.();
    setFormError('');
    let blocked = false;
    if (!firstName.trim()) { setFirstNameError('First name is required.'); blocked = true; }
    else setFirstNameError('');
    if (!lastName.trim()) { setLastNameError('Last name is required.'); blocked = true; }
    else setLastNameError('');
    if (!trimmedUsername) {
      setUsernameError('Username is required.');
      blocked = true;
    } else if (!usernameFormatOk) {
      setUsernameError(validateUsername(trimmedUsername) || 'Username is not valid.');
      blocked = true;
    } else if (usernameStatus === 'checking') {
      setUsernameError('');
      blocked = true; // wait for availability check
    }
    if (!email.trim()) { setEmailError('Email address is required.'); blocked = true; }
    else if (!emailValid) { setEmailError('Enter a valid email address.'); blocked = true; }
    else setEmailError('');
    if (blocked || !canContinue) return;

    setSaving(true);
    try {
      await saveIdentity({ first_name: firstName, last_name: lastName, username, contact_email: email });
    } catch (err) {
      if (err?.code === 'username_conflict') {
        setUsernameError(err.message || 'That username is already taken.');
        setUsernameStatus('');
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
        <Label htmlFor="onb-username" className="text-white text-xs">
          Username <span style={{ color: '#f87171' }}>*</span>
        </Label>
        <div
          className="flex items-center gap-2 rounded-lg px-3"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border:
              '1px solid ' +
              (usernameError
                ? 'rgba(239,68,68,0.4)'
                : usernameStatus === 'available'
                  ? 'rgba(29,161,161,0.45)'
                  : 'rgba(255,255,255,0.1)'),
          }}
        >
          <AtSign className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <input
            id="onb-username"
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value.toLowerCase());
              setUsernameError('');
              if (usernameStatus) setUsernameStatus('');
            }}
            placeholder="yourhandle"
            aria-invalid={!!usernameError}
            className="flex h-11 flex-1 bg-transparent text-sm font-mono focus-visible:outline-none"
            style={{ color: 'rgba(255,255,255,0.9)' }}
          />
          {usernameStatus === 'checking' && (
            <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'rgba(255,255,255,0.4)' }} />
          )}
        </div>
        {usernameError ? (
          <p className="text-xs" style={{ color: '#f87171' }}>{usernameError}</p>
        ) : usernameStatus === 'available' ? (
          <p className="text-xs font-mono" style={{ color: 'rgba(29,161,161,0.85)' }}>
            Available · public URL /u/{trimmedUsername}
          </p>
        ) : (
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
            3–24 chars · lowercase letters, numbers, underscores.
          </p>
        )}
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