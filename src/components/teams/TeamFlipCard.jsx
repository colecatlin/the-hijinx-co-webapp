import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import CountryFlag from '@/components/shared/CountryFlag';
import { buildProfileUrl } from '@/components/utils/routingContract';
import { createPageUrl } from '@/components/utils';
import { MapPin } from 'lucide-react';

export default function TeamFlipCard({ team, programs = [], driversCount = 0, media, performance }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const navigate = useNavigate();

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleProfileClick = (e) => {
    e.stopPropagation();
    navigate(createPageUrl('TeamProfile', { slug: team.slug }));
  };

  const headquarters = [team.headquarters_city, team.headquarters_state].filter(Boolean).join(', ');

  return (
    <div 
      className="relative h-[480px] cursor-pointer"
      style={{ perspective: '1000px' }}
      onClick={(e) => {
        if (!e.target.closest('button')) {
          handleFlip();
        }
      }}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d', pointerEvents: 'auto' }}
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
            <div className="flex-1 relative overflow-hidden bg-gray-100 flex items-center justify-center">
              {media?.logo_url || media?.hero_image_url ? (
                <img 
                  src={media.logo_url || media.hero_image_url} 
                  alt={team.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center bg-gray-200 w-full h-full">
                  <div className="text-6xl font-black text-gray-400">
                    {team.name.split(' ').map(w => w[0]).join('')}
                  </div>
                </div>
              )}
              
              {/* Status Badge */}
              {team.status && (
                <div className="absolute top-4 right-4 bg-white/95 px-4 py-2 border border-gray-300">
                  <div className="text-xs font-bold text-[#232323]">
                    {team.status}
                  </div>
                </div>
              )}
            </div>

            {/* Name Bar */}
            <div className="bg-white border-t border-gray-300 px-4 py-3 relative">
              <div className="text-xl font-black text-[#232323] tracking-tight text-center uppercase">
                {team.name}
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
              {team.country && <CountryFlag country={team.country} />}
              <h3 className="text-lg font-black text-[#232323] uppercase tracking-tight">
                {team.name}
              </h3>
            </div>
            {headquarters && (
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <MapPin className="w-3 h-3" />
                {headquarters}
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {team.primary_discipline && (
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Discipline</div>
                <div className="text-sm font-bold text-[#232323]">{team.primary_discipline}</div>
              </div>
            )}
            {team.team_level && (
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Level</div>
                <div className="text-sm font-bold text-[#232323]">{team.team_level}</div>
              </div>
            )}
            {team.founded_year && (
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Founded</div>
                <div className="text-sm font-bold text-[#232323]">{team.founded_year}</div>
              </div>
            )}
            {driversCount > 0 && (
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Drivers</div>
                <div className="text-sm font-bold text-[#232323]">{driversCount}</div>
              </div>
            )}
            {programs.length > 0 && (
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Programs</div>
                <div className="text-sm font-bold text-[#232323]">{programs.length}</div>
              </div>
            )}
            {team.status && (
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</div>
                <div className="text-sm font-bold text-[#232323]">{team.status}</div>
              </div>
            )}
          </div>

          {/* Description */}
          {team.description_summary && (
            <div className="mb-6 flex-1">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">About</div>
              <p className="text-xs text-gray-700 leading-relaxed line-clamp-4">
                {team.description_summary}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-auto pt-4 border-t border-gray-300">
            <div className="flex items-center justify-end mb-3">
              <button
                type="button"
                onClick={handleProfileClick}
                className="text-xs text-[#232323] hover:text-[#00FFDA] font-medium transition-colors cursor-pointer"
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