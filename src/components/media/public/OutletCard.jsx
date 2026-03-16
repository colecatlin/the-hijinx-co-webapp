import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { OUTLET_TYPE_LABELS } from './mediaPublicHelpers';

export default function OutletCard({ outlet }) {
  return (
    <Link
      to={`/media-outlets/${outlet.slug}`}
      className="group block bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-all hover:-translate-y-0.5"
    >
      {/* Cover */}
      <div className="h-20 bg-gradient-to-br from-gray-700 to-gray-500 relative overflow-hidden">
        {outlet.cover_image_url && (
          <img src={outlet.cover_image_url} alt="" className="w-full h-full object-cover opacity-70" />
        )}
      </div>
      <div className="px-4 pb-4 -mt-5 relative">
        {outlet.logo_url ? (
          <img
            src={outlet.logo_url}
            alt={outlet.name}
            className="w-10 h-10 rounded-xl object-cover border-2 border-white shadow bg-white mb-2"
          />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-gray-100 border-2 border-white shadow flex items-center justify-center mb-2">
            <Building2 className="w-4 h-4 text-gray-400" />
          </div>
        )}
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-gray-900 font-semibold text-sm truncate">{outlet.name}</p>
          {(outlet.verification_status === 'verified' || outlet.verification_status === 'featured') && (
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          )}
          {outlet.verification_status === 'featured' && (
            <Badge className="bg-amber-500 text-white text-[10px] py-0 px-1.5">Featured</Badge>
          )}
        </div>
        <p className="text-gray-500 text-xs mt-0.5">{OUTLET_TYPE_LABELS[outlet.outlet_type] || outlet.outlet_type}</p>
        {outlet.specialties?.length > 0 && (
          <p className="text-gray-400 text-xs mt-1.5 truncate">{outlet.specialties.slice(0, 2).join(' · ')}</p>
        )}
      </div>
    </Link>
  );
}