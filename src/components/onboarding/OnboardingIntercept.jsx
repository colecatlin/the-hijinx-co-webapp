import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/components/utils';
import { User, Users, MapPin, Trophy, ArrowRight, Gauge } from 'lucide-react';

const OPTIONS = [
  { icon: User, label: "I'm a driver", description: "Set up your racing profile", href: createPageUrl('EntityOnboarding') + '?mode=new&type=Driver' },
  { icon: Users, label: "I run a team", description: "Manage your team's presence", href: createPageUrl('EntityOnboarding') + '?mode=new&type=Team' },
  { icon: MapPin, label: "I operate a track", description: "Manage your venue and events", href: createPageUrl('EntityOnboarding') + '?mode=new&type=Track' },
  { icon: Trophy, label: "I run a series", description: "Oversee your racing series", href: createPageUrl('EntityOnboarding') + '?mode=new&type=Series' },
];

export default function OnboardingIntercept({ onSkip }) {
  const navigate = useNavigate();
  const [skipping, setSkipping] = useState(false);

  const handleSkip = async () => {
    setSkipping(true);
    await base44.auth.updateMe({ onboarding_complete: true }).catch(() => {});
    onSkip();
  };

  const handleOption = async (href) => {
    await base44.auth.updateMe({ onboarding_complete: true }).catch(() => {});
    navigate(href);
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
          <p className="text-gray-500 text-sm mt-2 max-w-sm mx-auto">
            Tell us how you're here so we can point you in the right direction.
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {OPTIONS.map(({ icon: Icon, label, description, href }) => (
            <button
              key={label}
              onClick={() => handleOption(href)}
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
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
          <div className="relative flex justify-center"><span className="px-3 bg-gray-50 text-xs text-gray-400">or</span></div>
        </div>

        {/* Skip */}
        <div className="text-center space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleSkip}
            disabled={skipping}
          >
            {skipping ? 'Loading...' : 'Take me to the good stuff →'}
          </Button>
          <p className="text-xs text-gray-400">You can always set up your profile later from your dashboard.</p>
        </div>

      </div>
    </div>
  );
}