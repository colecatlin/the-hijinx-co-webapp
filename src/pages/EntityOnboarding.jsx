import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
import PageShell from '@/components/shared/PageShell';
import RegisterEntityFlow from '@/components/onboarding/RegisterEntityFlow';
import ClaimEntityFlow from '@/components/onboarding/ClaimEntityFlow';
import LinkEntityFlow from '@/components/onboarding/LinkEntityFlow';
import { Plus, Search, KeyRound } from 'lucide-react';

const MODES = {
  new: { label: 'Create Profile', Icon: Plus, description: 'Register and become the profile owner.' },
  claim: { label: 'Claim Existing', Icon: Search, description: 'Request ownership of an existing profile.' },
  link: { label: 'Join with Code', Icon: KeyRound, description: 'Enter an access code to join a team, track, or series.' },
};

export default function EntityOnboarding() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode') || 'new';

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  useEffect(() => {
    if (!isLoading && !user) {
      base44.auth.redirectToLogin(createPageUrl('EntityOnboarding') + `?mode=${mode}`);
    }
  }, [user, isLoading, mode]);

  if (isLoading || !user) return null;

  const setMode = (m) => navigate(`${createPageUrl('EntityOnboarding')}?mode=${m}`);

  return (
    <PageShell className="bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {mode === 'new' ? 'Set Up Your Profile' : mode === 'claim' ? 'Claim Your Profile' : 'Join with Access Code'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Get on the platform as a driver, team, track, or series.</p>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
          {Object.entries(MODES).map(([key, { label, Icon }]) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                mode === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {React.createElement(Icon, { className: 'w-3.5 h-3.5' })}
              {label}
            </button>
          ))}
        </div>

        {/* Content card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          {mode === 'new' && <RegisterEntityFlow user={user} />}
          {mode === 'claim' && <ClaimEntityFlow user={user} />}
          {mode === 'link' && <LinkEntityFlow user={user} />}
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => navigate(createPageUrl('MyDashboard'))}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </PageShell>
  );
}