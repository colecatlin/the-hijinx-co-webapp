import React from 'react';
import { CountryFlag } from '@/components/shared/CountryFlag';

export default function DriverHero({ driver, media }) {
  const displayName = `${driver.first_name} ${driver.last_name}`;
  
  return (
    <div className="relative h-96 bg-gray-900 overflow-hidden">
      {media?.hero_image_url && (
        <img 
          src={media.hero_image_url} 
          alt={displayName}
          className="w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />
      
      <div className="absolute bottom-0 left-0 right-0 p-6 max-w-7xl mx-auto w-full">
        <div className="flex items-end gap-6">
          {media?.headshot_url && (
            <img 
              src={media.headshot_url}
              alt={displayName}
              className="h-40 w-40 rounded-lg object-cover border-4 border-white shadow-lg"
            />
          )}
          <div className="flex-1 pb-2">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                {displayName}
              </h1>
              {driver.nationality && (
                <CountryFlag code={driver.nationality} className="h-8 w-8" />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-white/80">
              {driver.primary_number && (
                <div className="text-lg">
                  <span className="text-white/60">Number:</span> #{driver.primary_number}
                </div>
              )}
              {driver.primary_discipline && (
                <div className="text-lg">
                  <span className="text-white/60">Discipline:</span> {driver.primary_discipline}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}