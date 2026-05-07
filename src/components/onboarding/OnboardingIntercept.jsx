import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
import PersonIdentityStep from './PersonIdentityStep';
import MediaOnboardingFlow from './MediaOnboardingFlow';
import { validateUsername, mapLegacyRoleToProfileType } from '@/components/system/userCapabilities';
import { User, Users, MapPin, Trophy, Heart, Search, ArrowRight, Gauge, Camera, AtSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TEAL = '#1DA1A1';
const CYAN = '#00FFDA';

const ENTITY_OPTIONS = [
  { icon: User, label: "I'm a driver", description: 'Create or claim your driver profile', mode: 'new', type: 'Driver' },
  { icon: Users, label: "I run a team", description: "Manage your team's presence", mode: 'new', type: 'Team' },
  { icon: MapPin, label: "I operate a track", description: 'Manage your venue and events', mode: 'new', type: 'Track' },
  { icon: Trophy, label: "I run a series", description: 'Oversee your racing series', mode: 'new', type: 'Series' },
];

function IntentButton({ icon: Icon, label, description, onClick, accent = false }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all duration-200 group"
      style={{
        background: accent ? 'rgba(29,161,161,0.06)' : 'rgba(255,255,255,0.03)',
        border: accent ? '1px solid rgba(29,161,161,0.2)' : '1px solid rgba(255,255,255,0.07)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(29,161,161,0.1)';
        e.currentTarget.style.border = '1px solid rgba(29,161,161,0.3)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = accent ? 'rgba(29,161,161,0.06)' : 'rgba(255,255,255,0.03)';
        e.currentTarget.style.border = accent ? '1px solid rgba(29,161,161,0.2)' : '1px solid rgba(255,255,255,0.07)';
      }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
        style={{ background: accent ? 'rgba(29,161,161,0.15)' : 'rgba(255,255,255,0.05)' }}>
        <Icon className="w-5 h-5" style={{ color: accent ? TEAL : 'rgba(255,255,255,0.5)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm text-white">{label}</div>
        <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{description}</div>
      </div>
      <ArrowRight className="w-4 h-4 flex-shrink-0 transition-colors" style={{ color: 'rgba(255,255,255,0.2)' }} />
    </button>
  );
}

export default function OnboardingIntercept({ user, onSkip }) {
  const navigate = useNavigate();

  const hasIdentity = !!(user?.first_name?.trim() && user?.last_name?.trim());
  const hasUsername = !!user?.username;
  const [step, setStep] = useState(hasIdentity ? (hasUsername ? 'intent' : 'username') : 'identity');
  const [skipping, setSkipping] = useState(false);
  const [updatedUser, setUpdatedUser] = useState(user);
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);

  const usernameValid = usernameInput.length >= 3 && !validateUsername(usernameInput);

  const handleIdentityComplete = (data) => {
    setUpdatedUser(prev => ({ ...prev, ...data }));
    setStep('username');
  };

  const handleUsernameSave = async () => {
    const val = usernameInput.toLowerCase().trim();
    const err = validateUsername(val);
    if (err) { setUsernameError(err); return; }
    setSavingUsername(true);
    await base44.auth.updateMe({ username: val, username_slug: val }).catch(() => {});
    setUpdatedUser(prev => ({ ...prev, username: val, username_slug: val }));
    setSavingUsername(false);
    setStep('intent');
  };

  const handleSkipUsername = () => setStep('intent');
  const handleMediaBranch = async () => {
    const currentTypes = updatedUser?.profile_types || [];
    const hasMedia = currentTypes.some(t => ['media', 'photographer', 'creator'].includes(t));
    const newTypes = hasMedia ? currentTypes : [...currentTypes.filter(t => t !== 'fan'), 'media'];
    const primaryType = updatedUser?.primary_profile_type;
    const newPrimary = (primaryType && primaryType !== 'fan') ? primaryType : 'media';
    await base44.auth.updateMe({
      onboarding_complete: true,
      profile_types: newTypes,
      primary_profile_type: newPrimary,
    }).catch(() => {});
    setUpdatedUser(prev => ({ ...prev, profile_types: newTypes, primary_profile_type: newPrimary }));
    setStep('media');
  };

  const handleEntityOption = async (mode, type) => {
    await base44.auth.updateMe({ onboarding_complete: true }).catch(() => {});
    navigate(`${createPageUrl('EntityOnboarding')}?mode=${mode}${type ? `&type=${type}` : ''}`);
  };

  const handleClaimExisting = async () => {
    await base44.auth.updateMe({ onboarding_complete: true }).catch(() => {});
    navigate(`${createPageUrl('EntityOnboarding')}?mode=claim`);
  };

  const handleFan = async () => {
    setSkipping(true);
    await base44.auth.updateMe({ onboarding_complete: true }).catch(() => {});
    setSkipping(false);
    onSkip();
  };

  const steps = ['identity', 'username', 'intent'];
  const stepIndex = steps.indexOf(step);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        background: '#060A0A',
        backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(29,161,161,0.12) 0%, transparent 60%)',
      }}>
      <div className="w-full max-w-lg">

        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'rgba(29,161,161,0.15)', border: '1px solid rgba(29,161,161,0.3)', boxShadow: '0 0 40px rgba(29,161,161,0.15)' }}>
            <Gauge className="w-7 h-7" style={{ color: TEAL }} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Welcome to HIJINX</h1>
          <AnimatePresence mode="wait">
            <motion.p key={step}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="text-sm mt-2"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              {step === 'identity' && "Let's start with who you are."}
              {step === 'username' && "Set your handle — this becomes your permanent public URL."}
              {step === 'intent' && "Tell us your role so we can set up your garage."}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Step dots */}
        {step !== 'media' && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {steps.map((s, i) => (
              <div key={s} className="transition-all duration-300 rounded-full"
                style={{
                  width: step === s ? 20 : 6,
                  height: 6,
                  background: step === s ? TEAL : i < stepIndex ? 'rgba(29,161,161,0.4)' : 'rgba(255,255,255,0.1)',
                }} />
            ))}
          </div>
        )}

        {/* Card */}
        <AnimatePresence mode="wait">
          <motion.div key={step}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl p-6"
            style={{
              background: 'rgba(8,12,14,0.85)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 8px 48px rgba(0,0,0,0.5)',
            }}
          >
            {/* Identity step */}
            {step === 'identity' && (
              <PersonIdentityStep user={user} onComplete={handleIdentityComplete} />
            )}

            {/* Username step */}
            {step === 'username' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-white mb-1">Choose your handle</label>
                  <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Your permanent public profile URL
                  </p>
                  <div className="flex items-center gap-2 rounded-xl px-3"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: usernameError ? '1px solid rgba(239,68,68,0.4)' : usernameValid ? '1px solid rgba(29,161,161,0.4)' : '1px solid rgba(255,255,255,0.1)',
                    }}>
                    <span className="text-sm font-mono flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>@</span>
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={e => { setUsernameInput(e.target.value.toLowerCase()); setUsernameError(''); }}
                      placeholder="yourhandle"
                      className="flex h-11 flex-1 bg-transparent text-sm font-mono focus-visible:outline-none"
                      style={{ color: 'rgba(255,255,255,0.9)' }}
                      onKeyDown={e => e.key === 'Enter' && usernameValid && handleUsernameSave()}
                    />
                    {usernameValid && <span className="text-xs font-bold flex-shrink-0" style={{ color: CYAN }}>✓</span>}
                  </div>
                  {usernameError && <p className="text-xs mt-2" style={{ color: '#f87171' }}>{usernameError}</p>}
                  {usernameValid && !usernameError && (
                    <p className="text-xs mt-2 font-mono" style={{ color: 'rgba(29,161,161,0.7)' }}>
                      your public URL: /u/{usernameInput}
                    </p>
                  )}
                  {!usernameValid && !usernameError && (
                    <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.2)' }}>3–24 chars · letters, numbers, underscores</p>
                  )}
                </div>
                <button
                  onClick={handleUsernameSave}
                  disabled={savingUsername || !usernameInput}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl text-white transition-all disabled:opacity-40"
                  style={{ background: usernameValid ? TEAL : 'rgba(255,255,255,0.08)' }}
                  onMouseEnter={e => { if (usernameValid) e.currentTarget.style.background = '#158080'; }}
                  onMouseLeave={e => { if (usernameValid) e.currentTarget.style.background = TEAL; }}
                >
                  <AtSign className="w-4 h-4" />
                  {savingUsername ? 'Claiming…' : 'Claim Handle'}
                </button>
                <button onClick={handleSkipUsername}
                  className="w-full text-center text-xs transition-colors"
                  style={{ color: 'rgba(255,255,255,0.2)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
                >
                  Skip for now — I'll set this up later
                </button>
              </div>
            )}

            {/* Intent step */}
            {step === 'intent' && (
              <div className="space-y-3">
                {ENTITY_OPTIONS.map(({ icon, label, description, mode, type }) => (
                  <IntentButton key={type} icon={icon} label={label} description={description}
                    onClick={() => handleEntityOption(mode, type)} />
                ))}
                <IntentButton
                  icon={Search} label="Claim an existing profile"
                  description="Find a profile already in the system and request ownership"
                  onClick={handleClaimExisting}
                />
                <IntentButton
                  icon={Camera} label="I'm media / a creator"
                  description="Photographer, videographer, writer, outlet, content creator"
                  onClick={handleMediaBranch}
                  accent
                />

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-3 text-xs" style={{ background: 'rgba(8,12,14,0.9)', color: 'rgba(255,255,255,0.2)' }}>or</span>
                  </div>
                </div>

                <button onClick={handleFan} disabled={skipping}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-2xl transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.07)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
                >
                  <Heart className="w-4 h-4" />
                  {skipping ? 'Loading…' : "I'm just a fan — show me the good stuff"}
                </button>
                <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  You can always set up your full profile later from your garage.
                </p>
              </div>
            )}

            {/* Media branch */}
            {step === 'media' && <MediaOnboardingFlow user={updatedUser} />}
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
}