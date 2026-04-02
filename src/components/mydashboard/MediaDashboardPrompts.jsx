import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Camera, BookOpen, ShieldCheck, ExternalLink, UserCircle } from 'lucide-react';

const MEDIA_NEXT_ACTIONS = [
  {
    icon: UserCircle,
    label: 'Complete your media profile',
    description: 'Add portfolio, bio, and social links.',
    to: createPageUrl('MediaPortal'),
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: BookOpen,
    label: 'Explore stories',
    description: 'Browse the latest from The Outlet.',
    to: createPageUrl('OutletHome'),
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: ShieldCheck,
    label: 'Apply for credentials',
    description: 'Request media credentials for upcoming events.',
    to: createPageUrl('MediaPortal'),
    color: 'bg-green-50 text-green-600',
  },
  {
    icon: ExternalLink,
    label: 'Connect your portfolio',
    description: 'Link your work from your profile settings.',
    to: createPageUrl('Profile'),
    color: 'bg-purple-50 text-purple-600',
  },
];

export default function MediaDashboardPrompts({ user }) {
  const hasPortfolio = !!(user?.portfolio_url || user?.instagram_url || user?.website_url);
  const hasOutletName = !!user?.media_outlet_name;

  const missingFields = [];
  if (!hasPortfolio) missingFields.push('portfolio link');
  if (!hasOutletName && user?.role_interest === 'Media Outlet') missingFields.push('outlet name');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Camera className="w-4 h-4 text-gray-500" />
        <h2 className="text-base font-semibold text-gray-900">Media Next Steps</h2>
        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
          {user?.role_interest || 'Media / Creator'}
        </span>
      </div>

      {missingFields.length > 0 && (
        <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          Profile tip: Add your {missingFields.join(' and ')} to improve discoverability.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {MEDIA_NEXT_ACTIONS.map(({ icon: Icon, label, description, to, color }) => (
          <Link key={label} to={to}>
            <div className="flex items-start gap-3 p-3.5 bg-white border border-gray-200 rounded-xl hover:shadow-sm hover:border-gray-300 transition-all h-full">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}