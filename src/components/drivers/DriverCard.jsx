import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import CountryFlag from '@/components/shared/CountryFlag';
import { buildProfileUrl } from '@/components/utils/routingContract';
import { MapPin } from 'lucide-react';

export default function DriverCard({ driver, program, team, media, performance }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const navigate = useNavigate();

  const handleFlip = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFlipped(!isFlipped);
  };

  const handleProfileClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(buildProfileUrl('Driver', driver.slug));
  };

  const bibNumber = program?.bib_number || program?.vehicle_number || driver.primary_number;
  const hometown = [driver.hometown_city, driver.hometown_state].filter(Boolean).join(', ');

  return (
    <div 
      className="relative h-[480px] cursor-pointer"
      style={{ perspective: '1000px' }}
      onClick={handleFlip}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
      >
        {/* FRONT OF CARD */}
        <div
          className="absolute inset-0 bg-white border border-gray-300"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="relative h-full flex flex-col">
            {/* Image Section */}
            <div className="flex-1 relative overflow-hidden bg-gray-100">
              {media?.headshot_url || media?.hero_image_url ? (
                <img 
                  src={media.headshot_url || media.hero_image_url} 
                  alt={`${driver.first_name} ${driver.last_name}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-200">
                  <div className="text-6xl font-black text-gray-400 mb-4">
                    {driver.first_name?.[0] || ''}{driver.last_name?.[0] || ''}
                  </div>
                  {bibNumber && (
                    <div className="text-8xl font-black text-gray-300">
                      {bibNumber}
                    </div>
                  )}
                </div>
              )}
              
              {/* Bib Number Overlay */}
              {bibNumber && (media?.headshot_url || media?.hero_image_url) && (
                <div className="absolute top-4 right-4 bg-white/95 px-4 py-2 border border-gray-300">
                  <div className="text-4xl font-black text-[#232323] leading-none">
                    {bibNumber}
                  </div>
                </div>
              )}
            </div>

            {/* Name Bar */}
            <div className="bg-white border-t border-gray-300 px-4 py-3 relative">
              <div className="text-xl font-black text-[#232323] tracking-tight text-center uppercase">
                {driver.first_name} {driver.last_name}
              </div>
              <div className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* BACK OF CARD */}
        <div
          className="absolute inset-0 bg-[#FAFAFA] border border-gray-300 p-6 flex flex-col"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <CountryFlag country={driver.hometown_country} />
              <h3 className="text-lg font-black text-[#232323] uppercase tracking-tight">
                {driver.first_name} {driver.last_name}
              </h3>
            </div>
            {hometown && (
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <MapPin className="w-3 h-3" />
                {hometown}
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {program?.series_name && (
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Series</div>
                <div className="text-sm font-bold text-[#232323]">{program.series_name}</div>
              </div>
            )}
            {program?.class_name && (
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Class</div>
                <div className="text-sm font-bold text-[#232323]">{program.class_name}</div>
              </div>
            )}
            {team?.name && (
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Team</div>
                <div className="text-sm font-bold text-[#232323]">{team.name}</div>
              </div>
            )}
            {driver.primary_discipline && (
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Discipline</div>
                <div className="text-sm font-bold text-[#232323]">{driver.primary_discipline}</div>
              </div>
            )}
            {performance?.career_wins && (
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Wins</div>
                <div className="text-sm font-bold text-[#232323]">{performance.career_wins}</div>
              </div>
            )}
            {performance?.career_podiums && (
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Podiums</div>
                <div className="text-sm font-bold text-[#232323]">{performance.career_podiums}</div>
              </div>
            )}
          </div>

          {/* Bio Section */}
          {performance?.bio_summary && (
            <div className="mb-6 flex-1">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">About</div>
              <p className="text-xs text-gray-700 leading-relaxed line-clamp-4">
                {performance.bio_summary}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-auto pt-4 border-t border-gray-300">
            <div className="flex items-center justify-end mb-3">
              <button
                onClick={handleProfileClick}
                className="text-xs text-[#232323] hover:text-[#00FFDA] font-medium transition-colors"
              >
                View full profile →
              </button>
            </div>
            <div className="text-right text-xs text-gray-500 font-medium">
              Back →
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}