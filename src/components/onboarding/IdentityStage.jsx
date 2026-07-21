import React, { useState } from 'react';
import { useOnboardingWizard } from '@/components/onboarding/OnboardingWizardContext';
import { validateUsername } from '@/components/system/userCapabilities';
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
  const [usernameError, setUsernameError] = useState('');
  const [saving, setSaving] = useState(false);

  const isFormatValid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0;

  const usernameValid =
    !username ||
    (username.length >= 3 && !validateUsername(username.toLowerCase().trim()));

  const canContinue = isFormatValid && usernameValid && !saving;

  const handleContinue = async () => {
    if (!canContinue) return;
    // Re-validate username format before save (only if provided).
    if (username) {
      const err = validateUsername(username.toLowerCase().trim());
      if (err) {
        setUsernameError(err);
        return;
      }
    }
    setSaving(true);
    try {
      await saveIdentity({ first_name: firstName, last_name: lastName, username });
    } catch (e) {
      setUsernameError(e?.message || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-white text-xs">First name <span style={{ color: '#f87171' }}>*</span></Label>
          <Input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Jordan"
            autoFocus
            className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-white text-xs">Last name <span style={{ color: '#f87171' }}>*</span></Label>
          <Input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Racer"
            className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-white text-xs">Username <span className="text-white/30 font-normal">(optional)</span></Label>
        <div className="flex items-center gap-2 rounded-lg px-3"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid ' + (usernameError ? 'rgba(239,68,68,0.4)' : usernameValid ? 'rgba(29,161,161,0.4)' : 'rgba(255,255,255,0.1)'),
          }}>
          <AtSign className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <input
            type="text"
            value={username}
            onChange={(e) => { setUsername(e.target.value.toLowerCase()); setUsernameError(''); }}
            placeholder="yourhandle"
            className="flex h-11 flex-1 bg-transparent text-sm font-mono focus-visible:outline-none"
            style={{ color: 'rgba(255,255,255,0.9)' }}
          />
        </div>
        {usernameError ? (
          <p className="text-xs" style={{ color: '#f87171' }}>{usernameError}</p>
        ) : usernameValid && username ? (
          <p className="text-xs font-mono" style={{ color: 'rgba(29,161,161,0.7)' }}>your public URL: /u/{username.toLowerCase().trim()}</p>
        ) : (
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
            3–24 chars · lowercase letters, numbers, underscores. You can set this later.
          </p>
        )}
      </div>

      <Button
        onClick={handleContinue}
        disabled={!canContinue}
        className="w-full gap-2 h-11 text-sm font-bold"
        style={{ background: canContinue ? TEAL : 'rgba(255,255,255,0.08)', color: canContinue ? '#050A0A' : 'rgba(255,255,255,0.3)' }}
      >
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Continue'}
      </Button>
    </div>
  );
}