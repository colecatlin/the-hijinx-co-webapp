import React from 'react';
import { X, Instagram, Youtube, ExternalLink, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function DriverModal({ driver, program, onClose }) {
  if (!driver) return null;

  const photoUrl = driver.hero_image_url || driver.headshot_url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      <div 
        className="relative bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/90 hover:bg-white rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {photoUrl && (
          <div className="w-full h-64 bg-gray-100 relative overflow-hidden">
            <img 
              src={photoUrl} 
              alt={driver.person_name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        )}

        <div className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-3xl font-black text-[#232323] mb-2">
                {driver.person_name}
              </h2>
              {driver.number && (
                <div className="text-xl font-bold text-gray-600 mb-2">
                  #{driver.number}
                </div>
              )}
              {program && (
                <Badge className="bg-[#1A3249] text-white">
                  {program.series_name}{program.class_name ? ` • ${program.class_name}` : ''}
                </Badge>
              )}
            </div>
          </div>

          {driver.hometown && (
            <div className="flex items-center gap-2 text-gray-600 mb-4">
              <MapPin className="w-4 h-4" />
              <span>{driver.hometown}</span>
            </div>
          )}

          {driver.bio_short && (
            <div className="mb-6">
              <p className="text-gray-700 leading-relaxed">{driver.bio_short}</p>
            </div>
          )}

          {(driver.social_instagram || driver.social_youtube || driver.social_x || driver.website_url) && (
            <div className="border-t border-gray-200 pt-6">
              <div className="text-sm font-semibold text-[#232323] mb-3">Connect</div>
              <div className="flex flex-wrap gap-3">
                {driver.social_instagram && (
                  <a
                    href={driver.social_instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-[#00FFDA] rounded transition-colors text-sm font-medium"
                  >
                    <Instagram className="w-4 h-4" />
                    Instagram
                  </a>
                )}
                {driver.social_youtube && (
                  <a
                    href={driver.social_youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-[#00FFDA] rounded transition-colors text-sm font-medium"
                  >
                    <Youtube className="w-4 h-4" />
                    YouTube
                  </a>
                )}
                {driver.social_x && (
                  <a
                    href={driver.social_x}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-[#00FFDA] rounded transition-colors text-sm font-medium"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    X
                  </a>
                )}
                {driver.website_url && (
                  <a
                    href={driver.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-[#00FFDA] rounded transition-colors text-sm font-medium"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Website
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}