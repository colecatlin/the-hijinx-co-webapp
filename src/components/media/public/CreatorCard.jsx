import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { MapPin, CheckCircle2 } from 'lucide-react';
import { ROLE_LABELS } from './mediaPublicHelpers';

export default function CreatorCard({ profile }) {
  const roleLabel = ROLE_LABELS[profile.primary_role] || profile.primary_role;
  const location = [profile.location_city, profile.location_state].filter(Boolean).join(', ');
  const isVerified = profile.verification_status === 'verified' || profile.verification_status === 'featured';
  const isFeatured = profile.verification_status === 'featured';

  return (
    <Link
      to={`/creators/${profile.slug}`}
      className="group block bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg hover:border-gray-200 transition-all"
    >
      {/* Cover strip */}
      <div className="h-16 bg-gradient-to-r from-gray-100 to-gray-50 relative overflow-hidden">
        {profile.cover_image_url && (
          <img src={profile.cover_image_url} alt="" className="w-full h-full object-cover" />
        )}
        {isFeatured && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-amber-500 text-white text-[10px] shadow-sm">Featured</Badge>
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        {/* Avatar */}
        <div className="-mt-6 mb-3">
          {profile.profile_image_url ? (
            <img
              src={profile.profile_image_url}
              alt={profile.display_name}
              className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-200 border-2 border-white shadow-sm flex items-center justify-center">
              <span className="text-gray-500 font-bold text-lg">{(profile.display_name || '?')[0]}</span>
            </div>
          )}
        </div>

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-gray-900 font-semibold text-sm truncate">{profile.display_name}</p>
              {isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
            </div>
            {roleLabel && <p className="text-gray-500 text-xs">{roleLabel}</p>}
          </div>
        </div>

        {location && (
          <div className="flex items-center gap-1 mt-1.5">
            <MapPin className="w-3 h-3 text-gray-400" />
            <span className="text-gray-400 text-xs">{location}</span>
          </div>
        )}

        {profile.specialties?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {profile.specialties.slice(0, 3).map(s => (
              <Badge key={s} className="bg-gray-100 text-gray-600 text-[10px] font-normal border-0">{s}</Badge>
            ))}
            {profile.specialties.length > 3 && (
              <Badge className="bg-gray-100 text-gray-400 text-[10px] font-normal border-0">+{profile.specialties.length - 3}</Badge>
            )}
          </div>
        )}

        {profile.bio && (
          <p className="text-gray-500 text-xs mt-2 line-clamp-2">{profile.bio}</p>
        )}

        {profile.primary_outlet_name && (
          <p className="text-gray-400 text-xs mt-1.5 truncate">at {profile.primary_outlet_name}</p>
        )}
      </div>
    </Link>
  );
}