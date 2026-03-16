import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Building2, CheckCircle2, Users } from 'lucide-react';
import { OUTLET_TYPE_LABELS } from './mediaPublicHelpers';

export default function OutletCard({ outlet }) {
  const typeLabel = OUTLET_TYPE_LABELS[outlet.outlet_type] || outlet.outlet_type;
  const isVerified = outlet.verification_status === 'verified' || outlet.verification_status === 'featured';
  const isFeatured = outlet.verification_status === 'featured';
  const contributorCount = (outlet.contributor_profile_ids || []).length;

  return (
    <Link
      to={`/media-outlets/${outlet.slug}`}
      className="group block bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg hover:border-gray-200 transition-all"
    >
      {/* Cover */}
      <div className="h-20 bg-gradient-to-r from-gray-100 to-gray-50 relative overflow-hidden">
        {outlet.cover_image_url && (
          <img src={outlet.cover_image_url} alt="" className="w-full h-full object-cover" />
        )}
        {isFeatured && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-amber-500 text-white text-[10px] shadow-sm">Featured</Badge>
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        <div className="-mt-6 mb-3">
          {outlet.logo_url ? (
            <img
              src={outlet.logo_url}
              alt={outlet.name}
              className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-sm bg-white"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gray-100 border-2 border-white shadow-sm flex items-center justify-center">
              <Building2 className="w-5 h-5 text-gray-400" />
            </div>
          )}
        </div>

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-gray-900 font-semibold text-sm truncate">{outlet.name}</p>
              {isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
            </div>
            <p className="text-gray-500 text-xs">{typeLabel}</p>
          </div>
        </div>

        {contributorCount > 0 && (
          <div className="flex items-center gap-1 mt-1.5">
            <Users className="w-3 h-3 text-gray-400" />
            <span className="text-gray-400 text-xs">{contributorCount} contributor{contributorCount !== 1 ? 's' : ''}</span>
          </div>
        )}

        {outlet.specialties?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {outlet.specialties.slice(0, 3).map(s => (
              <Badge key={s} className="bg-gray-100 text-gray-600 text-[10px] font-normal border-0">{s}</Badge>
            ))}
          </div>
        )}

        {outlet.description && (
          <p className="text-gray-500 text-xs mt-2 line-clamp-2">{outlet.description}</p>
        )}
      </div>
    </Link>
  );
}