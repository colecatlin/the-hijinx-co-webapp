import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Plus, Search, KeyRound, ChevronRight } from 'lucide-react';

const CARDS = [
  {
    mode: 'new',
    title: 'Register a New Entity',
    description: 'Create a new driver, team, track, or series profile and become the first owner.',
    cta: 'Register New',
    Icon: Plus,
    bg: 'bg-blue-50 border-blue-200',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    btnClass: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
  {
    mode: 'claim',
    title: 'Claim an Existing Entity',
    description: 'Search for an existing profile already in the system and request ownership.',
    cta: 'Claim Existing',
    Icon: Search,
    bg: 'bg-amber-50 border-amber-200',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    btnClass: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  {
    mode: 'link',
    title: 'Link an Entity',
    description: 'Enter an access code shared by an existing owner to gain access.',
    cta: 'Link with Code',
    Icon: KeyRound,
    bg: 'bg-green-50 border-green-200',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    btnClass: 'bg-green-600 hover:bg-green-700 text-white',
  },
];

export default function OnboardingEntryCards() {
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {CARDS.map(({ mode, title, description, cta, Icon, bg, iconBg, iconColor, btnClass }) => (
        <div key={mode} className={`border-2 rounded-xl p-5 flex flex-col gap-3 ${bg}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">{description}</p>
          </div>
          <button
            onClick={() => navigate(`${createPageUrl('EntityOnboarding')}?mode=${mode}`)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${btnClass}`}
          >
            {cta} <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}