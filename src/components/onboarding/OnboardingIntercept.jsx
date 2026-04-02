import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/components/utils';
import PersonIdentityStep from './PersonIdentityStep';
import { User, Users, MapPin, Trophy, Heart, Search, Plus, ArrowRight, Gauge } from 'lucide-react';

const ENTITY_OPTIONS = [
  { icon: User, label: "I'm a driver", description: "Create or claim your driver profile", mode: 'new', type: 'Driver' },
  { icon: Users, label: "I run a team", description: "Manage your team's presence", mode: 'new', type: 'Team' },
  { icon: MapPin, label: "I operate a track", description: "Manage your venue and events", mode: 'new', type: 'Track' },
  { icon: Trophy, label: "I run a series", description: "Oversee your racing series", mode: 'new', type: 'Series' },
];

export default function OnboardingIntercept({ user, onSkip }) {
  const navigate = useNavigate();

  // Layer 1 is satisfied if user already has both names, or after PersonIdentityStep completes
  const hasIdentity = !!(user?.first_name?.trim() && user?.last_name?.trim());
  const [step, setStep] = useState(hasIdentity ? 'intent' : 'identity');
  const [skipping, setSkipping] = useState(false);

  const handleIdentityComplete = () => {
    setStep('intent');
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
          {step === 'intent' && (
            <p className="text-gray-500 text-sm mt-2 max-w-sm mx-auto">
              Tell us how you're here so we can point you in the right direction.
            </p>
          )}
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`w-2 h-2 rounded-full transition-colors ${step === 'identity' ? 'bg-[#232323]' : 'bg-gray-300'}`} />
          <div className={`w-2 h-2 rounded-full transition-colors ${step === 'intent' ? 'bg-[#232323]' : 'bg-gray-200'}`} />
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6">

          {/* Layer 1 — Person Identity */}
          {step === 'identity' && (
            <PersonIdentityStep user={user} onComplete={handleIdentityComplete} />
          )}

          {/* Layer 2 — Entity Intent */}
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

                {/* Claim existing — secondary option */}
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
        </div>

      </div>
    </div>
  );
}