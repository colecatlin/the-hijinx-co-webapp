import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/components/utils';
import PersonIdentityStep from './PersonIdentityStep';
import MediaOnboardingFlow from './MediaOnboardingFlow';
import { validateUsername, mapLegacyRoleToProfileType, PROFILE_TYPE_CONFIG, ALL_PROFILE_TYPES } from '@/components/system/userCapabilities';
import { User, Users, MapPin, Trophy, Heart, Search, ArrowRight, Gauge, Camera, AtSign, Flag } from 'lucide-react';

const ENTITY_OPTIONS = [
  { icon: User, label: "I'm a driver", description: "Create or claim your driver profile", mode: 'new', type: 'Driver' },
  { icon: Users, label: "I run a team", description: "Manage your team's presence", mode: 'new', type: 'Team' },
  { icon: MapPin, label: "I operate a track", description: "Manage your venue and events", mode: 'new', type: 'Track' },
  { icon: Trophy, label: "I run a series", description: "Oversee your racing series", mode: 'new', type: 'Series' },
];

export default function OnboardingIntercept({ user, onSkip }) {
  const navigate = useNavigate();

  const hasIdentity = !!(user?.first_name?.trim() && user?.last_name?.trim());
  const hasUsername = !!user?.username;
  // Steps: identity → username → intent
  const [step, setStep] = useState(hasIdentity ? (hasUsername ? 'intent' : 'username') : 'identity');
  const [skipping, setSkipping] = useState(false);
  const [updatedUser, setUpdatedUser] = useState(user);
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);

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

  const handleSkipUsername = () => {
    setStep('intent');
  };

  const handleMediaBranch = () => {
    setStep('media');
  };

  const handleEntityOption = async (mode, type) => {
    await base44.auth.updateMe({ onboarding_complete: true }).catch(() => {});
    const url = `${createPageUrl('EntityOnboarding')}?mode=${mode}${type ? `&type=${type}` : ''}`;
    navigate(url);
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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#232323] rounded-2xl mb-4">
            <Gauge className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to Index46</h1>
          {step === 'identity' && (
            <p className="text-gray-500 text-sm mt-2 max-w-sm mx-auto">
              Let's start with who you are.
            </p>
          )}
          {step === 'username' && (
            <p className="text-gray-500 text-sm mt-2 max-w-sm mx-auto">
              Claim your spot in the HIJINX world.
            </p>
          )}
        {step === 'intent' && (
            <p className="text-gray-500 text-sm mt-2 max-w-sm mx-auto">
              Tell us how you're here so we can point you in the right direction.
            </p>
          )}
        </div>

        {/* Step indicator */}
        {step !== 'media' && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {['identity', 'username', 'intent'].map(s => (
              <div key={s} className={`w-2 h-2 rounded-full transition-colors ${step === s ? 'bg-[#232323]' : 'bg-gray-200'}`} />
            ))}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-2xl p-6">

          {/* Layer 1 — Person Identity */}
          {step === 'identity' && (
            <PersonIdentityStep user={user} onComplete={handleIdentityComplete} />
          )}

          {/* Layer 2 — Username */}
          {step === 'username' && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Choose your username
                </label>
                <p className="text-xs text-gray-400 mb-4">This becomes your public profile URL: hijinx.com/u/yourhandle</p>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm font-mono">@</span>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={e => { setUsernameInput(e.target.value.toLowerCase()); setUsernameError(''); }}
                    placeholder="yourhandle"
                    className={`flex h-10 flex-1 rounded-xl border px-3 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 ${usernameError ? 'border-red-300 focus-visible:ring-red-400' : 'border-gray-200 focus-visible:ring-gray-900'}`}
                  />
                </div>
                {usernameError && <p className="text-xs text-red-500 mt-2">{usernameError}</p>}
                <p className="text-xs text-gray-400 mt-2">3–24 chars. Letters, numbers, underscores only.</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUsernameSave} disabled={savingUsername || !usernameInput}
                  className="flex-1 bg-[#232323] hover:bg-black text-white gap-2">
                  <AtSign className="w-4 h-4" />
                  {savingUsername ? 'Saving…' : 'Claim Username'}
                </Button>
              </div>
              <button onClick={handleSkipUsername}
                className="w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors">
                Skip for now — I'll set this up later
              </button>
            </div>
          )}

          {/* Layer 3 — Entity Intent */}
          {step === 'intent' && (
            <div className="space-y-4">
              <div className="space-y-2">
                {ENTITY_OPTIONS.map(({ icon: Icon, label, description, mode, type }) => (
                  <button
                    key={type}
                    onClick={() => handleEntityOption(mode, type)}
                    className="w-full flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-900 hover:shadow-sm transition-all group text-left"
                  >
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-gray-200 transition-colors">
                      <Icon className="w-5 h-5 text-gray-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-900">{label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{description}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-700 transition-colors flex-shrink-0" />
                  </button>
                ))}

                {/* Claim existing */}
                <button
                  onClick={handleClaimExisting}
                  className="w-full flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-900 hover:shadow-sm transition-all group text-left"
                >
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-amber-100 transition-colors">
                    <Search className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-900">Claim an existing profile</div>
                    <div className="text-xs text-gray-500 mt-0.5">Find a profile already in the system and request ownership</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-700 transition-colors flex-shrink-0" />
                </button>

                {/* Media / Creator branch */}
                <button
                  onClick={handleMediaBranch}
                  className="w-full flex items-center gap-4 p-4 bg-white border border-blue-200 rounded-xl hover:border-blue-500 hover:shadow-sm transition-all group text-left"
                >
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                    <Camera className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-900">I'm a media creator / journalist</div>
                    <div className="text-xs text-gray-500 mt-0.5">Photographer, videographer, writer, outlet, content creator</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                </button>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                <div className="relative flex justify-center"><span className="px-3 bg-white text-xs text-gray-400">or</span></div>
              </div>

              {/* Fan path */}
              <div className="text-center space-y-2">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleFan}
                  disabled={skipping}
                >
                  <Heart className="w-4 h-4 text-gray-400" />
                  {skipping ? 'Loading...' : "I'm just a fan — take me to the good stuff"}
                </Button>
                <p className="text-xs text-gray-400">You can always set up your profile later from your dashboard.</p>
              </div>
            </div>
          )}

          {/* Layer 3 — Media Onboarding Flow */}
          {step === 'media' && (
            <MediaOnboardingFlow user={updatedUser} />
          )}
        </div>

      </div>
    </div>
  );
}