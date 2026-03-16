import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ROLE_LABELS } from './mediaPublicHelpers';

export default function CreatorCard({ profile }) {
  return (
    <Link
      to={`/creators/${profile.slug}`}
      className="group block bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-all hover:-translate-y-0.5"
    >
      {/* Cover / avatar area */}
      <div className="h-24 bg-gradient-to-br from-gray-800 to-gray-600 relative overflow-hidden">
        {profile.cover_image_url && (
          <img src={profile.cover_image_url} alt="" className="w-full h-full object-cover opacity-70" />
        )}
      </div>
      <div className="px-4 pb-4 -mt-6 relative">
        {profile.profile_image_url ? (
          <img
            src={profile.profile_image_url}
            alt={profile.display_name}
            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow mb-2"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-200 border-2 border-white shadow flex items-center justify-center mb-2">
            <span className="text-gray-500 font-bold text-lg">{(profile.display_name || '?')[0]}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-gray-900 font-semibold text-sm truncate">{profile.display_name}</p>
          {(profile.verification_status === 'verified' || profile.verification_status === 'featured') && (
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          )}
          {profile.verification_status === 'featured' && (
            <Badge className="bg-amber-500 text-white text-[10px] py-0 px-1.5">Featured</Badge>
          )}
        </div>
        <p className="text-gray-500 text-xs mt-0.5">{ROLE_LABELS[profile.primary_role] || profile.primary_role}</p>
        {profile.specialties?.length > 0 && (
          <p className="text-gray-400 text-xs mt-1.5 truncate">{profile.specialties.slice(0, 2).join(' · ')}</p>
        )}
      </div>
    </Link>
  );
}