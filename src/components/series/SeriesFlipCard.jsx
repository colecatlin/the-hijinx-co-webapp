import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { buildProfileUrl } from '@/components/utils/routingContract';
import { createPageUrl } from '@/components/utils';

export default function SeriesFlipCard({ series, media }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const navigate = useNavigate();

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleProfileClick = (e) => {
    e.stopPropagation();
    navigate(createPageUrl('SeriesDetail', { slug: series.slug }));
  };

  const disciplineColors = {
    'Stock Car': 'bg-blue-100 text-blue-800',
    'Off Road': 'bg-orange-100 text-orange-800',
    'Dirt Oval': 'bg-yellow-100 text-yellow-800',
    'Snowmobile': 'bg-cyan-100 text-cyan-800',
    'Dirt Bike': 'bg-amber-100 text-amber-800',
    'Open Wheel': 'bg-red-100 text-red-800',
    'Sports Car': 'bg-purple-100 text-purple-800',
    'Touring Car': 'bg-pink-100 text-pink-800',
    'Rally': 'bg-indigo-100 text-indigo-800',
    'Drag': 'bg-rose-100 text-rose-800',
    'Motorcycle': 'bg-violet-100 text-violet-800',
    'Karting': 'bg-lime-100 text-lime-800',
    'Water': 'bg-teal-100 text-teal-800',
    'Alternative': 'bg-gray-100 text-gray-800',
  };

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
            <div className="flex-1 relative overflow-hidden bg-gray-100">
              {media?.hero_image_url ? (
                <img 
                  src={media.hero_image_url} 
                  alt={series.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-200">
                  <div className="text-6xl font-black text-gray-400 mb-4">
                    {series.name?.[0] || ''}
                  </div>
                  <div className="text-4xl font-black text-gray-300">
                    {series.founded_year || '—'}
                  </div>
                </div>
              )}
              
              {/* Discipline Badge */}
              {series.discipline && (
                <div className="absolute top-4 right-4 bg-white/95 px-3 py-1 border border-gray-300 rounded-full">
                  <div className={`text-xs font-bold ${disciplineColors[series.discipline] || 'bg-gray-100 text-gray-800'}`}>
                    {series.discipline}
                  </div>
                </div>
              )}
            </div>

            {/* Name Bar */}
            <div className="bg-white border-t border-gray-300 px-4 py-3 relative">
              <div className="text-xl font-black text-[#232323] tracking-tight text-center uppercase">
                {series.name}
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
            <h3 className="text-lg font-black text-[#232323] uppercase tracking-tight mb-1">
              {series.name}
            </h3>
            <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${disciplineColors[series.discipline] || 'bg-gray-100 text-gray-800'}`}>
              {series.discipline}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {series.founded_year && (
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Founded</div>
                <div className="text-sm font-bold text-[#232323]">{series.founded_year}</div>
              </div>
            )}
            {series.region && (
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Region</div>
                <div className="text-sm font-bold text-[#232323]">{series.region}</div>
              </div>
            )}
            {series.competition_level && (
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Level</div>
                <div className="text-sm font-bold text-[#232323]">{series.competition_level}</div>
              </div>
            )}
            {series.status && (
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</div>
                <div className="text-sm font-bold text-[#232323]">{series.status}</div>
              </div>
            )}
          </div>

          {/* Description */}
          {series.description_summary && (
            <div className="mb-6 flex-1">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">About</div>
              <p className="text-xs text-gray-700 leading-relaxed line-clamp-4">
                {series.description_summary}
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