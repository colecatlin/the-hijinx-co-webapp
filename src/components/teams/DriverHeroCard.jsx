import React from 'react';
import { Instagram, Youtube } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function DriverHeroCard({ driver, program, onClick }) {
  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const photoUrl = driver.hero_image_url || driver.headshot_url;

  return (
    <div 
      onClick={onClick}
      className="relative bg-white border-2 border-gray-200 overflow-hidden group cursor-pointer hover:border-[#00FFDA] transition-all"
    >
      {/* Photo */}
      <div className="aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
        {photoUrl ? (
          <img 
            src={photoUrl} 
            alt={driver.person_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl font-black text-gray-400">
              {getInitials(driver.person_name)}
            </span>
          </div>
        )}
        
        {/* Number Badge */}
        {driver.number && (
          <div className="absolute top-4 right-4 bg-[#232323] text-white px-3 py-1 font-black text-lg">
            #{driver.number}
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      {/* Info Panel */}
      <div className="p-4">
        <h3 className="text-lg font-black text-[#232323] mb-2 group-hover:text-[#00FFDA] transition-colors">
          {driver.person_name}
        </h3>
        
        {program && (
          <Badge className="bg-[#1A3249] text-white text-xs mb-3">
            {program.series_name}{program.class_name ? ` • ${program.class_name}` : ''}
          </Badge>
        )}

        {/* Social Icons */}
        {(driver.social_instagram || driver.social_youtube || driver.social_x) && (
          <div className="flex items-center gap-2">
            {driver.social_instagram && (
              <a 
                href={driver.social_instagram}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
              >
                <Instagram className="w-4 h-4 text-gray-600" />
              </a>
            )}
            {driver.social_youtube && (
              <a 
                href={driver.social_youtube}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
              >
                <Youtube className="w-4 h-4 text-gray-600" />
              </a>
            )}
            {driver.social_x && (
              <a 
                href={driver.social_x}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
              >
                <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}